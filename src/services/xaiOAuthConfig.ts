export const XAI_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828';
export const XAI_OAUTH_SCOPE = 'openid profile email offline_access grok-cli:access api:access';

export const XAI_API_BASE = 'https://api.x.ai/v1';
export const XAI_PROXY_OVERRIDE_KEY = 'paxtu_xai_proxy_url';
export const XAI_DEV_PROXY_PREFIX = '/__xai_oauth';

const AUTH_HOSTS = /^(auth|api|accounts)\.x\.ai$/i;

export const isUsableXaiProxyOrigin = (raw: string): boolean => {
  const value = raw.trim().replace(/\/+$/, '');
  if (!value) return false;
  if (value === XAI_DEV_PROXY_PREFIX || value.endsWith(XAI_DEV_PROXY_PREFIX)) {
    return !/^https?:\/\/(auth|api|accounts)\.x\.ai/i.test(value);
  }
  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    if (AUTH_HOSTS.test(parsed.hostname)) return false;
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
  const value = url.trim().replace(/\/+$/, '');
  try {
    if (!value) localStorage.removeItem(XAI_PROXY_OVERRIDE_KEY);
    else localStorage.setItem(XAI_PROXY_OVERRIDE_KEY, value);
  } catch {
    // localStorage pode estar bloqueado
  }
};

const envProxy = (): string =>
  String(import.meta.env?.VITE_XAI_PROXY_URL || '').trim().replace(/\/+$/, '');

const devSameOriginProxy = (): string => {
  if (!import.meta.env?.DEV) return '';
  if (typeof window === 'undefined') return XAI_DEV_PROXY_PREFIX;
  return `${window.location.origin}${XAI_DEV_PROXY_PREFIX}`;
};

export const resolveXaiProxyOrigin = (): string => {
  const override = readXaiProxyOverride();
  if (isUsableXaiProxyOrigin(override)) return override.replace(/\/+$/, '');
  const fromEnv = envProxy();
  if (isUsableXaiProxyOrigin(fromEnv)) return fromEnv;
  const dev = devSameOriginProxy();
  return isUsableXaiProxyOrigin(dev) ? dev.replace(/\/+$/, '') : '';
};

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
  if (proxy) {
    return {
      device: `${proxy}/oauth/device`,
      token: `${proxy}/oauth/token`,
      userInfo: `${proxy}/oauth/userinfo`,
      models: `${proxy}/v1/language-models`,
      chat: `${proxy}/v1/chat/completions`,
      proxyConfigured: true,
      proxyOrigin: proxy,
    };
  }
  return {
    device: '',
    token: '',
    userInfo: '',
    models: '',
    chat: '',
    proxyConfigured: false,
    proxyOrigin: '',
  };
};

export const missingXaiProxyMessage = (): string =>
  'O login “Entrar com X / Grok” neste site não pode chamar auth.x.ai direto (o navegador bloqueia por CORS — isso aparece como “Failed to fetch”). Publique o Worker em workers/xai-proxy, grave a URL pública em VITE_XAI_PROXY_URL (GitHub Actions → Variables) e faça o rebuild do Pages. Em Configurações → IA também dá para colar a URL do Worker neste navegador. No computador, npm run dev:web usa um proxy local sem vazar tokens.';

export const unreachableXaiProxyMessage = (): string =>
  'O proxy xOAuth não respondeu. Confira se o Worker Cloudflare está no ar, se a URL não é auth.x.ai/api.x.ai, e se VITE_XAI_PROXY_URL (ou a URL colada em Configurações) está certa, sem barra no final. Sem o Worker, o botão “Entrar com X / Grok” falha com erro de rede.';

export const describeXaiProxyFailure = (error: unknown): string => {
  const text = String((error as Error)?.message || error || '').trim();
  if (!text || /failed to fetch|networkerror|load failed|err_name_not_resolved|err_connection|err_failed|network request failed|cors/i.test(text)) {
    return resolveXaiProxyOrigin() ? unreachableXaiProxyMessage() : missingXaiProxyMessage();
  }
  return text;
};

export const probeXaiProxy = async (): Promise<{ ok: boolean; message: string }> => {
  const urls = xaiOAuthUrls();
  if (!urls.proxyConfigured) return { ok: false, message: missingXaiProxyMessage() };
  try {
    const response = await fetch(urls.device, {
      method: 'OPTIONS',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status >= 500) {
      return { ok: false, message: unreachableXaiProxyMessage() };
    }
    return { ok: true, message: '' };
  } catch (error) {
    return { ok: false, message: describeXaiProxyFailure(error) };
  }
};
