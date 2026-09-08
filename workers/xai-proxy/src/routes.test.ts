import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedOrigin, requiresUserAuthorization, resolveUpstream } from './routes.ts';

test('libera a origem publicada do Paxtu e qualquer localhost', () => {
  assert.equal(allowedOrigin('https://mgbilibio.github.io'), 'https://mgbilibio.github.io');
  assert.equal(allowedOrigin('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(allowedOrigin('http://127.0.0.1:4173'), 'http://127.0.0.1:4173');
  assert.equal(allowedOrigin('https://example.com'), null);
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
