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

// Geração de ciclo — Gemini nativo; Ollama em partes (esqueleto + cada reunião).
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
  const cycle = await ollama.generateScoutCycle(params);
  return gemini.normalizeMeetingCycle(cycle as gemini.MeetingCycle);
};
