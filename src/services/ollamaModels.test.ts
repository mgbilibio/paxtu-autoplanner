import assert from 'node:assert/strict';
import test from 'node:test';
import { belongsInOllamaSelector } from './ollamaModels.ts';

test('seletor Ollama não mostra IDs do catálogo Gemini', () => {
  assert.equal(belongsInOllamaSelector('gemini-3.8-flash'), false);
  assert.equal(belongsInOllamaSelector('gemini-3.5-flash-lite'), false);
  assert.equal(belongsInOllamaSelector('llama3.2:latest'), true);
  assert.equal(belongsInOllamaSelector('minimax-m3:cloud'), true);
  assert.equal(belongsInOllamaSelector('gemini-2.5-flash-preview'), true);
});
