import type { Connect, Plugin } from 'vite';

export const XAI_DEV_PROXY_PREFIX = '/__xai_oauth';

const UPSTREAM: Record<string, string> = {
  'POST /oauth/device': 'https://auth.x.ai/oauth2/device/code',
  'POST /oauth/token': 'https://auth.x.ai/oauth2/token',
  'GET /oauth/userinfo': 'https://auth.x.ai/oauth2/userinfo',
  'GET /v1/language-models': 'https://api.x.ai/v1/language-models',
  'POST /v1/chat/completions': 'https://api.x.ai/v1/chat/completions',
};

const readBody = async (req: Connect.IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const handle: Connect.NextHandleFunction = async (req, res, next) => {
  const rawUrl = req.url || '';
  if (!rawUrl.startsWith(XAI_DEV_PROXY_PREFIX)) {
    next();
    return;
  }
  const url = new URL(rawUrl, 'http://127.0.0.1');
  const pathname = url.pathname.slice(XAI_DEV_PROXY_PREFIX.length) || '/';
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const upstream = UPSTREAM[`${(req.method || 'GET').toUpperCase()} ${normalized}`];
  if (!upstream) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'rota não encontrada' }));
    return;
  }
  try {
    const headers: Record<string, string> = {
      Accept: typeof req.headers.accept === 'string' ? req.headers.accept : 'application/json',
      'User-Agent': 'ScoutsAuto/2026.9 (xai-oauth-dev-proxy)',
    };
    if (typeof req.headers['content-type'] === 'string') {
      headers['Content-Type'] = req.headers['content-type'];
    }
    if (typeof req.headers.authorization === 'string') {
      headers.Authorization = req.headers.authorization;
    }
    const method = (req.method || 'GET').toUpperCase();
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(req);
    const response = await fetch(upstream, { method, headers, body });
    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'proxy local xOAuth não alcançou a xAI',
      detail: String((error as Error)?.message || error),
    }));
  }
};

export const xaiOAuthDevProxy = (): Plugin => ({
  name: 'xai-oauth-dev-proxy',
  configureServer(server) {
    server.middlewares.use(handle);
  },
  configurePreviewServer(server) {
    server.middlewares.use(handle);
  },
});
