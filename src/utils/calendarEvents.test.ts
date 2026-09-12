import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalendarEvent } from '../types.ts';
import { mergeHistoricalAttendance, shouldApplyEventLoad, staleCopiesOfEvent } from './calendarEvents.ts';

describe('staleCopiesOfEvent', () => {
  it('finds the old section copy when admin changes section on edit', () => {
    const moved: CalendarEvent = {
      id: 'evt-1',
      sectionId: 'alcateia-seeonee',
      date: '2026-04-11',
      title: 'Semana Escoteira 2026',
      branch: 'Lobinho',
      attendance: [],
    };
    const stale: CalendarEvent = {
      ...moved,
      sectionId: 'tropa-rondon',
      branch: 'Escoteiro',
    };
    const other: CalendarEvent = {
      id: 'evt-2',
      sectionId: 'tropa-rondon',
      date: '2026-05-01',
      title: '10º EducAção Escoteira',
      branch: 'Escoteiro',
      attendance: [],
    };
    const copies = staleCopiesOfEvent([stale, moved, other], moved);
    assert.deepEqual(copies.map(item => item.sectionId), ['tropa-rondon']);
  });

  it('does not treat a same-title event with another id as a stale copy', () => {
    const saved: CalendarEvent = {
      id: 'tropa-copy',
      sectionId: 'tropa-rondon',
      date: '2026-04-11',
      title: 'Semana Escoteira 2026',
      branch: 'Escoteiro',
      attendance: [],
    };
    const otherSection: CalendarEvent = {
      ...saved,
      id: 'alcateia-copy',
      sectionId: 'alcateia-seeonee',
      branch: 'Lobinho',
    };
    assert.deepEqual(staleCopiesOfEvent([saved, otherSection], saved), []);
  });
});

describe('stale event load and historical attendance', () => {
  it('ignores launch A when event B is open', () => {
    assert.equal(shouldApplyEventLoad('evt-a', 'evt-b'), false);
    assert.equal(shouldApplyEventLoad('evt-b', 'evt-b'), true);
  });

  it('keeps transferred youth on edit of an old meeting', () => {
    const merged = mergeHistoricalAttendance(
      [
        { memberId: 'old', present: true },
        { memberId: 'stay', present: true },
      ],
      ['stay', 'new'],
      ['stay'],
    );
    assert.equal(merged.some(row => row.memberId === 'old' && row.present), true);
    assert.equal(merged.find(row => row.memberId === 'stay')?.present, true);
    assert.equal(merged.find(row => row.memberId === 'new')?.present, false);
  });
});
