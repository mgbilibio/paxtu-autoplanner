import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedOrigin, resolveUpstream } from './routes.ts';

test('libera somente a origem publicada do Paxtu em produção', () => {
  assert.equal(allowedOrigin('https://mgbilibio.github.io', false), 'https://mgbilibio.github.io');
  assert.equal(allowedOrigin('https://example.com', false), null);
  assert.equal(allowedOrigin('http://localhost:5173', false), null);
});

test('libera localhost apenas por configuração explícita', () => {
  assert.equal(allowedOrigin('http://localhost:5173', true), 'http://localhost:5173');
});

test('não funciona como proxy aberto', () => {
  assert.equal(resolveUpstream('POST', '/oauth/device'), 'https://auth.x.ai/oauth2/device/code');
  assert.equal(resolveUpstream('POST', '/oauth/token/'), 'https://auth.x.ai/oauth2/token');
  assert.equal(resolveUpstream('POST', '/v1/chat/completions'), null);
  assert.equal(resolveUpstream('GET', 'https://example.com'), null);
});
