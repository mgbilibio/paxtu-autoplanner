import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearXaiBrowserSession,
  explainXaiWebAccessGap,
  getXaiBrowserStatus,
  saveXaiBrowserSession,
} from './xaiOAuthSession.ts';

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
  assert.equal(connected.proxyConfigured, false);
  clearXaiBrowserSession();
  const empty = getXaiBrowserStatus();
  assert.equal(empty.connected, false);
  assert.match(empty.message, /VITE_XAI_PROXY_URL|proxy/i);
});

test('sem chave e sem sessão o site explica o proxy, não falha em silêncio', () => {
  installSessionStorage();
  memory.clear();
  const gap = explainXaiWebAccessGap(false);
  assert.ok(gap);
  assert.match(gap || '', /VITE_XAI_PROXY_URL/);
  assert.equal(explainXaiWebAccessGap(true), null);
});
