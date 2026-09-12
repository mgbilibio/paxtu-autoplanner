import type { AppConfig } from '../../types.ts';
import { DEFAULT_OLLAMA_LOCAL_URL, normalizeOllamaBaseUrl } from '../ollamaUrlSecurity.ts';

export const CONFIG_KEY = 'PAXTU_AUTOPLANNER_CONFIG';

export const normalizePath = (path: string): string => {
  if (!path) return '';
  let normalized = path.trim().replace(/\\/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

const DEFAULT_OLLAMA_CONTEXT = 32_768;
const DEFAULT_OLLAMA_OUTPUT = 12_288;

export const migrateOllamaContext = (parsed: AppConfig): AppConfig => {
  let ctx = parsed.ollamaGenerationContext;
  let out = parsed.ollamaGenerationOutput;
  if (parsed.ollamaContextMigratedV2) {
    return {
      ...parsed,
      ollamaGenerationContext: ctx ?? DEFAULT_OLLAMA_CONTEXT,
      ollamaGenerationOutput: out ?? DEFAULT_OLLAMA_OUTPUT,
    };
  }
  if (ctx == null) ctx = DEFAULT_OLLAMA_CONTEXT;
  if (out == null || out === 12000) out = DEFAULT_OLLAMA_OUTPUT;
  return {
    ...parsed,
    ollamaGenerationContext: ctx,
    ollamaGenerationOutput: out,
    ollamaContextMigratedV2: true,
  };
};

export const getAppConfig = (): AppConfig | null => {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppConfig;
    const migrated = migrateOllamaContext(parsed);
    return {
      ...migrated,
      dataFolder: normalizePath(parsed.dataFolder || ''),
      ollamaBaseUrl: normalizeOllamaBaseUrl(parsed.ollamaBaseUrl) || DEFAULT_OLLAMA_LOCAL_URL,
      syncMode: parsed.syncMode === 'sharedFolder' ? 'sharedFolder' : 'local',
    };
  } catch (e) {
    return null;
  }
};

export const saveAppConfig = (config: AppConfig): void => {
  const normalized = {
    ...config,
    dataFolder: normalizePath(config.dataFolder),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
};

export const getStoredApiKey = (): string | null => {
  const config = getAppConfig();
  return config?.apiKey || null;
};
