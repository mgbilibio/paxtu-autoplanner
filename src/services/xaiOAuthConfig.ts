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
  'O proxy seguro do xOAuth não foi configurado neste deploy. Defina VITE_XAI_PROXY_URL e publique novamente.';
