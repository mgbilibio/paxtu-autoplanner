import { Activity, GenerateScoutActivityParams, GeneratorParams, MeetingPlan } from '../types';
import { getAppConfig } from './storageService';
import { extractJson } from './llmJson';
import { normalizeActivityForUse, normalizePlanForUse } from './planNormalizationService';
import { getProgressionDetail } from './progressionDetailService';
import type { MeetingCycle } from './geminiService';
import { attachmentsToPromptBlock } from './planAttachments';
import { activityBriefsPromptBlock, buildSingleActivityPrompt, PRACTICAL_CONTENT_RULES } from './activityBriefs';
import { chunkArray, DETAIL_BATCH_SIZE, mergeActivityDetails, STUDY_GUIDE_BATCH_SIZE } from './llmPlanBatches';
import type { PlanAttachment } from './planAttachments';
import { isWebApp } from './platform';
import { explainXaiWebAccessGap, getXaiBrowserStatus, resolveXaiBrowserBearer } from './xaiOAuthSession';
import { describeXaiApiFailure, xaiDirectApiUrl } from './xaiOAuthConfig';

const isTextLanguageModel = (id: string): boolean =>
  Boolean(id.trim())
  && !/imagine|voice|image|video|tts|whisper|audio|embed/i.test(id)
  && !/multi-agent/i.test(id);

export const pickXaiFastModel = (models: string[], current?: string): string => {
  const text = models.filter(isTextLanguageModel);
  if (current && text.includes(current)) return current;
  const economical = text.find(id => /mini|fast|lite|non-reasoning/i.test(id));
  return economical || text[0] || '';
};

const NO_KEY =
  'Entre com sua conta X/Grok ou informe uma chave xAI em Configurações.';

const sanitize = (error: unknown): string =>
  String((error as Error)?.message || error || 'Desconhecido')
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer ***')
    .replace(/xai-[\w-]+/gi, '***');

export const resolveXaiKey = (): string | undefined => {
  const key = getAppConfig()?.xaiApiKey?.trim();
  return key || undefined;
};

const hasXaiOAuthBridge = (): boolean => Boolean(window.fileSystem?.xaiOAuthRequest);

const requestWithGrokOAuth = async (prompt: string, modelId?: string): Promise<string> => {
  const request = window.fileSystem?.xaiOAuthRequest;
  if (!request) throw new Error(NO_KEY);
  const result = await request(prompt, modelId);
  if (!result.ok) throw new Error(result.error || 'Grok OAuth não retornou resposta.');
  return result.body;
};

export const isReachable = async (): Promise<{ ok: boolean; error?: string }> => {
  if (resolveXaiKey()) return { ok: true };
  const gap = explainXaiWebAccessGap(false);
  if (!gap) return { ok: true };
  return { ok: false, error: gap };
};

const chat = async (userPrompt: string, modelId?: string, temperature = 0.5): Promise<string> => {
  const apiKey = resolveXaiKey();
  if (!apiKey && hasXaiOAuthBridge()) return requestWithGrokOAuth(userPrompt, modelId);
  const bearer = apiKey || (isWebApp() ? await resolveXaiBrowserBearer() : undefined);
  if (!bearer) throw new Error(NO_KEY);
  const configuredModel = modelId?.trim() || getAppConfig()?.xaiOAuthModel?.trim();
  const model = pickXaiFastModel(await listModels(), configuredModel);
  if (!model) throw new Error('A xAI não retornou nenhum modelo de linguagem disponível para esta conta.');
  let response: Response;
  try {
    response = await fetch(xaiDirectApiUrl('chat'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
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
  } catch (error) {
    throw new Error(isWebApp() ? describeXaiApiFailure(error) : sanitize(error));
  }
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`xAI HTTP ${response.status}: ${raw.slice(0, 180)}`);
  }
  const data = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
};

const callJson = async <T,>(prompt: string, etapa: string, modelId?: string, temperature = 0.5): Promise<T> => {
  let text = await chat(prompt, modelId, temperature);
  let parsed = extractJson<T>(text);
  if (parsed === null) {
    text = await chat(
      `${prompt}\n\nIMPORTANTE: responda SOMENTE com o JSON pedido, sem texto extra nem markdown.`,
      modelId,
      Math.min(temperature, 0.3),
    );
    parsed = extractJson<T>(text);
  }
  if (parsed === null) throw new Error(`A IA não retornou JSON válido na etapa "${etapa}".`);
  return parsed;
};

export const listModels = async (): Promise<string[]> => {
  const apiKey = resolveXaiKey();
  try {
    const bearer = apiKey || (isWebApp() ? await resolveXaiBrowserBearer() : undefined);
    if (!bearer) return [];
    const response = await fetch(xaiDirectApiUrl('models'), {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!response.ok) return [];
    const data = await response.json() as {
      models?: Array<{ id: string; output_modalities?: string[] }>;
    };
    return (data.models || [])
      .filter(item => !item.output_modalities || item.output_modalities.includes('text'))
      .map(item => item.id)
      .filter(isTextLanguageModel);
  } catch {
    return [];
  }
};

export const askXai = async (question: string, context: string, modelId?: string): Promise<string> => {
  if (!resolveXaiKey() && !hasXaiOAuthBridge() && !getXaiBrowserStatus().connected) {
    throw new Error(NO_KEY);
  }
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
  attachments?: PlanAttachment[];
}): Promise<MeetingCycle> => {
  if (!resolveXaiKey() && !hasXaiOAuthBridge() && !getXaiBrowserStatus().connected) {
    throw new Error(NO_KEY);
  }
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
${attachmentsToPromptBlock(params.attachments)}
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
  if (!resolveXaiKey() && !hasXaiOAuthBridge() && !getXaiBrowserStatus().connected) {
    throw new Error(NO_KEY);
  }
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
Duração total: ${params.totalDuration} min. Atividades de miolo: ${params.activityCount || 3} (sem IBEAGU/intervalos/IBOAGUCL). Jovens: ${params.participantsCount || 20}.
Tema: ${params.narrativeTheme || 'livre'}.
`;
  const briefsBlock = activityBriefsPromptBlock(params.activityBriefs, params.activityCount || 3);
  if (briefsBlock) userPromptBase += `\n${briefsBlock}\n`;
  if (planningMode === 'from_selection') userPromptBase += `\nOBJETIVOS:\n${objectivesList || '(nenhum)'}\n`;
  else {
    userPromptBase += `\nAUTO_LINK: invente atividades e amarre CÓDIGOS EXATOS do catálogo.\n`;
    if (objectivesList) userPromptBase += `\nPREFERÊNCIAS:\n${objectivesList}\n`;
    if (params.catalogDigest) userPromptBase += `\n${params.catalogDigest}\n`;
  }
  if (params.customInstruction) userPromptBase += `\nINSTRUÇÃO:\n${params.customInstruction}\n`;
  const attachmentBlock = attachmentsToPromptBlock(params.attachments);
  if (attachmentBlock) userPromptBase += `\n${attachmentBlock}\n`;
  if (manuais.length) userPromptBase += `\nBIBLIOTECA:\n${manuais.join('\n')}\n`;

  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 1/3: Gerando estrutura...' } }));
  const planStructure = await callJson<any>(`
Você é um Chefe Escoteiro Sênior da UEB. Crie a ESTRUTURA de um roteiro.
Retorne APENAS JSON:
{"theme":"...","fundoDeCena":"...","preparacaoChefia":"...","generalNotes":"...","educationalRationale":"...","activities":[{"title":"...","durationMinutes":30,"educationalArea":"Físico","progressionObjective":"[CÓDIGO]"}]}
CONTEXTO:\n${userPromptBase}
`, 'estrutura', params.modelId);

  const structureActs = Array.isArray(planStructure.activities) ? planStructure.activities : [];
  const detailBatches = chunkArray(structureActs, DETAIL_BATCH_SIZE);
  const detailsArr: any[] = [];
  for (let b = 0; b < detailBatches.length; b += 1) {
    const batch = detailBatches[b];
    const from = b * DETAIL_BATCH_SIZE + 1;
    const to = from + batch.length - 1;
    const etapa = detailBatches.length === 1 ? 'detalhamento' : `detalhamento (${b + 1}/${detailBatches.length})`;
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', {
      detail: { message: detailBatches.length === 1
        ? 'Etapa 2/3: Detalhando atividades...'
        : `Etapa 2/3: Detalhando atividades ${from}–${to} (${b + 1}/${detailBatches.length})...` },
    }));
    const chunk = await callJson<any[]>(`
Estrutura (lote ${b + 1}/${detailBatches.length}): ${JSON.stringify({ ...planStructure, activities: batch })}
Para CADA atividade DESTE LOTE, devolva um array JSON com description, materials, progressionObjective, objetivoEspecifico, instrucaoChefia, conteudoPronto, passos, safetyNotes, manualReferencia e preparacaoPrevia. Conteúdo de campo (letra, cartões, script) é obrigatório no tipo correspondente.
Detalhe SOMENTE estas ${batch.length} atividades. Não invente faixas extras.
${PRACTICAL_CONTENT_RULES}
CONTEXTO:\n${userPromptBase}
`, etapa, params.modelId, 0.65);
    detailsArr.push(...(Array.isArray(chunk) ? chunk : []));
  }
  planStructure.activities = mergeActivityDetails(structureActs, detailsArr);

  const studyTitles = (planStructure.activities || []).map((a: any) => a.title);
  const studyBatches = chunkArray(studyTitles, STUDY_GUIDE_BATCH_SIZE);
  const studyGuide: any[] = [];
  for (let b = 0; b < studyBatches.length; b += 1) {
    const batch = studyBatches[b];
    const etapa = studyBatches.length === 1 ? 'guia de estudo' : `guia de estudo (${b + 1}/${studyBatches.length})`;
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', {
      detail: { message: studyBatches.length === 1
        ? 'Etapa 3/3: Gerando guia de estudo...'
        : `Etapa 3/3: Guia de estudo ${b + 1}/${studyBatches.length}...` },
    }));
    const chunk = await callJson<any[]>(`
Crie o GUIA DE ESTUDO para: ${JSON.stringify(batch)}
Array JSON: [{"activityTitle":"...","conceptExplainer":"...","teachingTips":"...","searchQueriesUsed":["..."]}]
`, etapa, params.modelId);
    studyGuide.push(...(Array.isArray(chunk) ? chunk : []));
  }
  planStructure.studyGuide = studyGuide;

  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Plano gerado com sucesso!' } }));
  planStructure.totalDuration = params.totalDuration;
  planStructure.branch = params.branch;
  planStructure.sources = [];
  planStructure.createdAt = new Date().toISOString();
  planStructure.id = Date.now().toString();
  return normalizePlanForUse(planStructure as MeetingPlan);
};

export const generateScoutActivity = async (params: GenerateScoutActivityParams): Promise<Activity> => {
  if (!resolveXaiKey() && !hasXaiOAuthBridge() && !getXaiBrowserStatus().connected) {
    throw new Error(NO_KEY);
  }
  const attachmentBlock = attachmentsToPromptBlock(params.attachments);
  const prompt = `${buildSingleActivityPrompt(params)}${attachmentBlock ? `\n\n${attachmentBlock}` : ''}`;
  const parsed = await callJson<Activity>(prompt, 'refazer atividade', params.modelId, 0.65);
  const { isOperational: _op, operationalType: _type, ...safe } = parsed;
  return normalizeActivityForUse(safe, params.slotIndex);
};

export const probeGrokCredentials = async (): Promise<'ok' | 'fail' | 'skipped'> => {
  if (!resolveXaiKey() && !getXaiBrowserStatus().connected) {
    return 'skipped';
  }
  const models = await listModels();
  return models.length > 0 ? 'ok' : 'fail';
};

export const xaiErrorMessage = (error: unknown): string => sanitize(error);
