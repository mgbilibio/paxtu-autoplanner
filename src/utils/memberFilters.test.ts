import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectUnits, filterMembers, normalizeSearchText } from './memberFilters.ts';

describe('normalizeSearchText', () => {
  it('ignores case, accents and extra spaces', () => {
    assert.equal(normalizeSearchText('  João  '), 'joao');
    assert.equal(normalizeSearchText('Águia'), 'aguia');
    assert.equal(normalizeSearchText('SEEONEE'), 'seeonee');
  });
});

describe('filterMembers', () => {
  const members = [
    { id: '1', name: 'João', sectionId: 'tropa', patrol: 'Águia' },
    { id: '2', name: 'Maria', sectionId: 'tropa', patrol: 'Lobo' },
    { id: '3', name: 'Ana', sectionId: 'alcateia', patrol: 'Seeonee' },
  ];

  it('keeps everyone when filters are empty', () => {
    assert.equal(filterMembers(members, {}).length, 3);
  });

  it('filters by section, unit and accent-insensitive name', () => {
    const bySection = filterMembers(members, { sectionId: 'tropa' });
    assert.deepEqual(bySection.map(item => item.id), ['1', '2']);

    const byUnit = filterMembers(members, { sectionId: 'tropa', unit: 'Águia' });
    assert.deepEqual(byUnit.map(item => item.id), ['1']);

    const byName = filterMembers(members, { name: 'joao' });
    assert.deepEqual(byName.map(item => item.id), ['1']);
  });
});

describe('collectUnits', () => {
  const sections = [
    { id: 'tropa', teams: [{ id: 't1', name: 'Águia' }] },
    { id: 'alcateia', teams: [{ id: 't2', name: 'Seeonee' }] },
  ];
  const members = [
    { sectionId: 'tropa', patrol: 'Lobo' },
    { sectionId: 'alcateia', patrol: 'Seeonee' },
  ];

  it('merges section.teams with member.patrol and can scope to one section', () => {
    assert.deepEqual(collectUnits(sections, members), ['Águia', 'Lobo', 'Seeonee']);
    assert.deepEqual(collectUnits(sections, members, 'tropa'), ['Águia', 'Lobo']);
  });
});
