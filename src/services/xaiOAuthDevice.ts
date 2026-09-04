import {
  missingXaiProxyMessage,
  XAI_CLIENT_ID,
  XAI_OAUTH_SCOPE,
  xaiOAuthUrls,
} from './xaiOAuthConfig';
import { saveXaiBrowserSession } from './xaiOAuthSession';

export interface XaiDeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export interface XaiDevicePollResult {
  status: 'pending' | 'slow_down' | 'authorized' | 'expired' | 'denied' | 'error';
  message: string;
}

const requestHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
});

export const startXaiDeviceAuthorization = async (): Promise<XaiDeviceAuthorization> => {
  const urls = xaiOAuthUrls();
  if (!urls.proxyConfigured) throw new Error(missingXaiProxyMessage());
  const body = new URLSearchParams({ client_id: XAI_CLIENT_ID, scope: XAI_OAUTH_SCOPE });
  const response = await fetch(urls.device, {
    method: 'POST',
    headers: requestHeaders(),
    body,
  });
  const data = await response.json() as Record<string, unknown>;
  const deviceCode = String(data.device_code || '');
  const userCode = String(data.user_code || '');
  if (!response.ok || !deviceCode || !userCode) {
    throw new Error(String(data.error_description || data.error || 'Não foi possível iniciar o xOAuth.'));
  }
  const baseUrl = String(data.verification_uri || 'https://accounts.x.ai/connect');
  return {
    deviceCode,
    userCode,
    verificationUrl: String(data.verification_uri_complete || `${baseUrl}?user_code=${userCode}`),
    expiresIn: Number(data.expires_in) || 1_800,
    interval: Math.max(Number(data.interval) || 5, 3),
  };
};

const fetchIdentity = async (accessToken: string): Promise<{ email?: string; name?: string }> => {
  const response = await fetch(xaiOAuthUrls().userInfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return {};
  const data = await response.json() as Record<string, unknown>;
  return {
    email: typeof data.email === 'string' ? data.email : undefined,
    name: typeof data.name === 'string' ? data.name : undefined,
  };
};

export const pollXaiDeviceAuthorization = async (
  deviceCode: string,
): Promise<XaiDevicePollResult> => {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceCode,
    client_id: XAI_CLIENT_ID,
  });
  const response = await fetch(xaiOAuthUrls().token, {
    method: 'POST',
    headers: requestHeaders(),
    body,
  });
  const data = await response.json() as Record<string, unknown>;
  if (response.ok && typeof data.access_token === 'string') {
    const identity = await fetchIdentity(data.access_token);
    saveXaiBrowserSession(
      data.access_token,
      typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
      Number(data.expires_in) || 21_600,
      identity,
    );
    return { status: 'authorized', message: `Conectado${identity.email ? ` como ${identity.email}` : ''}.` };
  }
  const error = String(data.error || '');
  if (error === 'authorization_pending') return { status: 'pending', message: 'Aguardando autorização…' };
  if (error === 'slow_down') return { status: 'slow_down', message: 'Aguarde um pouco…' };
  if (/expired/.test(error)) return { status: 'expired', message: 'O código expirou. Entre novamente.' };
  if (error === 'access_denied') return { status: 'denied', message: 'A autorização foi recusada.' };
  return {
    status: 'error',
    message: String(data.error_description || error || `Falha xOAuth (${response.status}).`),
  };
};
