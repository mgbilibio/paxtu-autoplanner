// Implementação de LlmProvider para Ollama (LLM local).
// API: https://github.com/ollama/ollama/blob/main/docs/api.md
//
// Funciona offline, dados não saem da máquina. Usuário precisa instalar Ollama
// (https://ollama.com/download) e baixar um modelo (ex: ollama pull llama3.1:8b).

import { GeneratorParams, MeetingPlan } from '../types';
import { getAppConfig } from './storageService';
import { buildManuaisContextForBranch } from '../data/manuaisReferencia';
import { normalizePlanForUse } from './planNormalizationService';
import { normalizeOllamaBaseUrl } from './ollamaUrlSecurity';
import { extractJson } from './llmJson';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 2000;
const OLLAMA_GENERATION_CONTEXT_TOKENS = 32768;
const OLLAMA_HELP_CONTEXT_TOKENS = 16384;
const OLLAMA_GENERATION_OUTPUT_TOKENS = 12000;
const OLLAMA_HELP_OUTPUT_TOKENS = 2048;
const OLLAMA_KEEP_ALIVE = '20m';

const getBaseUrl = (): string => {
  const config = getAppConfig();
  return normalizeOllamaBaseUrl(config?.ollamaBaseUrl) || DEFAULT_BASE_URL;
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const getGenerationContextTokens = (): number => {
  const config = getAppConfig();
  return clampNumber(
    config?.ollamaGenerationContext,
    OLLAMA_GENERATION_CONTEXT_TOKENS,
    4096,
    65536
  );
};

const getGenerationOutputTokens = (): number => {
  const config = getAppConfig();
  return clampNumber(
    config?.ollamaGenerationOutput,
    OLLAMA_GENERATION_OUTPUT_TOKENS,
    2048,
    24000
  );
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Roteador HTTP: usa IPC do Electron quando disponível (evita CORS), senão fetch direto.
// Ollama por padrão bloqueia chamadas cross-origin do renderer; main process não tem essa restrição.
// timeoutMs (opcional) propaga ao IPC/fetch; chamadas de checagem usam timeout curto.
const httpRequest = async (method: string, url: string, body?: any, timeoutMs?: number): Promise<{ ok: boolean; status: number; body: string; error?: string }> => {
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
  if (window.fileSystem?.ollamaRequest) {
    return await window.fileSystem.ollamaRequest(method, url, bodyStr, timeoutMs);
  }
  // Fallback para browser puro (dev sem Electron). Usuário precisa de OLLAMA_ORIGINS=*.
  const r = await fetchWithTimeout(url, {
    method,
    headers: bodyStr ? { 'Content-Type': 'application/json' } : undefined,
    body: bodyStr,
  }, timeoutMs ?? 5 * 60 * 1000);
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
};

// Extração robusta de JSON: modelos open-source às vezes envelopam em markdown ou prosa.
export interface OllamaTagsResponse {
  models: Array<{ name: string; modified_at: string; size: number }>;
}

export const isReachable = async (): Promise<{ ok: boolean; error?: string }> => {
  const url = `${getBaseUrl()}/api/tags`;
  // Checagem barata: GET /api/tags com timeout curto (~2.5s) para não travar a UI.
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
  // Corpo pode vir malformado (proxy, HTML de erro); falha vira lista vazia + log.
  let data: OllamaTagsResponse;
  try {
    data = JSON.parse(r.body) as OllamaTagsResponse;
  } catch (e) {
    console.error('Falha ao parsear /api/tags do Ollama:', r.body);
    return [];
  }
  if (!data?.models) return [];
  return data.models.map(m => m.name).sort();
};

interface OllamaChatResponse {
  message?: { content: string };
  response?: string;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

const buildPrompt = (params: GeneratorParams & { context?: { sectionName: string; groupName: string } }): { system: string; user: string } => {
  const objectivesList = params.objectives.map((obj, i) => {
    const codePrefix = obj.code ? `[CÓDIGO: ${obj.code}]` : `[Sem Código]`;
    let richContext = '';
    if (obj.requirementsContext) richContext += `\n   ⚠️ REQUISITOS: ${obj.requirementsContext}`;
    if ((obj as any).specialtyData?.requirements) {
      richContext += `\n   REQUISITOS GERAIS: ${(obj as any).specialtyData.requirements.join('; ')}`;
    }
    const espTag = obj.isSpecialty ? ` [ESPECIALIDADE NÍVEL ${obj.specialtyLevel || 1}]` : '';
    return `- Item ${i + 1}: ${codePrefix}${espTag} ${obj.description}${richContext}`;
  }).join('\n');

  const contextStr = params.context
    ? `Você está planejando para a seção "${params.context.sectionName}" do grupo "${params.context.groupName}".`
    : '';

  const manuaisContext = buildManuaisContextForBranch(params.branch);

  const system = [
    'Você é um Chefe Escoteiro Sênior experiente, atuando dentro do sistema PAXTU da União dos Escoteiros do Brasil (UEB).',
    'Sua tarefa é gerar um Roteiro de Reunião RICO E DETALHADO em JSON válido. O roteiro precisa ser pronto para impressão e uso direto na sede.',
    '',
    '=== REGRAS ESTRITAS DE FORMATAÇÃO ===',
    '1. Retorne APENAS um objeto JSON. Sem texto antes, sem texto depois, sem markdown, sem comentários.',
    '2. A soma de durationMinutes deve ser EXATAMENTE igual à duração total informada.',
    '3. Cada activity deve ter UM item correspondente em studyGuide com mesmo title.',
    '4. Cada activity DEVE endereçar pelo menos um dos OBJETIVOS OBRIGATÓRIOS — preencha "progressionObjective" com o código exato (ex: "B5.F2") e descrição curta.',
    '5. Cada activity DEVE trazer acompanhamento e avaliação: jovens avaliando jovens/autoavaliação, chefia avaliando, requisitos observáveis e critérios de aceite.',
    '',
    '=== ESTRUTURA OBRIGATÓRIA DO JSON ===',
    '{',
    '  "theme": "Tema narrativo curto (3-6 palavras)",',
    '  "fundoDeCena": "Narrativa que conecta TODAS as atividades em uma história/missão coerente. Ex: \'Os escoteiros foram chamados pela Defesa Civil para uma simulação de resgate em montanha. Cada estação treina uma habilidade necessária.\' Mínimo 2 frases.",',
    '  "totalDuration": NUMERO,',
    '  "preparacaoChefia": "Resumo do que a chefia precisa fazer ANTES da reunião (chegar mais cedo para montar X, imprimir Y mapas, separar Z materiais). Mínimo 3 linhas.",',
    '  "generalNotes": "Dicas de condução geral, atenções de segurança, ritmo da reunião",',
    '  "educationalRationale": "Justificativa pedagógica detalhada: POR QUE estas atividades atingem os objetivos selecionados. Conecte cada atividade ao propósito educativo do bloco/especialidade. Mínimo 4 linhas.",',
    '  "activities": [',
    '    {',
    '      "title": "Nome criativo da atividade",',
    '      "durationMinutes": 30,',
    '      "educationalArea": "Físico|Intelectual|Caráter|Afetivo|Social|Espiritual",',
    '      "description": "Regras DETALHADAS de como a atividade acontece — o suficiente para um chefe novo conduzir sem ajuda. Mínimo 4 linhas.",',
    '      "fundoDeCena": "Como esta atividade específica se encaixa na narrativa global. Ex: \'Nesta estação, os escoteiros recebem o mapa codificado.\'",',
    '      "materials": ["Item 1 com quantidade", "Item 2 com quantidade", "..."],',
    '      "progressionObjective": "B5.F2 — Aplicar nós direito, escota, volta do fiel",',
    '      "instrucaoChefia": "Passo-a-passo de execução para o chefe que vai conduzir. Inclui dicas de tempo, sinais de problema, variações conforme idade/maturidade. Mínimo 3 passos.",',
    '      "objetivoEspecifico": "Ao final, espera-se que o jovem seja capaz de... (verbo de ação)",',
    '      "manualReferencia": "Manual do Escotista 2025, Cap.9, p.279 (Vida ao Ar Livre)",',
    '      "preparacaoPrevia": ["Imprimir mapas em A3", "Montar pista de cordas", "..."],',
    '      "evaluation": {',
    '        "acompanhamento": "O que observar durante a atividade, quando intervir e que evidências colher",',
    '        "avaliacaoJovens": "Perguntas ou dinâmica rápida para autoavaliação/avaliação por pares",',
    '        "avaliacaoChefia": "Como a chefia decide se o requisito foi demonstrado",',
    '        "requisitosObservaveis": ["comportamento ou entrega verificável 1", "comportamento ou entrega verificável 2"],',
    '        "criteriosDeAceite": ["critério mínimo claro para marcar o item como cumprido"],',
    '        "evidenciasSugeridas": ["foto do produto final", "anotação na ficha do jovem"]',
    '      }',
    '    }',
    '  ],',
    '  "studyGuide": [',
    '    {',
    '      "activityTitle": "DEVE bater com title de uma activity",',
    '      "conceptExplainer": "Explicação teórica aprofundada — equivalente a 1 página de manual técnico. Mínimo 6 linhas.",',
    '      "teachingTips": "3-5 dicas didáticas práticas para aplicar com o ramo",',
    '      "searchQueriesUsed": ["termo 1 que daria boa busca", "termo 2"]',
    '    }',
    '  ]',
    '}',
    '',
    '=== MANUAIS DE REFERÊNCIA (use para enriquecer e amarrar) ===',
    manuaisContext,
    '',
    'Sempre que possível, em "manualReferencia" cite UM destes manuais com seção/capítulo aproximado.',
    'Em "conceptExplainer", se mencionar conceitos técnicos (nós, primeiros socorros, mística etc.), cite a fonte do manual.',
  ].join('\n');

  const user = [
    `Ramo: ${params.branch}.`,
    contextStr,
    `Duração total: ${params.totalDuration} minutos.`,
    `Quantidade sugerida de atividades: ${params.activityCount || 3}.`,
    `Quantidade de jovens (estimativa): ${params.participantsCount || 20}.`,
    `Tema narrativo solicitado: ${params.narrativeTheme || 'livre — invente um tema coerente com os objetivos'}.`,
    '',
    'OBJETIVOS OBRIGATÓRIOS (cada um deve ser endereçado por pelo menos uma atividade):',
    objectivesList,
    '',
    params.customInstruction ? `INSTRUÇÃO ESPECIAL: ${params.customInstruction}` : '',
    '',
    'Gere o roteiro AGORA. Lembre-se: SOMENTE JSON. Cada atividade DEVE ter description detalhada (não 1 frase), instrucaoChefia com passo-a-passo, materials específicos com quantidades, manualReferencia e evaluation completo.',
  ].filter(Boolean).join('\n');

  return { system, user };
};

const callOllamaChat = async (model: string, system: string, user: string): Promise<OllamaChatResponse> => {
  const url = `${getBaseUrl()}/api/chat`;
  const numCtx = getGenerationContextTokens();
  const numPredict = getGenerationOutputTokens();
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
    format: 'json',
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      temperature: 0.5,
      num_ctx: numCtx,
      num_predict: numPredict,
    },
  };
  const r = await httpRequest('POST', url, body);
  if (!r.ok) throw new Error(`Ollama respondeu HTTP ${r.status}: ${r.body}${r.error ? ' | ' + r.error : ''}`);
  return JSON.parse(r.body) as OllamaChatResponse;
};

// Q&A genérico para Painel de Ajuda — sem JSON estruturado, resposta livre.
export const askOllama = async (question: string, context: string, modelId?: string): Promise<string> => {
  const config = getAppConfig();
  const model = modelId || config?.ollamaModel || '';
  if (!model) throw new Error('Nenhum modelo Ollama selecionado.');
  const url = `${getBaseUrl()}/api/chat`;
  const body = {
    model,
    messages: [
      { role: 'system', content: 'Você é um assistente experiente em escotismo (UEB) e no app Paxtu AutoPlanner. Responda em português brasileiro, de forma direta e prática, em até 3 parágrafos. Use o contexto para fundamentar.' },
      { role: 'user', content: `CONTEXTO DO APP:\n${context}\n\nPERGUNTA:\n${question}` },
    ],
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      temperature: 0.5,
      num_ctx: OLLAMA_HELP_CONTEXT_TOKENS,
      num_predict: OLLAMA_HELP_OUTPUT_TOKENS,
    },
  };
  const r = await httpRequest('POST', url, body);
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}: ${r.error || r.body}`);
  const data = JSON.parse(r.body) as OllamaChatResponse;
  return data.message?.content || data.response || '';
};

export const generateScoutPlan = async (params: GeneratorParams & { context?: { sectionName: string; groupName: string } }): Promise<MeetingPlan> => {
  const config = getAppConfig();
  const model = params.modelId || config?.ollamaModel || '';
  if (!model) throw new Error('Nenhum modelo Ollama selecionado. Configure em Configurações.');

  // Verifica se Ollama está acessível antes de tentar gerar (evita esperar 5min em vão).
  const reachable = await isReachable();
  if (!reachable.ok) {
    throw new Error(`Ollama indisponível: ${reachable.error}\n\nVerifique se o serviço está rodando e tente novamente.`);
  }

  const startTime = Date.now();
  const { system, user } = buildPrompt(params);

  // Notifica UI sobre progresso (evento global capturado pelo App.tsx para mostrar banner).
  const notifyProgress = (message: string) => {
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { provider: 'ollama', message, model } }));
  };

  const contextTokens = getGenerationContextTokens();
  const outputTokens = getGenerationOutputTokens();
  notifyProgress(`Carregando ${model} com contexto ${contextTokens} e saída ${outputTokens}. Pode levar alguns minutos.`);

  // Primeira tentativa
  let result = await callOllamaChat(model, system, user);
  let raw = result.message?.content || result.response || '';
  if (result.done_reason === 'length') {
    notifyProgress('Ollama atingiu limite de saída; tentando validar o JSON recebido.');
  }
  let parsed = extractJson<MeetingPlan>(raw);

  // Retry se JSON inválido
  if (!parsed) {
    notifyProgress(`Resposta inválida ou truncada. Tentando segunda vez com JSON mais compacto.`);
    const retryUser = `${user}\n\nATENÇÃO: sua resposta anterior NÃO foi um JSON válido. Reenvie SOMENTE o JSON, sem texto extra. Mantenha detalhes úteis, mas evite repetição.`;
    result = await callOllamaChat(model, system, retryUser);
    raw = result.message?.content || result.response || '';
    parsed = extractJson<MeetingPlan>(raw);
  }

  if (!parsed) {
    throw new Error(
      `Modelo "${model}" não retornou JSON válido após retry. ` +
      `Motivo informado: ${result.done_reason || 'não informado'}.\n\n` +
      `Sugestões:\n` +
      `1. Reduza a quantidade de objetivos ou atividades nesta geração\n` +
      `2. Use um modelo com contexto maior e boa saída JSON\n` +
      `3. Se houver erro de memória, use modelo menor ou reduza o contexto\n` +
      `4. Resposta bruta (primeiras 200 chars): "${raw.slice(0, 200)}"`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  notifyProgress(`Plano gerado em ${elapsed}s.`);

  parsed.branch = params.branch;
  parsed.sources = [];
  parsed.createdAt = new Date().toISOString();
  parsed.id = Date.now().toString();
  return normalizePlanForUse(parsed);
};
