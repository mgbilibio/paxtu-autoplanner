import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

const PAXTU_XAI_PROXY_ORIGIN = 'https://paxtu-xai-proxy.margusbilibio.workers.dev';
const FOREIGN_XAI_PROXY_HOST = 'socialkids-xai-proxy';

const rel = (fromHere: string): string => fileURLToPath(new URL(fromHere, import.meta.url));
const read = (fromHere: string): string => readFileSync(rel(fromHere), 'utf8');

const walkRuntimeFiles = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkRuntimeFiles(full, acc);
      continue;
    }
    if (/\.test\.[cm]?[jt]sx?$/.test(name)) continue;
    if (/\.(ts|tsx|js|jsx|html|md|toml)$/.test(name)) acc.push(full);
  }
  return acc;
};

test('sem VITE_XAI_PROXY_URL o Device OAuth usa o proxy Paxtu no site', () => {
  const origin = resolveXaiProxyOriginFrom({});
  assert.equal(origin, DEFAULT_XAI_OAUTH_PROXY_ORIGIN);
  assert.equal(origin, PAXTU_XAI_PROXY_ORIGIN);
  const urls = xaiOAuthUrls();
  assert.equal(urls.proxyConfigured, true);
  assert.equal(urls.proxyOrigin, DEFAULT_XAI_OAUTH_PROXY_ORIGIN);
  assert.equal(urls.device, `${DEFAULT_XAI_OAUTH_PROXY_ORIGIN}/oauth/device`);
  assert.equal(urls.token, `${DEFAULT_XAI_OAUTH_PROXY_ORIGIN}/oauth/token`);
  assert.equal(urls.userInfo, `${DEFAULT_XAI_OAUTH_PROXY_ORIGIN}/oauth/userinfo`);
  assert.doesNotMatch(urls.device, /auth\.x\.ai/);
  assert.doesNotMatch(urls.device, /__xai_oauth|localhost|127\.0\.0\.1/);
  assert.doesNotMatch(urls.device, new RegExp(FOREIGN_XAI_PROXY_HOST));
  assert.equal(resolveXaiProxyOrigin(), DEFAULT_XAI_OAUTH_PROXY_ORIGIN);
});

test('src e README não usam o proxy SocialKids como dependência de runtime', () => {
  assert.equal(DEFAULT_XAI_OAUTH_PROXY_ORIGIN, PAXTU_XAI_PROXY_ORIGIN);
  const srcRoot = rel('../');
  const repoRoot = rel('../../');
  const files = [
    ...walkRuntimeFiles(srcRoot),
    join(repoRoot, 'README.md'),
    join(repoRoot, 'index.html'),
    join(repoRoot, 'workers/xai-proxy/wrangler.toml'),
  ];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    assert.equal(
      src.includes(FOREIGN_XAI_PROXY_HOST),
      false,
      `${file} ainda cita ${FOREIGN_XAI_PROXY_HOST} como dependência`,
    );
  }
  const wrangler = read('../../workers/xai-proxy/wrangler.toml');
  assert.match(wrangler, /^name = "paxtu-xai-proxy"$/m);
  const csp = read('../../index.html');
  assert.match(csp, /https:\/\/paxtu-xai-proxy\.margusbilibio\.workers\.dev/);
  assert.equal(csp.includes(FOREIGN_XAI_PROXY_HOST), false);
  const readme = read('../../README.md');
  assert.match(readme, /https:\/\/paxtu-xai-proxy\.margusbilibio\.workers\.dev/);
  assert.equal(readme.includes(FOREIGN_XAI_PROXY_HOST), false);
});

test('DEV ou ausência de env não desviam o login para Vite/localhost', () => {
  assert.equal(
    resolveXaiProxyOriginFrom({ envProxy: '' }),
    DEFAULT_XAI_OAUTH_PROXY_ORIGIN,
  );
  assert.doesNotMatch(resolveXaiProxyOriginFrom({}), /__xai_oauth/);
});

test('produção recusa HTTP externo, host não aprovado e URL com credenciais', () => {
  assert.equal(isUsableXaiProxyOrigin('http://evil.example'), false);
  assert.equal(isUsableXaiProxyOrigin('https://other.workers.dev'), false);
  assert.equal(isUsableXaiProxyOrigin('https://user:pass@paxtu-xai-proxy.margusbilibio.workers.dev'), false);
  assert.equal(isUsableXaiProxyOrigin('http://localhost:8787'), true);
  assert.equal(
    resolveXaiProxyOriginFrom({
      override: 'https://other.workers.dev',
      envProxy: 'https://custom.workers.dev',
    }),
    DEFAULT_XAI_OAUTH_PROXY_ORIGIN,
  );
  assert.equal(
    resolveXaiProxyOriginFrom({ override: PAXTU_XAI_PROXY_ORIGIN }),
    PAXTU_XAI_PROXY_ORIGIN,
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
  assert.equal(isUsableXaiProxyOrigin(PAXTU_XAI_PROXY_ORIGIN), true);
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
