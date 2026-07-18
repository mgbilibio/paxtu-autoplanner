const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

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
