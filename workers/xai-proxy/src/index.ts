import {
  allowedOrigin,
  corsHeaders,
  MAX_BODY_BYTES,
  resolveUpstream,
} from './routes';

interface WorkerEnvironment {
  ALLOW_LOCALHOST?: string;
}

const jsonResponse = (body: unknown, status: number, origin?: string): Response => {
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
  async fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(
      request.headers.get('Origin'),
      environment.ALLOW_LOCALHOST === '1',
    );
    if (request.method === 'OPTIONS') {
      return origin
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : new Response(null, { status: 403 });
    }
    if (!origin) return jsonResponse({ error: 'Origin not allowed' }, 403);
    const upstream = resolveUpstream(request.method, url.pathname);
    if (!upstream) return jsonResponse({ error: 'Route not found' }, 404, origin);
    const requestBody = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    if (requestBody && requestBody.byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Payload too large' }, 413, origin);
    }
    const headers = new Headers({
      Accept: request.headers.get('Accept') || 'application/json',
      'User-Agent': 'ScoutsAuto/2026.9 (xai-oauth-proxy)',
    });
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);
    const authorization = request.headers.get('Authorization');
    if (authorization) headers.set('Authorization', authorization);
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
