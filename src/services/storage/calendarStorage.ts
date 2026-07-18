import { CalendarEvent } from '../../types';
import { readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { CALENDAR_FILENAME, CALENDAR_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

export const getCalendarEventsAsync = async (
  sectionId?: string,
): Promise<CalendarEvent[]> => {
  const events = await readJsonDoc<CalendarEvent[]>(CALENDAR_FILENAME, CALENDAR_KEY, []);
  if (sectionId) return events.filter(event => event.sectionId === sectionId);
  return events;
};

export const saveCalendarEventAsync = async (
  event: CalendarEvent,
): Promise<void> => {
  assertCanWriteSection(event.sectionId);
  // Releitura dentro da secao critica serializada por chave (anti lost update).
  await runExclusive(CALENDAR_FILENAME, async () => {
    const current = await getCalendarEventsAsync();
    const index = current.findIndex(item => item.id === event.id);
    const updated = index >= 0 ? [...current] : [...current, event];
    if (index >= 0) updated[index] = event;
    await writeJsonDoc(CALENDAR_FILENAME, CALENDAR_KEY, updated);
  });
  dispatchDataEvent(DATA_EVENTS.CALENDAR_UPDATED);
};

export const deleteCalendarEventAsync = async (id: string): Promise<void> => {
  await runExclusive(CALENDAR_FILENAME, async () => {
    const current = await getCalendarEventsAsync();
    const event = current.find(item => item.id === id);
    assertCanWriteSection(event?.sectionId);
    await writeJsonDoc(CALENDAR_FILENAME, CALENDAR_KEY, current.filter(e => e.id !== id));
  });
  dispatchDataEvent(DATA_EVENTS.CALENDAR_UPDATED);
};
