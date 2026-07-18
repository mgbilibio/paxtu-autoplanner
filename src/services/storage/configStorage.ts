import { AppConfig } from '../../types';
import { normalizeOllamaBaseUrl } from '../ollamaUrlSecurity';

export const CONFIG_KEY = 'PAXTU_AUTOPLANNER_CONFIG';

export const normalizePath = (path: string): string => {
  if (!path) return '';
  let normalized = path.trim().replace(/\\/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

const DEFAULT_OLLAMA_CONTEXT = 262_144;
const DEFAULT_OLLAMA_OUTPUT = 12_288;

export const getAppConfig = (): AppConfig | null => {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppConfig;
    // Migração suave: configs antigas com 32k/12k sobem para o piso cloud-friendly
    // só quando o valor está ausente ou claramente no default antigo.
    let ctx = parsed.ollamaGenerationContext;
    let out = parsed.ollamaGenerationOutput;
    if (ctx == null || ctx === 32768 || ctx === 4096) ctx = DEFAULT_OLLAMA_CONTEXT;
    if (out == null || out === 12000) out = DEFAULT_OLLAMA_OUTPUT;
    return {
      ...parsed,
      dataFolder: normalizePath(parsed.dataFolder || ''),
      ollamaBaseUrl: normalizeOllamaBaseUrl(parsed.ollamaBaseUrl) || 'http://localhost:11434',
      ollamaGenerationContext: ctx,
      ollamaGenerationOutput: out,
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
