export const PRODUCTION_ORIGINS = [
  'https://mgbilibio.github.io',
] as const;

export const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const;

const UPSTREAM: Record<string, string> = {
  'POST /oauth/device': 'https://auth.x.ai/oauth2/device/code',
  'POST /oauth/token': 'https://auth.x.ai/oauth2/token',
  'GET /oauth/userinfo': 'https://auth.x.ai/oauth2/userinfo',
};

export const MAX_BODY_BYTES = 64_000;

export const allowedOrigin = (
  origin: string | null,
  allowLocalhost: boolean,
): string | null => {
  if (!origin) return null;
  const allowed = allowLocalhost
    ? [...PRODUCTION_ORIGINS, ...LOCAL_ORIGINS]
    : [...PRODUCTION_ORIGINS];
  return (allowed as string[]).includes(origin) ? origin : null;
};

export const resolveUpstream = (method: string, pathname: string): string | null => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return UPSTREAM[`${method.toUpperCase()} ${normalized}`] || null;
};

export const corsHeaders = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});
