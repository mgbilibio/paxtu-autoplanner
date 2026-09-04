import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVITY_JSON_HINT, PRACTICAL_CONTENT_RULES } from './activityBriefs.ts';

test('regras de geração exigem material de campo, não slogan', () => {
  assert.match(PRACTICAL_CONTENT_RULES, /conteudoPronto/);
  assert.match(PRACTICAL_CONTENT_RULES, /SCRIPT FALADO|script falado/i);
  assert.match(PRACTICAL_CONTENT_RULES, /roteiro cronometrado/i);
  assert.match(PRACTICAL_CONTENT_RULES, /Não invente código/i);
  assert.match(ACTIVITY_JSON_HINT, /conteudoPronto/);
  assert.match(ACTIVITY_JSON_HINT, /passos/);
});
