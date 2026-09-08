import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GEMINI_MODEL,
  offlineGeminiModels,
  pickPreferredGeminiModel,
  withGeminiCatalogFallback,
} from './geminiModels.ts';

test('padrão offline é Flash-Lite e a lista fria não fica vazia', () => {
  const offline = offlineGeminiModels();
  assert.ok(offline.length >= 2);
  assert.equal(offline[0], DEFAULT_GEMINI_MODEL);
  assert.match(DEFAULT_GEMINI_MODEL, /flash-lite/i);
});

test('pickPreferredGeminiModel prefere o modelo atual se ele estiver no catálogo vivo', () => {
  assert.equal(
    pickPreferredGeminiModel(['gemini-3.7-flash', 'gemini-3.5-flash-lite'], 'gemini-3.7-flash'),
    'gemini-3.7-flash',
  );
});

test('pickPreferredGeminiModel escolhe Flash-Lite mais novo quando não há escolha salva', () => {
  assert.equal(
    pickPreferredGeminiModel(['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash-lite']),
    'gemini-3.5-flash-lite',
  );
});

test('catálogo vazio ou falho não devolve string vazia', () => {
  assert.equal(pickPreferredGeminiModel([]), DEFAULT_GEMINI_MODEL);
  assert.equal(pickPreferredGeminiModel([], ''), DEFAULT_GEMINI_MODEL);
  assert.deepEqual(withGeminiCatalogFallback([]), offlineGeminiModels());
});

test('catálogo vivo tem prioridade sobre o fallback offline', () => {
  const live = ['gemini-3.7-flash', 'gemini-3.6-flash'];
  assert.deepEqual(withGeminiCatalogFallback(live), ['gemini-3.7-flash', 'gemini-3.6-flash']);
  assert.equal(pickPreferredGeminiModel(live), 'gemini-3.7-flash');
});
