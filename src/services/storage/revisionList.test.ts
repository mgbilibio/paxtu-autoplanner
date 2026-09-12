import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyIdentifiedPatch,
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

  it('does not treat extra live fields as a conflict on another youth', () => {
    const live = {
      revision: 1,
      items: [
        { id: 'a', name: 'Ana', extra: 1 } as Member & { extra: number },
        { id: 'b', name: 'Beto' },
      ],
    };
    const after = applyIdentifiedPatch(live, {
      kind: 'upsert',
      item: { id: 'a', name: 'Ana Clara' },
      baseItem: { id: 'a', name: 'Ana' },
    });
    assert.equal(after.items.find(item => item.id === 'a')?.name, 'Ana Clara');
    assert.equal(after.items.find(item => item.id === 'b')?.name, 'Beto');
  });

  it('applies a catalog upsert onto the live list without requiring an identical snapshot', () => {
    const live = {
      revision: 4,
      items: [{ id: 'old', name: 'Roteiro antigo' }],
    };
    const after = applyIdentifiedPatch(live, {
      kind: 'upsert',
      item: { id: 'new', name: 'Rascunho manual' },
    });
    assert.equal(after.items.length, 2);
    assert.ok(after.items.some(item => item.id === 'old'));
    assert.ok(after.items.some(item => item.id === 'new'));
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
