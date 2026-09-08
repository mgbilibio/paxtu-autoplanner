import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import {
  buildOllamaListRequest,
  DEFAULT_OLLAMA_LOCAL_URL,
  listOllamaModels,
  OLLAMA_CLOUD_BASE_URL,
} from './ollamaListRequest.ts';

test('listagem local usa a URL do campo e não manda Authorization', () => {
  const loopback = buildOllamaListRequest({ mode: 'local', baseUrl: DEFAULT_OLLAMA_LOCAL_URL });
  assert.equal(loopback.url, 'http://127.0.0.1:11434/api/tags');
  assert.equal(loopback.authorization, undefined);

  const viaLocalhost = buildOllamaListRequest({ mode: 'local', baseUrl: 'http://localhost:11434' });
  assert.equal(viaLocalhost.url, 'http://localhost:11434/api/tags');
  assert.equal(viaLocalhost.authorization, undefined);

  assert.equal(DEFAULT_OLLAMA_LOCAL_URL, 'http://127.0.0.1:11434');
});

test('listagem Cloud usa ollama.com e Bearer da chave colada', () => {
  const req = buildOllamaListRequest({ mode: 'cloud', cloudApiKey: 'ollama-cloud-key' });
  assert.equal(req.url, `${OLLAMA_CLOUD_BASE_URL}/api/tags`);
  assert.equal(req.url, 'https://ollama.com/api/tags');
  assert.equal(req.authorization, 'Bearer ollama-cloud-key');

  const already = buildOllamaListRequest({ mode: 'cloud', cloudApiKey: 'Bearer already' });
  assert.equal(already.authorization, 'Bearer already');

  const noKey = buildOllamaListRequest({ mode: 'cloud', cloudApiKey: '' });
  assert.equal(noKey.url, 'https://ollama.com/api/tags');
  assert.equal(noKey.authorization, undefined);
});

test('listModels local: fetch na URL do daemon, sem chave, sem IDs Gemini', async () => {
  const seen: { url?: string; auth?: string } = {};
  const server = createServer((req, res) => {
    seen.url = req.url;
    seen.auth = req.headers.authorization;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      models: [
        { name: 'llama3.2:latest', modified_at: '2026-01-01', size: 1 },
        { name: 'gemini-3.5-flash-lite', modified_at: '2026-01-01', size: 1 },
        { name: 'gemini-2.5-flash-preview', modified_at: '2026-01-01', size: 1 },
        { name: 'qwen2.5:7b', modified_at: '2026-01-01', size: 1 },
      ],
    }));
  });
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    const listed = await listOllamaModels({ mode: 'local', baseUrl: `http://127.0.0.1:${address.port}` });
    assert.equal(seen.url, '/api/tags');
    assert.equal(seen.auth, undefined);
    assert.deepEqual(listed, ['llama3.2:latest', 'qwen2.5:7b']);
    assert.equal(listed.some(id => /^gemini/i.test(id)), false);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(err => { if (err) reject(err); else resolve(); });
    });
  }
});

test('listModels Cloud: fetch em ollama.com com Bearer e sem IDs Gemini', async () => {
  const calls: Array<{ url: string; auth: string | null }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(input), auth: headers.get('authorization') });
    return new Response(JSON.stringify({
      models: [
        { name: 'kimi-k2.5:cloud', modified_at: '2026-01-01', size: 1 },
        { name: 'gemini-3.8-flash', modified_at: '2026-01-01', size: 1 },
        { name: 'minimax-m3:cloud', modified_at: '2026-01-01', size: 1 },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    const listed = await listOllamaModels({ mode: 'cloud', cloudApiKey: 'ollama-cloud-key' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://ollama.com/api/tags');
    assert.equal(calls[0].auth, 'Bearer ollama-cloud-key');
    assert.deepEqual(listed, ['kimi-k2.5:cloud', 'minimax-m3:cloud']);
    assert.equal(listed.some(id => /^gemini/i.test(id)), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
