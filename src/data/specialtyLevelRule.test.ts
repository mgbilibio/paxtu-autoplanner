import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { specialtyLevelRuleFor } from './specialtyLevelRule.ts';

describe('specialty level rules', () => {
  it('does not invent levels when the source omits them', () => {
    const rule = specialtyLevelRuleFor({ requisitos: ['a', 'b', 'c'] });
    assert.equal(rule.kind, 'unvalidated');
  });

  it('keeps explicit UEB levels', () => {
    const rule = specialtyLevelRuleFor({
      niveis: [
        { nome: 'Nível I', itens: 3 },
        { nome: 'Nível II', itens: 6 },
      ],
      fonte: 'UEB Especialidades 2026',
    });
    assert.equal(rule.kind, 'explicit');
    if (rule.kind === 'explicit') {
      assert.equal(rule.nivel1, 3);
      assert.equal(rule.nivel2, 6);
      assert.equal(rule.source, 'UEB Especialidades 2026');
    }
  });
});
