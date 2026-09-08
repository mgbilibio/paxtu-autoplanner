import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { explainOllamaLocalFailure, OLLAMA_LOCAL_ORIGIN_HINT } from './ollamaLocalAccess.ts';

test('falha local fala em origem do site, nunca em aplicativo desktop', () => {
  const text = explainOllamaLocalFailure('http://127.0.0.1:11434', 'Failed to fetch');
  assert.match(text, new RegExp(OLLAMA_LOCAL_ORIGIN_HINT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(text, /127\.0\.0\.1:11434/);
  assert.match(text, /https:\/\/mgbilibio\.github\.io/);
  assert.match(text, /conteúdo misto/);
  assert.equal(/aplicativo desktop|só no desktop|não roda neste site/i.test(text), false);
});

test('timeout e CORS usam o mesmo aviso de origem', () => {
  assert.match(explainOllamaLocalFailure('http://127.0.0.1:11434', 'timeout'), /https:\/\/mgbilibio\.github\.io/);
  assert.match(explainOllamaLocalFailure('http://localhost:11434', 'CORS blocked'), /https:\/\/mgbilibio\.github\.io/);
  assert.match(explainOllamaLocalFailure('http://127.0.0.1:11434', 'Mixed Content'), /conteúdo misto/);
});

test('código do provedor e das configurações não bloqueia Ollama local na web', () => {
  const files = [
    'llmProvider.ts',
    '../App.tsx',
    '../components/SetupWizard.tsx',
    '../components/help/helpContent.ts',
    '../../README.md',
  ].map(rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
  for (const src of files) {
    assert.equal(/Ollama local só funciona no aplicativo desktop/i.test(src), false);
    assert.equal(/Ollama local não roda neste site/i.test(src), false);
    assert.equal(/só no app desktop/i.test(src), false);
    assert.equal(/Baixar Ollama/.test(src), false);
    assert.equal(/aplicativo desktop/i.test(src), false);
  }
});

test('código de progressão no card quebra linha e não trunca', () => {
  const src = readFileSync(fileURLToPath(new URL('../components/PlanDisplay.tsx', import.meta.url)), 'utf8');
  const start = src.indexOf('Código de progressão');
  assert.ok(start >= 0);
  const block = src.slice(start, start + 400);
  assert.match(block, /wrap-por-text/);
  assert.equal(/truncate|line-clamp|whitespace-nowrap|overflow-hidden/.test(block), false);
});
