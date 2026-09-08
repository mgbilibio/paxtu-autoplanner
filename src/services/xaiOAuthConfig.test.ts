import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DEFAULT_XAI_OAUTH_PROXY_ORIGIN,
  describeXaiApiFailure,
  describeXaiProxyFailure,
  isUsableXaiProxyOrigin,
  missingXaiProxyMessage,
  resolveXaiProxyOrigin,
  resolveXaiProxyOriginFrom,
  unreachableXaiProxyMessage,
  xaiDirectApiUrl,
  xaiOAuthUrls,
} from './xaiOAuthConfig.ts';

const rel = (fromHere: string): string => fileURLToPath(new URL(fromHere, import.meta.url));
const read = (fromHere: string): string => readFileSync(rel(fromHere), 'utf8');

test('sem VITE_XAI_PROXY_URL o Device OAuth usa o proxy SocialKids no site', () => {
  const origin = resolveXaiProxyOriginFrom({});
  assert.equal(origin, DEFAULT_XAI_OAUTH_PROXY_ORIGIN);
  assert.equal(origin, 'https://socialkids-xai-proxy.margusbilibio.workers.dev');
  const urls = xaiOAuthUrls();
  assert.equal(urls.proxyConfigured, true);
  assert.equal(urls.proxyOrigin, DEFAULT_XAI_OAUTH_PROXY_ORIGIN);
  assert.equal(urls.device, `${DEFAULT_XAI_OAUTH_PROXY_ORIGIN}/oauth/device`);
  assert.equal(urls.token, `${DEFAULT_XAI_OAUTH_PROXY_ORIGIN}/oauth/token`);
  assert.equal(urls.userInfo, `${DEFAULT_XAI_OAUTH_PROXY_ORIGIN}/oauth/userinfo`);
  assert.doesNotMatch(urls.device, /auth\.x\.ai/);
  assert.doesNotMatch(urls.device, /__xai_oauth|localhost|127\.0\.0\.1/);
  assert.equal(resolveXaiProxyOrigin(), DEFAULT_XAI_OAUTH_PROXY_ORIGIN);
});

test('DEV ou ausência de env não desviam o login para Vite/localhost', () => {
  assert.equal(
    resolveXaiProxyOriginFrom({ envProxy: '' }),
    DEFAULT_XAI_OAUTH_PROXY_ORIGIN,
  );
  assert.doesNotMatch(resolveXaiProxyOriginFrom({}), /__xai_oauth/);
});

test('override avançado ganha do padrão; env só se não houver override', () => {
  assert.equal(
    resolveXaiProxyOriginFrom({
      override: 'https://other.workers.dev',
      envProxy: 'https://custom.workers.dev',
    }),
    'https://other.workers.dev',
  );
  assert.equal(
    resolveXaiProxyOriginFrom({ envProxy: 'https://custom.workers.dev' }),
    'https://custom.workers.dev',
  );
});

test('catálogo e chat vão direto para api.x.ai, nunca pelo proxy OAuth', () => {
  const urls = xaiOAuthUrls();
  assert.equal(urls.models, 'https://api.x.ai/v1/language-models');
  assert.equal(urls.chat, 'https://api.x.ai/v1/chat/completions');
  assert.equal(xaiDirectApiUrl('models'), 'https://api.x.ai/v1/language-models');
  assert.equal(xaiDirectApiUrl('chat'), 'https://api.x.ai/v1/chat/completions');
  assert.doesNotMatch(urls.models, /workers\.dev|__xai_oauth/);
  assert.doesNotMatch(urls.chat, /workers\.dev|__xai_oauth/);
});

test('auth.x.ai e api.x.ai não valem como proxy', () => {
  assert.equal(isUsableXaiProxyOrigin('https://auth.x.ai'), false);
  assert.equal(isUsableXaiProxyOrigin('https://api.x.ai/v1'), false);
  assert.equal(isUsableXaiProxyOrigin('https://socialkids-xai-proxy.margusbilibio.workers.dev'), true);
  assert.equal(isUsableXaiProxyOrigin('/__xai_oauth'), false);
});

test('falha de rede do proxy vira alerta em português, nunca Failed to fetch cru', () => {
  const message = describeXaiProxyFailure(new TypeError('Failed to fetch'));
  assert.doesNotMatch(message, /Failed to fetch/i);
  assert.doesNotMatch(message, /VITE_XAI_PROXY_URL|workers\/xai-proxy|publique|npm run|Vite|__xai_oauth/i);
  assert.match(message, /não respondeu/i);
  assert.match(unreachableXaiProxyMessage(), /não respondeu/i);
  assert.doesNotMatch(missingXaiProxyMessage(), /VITE_XAI_PROXY_URL|workers\/xai-proxy|npm run/i);
  assert.match(describeXaiApiFailure(new TypeError('Failed to fetch')), /API da xAI/i);
});

test('xaiService lista modelos e chat em api.x.ai', () => {
  const src = read('./xaiService.ts');
  assert.match(src, /xaiDirectApiUrl/);
  assert.doesNotMatch(src, /urls\.models|urls\.chat/);
  assert.doesNotMatch(src, /xaiOAuthUrls\(\)\.models/);
});

test('login xOAuth no site não pede Vite, npm nem Worker novo', () => {
  const files = [
    '../components/XaiOAuthPanel.tsx',
    '../App.tsx',
    '../components/SetupWizard.tsx',
    '../components/help/helpContent.ts',
    './aiLoginStatus.ts',
    './xaiOAuthSession.ts',
    '../../docs/usersmanual.html',
  ];
  for (const file of files) {
    const src = read(file);
    assert.equal(/VITE_XAI_PROXY_URL/.test(src), false, `${file} ainda cita VITE_XAI_PROXY_URL`);
    assert.equal(/npm run dev/.test(src), false, `${file} ainda pede npm run dev para o login`);
    assert.equal(/__xai_oauth/.test(src), false, `${file} ainda aponta para o proxy Vite`);
    assert.equal(/workers\/xai-proxy/.test(src), false, `${file} ainda pede deploy do Worker`);
  }
  const readme = read('../../README.md');
  assert.equal(/VITE_XAI_PROXY_URL/.test(readme), false, 'README ainda cita VITE_XAI_PROXY_URL');
  assert.equal(/__xai_oauth/.test(readme), false, 'README ainda aponta para o proxy Vite');
});
