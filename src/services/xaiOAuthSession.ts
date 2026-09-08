import {
  describeXaiProxyFailure,
  missingXaiProxyMessage,
  XAI_CLIENT_ID,
  xaiOAuthUrls,
} from './xaiOAuthConfig.ts';

const ACCESS_KEY = 'paxtu_xai_access_session';
const META_KEY = 'paxtu_xai_oauth_meta';

interface StoredAccess {
  accessToken: string;
  expiresAt: string;
}

interface StoredMeta {
  refreshToken?: string;
  expiresAt: string;
  email?: string;
  name?: string;
}

export interface XaiBrowserStatus {
  connected: boolean;
  email?: string;
  name?: string;
  expiresAt?: string;
  message: string;
  proxyConfigured: boolean;
}

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
};

const isExpired = (expiresAt?: string, skewMs = 120_000): boolean => {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && Date.now() >= timestamp - skewMs;
};

export const saveXaiBrowserSession = (
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  identity: { email?: string; name?: string },
): void => {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  sessionStorage.setItem(ACCESS_KEY, JSON.stringify({ accessToken, expiresAt }));
  sessionStorage.setItem(META_KEY, JSON.stringify({
    refreshToken,
    expiresAt,
    email: identity.email,
    name: identity.name,
  }));
};

export const clearXaiBrowserSession = (): void => {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(META_KEY);
};

export const getXaiBrowserStatus = (): XaiBrowserStatus => {
  const access = readJson<StoredAccess>(ACCESS_KEY);
  const meta = readJson<StoredMeta>(META_KEY);
  const expiresAt = access?.expiresAt || meta?.expiresAt;
  const canRefresh = Boolean(meta?.refreshToken);
  const connected = Boolean(access?.accessToken && !isExpired(access.expiresAt)) || canRefresh;
  const proxyConfigured = xaiOAuthUrls().proxyConfigured;
  return {
    connected,
    email: meta?.email,
    name: meta?.name,
    expiresAt,
    proxyConfigured,
    message: connected
      ? `Conectado via xOAuth${meta?.email ? ` como ${meta.email}` : ''}.`
      : 'Sessão xAI não conectada.',
  };
};

const refreshAccessToken = async (meta: StoredMeta): Promise<string> => {
  if (!meta.refreshToken) throw new Error('Sessão xAI expirada. Entre novamente.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: meta.refreshToken,
    client_id: XAI_CLIENT_ID,
  });
  const urls = xaiOAuthUrls();
  if (!urls.proxyConfigured) throw new Error(missingXaiProxyMessage());
  let response: Response;
  try {
    response = await fetch(urls.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
  } catch (error) {
    throw new Error(describeXaiProxyFailure(error));
  }
  const data = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    clearXaiBrowserSession();
    throw new Error(data.error_description || 'Não foi possível renovar a sessão xAI.');
  }
  saveXaiBrowserSession(
    data.access_token,
    data.refresh_token || meta.refreshToken,
    data.expires_in || 21_600,
    { email: meta.email, name: meta.name },
  );
  return data.access_token;
};

export const explainXaiWebAccessGap = (hasApiKey = false): string | null => {
  if (hasApiKey) return null;
  const status = getXaiBrowserStatus();
  if (status.connected) return null;
  return 'Entre com X/Grok neste navegador ou informe uma chave da API xAI.';
};

export const resolveXaiBrowserBearer = async (): Promise<string> => {
  if (!xaiOAuthUrls().proxyConfigured) throw new Error(missingXaiProxyMessage());
  const access = readJson<StoredAccess>(ACCESS_KEY);
  if (access?.accessToken && !isExpired(access.expiresAt)) return access.accessToken;
  const meta = readJson<StoredMeta>(META_KEY);
  if (meta?.refreshToken) return refreshAccessToken(meta);
  throw new Error('Entre com sua conta X/Grok para usar os créditos da assinatura.');
};
