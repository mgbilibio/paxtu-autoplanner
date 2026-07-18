// Abstração de provider de LLM. Alterna Gemini, Ollama local, Ollama Cloud (e reserva xAI).
// Ordem de preferência de produto: gemini → ollama-local → ollama-cloud → xai-oauth.

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

/** Normaliza ids legados e aliases. */
export const normalizeProviderId = (id?: string | null): LlmProviderId => {
  if (id === 'ollama' || id === 'ollama-local') return 'ollama-local';
  if (id === 'ollama-cloud') return 'ollama-cloud';
  if (id === 'xai-oauth') return 'xai-oauth';
  return 'gemini';
};

const geminiProvider: LlmProvider = {
  id: 'gemini',
  listModels: gemini.getAvailableModels,
  generateScoutPlan: gemini.generateScoutPlan,
  isReachable: async () => {
    const config = getAppConfig();
    if (!config?.apiKey) return { ok: false, error: 'Chave de API do Gemini não configurada.' };
    return { ok: true };
  },
};

const ollamaLocalProvider: LlmProvider = {
  id: 'ollama-local',
  listModels: ollama.listModels,
  generateScoutPlan: ollama.generateScoutPlan,
  isReachable: ollama.isReachable,
};

const ollamaCloudProvider: LlmProvider = {
  id: 'ollama-cloud',
  listModels: ollama.listModels,
  generateScoutPlan: ollama.generateScoutPlan,
  isReachable: ollama.isReachable,
};

const xaiStubProvider: LlmProvider = {
  id: 'xai-oauth',
  listModels: async () => [],
  generateScoutPlan: async () => {
    throw new Error(
      'xAI Grok OAuth ainda não está ativo neste build. Use Gemini (recomendado) ou Ollama. Ver docs/design/2026-07-18-xai-oauth-provider.md.',
    );
  },
  isReachable: async () => ({
    ok: false,
    error: 'xAI OAuth planejado — autenticação por assinatura SuperGrok/X Premium+ em breve.',
  }),
};

export const getActiveProvider = (): LlmProvider => {
  const id = normalizeProviderId(getAppConfig()?.llmProvider);
  return getProviderById(id);
};

export const getProviderById = (id: LlmProviderId): LlmProvider => {
  const n = normalizeProviderId(id);
  if (n === 'ollama-local') return ollamaLocalProvider;
  if (n === 'ollama-cloud') return ollamaCloudProvider;
  if (n === 'xai-oauth') return xaiStubProvider;
  return geminiProvider;
};

export const generateScoutPlanRouted = (params: Parameters<LlmProvider['generateScoutPlan']>[0]) =>
  getActiveProvider().generateScoutPlan(params);

export const listAvailableModels = () => getActiveProvider().listModels();

export const askLlm = async (question: string, context: string, modelId?: string): Promise<string> => {
  const id = normalizeProviderId(getAppConfig()?.llmProvider);
  if (id === 'ollama-local' || id === 'ollama-cloud') return ollama.askOllama(question, context, modelId);
  if (id === 'xai-oauth') {
    throw new Error('xAI OAuth ainda não disponível para o painel de ajuda. Use Gemini ou Ollama.');
  }
  return gemini.askGemini(question, context, modelId);
};

export const generateScoutCycleRouted = async (params: {
  branch: string;
  cycleTheme: string;
  meetingCount: number;
  objectives: string[];
  customInstruction?: string;
  modelId?: string;
  planningMode?: 'from_selection' | 'auto_link';
  catalogDigest?: string;
}): Promise<gemini.MeetingCycle> => {
  const id = normalizeProviderId(getAppConfig()?.llmProvider);
  if (id === 'gemini') {
    return gemini.generateScoutCycle(params);
  }
  if (id === 'xai-oauth') {
    throw new Error('xAI OAuth ainda não disponível para ciclo. Use Gemini ou Ollama.');
  }
  // ollama-local e ollama-cloud
  const cycle = await ollama.generateScoutCycle(params);
  return gemini.normalizeMeetingCycle(cycle as gemini.MeetingCycle);
};
