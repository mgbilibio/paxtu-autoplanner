import {
  allowedOrigin,
  corsHeaders,
  MAX_BODY_BYTES,
  requiresUserAuthorization,
  resolveUpstream,
} from './routes';

interface WorkerEnvironment {
  ALLOW_LOCALHOST?: string;
}

const jsonResponse = (body: unknown, status: number, origin?: string | null): Response => {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  if (origin) {
    Object.entries(corsHeaders(origin)).forEach(([name, value]) => headers.set(name, value));
  }
  return new Response(JSON.stringify(body), { status, headers });
};

export default {
  async fetch(request: Request, _environment: WorkerEnvironment): Promise<Response> {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get('Origin');
    const origin = allowedOrigin(requestOrigin);

    if (request.method === 'OPTIONS') {
      if (!origin) {
        return new Response(null, {
          status: 403,
          headers: corsHeaders(requestOrigin || '*'),
        });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!origin) {
      return jsonResponse(
        { error: 'origem não autorizada pelo proxy xAI' },
        403,
        requestOrigin,
      );
    }

    const upstream = resolveUpstream(request.method, url.pathname);
    if (!upstream) return jsonResponse({ error: 'rota não encontrada' }, 404, origin);

    const incomingAuth = request.headers.get('Authorization');
    if (requiresUserAuthorization(url.pathname) && !incomingAuth) {
      return jsonResponse({ error: 'Authorization Bearer obrigatório nesta rota' }, 401, origin);
    }

    const requestBody = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    if (requestBody && requestBody.byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'corpo grande demais para o proxy' }, 413, origin);
    }

    const headers = new Headers({
      Accept: request.headers.get('Accept') || 'application/json',
      'User-Agent': 'ScoutsAuto/2026.9 (xai-oauth-proxy)',
    });
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    if (incomingAuth) headers.set('Authorization', incomingAuth);

    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: requestBody,
      redirect: 'manual',
    });
    const outputHeaders = new Headers(corsHeaders(origin));
    outputHeaders.set('Cache-Control', 'no-store');
    outputHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json');
    return new Response(response.body, { status: response.status, headers: outputHeaders });
  },
};
