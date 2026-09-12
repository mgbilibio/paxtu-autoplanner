import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { civilDateInTimeZone, formatCivilDate, isCivilToday, shiftVisibleMonth } from './civilDate.ts';

describe('shiftVisibleMonth', () => {
  it('moves January 31 2026 to February 2026, not March 3', () => {
    const from = new Date(2026, 0, 31);
    const next = shiftVisibleMonth(from, 1);
    assert.equal(next.getFullYear(), 2026);
    assert.equal(next.getMonth(), 1);
    assert.equal(next.getDate(), 1);
  });

  it('covers leap year February', () => {
    const from = new Date(2028, 0, 31);
    const next = shiftVisibleMonth(from, 1);
    assert.equal(next.getFullYear(), 2028);
    assert.equal(next.getMonth(), 1);
    assert.equal(next.getDate(), 1);
  });
});

describe('civil today', () => {
  it('formats the local civil date without toISOString', () => {
    const late = new Date(2026, 8, 11, 21, 0, 0);
    assert.equal(formatCivilDate(late), '2026-09-11');
    assert.equal(isCivilToday('2026-09-11', late), true);
  });

  it('keeps 11 Sep 2026 after 21h in America/Cuiaba', () => {
    const utc = new Date('2026-09-12T00:30:00.000Z');
    assert.equal(civilDateInTimeZone(utc, 'America/Cuiaba'), '2026-09-11');
  });
});
