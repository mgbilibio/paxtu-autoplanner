import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ScoutBranch } from '../types.ts';

import { shouldReuseLaunch } from './progression/launchPolicy.ts';
import { assertProgressionCodes } from './progression/codeResolver.ts';

describe('progression launches', () => {
  it('reuses the launch of the same event instead of duplicating', () => {
    const launch = {
      id: 'L1',
      eventId: 'E1',
      sectionId: 'tropa',
      date: '2026-09-11',
      codes: ['B1.F1'],
      creditedMemberIds: ['m1'],
      excludedMemberIds: [],
      applies: [],
      createdAt: '',
      updatedAt: '',
    };
    assert.equal(shouldReuseLaunch(launch, 'E1'), true);
    assert.equal(shouldReuseLaunch(launch, 'E2'), false);
  });

  it('rejects a code before any credit is written', () => {
    assert.throws(() => assertProgressionCodes(['B999.F999'], ScoutBranch.ESCOTEIRO), /recusado/);
  });
});
