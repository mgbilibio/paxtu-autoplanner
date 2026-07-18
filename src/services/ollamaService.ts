// Implementação de LlmProvider para Ollama (local + cloud).
// API: https://github.com/ollama/ollama/blob/main/docs/api.md
//
// Cloud (:cloud): contexto alto (256k–1M), geração em PARTES e agregação no app
// para evitar JSON monolítico que estoura saída/timeout e volta vazio.

import { Activity, ActivityEvaluation, GeneratorParams, MeetingPlan, StudyItem } from '../types';
import { getAppConfig } from './storageService';
import { buildManuaisContextForBranch } from '../data/manuaisReferencia';
import { normalizePlanForUse } from './planNormalizationService';
import { normalizeOllamaBaseUrl } from './ollamaUrlSecurity';
import { extractJson } from './llmJson';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 2000;

/** Contexto padrão: 256k (cloud-friendly). Local ainda pode baixar nas configurações. */
const DEFAULT_CONTEXT_TOKENS = 262_144;
const MIN_CONTEXT_TOKENS = 32_768;
const MAX_CONTEXT_TOKENS = 1_048_576; // 1M

/** Saída por chamada de parte (não do plano inteiro). */
const DEFAULT_PART_OUTPUT_TOKENS = 12_288;
const MIN_OUTPUT_TOKENS = 2_048;
const MAX_OUTPUT_TOKENS = 65_536;

const OLLAMA_HELP_CONTEXT_TOKENS = 65_536;
const OLLAMA_HELP_OUTPUT_TOKENS = 4_096;
const OLLAMA_KEEP_ALIVE = '20m';

/** Timeouts: cloud demora mais (rede + thinking). */
const LOCAL_CHAT_TIMEOUT_MS = 8 * 60 * 1000;
const CLOUD_CHAT_TIMEOUT_MS = 15 * 60 * 1000;

const getBaseUrl = (): string => {
  const config = getAppConfig();
  return normalizeOllamaBaseUrl(config?.ollamaBaseUrl) || DEFAULT_BASE_URL;
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

/** Modelos cloud do Ollama (não baixam pesos locais). */
export const isCloudModel = (model: string): boolean => {
  const m = (model || '').toLowerCase();
  if (!m) return false;
  if (m.includes('cloud')) return true;
  // Tags cloud-only sem sufixo :cloud no catálogo atual
  if (/^gemini-.*preview/i.test(m)) return true;
  return false;
};

/** Ordena cloud primeiro (melhor default para setup/config). */
export const sortModelsCloudFirst = (names: string[]): string[] =>
  [...names].sort((a, b) => {
    const ca = isCloudModel(a) ? 0 : 1;
    const cb = isCloudModel(b) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });

const getGenerationContextTokens = (model?: string): number => {
  const config = getAppConfig();
  const raw = clampNumber(
    config?.ollamaGenerationContext,
    DEFAULT_CONTEXT_TOKENS,
    MIN_CONTEXT_TOKENS,
    MAX_CONTEXT_TOKENS
  );
  // Cloud: piso 256k mesmo se config antiga ficou em 32k.
  if (model && isCloudModel(model)) {
    return Math.max(raw, 262_144);
  }
  return raw;
};

const getGenerationOutputTokens = (model?: string): number => {
  const config = getAppConfig();
  const raw = clampNumber(
    config?.ollamaGenerationOutput,
    DEFAULT_PART_OUTPUT_TOKENS,
    MIN_OUTPUT_TOKENS,
    MAX_OUTPUT_TOKENS
  );
  // Por parte: cloud pode usar um pouco mais; local mantém configurado.
  if (model && isCloudModel(model)) {
    return Math.max(raw, 8_192);
  }
  return raw;
};

const chatTimeoutFor = (model: string): number =>
  isCloudModel(model) ? CLOUD_CHAT_TIMEOUT_MS : LOCAL_CHAT_TIMEOUT_MS;

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Roteador HTTP: IPC Electron quando disponível (evita CORS), senão fetch direto.
const httpRequest = async (
  method: string,
  url: string,
  body?: unknown,
  timeoutMs?: number
): Promise<{ ok: boolean; status: number; body: string; error?: string }> => {
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
  if (window.fileSystem?.ollamaRequest) {
    return await window.fileSystem.ollamaRequest(method, url, bodyStr, timeoutMs);
  }
  const r = await fetchWithTimeout(url, {
    method,
    headers: bodyStr ? { 'Content-Type': 'application/json' } : undefined,
    body: bodyStr,
  }, timeoutMs ?? LOCAL_CHAT_TIMEOUT_MS);
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
};

export interface OllamaTagsResponse {
  models: Array<{ name: string; modified_at: string; size: number }>;
}

export const isReachable = async (): Promise<{ ok: boolean; error?: string }> => {
  const url = `${getBaseUrl()}/api/tags`;
  const r = await httpRequest('GET', url, undefined, 2500);
  if (r.ok) return { ok: true };
  if (r.error === 'timeout') return { ok: false, error: `Timeout — Ollama não está rodando em ${getBaseUrl()}?` };
  if (r.error) return { ok: false, error: `Não foi possível conectar: ${r.error}` };
  return { ok: false, error: `Ollama respondeu HTTP ${r.status}` };
};

export const listModels = async (): Promise<string[]> => {
  const url = `${getBaseUrl()}/api/tags`;
  const r = await httpRequest('GET', url, undefined, 2500);
  if (!r.ok) return [];
  let data: OllamaTagsResponse;
  try {
    data = JSON.parse(r.body) as OllamaTagsResponse;
  } catch (e) {
    console.error('Falha ao parsear /api/tags do Ollama:', r.body);
    return [];
  }
  if (!data?.models) return [];
  // Cloud primeiro; manifests minúsculos (size ~centenas de bytes) também sobem.
  const ranked = data.models.map(m => ({
    name: m.name,
    cloudish: isCloudModel(m.name) || (typeof m.size === 'number' && m.size > 0 && m.size < 50_000),
  }));
  ranked.sort((a, b) => {
    if (a.cloudish !== b.cloudish) return a.cloudish ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return ranked.map(m => m.name);
};

interface OllamaChatResponse {
  message?: { content: string; role?: string };
  response?: string;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

// ─── Esqueletos de partes ───────────────────────────────────────────────────

interface PlanSkeletonActivity {
  title: string;
  durationMinutes: number;
  educationalArea: string;
  progressionObjective: string;
  objectiveCodes?: string[];
}

interface PlanSkeleton {
  theme: string;
  fundoDeCena?: string;
  preparacaoChefia?: string;
  generalNotes?: string;
  educationalRationale?: string;
  totalDuration: number;
  activities: PlanSkeletonActivity[];
}

interface ActivityDetailPayload {
  title: string;
  durationMinutes?: number;
  educationalArea?: string;
  description: string;
  fundoDeCena?: string;
  materials: string[];
  progressionObjective?: string;
  instrucaoChefia?: string;
  objetivoEspecifico?: string;
  manualReferencia?: string;
  preparacaoPrevia?: string[];
  evaluation?: ActivityEvaluation;
}

const emptyEvaluation = (): ActivityEvaluation => ({
  acompanhamento: '',
  avaliacaoJovens: '',
  avaliacaoChefia: '',
  requisitosObservaveis: [],
  criteriosDeAceite: [],
  evidenciasSugeridas: [],
});

const objectivesBlock = (params: GeneratorParams): string =>
  params.objectives.map((obj, i) => {
    const codePrefix = obj.code ? `[CÓDIGO: ${obj.code}]` : `[Sem Código]`;
    let richContext = '';
    if (obj.requirementsContext) richContext += `\n   ⚠️ REQUISITOS: ${obj.requirementsContext}`;
    if ((obj as any).specialtyData?.requirements) {
      richContext += `\n   REQUISITOS GERAIS: ${(obj as any).specialtyData.requirements.join('; ')}`;
    }
    const espTag = obj.isSpecialty ? ` [ESPECIALIDADE NÍVEL ${obj.specialtyLevel || 1}]` : '';
    return `- Item ${i + 1}: ${codePrefix}${espTag} ${obj.description}${richContext}`;
  }).join('\n');

const commonBrief = (params: GeneratorParams & { context?: { sectionName: string; groupName: string } }): string => {
  const contextStr = params.context
    ? `Seção "${params.context.sectionName}" do grupo "${params.context.groupName}".`
    : '';
  return [
    `Ramo: ${params.branch}.`,
    contextStr,
    `Duração total: ${params.totalDuration} minutos.`,
    `Quantidade sugerida de atividades: ${params.activityCount || 3}.`,
    `Quantidade de jovens (estimativa): ${params.participantsCount || 20}.`,
    `Tema narrativo solicitado: ${params.narrativeTheme || 'livre — invente um tema coerente com os objetivos'}.`,
    params.customInstruction ? `INSTRUÇÃO ESPECIAL: ${params.customInstruction}` : '',
    '',
    'OBJETIVOS OBRIGATÓRIOS:',
    objectivesBlock(params),
  ].filter(Boolean).join('\n');
};

const SYSTEM_BASE = [
  'Você é um Chefe Escoteiro Sênior experiente, atuando no sistema PAXTU da UEB.',
  'Responda SEMPRE em português brasileiro.',
  'Retorne APENAS um objeto JSON válido. Sem markdown, sem texto antes ou depois, sem comentários.',
].join('\n');

// ─── Chamada chat com retries e fallback de format ──────────────────────────

type ChatCallOptions = {
  model: string;
  system: string;
  user: string;
  preferJsonFormat?: boolean;
  numPredict?: number;
  temperature?: number;
};

const parseChatBody = (body: string): OllamaChatResponse => {
  try {
    return JSON.parse(body) as OllamaChatResponse;
  } catch {
    throw new Error(`Resposta Ollama não é JSON de API: ${body.slice(0, 200)}`);
  }
};

const contentOf = (result: OllamaChatResponse): string =>
  (result.message?.content || result.response || '').trim();

const callOllamaChatOnce = async (
  opts: ChatCallOptions,
  useJsonFormat: boolean
): Promise<OllamaChatResponse> => {
  const url = `${getBaseUrl()}/api/chat`;
  const numCtx = getGenerationContextTokens(opts.model);
  const numPredict = opts.numPredict ?? getGenerationOutputTokens(opts.model);
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      temperature: opts.temperature ?? 0.4,
      num_ctx: numCtx,
      num_predict: numPredict,
    },
  };
  // format:json ajuda, mas alguns cloud models devolvem content vazio com ele.
  if (useJsonFormat) body.format = 'json';

  const r = await httpRequest('POST', url, body, chatTimeoutFor(opts.model));
  if (!r.ok) {
    throw new Error(
      `Ollama HTTP ${r.status}: ${r.error || r.body.slice(0, 400)}`
    );
  }
  return parseChatBody(r.body);
};

/** Chat com até 2 tentativas: format json → sem format; retry de prompt se vazio/inválido. */
const callOllamaChatForJson = async <T,>(
  opts: ChatCallOptions,
  label: string,
  notify?: (msg: string) => void
): Promise<T> => {
  const preferJson = opts.preferJsonFormat !== false;
  const attempts: Array<{ jsonFormat: boolean; user: string }> = [
    { jsonFormat: preferJson, user: opts.user },
    { jsonFormat: false, user: opts.user },
    {
      jsonFormat: false,
      user: `${opts.user}\n\nATENÇÃO: a resposta anterior estava vazia ou inválida. Reenvie SOMENTE o JSON pedido, sem markdown.`,
    },
  ];

  let lastRaw = '';
  let lastReason = '';

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    notify?.(
      `${label} (tentativa ${i + 1}/${attempts.length}${attempt.jsonFormat ? ', format=json' : ''})…`
    );
    try {
      const result = await callOllamaChatOnce(
        { ...opts, user: attempt.user },
        attempt.jsonFormat
      );
      lastReason = result.done_reason || '';
      lastRaw = contentOf(result);
      if (!lastRaw) {
        notify?.(`${label}: resposta vazia (done_reason=${lastReason || '?'}). Tentando de novo…`);
        continue;
      }
      if (result.done_reason === 'length') {
        notify?.(`${label}: saída possivelmente truncada; validando JSON…`);
      }
      const parsed = extractJson<T>(lastRaw);
      if (parsed) return parsed;
      notify?.(`${label}: JSON inválido. Tentando de novo…`);
    } catch (e: any) {
      lastRaw = e?.message || String(e);
      notify?.(`${label}: erro — ${lastRaw.slice(0, 120)}. Tentando de novo…`);
    }
  }

  throw new Error(
    `Modelo "${opts.model}" não retornou JSON válido em "${label}". ` +
    `Motivo: ${lastReason || 'não informado'}. ` +
    `Resposta bruta (200 chars): "${lastRaw.slice(0, 200)}"`
  );
};

// ─── Q&A (help) ─────────────────────────────────────────────────────────────

export const askOllama = async (question: string, context: string, modelId?: string): Promise<string> => {
  const config = getAppConfig();
  const model = modelId || config?.ollamaModel || '';
  if (!model) throw new Error('Nenhum modelo Ollama selecionado.');
  const numCtx = isCloudModel(model)
    ? Math.max(getGenerationContextTokens(model), OLLAMA_HELP_CONTEXT_TOKENS)
    : OLLAMA_HELP_CONTEXT_TOKENS;
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'Você é um assistente experiente em escotismo (UEB) e no app Paxtu AutoPlanner. Responda em português brasileiro, de forma direta e prática, em até 3 parágrafos. Use o contexto para fundamentar.',
      },
      { role: 'user', content: `CONTEXTO DO APP:\n${context}\n\nPERGUNTA:\n${question}` },
    ],
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      temperature: 0.5,
      num_ctx: numCtx,
      num_predict: OLLAMA_HELP_OUTPUT_TOKENS,
    },
  };
  const r = await httpRequest('POST', `${getBaseUrl()}/api/chat`, body, chatTimeoutFor(model));
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}: ${r.error || r.body}`);
  const data = parseChatBody(r.body);
  return contentOf(data);
};

// ─── Geração em PARTES ──────────────────────────────────────────────────────

const buildSkeletonPrompt = (
  params: GeneratorParams & { context?: { sectionName: string; groupName: string } }
): { system: string; user: string } => {
  const n = params.activityCount || 3;
  const manuais = buildManuaisContextForBranch(params.branch);
  const system = [
    SYSTEM_BASE,
    'Você está na FASE 1: esqueleto do roteiro (sem detalhar cada atividade).',
    'Distribua os objetivos entre as atividades. A soma de durationMinutes = duração total.',
    'Cada activity.progressionObjective deve citar o código do objetivo (ex: B5.F2) quando houver.',
  ].join('\n');

  const user = [
    commonBrief(params),
    '',
    'MANUAIS DE REFERÊNCIA (só para orientar o tema; não invente citações longas ainda):',
    manuais,
    '',
    `Crie o esqueleto com cerca de ${n} atividades.`,
    'JSON EXATO:',
    '{',
    '  "theme": "tema curto 3-6 palavras",',
    '  "fundoDeCena": "narrativa global 2-4 frases",',
    '  "preparacaoChefia": "o que preparar antes (3+ linhas)",',
    '  "generalNotes": "dicas gerais e segurança",',
    '  "educationalRationale": "por que estas atividades batem nos objetivos (3+ linhas)",',
    `  "totalDuration": ${params.totalDuration},`,
    '  "activities": [',
    '    {',
    '      "title": "nome criativo",',
    '      "durationMinutes": 30,',
    '      "educationalArea": "Físico|Intelectual|Caráter|Afetivo|Social|Espiritual",',
    '      "progressionObjective": "COD — descrição curta",',
    '      "objectiveCodes": ["COD"]',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  return { system, user };
};

const buildActivityDetailPrompt = (
  params: GeneratorParams & { context?: { sectionName: string; groupName: string } },
  skeleton: PlanSkeleton,
  activity: PlanSkeletonActivity,
  index: number,
  total: number
): { system: string; user: string } => {
  const manuais = buildManuaisContextForBranch(params.branch);
  const system = [
    SYSTEM_BASE,
    `Você está na FASE 2: detalhar a atividade ${index + 1} de ${total} do roteiro.`,
    'Não invente outras atividades. Foque só nesta. Seja rico e prático para a chefia conduzir.',
  ].join('\n');

  const user = [
    commonBrief(params),
    '',
    `TEMA DO ROTEIRO: ${skeleton.theme}`,
    `FUNDO DE CENA GLOBAL: ${skeleton.fundoDeCena || ''}`,
    '',
    `ATIVIDADE A DETALHAR (${index + 1}/${total}):`,
    JSON.stringify(activity, null, 2),
    '',
    'MANUAIS:',
    manuais,
    '',
    'JSON EXATO desta atividade (um objeto, não array):',
    '{',
    `  "title": ${JSON.stringify(activity.title)},`,
    `  "durationMinutes": ${activity.durationMinutes},`,
    `  "educationalArea": ${JSON.stringify(activity.educationalArea)},`,
    '  "description": "regras detalhadas, mínimo 4 linhas",',
    '  "fundoDeCena": "como encaixa na narrativa global",',
    '  "materials": ["item com quantidade", "..."],',
    `  "progressionObjective": ${JSON.stringify(activity.progressionObjective)},`,
    '  "instrucaoChefia": "passo-a-passo com dicas de tempo e segurança",',
    '  "objetivoEspecifico": "Ao final, o jovem será capaz de...",',
    '  "manualReferencia": "Manual X, cap/seção",',
    '  "preparacaoPrevia": ["preparar ..."],',
    '  "evaluation": {',
    '    "acompanhamento": "...",',
    '    "avaliacaoJovens": "...",',
    '    "avaliacaoChefia": "...",',
    '    "requisitosObservaveis": ["..."],',
    '    "criteriosDeAceite": ["..."],',
    '    "evidenciasSugeridas": ["..."]',
    '  }',
    '}',
  ].join('\n');

  return { system, user };
};

const buildStudyGuidePrompt = (
  params: GeneratorParams,
  skeleton: PlanSkeleton,
  activity: Activity
): { system: string; user: string } => {
  const manuais = buildManuaisContextForBranch(params.branch);
  const system = [
    SYSTEM_BASE,
    'Você está na FASE 3: guia de estudo para UMA atividade (conceptExplainer + teachingTips).',
  ].join('\n');

  const user = [
    `Ramo: ${params.branch}. Tema do roteiro: ${skeleton.theme}.`,
    `Atividade: ${activity.title}`,
    `Descrição: ${activity.description}`,
    `Objetivo: ${activity.progressionObjective}`,
    `Manual já citado: ${activity.manualReferencia || '—'}`,
    '',
    'MANUAIS:',
    manuais,
    '',
    'JSON EXATO:',
    '{',
    `  "activityTitle": ${JSON.stringify(activity.title)},`,
    '  "conceptExplainer": "explicação teórica aprofundada, mínimo 6 linhas",',
    '  "teachingTips": "3-5 dicas didáticas práticas",',
    '  "searchQueriesUsed": ["termo 1", "termo 2"]',
    '}',
  ].join('\n');

  return { system, user };
};

const mergeActivity = (skel: PlanSkeletonActivity, detail: ActivityDetailPayload | null): Activity => {
  const evaluation = detail?.evaluation
    ? {
        acompanhamento: detail.evaluation.acompanhamento || '',
        avaliacaoJovens: detail.evaluation.avaliacaoJovens || '',
        avaliacaoChefia: detail.evaluation.avaliacaoChefia || '',
        requisitosObservaveis: detail.evaluation.requisitosObservaveis || [],
        criteriosDeAceite: detail.evaluation.criteriosDeAceite || [],
        evidenciasSugeridas: detail.evaluation.evidenciasSugeridas || [],
      }
    : emptyEvaluation();

  return {
    title: detail?.title || skel.title,
    durationMinutes: detail?.durationMinutes ?? skel.durationMinutes,
    educationalArea: (detail?.educationalArea || skel.educationalArea || 'Intelectual') as Activity['educationalArea'],
    description:
      detail?.description ||
      `Atividade "${skel.title}" vinculada a ${skel.progressionObjective}. (Detalhe automático incompleto — revise com a chefia.)`,
    materials: detail?.materials?.length ? detail.materials : ['Materiais a definir pela chefia'],
    progressionObjective: detail?.progressionObjective || skel.progressionObjective,
    fundoDeCena: detail?.fundoDeCena,
    instrucaoChefia: detail?.instrucaoChefia,
    objetivoEspecifico: detail?.objetivoEspecifico,
    manualReferencia: detail?.manualReferencia,
    preparacaoPrevia: detail?.preparacaoPrevia,
    evaluation,
  };
};

const fallbackStudy = (activity: Activity): StudyItem => ({
  activityTitle: activity.title,
  conceptExplainer: `Conceitos relacionados a: ${activity.progressionObjective || activity.title}. Complemente com o manual citado na atividade.`,
  teachingTips: 'Use demonstração, prática em pares e feedback imediato. Adapte ao ritmo da seção.',
  searchQueriesUsed: [activity.title, activity.progressionObjective].filter(Boolean) as string[],
});

// ─── Ciclo de programa (também em partes) ───────────────────────────────────

export interface OllamaCycleMeeting {
  theme: string;
  generalNotes: string;
  progressionObjective: string;
  acompanhamento?: string;
  avaliacaoJovens?: string;
  avaliacaoChefia?: string;
  requisitosObservaveis?: string[];
  criteriosDeAceite?: string[];
}

export interface OllamaMeetingCycle {
  id: string;
  theme: string;
  rational: string;
  meetings: OllamaCycleMeeting[];
}

export const generateScoutCycle = async (params: {
  branch: string;
  cycleTheme: string;
  meetingCount: number;
  objectives: string[];
  customInstruction?: string;
  modelId?: string;
}): Promise<OllamaMeetingCycle> => {
  const config = getAppConfig();
  const model = params.modelId || config?.ollamaModel || '';
  if (!model) throw new Error('Nenhum modelo Ollama selecionado.');

  const notifyProgress = (message: string) => {
    window.dispatchEvent(
      new CustomEvent('paxtu:llm-progress', { detail: { provider: 'ollama', message, model } })
    );
  };

  const n = Math.max(1, Math.min(params.meetingCount || 4, 20));
  const objs = params.objectives.map(o => `- ${o}`).join('\n');

  // Fase A: esqueleto do ciclo
  const skeleton = await callOllamaChatForJson<{
    theme: string;
    rational: string;
    meetings: Array<{ theme: string; progressionObjective: string; generalNotes?: string }>;
  }>(
    {
      model,
      system: SYSTEM_BASE + '\nFase A: esqueleto do CICLO (só títulos e objetivos por reunião).',
      user: [
        `Ramo: ${params.branch}. Tema do ciclo: ${params.cycleTheme}.`,
        `Quantidade de reuniões: ${n}.`,
        'Objetivos a distribuir (não repita o mesmo em mais de 2 reuniões):',
        objs,
        params.customInstruction ? `Instrução especial: ${params.customInstruction}` : '',
        '',
        'JSON:',
        '{"theme":"...","rational":"estratégia do ciclo","meetings":[{"theme":"...","progressionObjective":"COD","generalNotes":"1 frase"}]}',
      ].filter(Boolean).join('\n'),
      numPredict: 6_144,
    },
    'Ciclo fase A — esqueleto',
    notifyProgress
  );

  const meetingsOutline = (skeleton.meetings || []).slice(0, n);
  while (meetingsOutline.length < n) {
    meetingsOutline.push({
      theme: `Reunião ${meetingsOutline.length + 1}`,
      progressionObjective: params.objectives[meetingsOutline.length % Math.max(1, params.objectives.length)] || '',
      generalNotes: '',
    });
  }

  const meetings: OllamaCycleMeeting[] = [];
  for (let i = 0; i < meetingsOutline.length; i++) {
    const m = meetingsOutline[i];
    try {
      const detailed = await callOllamaChatForJson<OllamaCycleMeeting>(
        {
          model,
          system: SYSTEM_BASE + `\nFase B: detalhar reunião ${i + 1}/${meetingsOutline.length} do ciclo.`,
          user: [
            `Ciclo: ${skeleton.theme || params.cycleTheme}. Ramo: ${params.branch}.`,
            `Reunião: ${m.theme}. Objetivo: ${m.progressionObjective}.`,
            `Notas iniciais: ${m.generalNotes || ''}`,
            '',
            'JSON da reunião:',
            '{',
            `  "theme": ${JSON.stringify(m.theme)},`,
            '  "generalNotes": "narrativa e dinâmica da reunião",',
            `  "progressionObjective": ${JSON.stringify(m.progressionObjective)},`,
            '  "acompanhamento": "...",',
            '  "avaliacaoJovens": "...",',
            '  "avaliacaoChefia": "...",',
            '  "requisitosObservaveis": ["..."],',
            '  "criteriosDeAceite": ["..."]',
            '}',
          ].join('\n'),
          numPredict: 4_096,
        },
        `Ciclo fase B — reunião ${i + 1}`,
        notifyProgress
      );
      meetings.push({
        theme: detailed.theme || m.theme,
        generalNotes: detailed.generalNotes || m.generalNotes || '',
        progressionObjective: detailed.progressionObjective || m.progressionObjective,
        acompanhamento: detailed.acompanhamento || '',
        avaliacaoJovens: detailed.avaliacaoJovens || '',
        avaliacaoChefia: detailed.avaliacaoChefia || '',
        requisitosObservaveis: detailed.requisitosObservaveis || [],
        criteriosDeAceite: detailed.criteriosDeAceite || [],
      });
    } catch {
      meetings.push({
        theme: m.theme,
        generalNotes: m.generalNotes || '',
        progressionObjective: m.progressionObjective,
        acompanhamento: '',
        avaliacaoJovens: '',
        avaliacaoChefia: '',
        requisitosObservaveis: [],
        criteriosDeAceite: [],
      });
    }
  }

  return {
    id: Date.now().toString(),
    theme: skeleton.theme || params.cycleTheme,
    rational: skeleton.rational || '',
    meetings,
  };
};

export const generateScoutPlan = async (
  params: GeneratorParams & { context?: { sectionName: string; groupName: string } }
): Promise<MeetingPlan> => {
  const config = getAppConfig();
  const model = params.modelId || config?.ollamaModel || '';
  if (!model) throw new Error('Nenhum modelo Ollama selecionado. Configure em Configurações.');

  const reachable = await isReachable();
  if (!reachable.ok) {
    throw new Error(
      `Ollama indisponível: ${reachable.error}\n\nVerifique se o serviço está rodando e tente novamente.`
    );
  }

  const startTime = Date.now();
  const notifyProgress = (message: string) => {
    window.dispatchEvent(
      new CustomEvent('paxtu:llm-progress', { detail: { provider: 'ollama', message, model } })
    );
  };

  const contextTokens = getGenerationContextTokens(model);
  const outputTokens = getGenerationOutputTokens(model);
  const cloud = isCloudModel(model);
  notifyProgress(
    `Geração em partes com ${model} · contexto ${contextTokens} · saída/parte ${outputTokens}` +
      (cloud ? ' · cloud' : ' · local')
  );

  // ── FASE 1: esqueleto ────────────────────────────────────────────────────
  const skelPrompt = buildSkeletonPrompt(params);
  const skeleton = await callOllamaChatForJson<PlanSkeleton>(
    {
      model,
      system: skelPrompt.system,
      user: skelPrompt.user,
      numPredict: Math.min(outputTokens, 8_192),
      temperature: 0.45,
    },
    'Fase 1/3 — esqueleto',
    notifyProgress
  );

  if (!skeleton.activities?.length) {
    throw new Error('O esqueleto não trouxe atividades. Tente novamente ou reduza objetivos.');
  }

  // Normaliza duração se o modelo errar a soma
  skeleton.totalDuration = skeleton.totalDuration || params.totalDuration;
  const sumDur = skeleton.activities.reduce((s, a) => s + (Number(a.durationMinutes) || 0), 0);
  if (sumDur > 0 && Math.abs(sumDur - params.totalDuration) > 5) {
    // redistribui proporcionalmente
    const scale = params.totalDuration / sumDur;
    let acc = 0;
    skeleton.activities.forEach((a, i) => {
      if (i === skeleton.activities.length - 1) {
        a.durationMinutes = Math.max(5, params.totalDuration - acc);
      } else {
        a.durationMinutes = Math.max(5, Math.round((Number(a.durationMinutes) || 15) * scale));
        acc += a.durationMinutes;
      }
    });
    skeleton.totalDuration = params.totalDuration;
  }

  notifyProgress(
    `Esqueleto OK: "${skeleton.theme}" com ${skeleton.activities.length} atividade(s). Detalhando…`
  );

  // ── FASE 2: cada atividade ───────────────────────────────────────────────
  const detailedActivities: Activity[] = [];
  for (let i = 0; i < skeleton.activities.length; i++) {
    const sk = skeleton.activities[i];
    const actPrompt = buildActivityDetailPrompt(
      params,
      skeleton,
      sk,
      i,
      skeleton.activities.length
    );
    let detail: ActivityDetailPayload | null = null;
    try {
      detail = await callOllamaChatForJson<ActivityDetailPayload>(
        {
          model,
          system: actPrompt.system,
          user: actPrompt.user,
          numPredict: outputTokens,
          temperature: 0.4,
        },
        `Fase 2/3 — atividade ${i + 1}/${skeleton.activities.length} (${sk.title})`,
        notifyProgress
      );
    } catch (e: any) {
      notifyProgress(
        `Atividade ${i + 1} incompleta (${e?.message?.slice(0, 80) || 'erro'}); usando esqueleto.`
      );
    }
    detailedActivities.push(mergeActivity(sk, detail));
  }

  // ── FASE 3: study guides ─────────────────────────────────────────────────
  const studyGuide: StudyItem[] = [];
  for (let i = 0; i < detailedActivities.length; i++) {
    const act = detailedActivities[i];
    const sgPrompt = buildStudyGuidePrompt(params, skeleton, act);
    try {
      const item = await callOllamaChatForJson<StudyItem>(
        {
          model,
          system: sgPrompt.system,
          user: sgPrompt.user,
          numPredict: Math.min(outputTokens, 6_144),
          temperature: 0.35,
        },
        `Fase 3/3 — estudo ${i + 1}/${detailedActivities.length}`,
        notifyProgress
      );
      studyGuide.push({
        activityTitle: item.activityTitle || act.title,
        conceptExplainer: item.conceptExplainer || fallbackStudy(act).conceptExplainer,
        teachingTips: item.teachingTips || fallbackStudy(act).teachingTips,
        searchQueriesUsed: item.searchQueriesUsed?.length
          ? item.searchQueriesUsed
          : fallbackStudy(act).searchQueriesUsed,
      });
    } catch {
      notifyProgress(`Guia de estudo ${i + 1} incompleto; usando fallback curto.`);
      studyGuide.push(fallbackStudy(act));
    }
  }

  const plan: MeetingPlan = {
    theme: skeleton.theme || params.narrativeTheme || 'Roteiro da reunião',
    fundoDeCena: skeleton.fundoDeCena,
    preparacaoChefia: skeleton.preparacaoChefia,
    generalNotes: skeleton.generalNotes || '',
    educationalRationale: skeleton.educationalRationale,
    totalDuration: params.totalDuration,
    activities: detailedActivities,
    studyGuide,
    branch: params.branch,
    sources: [],
    createdAt: new Date().toISOString(),
    id: Date.now().toString(),
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  notifyProgress(
    `Plano agregado em ${elapsed}s (${detailedActivities.length} atividades + ${studyGuide.length} guias).`
  );

  return normalizePlanForUse(plan);
};
