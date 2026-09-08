import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeXaiProxyFailure,
  isUsableXaiProxyOrigin,
  missingXaiProxyMessage,
  unreachableXaiProxyMessage,
  xaiOAuthUrls,
} from './xaiOAuthConfig.ts';

test('sem proxy o Device OAuth web não aponta para auth.x.ai', () => {
  const urls = xaiOAuthUrls();
  assert.equal(urls.proxyConfigured, false);
  assert.equal(urls.device, '');
  assert.doesNotMatch(urls.device, /auth\.x\.ai/);
  assert.match(missingXaiProxyMessage(), /VITE_XAI_PROXY_URL/);
  assert.match(missingXaiProxyMessage(), /CORS|Failed to fetch/i);
});

test('auth.x.ai e api.x.ai não valem como proxy', () => {
  assert.equal(isUsableXaiProxyOrigin('https://auth.x.ai'), false);
  assert.equal(isUsableXaiProxyOrigin('https://api.x.ai/v1'), false);
  assert.equal(isUsableXaiProxyOrigin('https://paxtu-xai-proxy.example.workers.dev'), true);
  assert.equal(isUsableXaiProxyOrigin('/__xai_oauth'), true);
});

test('falha de rede do proxy vira alerta em português, nunca Failed to fetch cru', () => {
  const message = describeXaiProxyFailure(new TypeError('Failed to fetch'));
  assert.doesNotMatch(message, /^Failed to fetch$/i);
  assert.match(message, /proxy|Worker|VITE_XAI_PROXY_URL/i);
  assert.match(unreachableXaiProxyMessage(), /não respondeu/i);
});
