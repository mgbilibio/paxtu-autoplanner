export const XAI_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828';
export const XAI_OAUTH_SCOPE = 'openid profile email offline_access grok-cli:access api:access';

export const XAI_API_BASE = 'https://api.x.ai/v1';
export const DEFAULT_XAI_OAUTH_PROXY_ORIGIN = 'https://paxtu-xai-proxy.margusbilibio.workers.dev';
export const XAI_PROXY_OVERRIDE_KEY = 'paxtu_xai_proxy_url';

const AUTH_HOSTS = /^(auth|api|accounts)\.x\.ai$/i;
const APPROVED_PROXY_HOSTS = [
  'paxtu-xai-proxy.margusbilibio.workers.dev',
] as const;

const stripSlash = (raw: string): string => raw.trim().replace(/\/+$/, '');

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

export const isUsableXaiProxyOrigin = (raw: string, production = true): boolean => {
  const value = stripSlash(raw);
  if (!value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    if (AUTH_HOSTS.test(parsed.hostname)) return false;
    if (isLocalHost(parsed.hostname)) {
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    if (parsed.protocol !== 'https:') return false;
    if (production) {
      return (APPROVED_PROXY_HOSTS as readonly string[]).includes(parsed.hostname);
    }
    return true;
  } catch {
    return false;
  }
};

export const readXaiProxyOverride = (): string => {
  try {
    return String(localStorage.getItem(XAI_PROXY_OVERRIDE_KEY) || '').trim();
  } catch {
    return '';
  }
};

export const writeXaiProxyOverride = (url: string): void => {
  const value = stripSlash(url);
  try {
    if (!value) localStorage.removeItem(XAI_PROXY_OVERRIDE_KEY);
    else localStorage.setItem(XAI_PROXY_OVERRIDE_KEY, value);
  } catch {
    // localStorage pode estar bloqueado
  }
};

const envProxy = (): string =>
  stripSlash(String(import.meta.env?.VITE_XAI_PROXY_URL || ''));

export const resolveXaiProxyOriginFrom = (input: {
  override?: string;
  envProxy?: string;
  production?: boolean;
}): string => {
  const production = input.production !== false;
  const override = stripSlash(input.override || '');
  if (isUsableXaiProxyOrigin(override, production)) return override;
  const fromEnv = stripSlash(input.envProxy || '');
  if (isUsableXaiProxyOrigin(fromEnv, production)) return fromEnv;
  return DEFAULT_XAI_OAUTH_PROXY_ORIGIN;
};

export const resolveXaiProxyOrigin = (): string =>
  resolveXaiProxyOriginFrom({
    override: readXaiProxyOverride(),
    envProxy: envProxy(),
  });

export const xaiDirectApiUrl = (kind: 'models' | 'chat'): string =>
  kind === 'models' ? `${XAI_API_BASE}/language-models` : `${XAI_API_BASE}/chat/completions`;

export const xaiOAuthUrls = (): {
  device: string;
  token: string;
  userInfo: string;
  models: string;
  chat: string;
  proxyConfigured: boolean;
  proxyOrigin: string;
} => {
  const proxy = resolveXaiProxyOrigin();
  return {
    device: `${proxy}/oauth/device`,
    token: `${proxy}/oauth/token`,
    userInfo: `${proxy}/oauth/userinfo`,
    models: xaiDirectApiUrl('models'),
    chat: xaiDirectApiUrl('chat'),
    proxyConfigured: isUsableXaiProxyOrigin(proxy),
    proxyOrigin: proxy,
  };
};

export const missingXaiProxyMessage = (): string =>
  'Não foi possível iniciar o login com X/Grok. Tente de novo em instantes.';

export const unreachableXaiProxyMessage = (): string =>
  'O login com X/Grok não respondeu. Tente de novo em instantes.';

export const describeXaiProxyFailure = (error: unknown): string => {
  const text = String((error as Error)?.message || error || '').trim();
  if (!text || /failed to fetch|networkerror|load failed|err_name_not_resolved|err_connection|err_failed|network request failed|cors/i.test(text)) {
    return unreachableXaiProxyMessage();
  }
  return text;
};

export const describeXaiApiFailure = (error: unknown): string => {
  const text = String((error as Error)?.message || error || '').trim();
  if (!text || /failed to fetch|networkerror|load failed|err_name_not_resolved|err_connection|err_failed|network request failed|cors/i.test(text)) {
    return 'A API da xAI não respondeu. Tente de novo em instantes.';
  }
  return text;
};
