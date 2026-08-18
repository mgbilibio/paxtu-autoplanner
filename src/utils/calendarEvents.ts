import type { CalendarEvent } from '../types';

/** Cópias do mesmo id em outra seção — sobra quando o admin troca a seção no edit. */
export const staleCopiesOfEvent = (
  events: CalendarEvent[],
  event: Pick<CalendarEvent, 'id' | 'sectionId'>,
): CalendarEvent[] =>
  events.filter(
    item => item.id === event.id && !!item.sectionId && item.sectionId !== event.sectionId,
  );
