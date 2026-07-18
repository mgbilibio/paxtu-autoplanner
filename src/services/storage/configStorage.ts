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

export const getAppConfig = (): AppConfig | null => {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppConfig;
    return {
      ...parsed,
      dataFolder: normalizePath(parsed.dataFolder || ''),
      ollamaBaseUrl: normalizeOllamaBaseUrl(parsed.ollamaBaseUrl) || 'http://localhost:11434',
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
