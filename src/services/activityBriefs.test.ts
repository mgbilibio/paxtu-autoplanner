import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./activityBriefs.ts', import.meta.url), 'utf8');

test('regras de geração exigem material de campo, não slogan', () => {
  assert.match(source, /CONTEÚDO PRÁTICO PARA CAMPO/);
  assert.match(source, /conteudoPronto/);
  assert.match(source, /SCRIPT FALADO/);
  assert.match(source, /roteiro cronometrado/);
  assert.match(source, /Não invente código de progressão/);
  assert.match(source, /"passos"/);
});
