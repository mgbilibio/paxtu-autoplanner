const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Daemon local no navegador. Aceita também localhost / ::1 no campo. */
export const DEFAULT_OLLAMA_LOCAL_URL = 'http://127.0.0.1:11434';

/** Host oficial da API Cloud (docs.ollama.com/cloud): /api/tags e /api/chat. */
export const OLLAMA_CLOUD_BASE_URL = 'https://ollama.com';

export const normalizeOllamaBaseUrl = (value?: string): string | null => {
  const raw = (value || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!LOOPBACK_HOSTS.has(parsed.hostname)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};
