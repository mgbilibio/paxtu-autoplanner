import type { AttendanceRecord, CalendarEvent } from '../types';

/** Cópias do mesmo id em outra seção — sobra quando o admin troca a seção no edit. */
export const staleCopiesOfEvent = (
  events: CalendarEvent[],
  event: Pick<CalendarEvent, 'id' | 'sectionId'>,
): CalendarEvent[] =>
  events.filter(
    item => item.id === event.id && !!item.sectionId && item.sectionId !== event.sectionId,
  );

export const shouldApplyEventLoad = (requestEventId: string, openEventId: string | null): boolean =>
  !!openEventId && requestEventId === openEventId;

export const mergeHistoricalAttendance = (
  previous: AttendanceRecord[] | undefined,
  currentMemberIds: string[],
  presentIds: string[],
): AttendanceRecord[] => {
  const current = new Set(currentMemberIds);
  const preserved = (previous || []).filter(row => !current.has(row.memberId));
  const rebuilt = currentMemberIds.map(memberId => ({
    memberId,
    present: presentIds.includes(memberId),
  }));
  return [...preserved, ...rebuilt];
};
