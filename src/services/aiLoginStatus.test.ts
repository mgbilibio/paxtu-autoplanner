import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveGeminiLoginStatus, deriveGrokLoginStatus } from './aiLoginStatus.ts';

const grokBase = {
  hasGeminiCredentials: false,
  hasXaiApiKey: false,
  webSessionConnected: false,
  proxyConfigured: true,
  isWeb: true,
};

test('Gemini fica vermelho sem credencial e só verde após verificação ok', () => {
  assert.equal(deriveGeminiLoginStatus({ hasGeminiCredentials: false }).online, false);
  assert.equal(deriveGeminiLoginStatus({ hasGeminiCredentials: true, geminiProbe: 'skipped' }).online, false);
  assert.equal(deriveGeminiLoginStatus({ hasGeminiCredentials: true, geminiProbe: 'fail' }).online, false);
  assert.equal(deriveGeminiLoginStatus({ hasGeminiCredentials: true, geminiProbe: 'ok' }).online, true);
  assert.match(deriveGeminiLoginStatus({ hasGeminiCredentials: false }).label, /Gemini/);
});

test('Grok na web não fica verde só porque existe texto de chave se a sonda falhou', () => {
  const red = deriveGrokLoginStatus({
    ...grokBase,
    hasXaiApiKey: true,
    grokProbe: 'fail',
  });
  assert.equal(red.online, false);
  assert.match(red.detail, /falhou/i);
});

test('Grok na web fica verde com sessão xOAuth e proxy, após sonda ok', () => {
  const green = deriveGrokLoginStatus({
    ...grokBase,
    webSessionConnected: true,
    proxyConfigured: true,
    grokProbe: 'ok',
  });
  assert.equal(green.online, true);
  assert.equal(green.label, 'Grok');
});

test('Grok na web fica vermelho se o proxy falta e não há chave', () => {
  const red = deriveGrokLoginStatus({
    ...grokBase,
    proxyConfigured: false,
    grokProbe: 'skipped',
  });
  assert.equal(red.online, false);
  assert.match(red.detail, /proxy/i);
});

test('Grok no desktop não afirma online se o binário falta', () => {
  const red = deriveGrokLoginStatus({
    ...grokBase,
    isWeb: false,
    proxyConfigured: false,
    desktopInstalled: false,
    desktopConnected: true,
    grokProbe: 'skipped',
  });
  assert.equal(red.online, false);
  assert.match(red.detail, /não encontrado/i);
});
