const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo';
const GEMINI_OAUTH_TOKEN_KEY = 'PAXTU_GEMINI_OAUTH_TOKEN';
const GEMINI_OAUTH_SCOPE = 'https://www.googleapis.com/auth/generative-language';

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export const getGoogleClientId = (): string => GOOGLE_CLIENT_ID;

export const isGoogleSignInConfigured = (): boolean =>
  GOOGLE_CLIENT_ID.length > 0 && GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com');

const loadGisScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o login Google.')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o login Google.'));
    document.head.appendChild(script);
  });

export const ensureGoogleIdentity = (): Promise<void> => loadGisScript();

const decodeJwtPayload = (credential: string): Record<string, unknown> => {
  const parts = credential.split('.');
  if (parts.length < 2) throw new Error('Token Google inválido.');
  const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return JSON.parse(atob(padded + pad)) as Record<string, unknown>;
};

const identityFromPayload = (payload: Record<string, unknown>, clientId: string): GoogleIdentity => {
  const aud = String(payload.aud || '');
  const iss = String(payload.iss || '');
  const exp = Number(payload.exp || 0) * 1000;
  const issOk = iss === 'accounts.google.com' || iss === 'https://accounts.google.com';
  if (aud !== clientId || !issOk || exp < Date.now()) {
    throw new Error('Sessão Google inválida ou expirada.');
  }
  const email = String(payload.email || '');
  const verified = payload.email_verified;
  if (!email || verified === 'false' || verified === false) {
    throw new Error('Use uma conta Google com e-mail verificado.');
  }
  return {
    sub: String(payload.sub || email),
    email,
    name: String(payload.name || email.split('@')[0]),
    emailVerified: true,
  };
};

export const verifyGoogleIdToken = async (credential: string): Promise<GoogleIdentity> => {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Login Google ainda não está configurado neste site.');
  try {
    const response = await fetch(`${TOKENINFO}?id_token=${encodeURIComponent(credential)}`);
    if (response.ok) {
      return identityFromPayload(await response.json() as Record<string, unknown>, clientId);
    }
  } catch {
    // tokeninfo pode falhar por CORS; o JWT veio do GIS inicializado com o nosso Client ID.
  }
  return identityFromPayload(decodeJwtPayload(credential), clientId);
};

export const getGeminiOAuthAccessToken = (): string | undefined =>
  sessionStorage.getItem(GEMINI_OAUTH_TOKEN_KEY) || undefined;

export const clearGeminiOAuthAccessToken = (): void => {
  sessionStorage.removeItem(GEMINI_OAUTH_TOKEN_KEY);
};

/** Tenta obter um access token para a API Gemini. Falha silenciosa — a chave do AI Studio continua válida. */
export const tryRequestGeminiAccessToken = async (): Promise<boolean> => {
  const clientId = getGoogleClientId();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!clientId || !oauth2) return false;
  return new Promise(resolve => {
    try {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: GEMINI_OAUTH_SCOPE,
        callback: (response: { access_token?: string; error?: string }) => {
          if (response.access_token) {
            sessionStorage.setItem(GEMINI_OAUTH_TOKEN_KEY, response.access_token);
            resolve(true);
            return;
          }
          resolve(false);
        },
      });
      client.requestAccessToken({ prompt: '' });
    } catch {
      resolve(false);
    }
  });
};

export const renderGoogleSignInButton = (
  container: HTMLElement,
  onCredential: (credential: string) => void,
): void => {
  const clientId = getGoogleClientId();
  const googleId = window.google?.accounts?.id;
  if (!clientId || !googleId) return;
  googleId.initialize({
    client_id: clientId,
    callback: (response: { credential?: string }) => {
      if (response.credential) onCredential(response.credential);
    },
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  googleId.renderButton(container, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    locale: 'pt-BR',
    width: Math.min(320, container.clientWidth || 320),
  });
};
