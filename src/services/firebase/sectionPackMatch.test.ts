import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  describeSectionPackMismatch,
  membersOfTargetSection,
  normalizePackName,
  packKindDiffersFromSection,
  packNameDiffersFromSection,
  requireExplicitSectionId,
  suggestPackSectionId,
} from './sectionPackMatch.ts';

describe('requireExplicitSectionId', () => {
  it('rejects empty, blank and missing ids', () => {
    assert.throws(() => requireExplicitSectionId(''), /Selecione uma seção/);
    assert.throws(() => requireExplicitSectionId('   '), /Selecione uma seção/);
    assert.throws(() => requireExplicitSectionId(undefined), /Selecione uma seção/);
    assert.throws(() => requireExplicitSectionId(null), /Selecione uma seção/);
  });

  it('returns the trimmed explicit id', () => {
    assert.equal(requireExplicitSectionId('  alcateia-1  '), 'alcateia-1');
  });
});

describe('pack name mismatch', () => {
  it('ignores accents, case and extra spaces', () => {
    assert.equal(normalizePackName('  Alcatéia   Seeonee '), 'alcateia seeonee');
    assert.equal(packNameDiffersFromSection('Alcatéia Seeonee', 'alcateia seeonee'), false);
    assert.equal(packNameDiffersFromSection('Tropa Marechal Rondon', 'tropa marechal rondon'), false);
  });

  it('does not warn when the pack has no section name', () => {
    assert.equal(packNameDiffersFromSection(undefined, 'Alcateia Seeonee'), false);
    assert.equal(packNameDiffersFromSection('', 'Alcateia Seeonee'), false);
  });

  it('warns when pack and target names differ', () => {
    assert.equal(
      packNameDiffersFromSection('Alcateia Seeonee', 'Tropa Marechal Rondon'),
      true,
    );
  });
});

describe('pack kind / branch mismatch', () => {
  it('detects alcateia pack into tropa', () => {
    assert.equal(
      packKindDiffersFromSection({ kind: 'alcateia', branch: 'Lobinho' }, { kind: 'tropa', branch: 'Escoteiro' }),
      true,
    );
    assert.equal(
      packKindDiffersFromSection({ branch: 'Lobinho' }, { branch: 'Escoteiro' }),
      true,
    );
  });

  it('does not warn for the same kind and branch', () => {
    assert.equal(
      packKindDiffersFromSection({ kind: 'alcateia', branch: 'Lobinho' }, { kind: 'alcateia', branch: 'Lobinho' }),
      false,
    );
  });
});

describe('describeSectionPackMismatch', () => {
  it('returns the destine-section warning with both names', () => {
    const text = describeSectionPackMismatch(
      { section: { name: 'Alcateia Seeonee', kind: 'alcateia', branch: 'Lobinho' } },
      { name: 'Tropa Marechal Rondon', kind: 'tropa', branch: 'Escoteiro' },
    );
    assert.ok(text);
    assert.match(text, /Este pacote é da seção «Alcateia Seeonee»/);
    assert.match(text, /Você escolheu «Tropa Marechal Rondon»/);
    assert.match(text, /Jovens e chefia serão gravados na seção escolhida, não na do arquivo/);
    assert.match(text, /Alcateia \(Lobinho\)/);
    assert.match(text, /Tropa \(Escoteiro\)/);
    assert.match(text, /independentes/);
  });

  it('returns null when names and kinds match', () => {
    assert.equal(
      describeSectionPackMismatch(
        { section: { name: 'Alcatéia Seeonee', branch: 'Lobinho' } },
        { name: 'Alcateia Seeonee', branch: 'Lobinho' },
      ),
      null,
    );
  });
});

describe('suggestPackSectionId', () => {
  const sectionIds = ['alcateia-seeonee', 'tropa-rondon'];

  it('never falls back to the first section for an admin', () => {
    assert.equal(suggestPackSectionId({ canPick: true, sectionIds }), '');
    assert.equal(
      suggestPackSectionId({ canPick: true, currentSectionId: 'tropa-rondon', sectionIds }),
      'tropa-rondon',
    );
  });

  it('does not use a current section that is not in the list', () => {
    assert.equal(
      suggestPackSectionId({ canPick: true, currentSectionId: 'ghost', sectionIds }),
      '',
    );
  });

  it('scopes a chefe to an allowed section only', () => {
    assert.equal(
      suggestPackSectionId({
        canPick: false,
        currentSectionId: 'tropa-rondon',
        allowedSectionIds: ['alcateia-seeonee'],
        sectionIds,
      }),
      'alcateia-seeonee',
    );
  });
});

describe('membersOfTargetSection', () => {
  it('keeps only members of the target section', () => {
    const members = [
      { id: '1', sectionId: 'alcateia-seeonee' },
      { id: '2', sectionId: 'tropa-rondon' },
      { id: '3' },
    ];
    const scoped = membersOfTargetSection(members, 'alcateia-seeonee');
    assert.deepEqual(scoped.map(item => item.id), ['1', '3']);
  });
});
