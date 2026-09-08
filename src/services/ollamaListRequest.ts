import { belongsInOllamaSelector } from './ollamaModels.ts';
import {
  DEFAULT_OLLAMA_LOCAL_URL,
  OLLAMA_CLOUD_BASE_URL,
  normalizeOllamaBaseUrl,
} from './ollamaUrlSecurity.ts';

export { DEFAULT_OLLAMA_LOCAL_URL, OLLAMA_CLOUD_BASE_URL };

export interface OllamaListAccess {
  mode?: 'local' | 'cloud';
  baseUrl?: string;
  cloudApiKey?: string;
}

/** URL + auth da listagem. Local: URL do campo, sem chave. Cloud: ollama.com + Bearer. */
export const buildOllamaListRequest = (options: OllamaListAccess = {}): {
  url: string;
  authorization?: string;
} => {
  if (options.mode === 'cloud') {
    const key = (options.cloudApiKey || '').trim();
    const authorization = !key ? undefined : key.startsWith('Bearer ') ? key : `Bearer ${key}`;
    return authorization
      ? { url: `${OLLAMA_CLOUD_BASE_URL}/api/tags`, authorization }
      : { url: `${OLLAMA_CLOUD_BASE_URL}/api/tags` };
  }
  const base = normalizeOllamaBaseUrl(options.baseUrl) || DEFAULT_OLLAMA_LOCAL_URL;
  return { url: `${base}/api/tags` };
};

export const parseOllamaTagNames = (body: string): string[] => {
  try {
    const data = JSON.parse(body) as { models?: Array<{ name?: string }> };
    if (!data?.models) return [];
    return data.models
      .map(item => String(item?.name || '').trim())
      .filter(belongsInOllamaSelector);
  } catch {
    return [];
  }
};

/** Caminho web: fetch na URL montada, com Bearer só no Cloud. */
export const listOllamaModels = async (options: OllamaListAccess = {}): Promise<string[]> => {
  const { url, authorization } = buildOllamaListRequest(options);
  const headers: Record<string, string> = {};
  if (authorization) headers.Authorization = authorization;
  const response = await fetch(url, {
    method: 'GET',
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (!response.ok) return [];
  return parseOllamaTagNames(await response.text());
};
