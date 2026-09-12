import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendImportedId, remainingImportItems } from './importCheckpoint.ts';
import { matchIncomingMember } from './sectionPackMatch.ts';

describe('import matcher and resume', () => {
  it('does not auto-merge homonyms with different registers', () => {
    const existing = [
      { id: 'a', name: 'João Silva', registerNumber: '111' },
      { id: 'b', name: 'João Silva', registerNumber: '222' },
    ];
    const incoming = { name: 'João Silva', registerNumber: '333' };
    assert.equal(matchIncomingMember(incoming, existing).kind, 'none');
    const byNameOnly = { name: 'João Silva' };
    assert.equal(matchIncomingMember(byNameOnly, existing).kind, 'ambiguous-name');
  });

  it('resumes after a mid-failure without duplicating saved ids', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    let checkpoint = { sectionId: 'tropa', fingerprint: '1|2|3', savedIds: ['1'] };
    const rest = remainingImportItems(items, checkpoint);
    assert.deepEqual(rest.map(item => item.id), ['2', '3']);
    checkpoint = appendImportedId(checkpoint, '2');
    const again = remainingImportItems(items, checkpoint);
    assert.deepEqual(again.map(item => item.id), ['3']);
    const full = remainingImportItems(items, appendImportedId(checkpoint, '3'));
    assert.deepEqual(full, []);
  });
});
