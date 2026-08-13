import { GeneratorParams, MeetingPlan } from '../types';
import { getAppConfig } from './storageService';
import { extractJson } from './llmJson';
import { normalizePlanForUse } from './planNormalizationService';
import { getProgressionDetail } from './progressionDetailService';
import type { MeetingCycle } from './geminiService';

const XAI_API = 'https://api.x.ai/v1';
// Catálogo xAI (ago/2026): não há mais grok-3-mini / grok-4-fast (aposentados em mai/2026).
// grok-4.3 é o texto geral mais barato; se a listagem trouxer mini/fast/lite, preferimos isso.
export const DEFAULT_MODEL = 'grok-4.3';
export const FALLBACK_MODELS = ['grok-4.3', 'grok-4.20-0309-non-reasoning', 'grok-4.5'];

const isTextGrok = (id: string): boolean =>
  /^grok/i.test(id)
  && !/imagine|voice|image|video|tts|whisper|audio|embed/i.test(id)
  && !/multi-agent/i.test(id);

export const pickXaiFastModel = (models: string[], current?: string): string => {
  const text = models.filter(isTextGrok);
  const pool = text.length > 0 ? text : FALLBACK_MODELS;
  const cheap = pool.filter(id => /mini|fast|lite|4\.3/i.test(id));
  const cheapNonReason = cheap.filter(id => /non-reasoning/i.test(id) || !/reasoning/i.test(id));
  if (current && cheapNonReason.includes(current)) return current;
  if (current && cheap.includes(current)) return current;
  if (cheapNonReason.includes('grok-4.3')) return 'grok-4.3';
  if (cheapNonReason[0]) return cheapNonReason[0];
  if (cheap[0]) return cheap[0];
  return pool[0] || DEFAULT_MODEL;
};

const NO_KEY =
  'Informe sua chave xAI em Configurações (fica só neste navegador). Sem chave, o Grok não gera roteiros.';

const sanitize = (error: unknown): string =>
  String((error as Error)?.message || error || 'Desconhecido')
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer ***')
    .replace(/xai-[\w-]+/gi, '***');

export const resolveXaiKey = (): string | undefined => {
  const key = getAppConfig()?.xaiApiKey?.trim();
  return key || undefined;
};

export const isReachable = async (): Promise<{ ok: boolean; error?: string }> => {
  if (!resolveXaiKey()) return { ok: false, error: NO_KEY };
  return { ok: true };
};

const chat = async (userPrompt: string, modelId?: string): Promise<string> => {
  const apiKey = resolveXaiKey();
  if (!apiKey) throw new Error(NO_KEY);
  const model = modelId || getAppConfig()?.xaiOAuthModel || DEFAULT_MODEL;
  const response = await fetch(`${XAI_API}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content:
            'Você é um chefe escoteiro da UEB. Responda em português brasileiro. Quando pedirem JSON, devolva somente JSON válido, sem markdown.',
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`xAI HTTP ${response.status}: ${raw.slice(0, 180)}`);
  }
  const data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
};

const callJson = async <T,>(prompt: string, etapa: string, modelId?: string): Promise<T> => {
  let text = await chat(prompt, modelId);
  let parsed = extractJson<T>(text);
  if (parsed === null) {
    text = await chat(
      `${prompt}\n\nIMPORTANTE: responda SOMENTE com o JSON pedido, sem texto extra nem markdown.`,
      modelId,
    );
    parsed = extractJson<T>(text);
  }
  if (parsed === null) throw new Error(`A IA não retornou JSON válido na etapa "${etapa}".`);
  return parsed;
};

export const listModels = async (): Promise<string[]> => {
  const apiKey = resolveXaiKey();
  if (!apiKey) return FALLBACK_MODELS;
  try {
    const response = await fetch(`${XAI_API}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return FALLBACK_MODELS;
    const data = await response.json() as { data?: Array<{ id: string }> };
    const ids = (data.data || []).map(item => item.id).filter(id => id.toLowerCase().includes('grok'));
    return ids.length > 0 ? ids : FALLBACK_MODELS;
  } catch {
    return FALLBACK_MODELS;
  }
};

export const askXai = async (question: string, context: string, modelId?: string): Promise<string> => {
  if (!resolveXaiKey()) throw new Error(NO_KEY);
  return chat(
    `CONTEXTO DO APP:\n${context}\n\nPERGUNTA DO CHEFE:\n${question}\n\nResponda em até 3 parágrafos, direto e prático.`,
    modelId,
  );
};

export const generateScoutCycle = async (params: {
  branch: string;
  cycleTheme: string;
  meetingCount: number;
  objectives: string[];
  modelId?: string;
  customInstruction?: string;
  planningMode?: 'from_selection' | 'auto_link';
  catalogDigest?: string;
}): Promise<MeetingCycle> => {
  if (!resolveXaiKey()) throw new Error(NO_KEY);
  const mode =
    params.planningMode === 'from_selection' || params.planningMode === 'auto_link'
      ? params.planningMode
      : ((params.objectives?.length || 0) > 0 ? 'from_selection' : 'auto_link');
  const objs = (params.objectives || []).join('\n');
  const prompt = `
Você é um Chefe Escoteiro Sênior. Planeje um CICLO DE PROGRAMA para o Ramo ${params.branch}.
TEMA: ${params.cycleTheme}
REUNIÕES: ${params.meetingCount}
MODO: ${mode}
${mode === 'from_selection' ? `OBJETIVOS:\n${objs || '(nenhum)'}` : `PREFERÊNCIAS:\n${objs || '(nenhuma)'}`}
${params.catalogDigest || ''}
${params.customInstruction ? `INSTRUÇÃO: ${params.customInstruction}` : ''}
RETORNE APENAS JSON:
{"id":"ciclo","theme":"${params.cycleTheme}","rational":"...","meetings":[{"theme":"...","generalNotes":"...","progressionObjective":"...","acompanhamento":"...","avaliacaoJovens":"...","avaliacaoChefia":"...","requisitosObservaveis":["..."],"criteriosDeAceite":["..."]}]}
`;
  const parsed = await callJson<MeetingCycle>(prompt, 'ciclo', params.modelId);
  parsed.id = parsed.id || Date.now().toString();
  parsed.meetings = parsed.meetings || [];
  return parsed;
};

export const generateScoutPlan = async (
  params: GeneratorParams & { context?: { sectionName: string; groupName: string } },
): Promise<MeetingPlan> => {
  if (!resolveXaiKey()) throw new Error(NO_KEY);
  const planningMode =
    params.planningMode === 'from_selection' || params.planningMode === 'auto_link'
      ? params.planningMode
      : ((params.objectives?.length || 0) > 0 ? 'from_selection' : 'auto_link');
  const objectivesList = (params.objectives || []).map((obj, i) => {
    const code = obj.code ? `[CÓDIGO: ${obj.code}]` : '[Sem Código]';
    return `- Item ${i + 1}: ${code} ${obj.description}`;
  }).join('\n');
  const manuais = (params.objectives || [])
    .map(obj => (obj.code ? getProgressionDetail(obj.code) : null))
    .filter(Boolean);
  let userPromptBase = `
Planeje para o Ramo ${params.branch}.
${params.context ? `Seção "${params.context.sectionName}" do Grupo "${params.context.groupName}".` : ''}
Modo: ${planningMode}.
Duração total: ${params.totalDuration} min. Atividades: ${params.activityCount || 3}. Jovens: ${params.participantsCount || 20}.
Tema: ${params.narrativeTheme || 'livre'}.
`;
  if (planningMode === 'from_selection') userPromptBase += `\nOBJETIVOS:\n${objectivesList || '(nenhum)'}\n`;
  else {
    userPromptBase += `\nAUTO_LINK: invente atividades e amarre CÓDIGOS EXATOS do catálogo.\n`;
    if (objectivesList) userPromptBase += `\nPREFERÊNCIAS:\n${objectivesList}\n`;
    if (params.catalogDigest) userPromptBase += `\n${params.catalogDigest}\n`;
  }
  if (params.customInstruction) userPromptBase += `\nINSTRUÇÃO:\n${params.customInstruction}\n`;
  if (manuais.length) userPromptBase += `\nBIBLIOTECA:\n${manuais.join('\n')}\n`;

  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 1/3: Gerando estrutura...' } }));
  const planStructure = await callJson<any>(`
Você é um Chefe Escoteiro Sênior da UEB. Crie a ESTRUTURA de um roteiro.
Retorne APENAS JSON:
{"theme":"...","fundoDeCena":"...","preparacaoChefia":"...","generalNotes":"...","educationalRationale":"...","activities":[{"title":"...","durationMinutes":30,"educationalArea":"Físico","progressionObjective":"[CÓDIGO]"}]}
CONTEXTO:\n${userPromptBase}
`, 'estrutura', params.modelId);

  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 2/3: Detalhando atividades...' } }));
  const detailsArr = await callJson<any[]>(`
Estrutura: ${JSON.stringify(planStructure)}
Para CADA atividade, devolva um array JSON com description, materials, instrucaoChefia, objetivoEspecifico, fundoDeCena, evaluation.
CONTEXTO:\n${userPromptBase}
`, 'detalhamento', params.modelId);
  const details = Array.isArray(detailsArr) ? detailsArr : [];
  planStructure.activities = (planStructure.activities || []).map((act: any, idx: number) => ({
    ...act,
    ...(details.find((d: any) => d?.title === act.title) || details[idx] || {}),
  }));

  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 3/3: Gerando guia de estudo...' } }));
  planStructure.studyGuide = await callJson<any[]>(`
Crie o GUIA DE ESTUDO para: ${JSON.stringify((planStructure.activities || []).map((a: any) => a.title))}
Array JSON: [{"activityTitle":"...","conceptExplainer":"...","teachingTips":"...","searchQueriesUsed":["..."]}]
`, 'guia de estudo', params.modelId);

  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Plano gerado com sucesso!' } }));
  planStructure.totalDuration = params.totalDuration;
  planStructure.branch = params.branch;
  planStructure.sources = [];
  planStructure.createdAt = new Date().toISOString();
  planStructure.id = Date.now().toString();
  return normalizePlanForUse(planStructure as MeetingPlan);
};

export const xaiErrorMessage = (error: unknown): string => sanitize(error);
