import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ScoutBranch, TroopRole } from '../../types.ts';
import type { ScoutMember } from '../../types.ts';
import {
  TRANSFER_IN_FLIGHT_MESSAGE,
  applyMembershipTransfer,
  applyTransferPatchesOnLive,
  assertTransferJournalAllows,
  beginTransferJournal,
  isTransferPhaseDone,
} from './transferMember.ts';

const youth = (over: Partial<ScoutMember> = {}): ScoutMember => ({
  id: 'm1',
  name: 'João',
  sectionId: 'tropa',
  branch: ScoutBranch.ESCOTEIRO,
  role: TroopRole.JUVENIL,
  enrollments: [{ sectionId: 'tropa', role: TroopRole.JUVENIL, startDate: '2024-01-01', isActive: true }],
  ...over,
});

describe('transferMember', () => {
  it('leaves a single active membership with history', () => {
    const member = youth();
    const first = applyMembershipTransfer({
      member,
      fromMembers: [member],
      toMembers: [],
      command: {
        memberId: 'm1',
        fromSectionId: 'tropa',
        toSectionId: 'alcateia',
        toBranch: ScoutBranch.LOBINHO,
        at: '2026-09-11T12:00:00.000Z',
      },
    });
    assert.equal(first.fromMembers.length, 0);
    assert.equal(first.toMembers.length, 1);
    assert.equal(first.transferred.sectionId, 'alcateia');
    assert.equal(first.toMembers.filter(item => item.id === 'm1').length, 1);
    assert.equal(first.transferred.enrollments?.filter(entry => entry.isActive).length, 1);

    const again = applyMembershipTransfer({
      member: first.transferred,
      fromMembers: first.fromMembers,
      toMembers: first.toMembers,
      command: {
        memberId: 'm1',
        fromSectionId: 'tropa',
        toSectionId: 'alcateia',
        at: '2026-09-11T12:05:00.000Z',
      },
    });
    assert.equal(again.toMembers.length, 1);
  });

  it('keeps a concurrent patch of another youth when transferring one member', () => {
    const ana = youth({ id: 'a', name: 'Ana' });
    const beto = youth({ id: 'b', name: 'Beto' });
    const source = { revision: 1, items: [ana, beto] };
    const dest = { revision: 1, items: [] as ScoutMember[] };
    const patchedAna = { ...ana, name: 'Ana Clara' };
    const afterPatch = {
      revision: source.revision + 1,
      items: [patchedAna, beto],
    };
    const moved = applyMembershipTransfer({
      member: beto,
      fromMembers: afterPatch.items,
      toMembers: dest.items,
      command: {
        memberId: 'b',
        fromSectionId: 'tropa',
        toSectionId: 'alcateia',
        at: '2026-09-11T12:00:00.000Z',
      },
    }).transferred;
    const merged = applyTransferPatchesOnLive(afterPatch, dest, beto, moved);
    assert.equal(merged.source.items.find(item => item.id === 'a')?.name, 'Ana Clara');
    assert.equal(merged.source.items.some(item => item.id === 'b'), false);
    assert.equal(merged.dest.items.find(item => item.id === 'b')?.sectionId, 'alcateia');
  });

  it('resumes the same transfer and blocks a second in-flight dest', () => {
    const command = {
      memberId: 'm1',
      fromSectionId: 'tropa',
      toSectionId: 'alcateia',
      at: '2026-09-11T12:00:00.000Z',
    };
    const journal = beginTransferJournal(command);
    assert.equal(isTransferPhaseDone(journal, 'copied-subdocs'), false);
    assert.doesNotThrow(() => assertTransferJournalAllows(journal, command));
    assert.throws(
      () => assertTransferJournalAllows(journal, { ...command, toSectionId: 'outra' }),
      { message: TRANSFER_IN_FLIGHT_MESSAGE },
    );
  });
});
