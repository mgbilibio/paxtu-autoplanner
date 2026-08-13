// Abstração de provider de LLM. Alterna Gemini, Ollama local, Ollama Cloud e xAI.
// Ordem de preferência de produto: gemini → ollama-local → ollama-cloud → xai-oauth.
// Na web (GitHub Pages) o padrão continua Gemini; xAI é extra opcional com chave no browser.

import { GeneratorParams, MeetingPlan, LlmProviderId } from '../types';
import { getAppConfig } from './storageService';
import * as gemini from './geminiService';
import * as ollama from './ollamaService';
import * as xai from './xaiService';
import { isWebApp } from './platform';

export const GEMINI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';
/** Painel de uso/cota do AI Studio (aba de rate limits no mesmo endereço). */
export const GEMINI_USAGE_URL = 'https://aistudio.google.com/usage';
/** Usage Explorer oficial da xAI Console. */
export const XAI_USAGE_URL = 'https://console.x.ai/team/default/usage';
export const GEMINI_KEY_HELP =
  'Obtenha uma chave grátis em https://aistudio.google.com/app/apikey (conta Google, sem cartão de crédito) e cole em Configurações. A chave fica só neste aparelho/navegador — nunca no repositório.';

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
    if (!gemini.hasGeminiCredentials()) {
      return { ok: false, error: `Chave de API do Gemini não configurada. ${GEMINI_KEY_HELP}` };
    }
    return { ok: true };
  },
};

const ollamaLocalProvider: LlmProvider = {
  id: 'ollama-local',
  listModels: ollama.listModels,
  generateScoutPlan: ollama.generateScoutPlan,
  isReachable: async () => {
    if (isWebApp()) {
      return {
        ok: false,
        error: 'Ollama local (localhost:11434) está disponível no aplicativo desktop. Neste site use Gemini (padrão) ou xAI, ou Ollama Cloud se você colar uma chave ollama.com.',
      };
    }
    return ollama.isReachable();
  },
};

const ollamaCloudProvider: LlmProvider = {
  id: 'ollama-cloud',
  listModels: ollama.listModels,
  generateScoutPlan: ollama.generateScoutPlan,
  isReachable: ollama.isReachable,
};

const xaiProvider: LlmProvider = {
  id: 'xai-oauth',
  listModels: xai.listModels,
  generateScoutPlan: xai.generateScoutPlan,
  isReachable: xai.isReachable,
};

export const getActiveProvider = (): LlmProvider => {
  const id = normalizeProviderId(getAppConfig()?.llmProvider);
  return getProviderById(id);
};

export const getProviderById = (id: LlmProviderId): LlmProvider => {
  const n = normalizeProviderId(id);
  if (n === 'ollama-local') return ollamaLocalProvider;
  if (n === 'ollama-cloud') return ollamaCloudProvider;
  if (n === 'xai-oauth') return xaiProvider;
  return geminiProvider;
};

export const generateScoutPlanRouted = (params: Parameters<LlmProvider['generateScoutPlan']>[0]) =>
  getActiveProvider().generateScoutPlan(params);

export const listAvailableModels = () => getActiveProvider().listModels();

export const askLlm = async (question: string, context: string, modelId?: string): Promise<string> => {
  const id = normalizeProviderId(getAppConfig()?.llmProvider);
  if (id === 'ollama-local') {
    if (isWebApp()) {
      throw new Error('Ollama local não roda neste site. Use Gemini (cole a chave em Configurações) ou xAI.');
    }
    return ollama.askOllama(question, context, modelId);
  }
  if (id === 'ollama-cloud') return ollama.askOllama(question, context, modelId);
  if (id === 'xai-oauth') return xai.askXai(question, context, modelId);
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
    return xai.generateScoutCycle(params);
  }
  if (id === 'ollama-local' && isWebApp()) {
    throw new Error('Ollama local não roda neste site. Use Gemini ou xAI.');
  }
  const cycle = await ollama.generateScoutCycle(params);
  return gemini.normalizeMeetingCycle(cycle as gemini.MeetingCycle);
};
