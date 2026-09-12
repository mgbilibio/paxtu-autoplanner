import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ScoutBranch } from '../../types.ts';
import { resolveProgressionCode } from './codeResolver.ts';

describe('progression codes against catalog and branch', () => {
  it('rejects nonexistent block and other-branch-incompatible codes', () => {
    const bad = resolveProgressionCode('B999.F999', ScoutBranch.ESCOTEIRO);
    assert.equal(bad.ok, false);
    const senior = resolveProgressionCode('B1.F1', ScoutBranch.SENIOR);
    assert.equal(senior.ok, false);
  });

  it('resolves a real Escoteiro fixed action', () => {
    const ok = resolveProgressionCode('B1.F1', ScoutBranch.ESCOTEIRO);
    assert.equal(ok.ok, true);
  });

  it('rejects a specialty id that is not in UEB 2026', () => {
    const missing = resolveProgressionCode('ESP-UEB26-9', ScoutBranch.ESCOTEIRO);
    assert.equal(missing.ok, false);
  });

  it('rejects unknown ESP-GUIA ids and accepts one from the historical catalog', async () => {
    const { ESPECIALIDADES_GUIA } = await import('../../data/generated/especialidades_guia.ts');
    const realId = ESPECIALIDADES_GUIA[0]?.id;
    assert.ok(realId);
    const ok = resolveProgressionCode(`ESP-GUIA-${realId}`, ScoutBranch.ESCOTEIRO);
    assert.equal(ok.ok, true);
    const missing = resolveProgressionCode('ESP-GUIA-999999', ScoutBranch.ESCOTEIRO);
    assert.equal(missing.ok, false);
  });
});
