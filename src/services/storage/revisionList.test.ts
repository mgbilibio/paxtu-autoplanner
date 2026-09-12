import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyIdentifiedPatch,
  emptyRevisionedList,
  replaceRevisionedList,
  WriteConflictError,
} from './revisionList.ts';

type Member = { id: string; name: string };

describe('two-client list writes', () => {
  it('preserves distinct member upserts from the same revision', () => {
    const base = {
      revision: 1,
      items: [
        { id: 'a', name: 'Ana' },
        { id: 'b', name: 'Beto' },
      ] as Member[],
    };
    const afterA = applyIdentifiedPatch(base, {
      kind: 'upsert',
      item: { id: 'a', name: 'Ana Clara' },
      baseItem: { id: 'a', name: 'Ana' },
    });
    const afterB = applyIdentifiedPatch(afterA, {
      kind: 'upsert',
      item: { id: 'b', name: 'Roberto' },
      baseItem: { id: 'b', name: 'Beto' },
    });
    assert.equal(afterB.items.find(item => item.id === 'a')?.name, 'Ana Clara');
    assert.equal(afterB.items.find(item => item.id === 'b')?.name, 'Roberto');
  });

  it('detects same-field conflict instead of silent last write', () => {
    const base = emptyRevisionedList<Member>();
    const seeded = applyIdentifiedPatch(base, { kind: 'upsert', item: { id: 'a', name: 'Ana' } });
    assert.throws(
      () => applyIdentifiedPatch(seeded, {
        kind: 'upsert',
        item: { id: 'a', name: 'Outro' },
        baseItem: { id: 'a', name: 'Ana antiga' },
      }),
      WriteConflictError,
    );
  });

  it('refuses a stale full-list write without replace/baseItems', () => {
    const live = { revision: 2, items: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }] };
    const stale = [{ id: 'a', name: 'Ana' }];
    assert.throws(() => replaceRevisionedList(live, stale, {}), WriteConflictError);
    assert.throws(
      () => replaceRevisionedList(live, stale, { baseItems: stale }),
      WriteConflictError,
    );
    const replaced = replaceRevisionedList(live, [], { replace: true });
    assert.deepEqual(replaced.items, []);
    const fresh = replaceRevisionedList(live, [{ id: 'a', name: 'Ana Clara' }, { id: 'b', name: 'Beto' }], {
      baseItems: live.items,
    });
    assert.equal(fresh.items.find(item => item.id === 'a')?.name, 'Ana Clara');
    assert.equal(fresh.items.find(item => item.id === 'b')?.name, 'Beto');
  });
});
