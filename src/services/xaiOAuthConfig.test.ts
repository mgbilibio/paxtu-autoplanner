import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeXaiProxyFailure,
  missingXaiProxyMessage,
  unreachableXaiProxyMessage,
  xaiOAuthUrls,
} from './xaiOAuthConfig.ts';

test('sem VITE_XAI_PROXY_URL o Device OAuth web não finge que o proxy existe', () => {
  const urls = xaiOAuthUrls();
  assert.equal(urls.proxyConfigured, false);
  assert.match(urls.device, /auth\.x\.ai/);
  assert.match(missingXaiProxyMessage(), /VITE_XAI_PROXY_URL/);
  assert.match(missingXaiProxyMessage(), /Cloudflare|Worker/i);
});

test('falha de rede do proxy vira alerta acionável', () => {
  assert.equal(describeXaiProxyFailure(new TypeError('Failed to fetch')), unreachableXaiProxyMessage());
  assert.match(unreachableXaiProxyMessage(), /não respondeu|não fala/i);
});
