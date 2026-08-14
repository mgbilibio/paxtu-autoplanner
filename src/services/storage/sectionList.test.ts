import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ScoutSection } from '../../types.ts';
import {
  applySectionsUpdatedDetail,
  mergeSectionLists,
  sectionIdsMissingFrom,
} from './sectionList.ts';

const tropa = {
  id: 'tropa-rondon',
  name: 'Tropa Marechal Rondon',
  branch: 'Escoteiro',
} as ScoutSection;

const seeonee = {
  id: '1786735928783',
  name: 'Alcateia Seeonee',
  branch: 'Lobinho',
} as ScoutSection;

describe('mergeSectionLists', () => {
  it('keeps a just-created section when the remote list is still only Tropa', () => {
    const merged = mergeSectionLists([tropa], [seeonee]);
    assert.deepEqual(merged.map(item => item.id), ['tropa-rondon', '1786735928783']);
    assert.equal(merged.find(item => item.id === '1786735928783')?.name, 'Alcateia Seeonee');
  });

  it('updates an existing section without dropping others', () => {
    const merged = mergeSectionLists(
      [tropa, seeonee],
      [{ ...seeonee, name: 'Alcateia Seeonee (lobo)' }],
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find(item => item.id === seeonee.id)?.name, 'Alcateia Seeonee (lobo)');
  });
});

describe('applySectionsUpdatedDetail', () => {
  it('inserts the upsert from SECTIONS_UPDATED immediately', () => {
    const next = applySectionsUpdatedDetail([tropa], { upsert: seeonee });
    assert.ok(next.some(item => item.id === '1786735928783'));
  });

  it('removes a deleted section', () => {
    const next = applySectionsUpdatedDetail([tropa, seeonee], { removedId: tropa.id });
    assert.deepEqual(next.map(item => item.id), ['1786735928783']);
  });
});

describe('sectionIdsMissingFrom', () => {
  it('asks for the new id when the collection snapshot is stale', () => {
    assert.deepEqual(
      sectionIdsMissingFrom([tropa], [tropa.id, seeonee.id]),
      ['1786735928783'],
    );
  });
});
