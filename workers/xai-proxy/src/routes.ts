export const PRODUCTION_ORIGINS = [
  'https://mgbilibio.github.io',
] as const;

export const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const UPSTREAM: Record<string, string> = {
  'POST /oauth/device': 'https://auth.x.ai/oauth2/device/code',
  'POST /oauth/token': 'https://auth.x.ai/oauth2/token',
  'GET /oauth/userinfo': 'https://auth.x.ai/oauth2/userinfo',
  'GET /v1/language-models': 'https://api.x.ai/v1/language-models',
  'POST /v1/chat/completions': 'https://api.x.ai/v1/chat/completions',
};

export const MAX_BODY_BYTES = 512_000;

export const allowedOrigin = (origin: string | null): string | null => {
  if (!origin) return null;
  if ((PRODUCTION_ORIGINS as readonly string[]).includes(origin)) return origin;
  if (LOCAL_ORIGIN_PATTERN.test(origin)) return origin;
  return null;
};

export const resolveUpstream = (method: string, pathname: string): string | null => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return UPSTREAM[`${method.toUpperCase()} ${normalized}`] || null;
};

export const requiresUserAuthorization = (pathname: string): boolean =>
  pathname.replace(/\/$/, '').startsWith('/v1/');

export const corsHeaders = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});
