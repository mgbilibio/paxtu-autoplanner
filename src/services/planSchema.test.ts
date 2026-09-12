import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ScoutBranch } from '../types.ts';

import { assertPlanJson, PlanValidationError } from './planSchema.ts';

describe('AI plan JSON', () => {
  it('rejects valid JSON with the wrong types without throwing on map of object', () => {
    assert.throws(
      () => assertPlanJson({ theme: 'X', activities: { title: 'nope' } }, ScoutBranch.ESCOTEIRO),
      PlanValidationError,
    );
    assert.throws(
      () => assertPlanJson({ theme: 'X', activities: [{ title: 'A', durationMinutes: -3 }] }, ScoutBranch.ESCOTEIRO),
      PlanValidationError,
    );
    assert.throws(
      () => assertPlanJson({
        theme: 'X',
        activities: [{ title: 'A', durationMinutes: 10, objectiveCodes: ['B999.F999'] }],
      }, ScoutBranch.ESCOTEIRO),
      PlanValidationError,
    );
  });

  it('accepts a minimal valid plan', () => {
    const plan = assertPlanJson({
      theme: 'Reunião',
      activities: [{ title: 'Jogo', durationMinutes: 15 }],
      totalDuration: 15,
    }, ScoutBranch.ESCOTEIRO);
    assert.equal(plan.theme, 'Reunião');
    assert.equal(plan.activities.length, 1);
  });
});
