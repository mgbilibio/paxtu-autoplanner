import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearXaiBrowserSession,
  explainXaiWebAccessGap,
  getXaiBrowserStatus,
  saveXaiBrowserSession,
} from './xaiOAuthSession.ts';
import { DEFAULT_XAI_OAUTH_PROXY_ORIGIN } from './xaiOAuthConfig.ts';

const memory = new Map<string, string>();

const installSessionStorage = (): void => {
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
    removeItem: (key: string) => { memory.delete(key); },
    clear: () => { memory.clear(); },
    key: (index: number) => [...memory.keys()][index] ?? null,
    get length() { return memory.size; },
  };
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
};

test('sessão xOAuth web fica no sessionStorage e some no clear', () => {
  installSessionStorage();
  memory.clear();
  saveXaiBrowserSession('tok-access', 'tok-refresh', 3600, { email: 'chefe@example.com', name: 'Chefe' });
  const connected = getXaiBrowserStatus();
  assert.equal(connected.connected, true);
  assert.equal(connected.email, 'chefe@example.com');
  assert.equal(connected.proxyConfigured, true);
  assert.equal(connected.message.includes('chefe@example.com'), true);
  clearXaiBrowserSession();
  const empty = getXaiBrowserStatus();
  assert.equal(empty.connected, false);
  assert.match(empty.message, /não conectada/i);
  assert.doesNotMatch(empty.message, /VITE_XAI_PROXY_URL|npm run|Vite|Worker/i);
});

test('sem chave e sem sessão o site pede o login no navegador, sem setup', () => {
  installSessionStorage();
  memory.clear();
  const gap = explainXaiWebAccessGap(false);
  assert.ok(gap);
  assert.match(gap || '', /Entre com X\/Grok/);
  assert.doesNotMatch(gap || '', /VITE_XAI_PROXY_URL|npm run|Vite|__xai_oauth/);
  assert.equal(explainXaiWebAccessGap(true), null);
});

test('proxy padrão do site é o paxtu-xai-proxy', () => {
  installSessionStorage();
  memory.clear();
  const status = getXaiBrowserStatus();
  assert.equal(status.proxyConfigured, true);
  assert.equal(DEFAULT_XAI_OAUTH_PROXY_ORIGIN, 'https://paxtu-xai-proxy.margusbilibio.workers.dev');
  assert.doesNotMatch(DEFAULT_XAI_OAUTH_PROXY_ORIGIN, /socialkids-xai-proxy/);
});
