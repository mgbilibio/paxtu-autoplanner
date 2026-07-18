// Abstração de provider de LLM. Permite alternar entre Gemini (cloud) e Ollama (local)
// sem mudar nenhum componente que gera planos.
//
// Componentes existentes seguem importando `generateScoutPlan` e `getAvailableModels`
// de `geminiService` (re-exportados ou via roteador). O roteador escolhe a implementação
// com base em `AppConfig.llmProvider`.

import { GeneratorParams, MeetingPlan, LlmProviderId } from '../types';
import { getAppConfig } from './storageService';
import * as gemini from './geminiService';
import * as ollama from './ollamaService';
import { extractJson } from './llmJson';

export interface LlmProvider {
  id: LlmProviderId;
  listModels: () => Promise<string[]>;
  generateScoutPlan: (params: GeneratorParams & { context?: { sectionName: string; groupName: string } }) => Promise<MeetingPlan>;
  isReachable: () => Promise<{ ok: boolean; error?: string }>;
}

const geminiProvider: LlmProvider = {
  id: 'gemini',
  listModels: gemini.getAvailableModels,
  generateScoutPlan: gemini.generateScoutPlan,
  isReachable: async () => {
    // Gemini é "alcançável" se houver chave configurada. Não há ping barato.
    const config = getAppConfig();
    if (!config?.apiKey) return { ok: false, error: 'Chave de API do Gemini não configurada.' };
    return { ok: true };
  },
};

const ollamaProvider: LlmProvider = {
  id: 'ollama',
  listModels: ollama.listModels,
  generateScoutPlan: ollama.generateScoutPlan,
  isReachable: ollama.isReachable,
};

export const getActiveProvider = (): LlmProvider => {
  const config = getAppConfig();
  return config?.llmProvider === 'ollama' ? ollamaProvider : geminiProvider;
};

export const getProviderById = (id: LlmProviderId): LlmProvider =>
  id === 'ollama' ? ollamaProvider : geminiProvider;

// Wrappers convenientes — preferir importar destes em vez de geminiService diretamente.
export const generateScoutPlanRouted = (params: Parameters<LlmProvider['generateScoutPlan']>[0]) =>
  getActiveProvider().generateScoutPlan(params);

export const listAvailableModels = () => getActiveProvider().listModels();

// Q&A genérico (Painel de Ajuda) — roteia para Gemini ou Ollama conforme provider ativo.
export const askLlm = async (question: string, context: string, modelId?: string): Promise<string> => {
  const config = getAppConfig();
  if (config?.llmProvider === 'ollama') return ollama.askOllama(question, context, modelId);
  return gemini.askGemini(question, context, modelId);
};

// Geração de ciclo — Gemini tem implementação nativa; Ollama usa askOllama com prompt JSON.
export const generateScoutCycleRouted = async (params: {
  branch: string;
  cycleTheme: string;
  meetingCount: number;
  objectives: string[];
  customInstruction?: string;
  modelId?: string;
}): Promise<gemini.MeetingCycle> => {
  const config = getAppConfig();
  if (config?.llmProvider !== 'ollama') {
    return gemini.generateScoutCycle(params);
  }
  // Ollama: usa askOllama com instruções para retornar JSON do ciclo
  const prompt = [
    `Planeje um CICLO DE PROGRAMA para o Ramo ${params.branch}.`,
    `TEMA: ${params.cycleTheme}`,
    `QUANTIDADE DE REUNIÕES: ${params.meetingCount}`,
    `OBJETIVOS A DISTRIBUIR (não repita o mesmo em mais de 2 reuniões):`,
    params.objectives.map(o => `- ${o}`).join('\n'),
    params.customInstruction ? `\nINSTRUÇÃO ESPECIAL: ${params.customInstruction}` : '',
    '',
    'Cada reunião deve incluir acompanhamento e avaliação dos jovens pelos jovens e pela chefia.',
    'Inclua requisitos observáveis e critérios de aceite claros, vinculados ao objetivo da reunião.',
    '',
    'Retorne SOMENTE JSON válido neste formato (sem markdown, sem texto adicional):',
    '{"id":"x","theme":"...","rational":"...","meetings":[{"theme":"...","generalNotes":"...","progressionObjective":"COD","acompanhamento":"...","avaliacaoJovens":"...","avaliacaoChefia":"...","requisitosObservaveis":["..."],"criteriosDeAceite":["..."]}]}',
  ].filter(Boolean).join('\n');
  // Extrai JSON robustamente (reusa extractJson) com 1 retry, igual ao generateScoutPlan.
  let text = await ollama.askOllama(prompt, '', params.modelId);
  let parsed = extractJson<gemini.MeetingCycle>(text);
  if (!parsed) {
    const retry = `${prompt}\n\nATENÇÃO: sua resposta anterior NÃO foi um JSON válido. Reenvie SOMENTE o JSON do ciclo, sem markdown nem texto extra.`;
    text = await ollama.askOllama(retry, '', params.modelId);
    parsed = extractJson<gemini.MeetingCycle>(text);
  }
  if (!parsed) throw new Error('Ollama não retornou JSON válido para o ciclo.');
  parsed.id = parsed.id || Date.now().toString();
  return gemini.normalizeMeetingCycle(parsed as gemini.MeetingCycle);
};
