export const XAI_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828';
export const XAI_OAUTH_SCOPE = 'openid profile email offline_access grok-cli:access api:access';

const XAI_AUTH_BASE = 'https://auth.x.ai/oauth2';
export const XAI_API_BASE = 'https://api.x.ai/v1';

export const resolveXaiProxyOrigin = (): string =>
  String(import.meta.env?.VITE_XAI_PROXY_URL || '').trim().replace(/\/+$/, '');

export const xaiOAuthUrls = (): {
  device: string;
  token: string;
  userInfo: string;
  proxyConfigured: boolean;
} => {
  const proxy = resolveXaiProxyOrigin();
  if (proxy) {
    return {
      device: `${proxy}/oauth/device`,
      token: `${proxy}/oauth/token`,
      userInfo: `${proxy}/oauth/userinfo`,
      proxyConfigured: true,
    };
  }
  return {
    device: `${XAI_AUTH_BASE}/device/code`,
    token: `${XAI_AUTH_BASE}/token`,
    userInfo: `${XAI_AUTH_BASE}/userinfo`,
    proxyConfigured: false,
  };
};

export const missingXaiProxyMessage = (): string =>
  'O login “Entrar com X / Grok” neste site precisa do proxy Cloudflare (Worker em workers/xai-proxy). Defina a variável pública VITE_XAI_PROXY_URL no GitHub Actions (Settings → Secrets and variables → Actions → Variables) com a URL do Worker e publique de novo. Sem isso o navegador é bloqueado pelo CORS de auth.x.ai. Enquanto o proxy não estiver no ar, use uma chave da API xAI ou o aplicativo desktop.';

export const unreachableXaiProxyMessage = (): string =>
  'O proxy xOAuth está configurado, mas não respondeu. Confira se o Worker Cloudflare está publicado e se VITE_XAI_PROXY_URL aponta para a URL correta (sem barra no final). Sem o proxy, o navegador não fala com auth.x.ai.';

export const describeXaiProxyFailure = (error: unknown): string => {
  const text = String((error as Error)?.message || error || '');
  if (/failed to fetch|networkerror|load failed|err_name_not_resolved|err_connection|err_failed|network request failed/i.test(text)) {
    return unreachableXaiProxyMessage();
  }
  return text.trim() || unreachableXaiProxyMessage();
};

export const probeXaiProxy = async (): Promise<{ ok: boolean; message: string }> => {
  const origin = resolveXaiProxyOrigin();
  if (!origin) return { ok: false, message: missingXaiProxyMessage() };
  try {
    const response = await fetch(`${origin}/oauth/device`, {
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
