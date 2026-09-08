import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { allowedOrigin, requiresUserAuthorization, resolveUpstream } from './routes.ts';

const read = (fromHere: string): string =>
  readFileSync(fileURLToPath(new URL(fromHere, import.meta.url)), 'utf8');

test('wrangler name é paxtu-xai-proxy', () => {
  const wrangler = read('../../wrangler.toml');
  const pkg = read('../../package.json');
  assert.match(wrangler, /^name = "paxtu-xai-proxy"$/m);
  assert.match(pkg, /"name": "paxtu-xai-proxy"/);
  assert.doesNotMatch(wrangler, /socialkids/i);
  assert.doesNotMatch(pkg, /socialkids/i);
});

test('libera a origem publicada do Paxtu e qualquer localhost', () => {
  assert.equal(allowedOrigin('https://mgbilibio.github.io'), 'https://mgbilibio.github.io');
  assert.equal(allowedOrigin('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(allowedOrigin('http://127.0.0.1:4173'), 'http://127.0.0.1:4173');
  assert.equal(allowedOrigin('https://example.com'), null);
  assert.equal(allowedOrigin('https://socialkids.web.app'), null);
  assert.equal(allowedOrigin('https://socialkids.firebaseapp.com'), null);
  assert.equal(allowedOrigin('https://socialkids-xai-proxy.margusbilibio.workers.dev'), null);
});

test('encaminha device, token, userinfo, modelos e chat — e nada além disso', () => {
  assert.equal(resolveUpstream('POST', '/oauth/device'), 'https://auth.x.ai/oauth2/device/code');
  assert.equal(resolveUpstream('POST', '/oauth/token/'), 'https://auth.x.ai/oauth2/token');
  assert.equal(resolveUpstream('GET', '/oauth/userinfo'), 'https://auth.x.ai/oauth2/userinfo');
  assert.equal(resolveUpstream('GET', '/v1/language-models'), 'https://api.x.ai/v1/language-models');
  assert.equal(resolveUpstream('POST', '/v1/chat/completions'), 'https://api.x.ai/v1/chat/completions');
  assert.equal(resolveUpstream('GET', 'https://example.com'), null);
  assert.equal(resolveUpstream('POST', '/v1/other'), null);
});

test('rotas de API exigem Bearer; device/token não', () => {
  assert.equal(requiresUserAuthorization('/v1/language-models'), true);
  assert.equal(requiresUserAuthorization('/v1/chat/completions'), true);
  assert.equal(requiresUserAuthorization('/oauth/device'), false);
});
