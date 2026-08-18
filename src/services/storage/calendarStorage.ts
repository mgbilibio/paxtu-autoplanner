import { CalendarEvent } from '../../types';
import { staleCopiesOfEvent } from '../../utils/calendarEvents';
import { readAccessibleItems, readSectionItems, writeSectionItems } from '../firebase/sectionData';
import { isFirestoreBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { CALENDAR_FILENAME, CALENDAR_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

const deleteEventFromSection = async (sectionId: string, id: string): Promise<void> => {
  await runExclusive(`firestore-calendar-${sectionId}`, async () => {
    const current = await readSectionItems<CalendarEvent>(sectionId, 'calendar');
    await writeSectionItems(sectionId, 'calendar', current.filter(item => item.id !== id));
  });
};

export const getCalendarEventsAsync = async (
  sectionId?: string,
): Promise<CalendarEvent[]> => {
  if (isFirestoreBacked()) {
    if (sectionId) return readSectionItems<CalendarEvent>(sectionId, 'calendar');
    return readAccessibleItems<CalendarEvent>('calendar');
  }
  const events = await readJsonDoc<CalendarEvent[]>(CALENDAR_FILENAME, CALENDAR_KEY, []);
  if (sectionId) return events.filter(event => event.sectionId === sectionId);
  return events;
};

export const saveCalendarEventAsync = async (
  event: CalendarEvent,
): Promise<void> => {
  assertCanWriteSection(event.sectionId);
  if (isFirestoreBacked()) {
    const sectionId = event.sectionId;
    if (!sectionId) throw new Error('Evento sem seção.');
    await runExclusive(`firestore-calendar-${sectionId}`, async () => {
      const current = await readSectionItems<CalendarEvent>(sectionId, 'calendar');
      const index = current.findIndex(item => item.id === event.id);
      const updated = index >= 0 ? [...current] : [...current, event];
      if (index >= 0) updated[index] = event;
      await writeSectionItems(sectionId, 'calendar', updated);
    });
    // Admin trocou a seção no edit: grava na nova e apaga a cópia da antiga.
    const accessible = await getCalendarEventsAsync();
    const stale = staleCopiesOfEvent(accessible, event);
    for (const copy of stale) {
      if (!copy.sectionId) continue;
      assertCanWriteSection(copy.sectionId);
      await deleteEventFromSection(copy.sectionId, event.id);
    }
    dispatchDataEvent(DATA_EVENTS.CALENDAR_UPDATED);
    return;
  }
  await runExclusive(CALENDAR_FILENAME, async () => {
    const current = await getCalendarEventsAsync();
    const index = current.findIndex(item => item.id === event.id);
    const updated = index >= 0 ? [...current] : [...current, event];
    if (index >= 0) updated[index] = event;
    await writeJsonDoc(CALENDAR_FILENAME, CALENDAR_KEY, updated);
  });
  dispatchDataEvent(DATA_EVENTS.CALENDAR_UPDATED);
};

export const deleteCalendarEventAsync = async (
  id: string,
  sectionId?: string,
): Promise<void> => {
  if (isFirestoreBacked()) {
    let eventSectionId = sectionId;
    if (!eventSectionId) {
      const all = await getCalendarEventsAsync();
      eventSectionId = all.find(item => item.id === id)?.sectionId;
    }
    assertCanWriteSection(eventSectionId);
    if (!eventSectionId) return;
    await deleteEventFromSection(eventSectionId, id);
    dispatchDataEvent(DATA_EVENTS.CALENDAR_UPDATED);
    return;
  }
  await runExclusive(CALENDAR_FILENAME, async () => {
    const current = await getCalendarEventsAsync();
    const event = current.find(e => e.id === id);
    assertCanWriteSection(event?.sectionId);
    await writeJsonDoc(CALENDAR_FILENAME, CALENDAR_KEY, current.filter(e => e.id !== id));
  });
  dispatchDataEvent(DATA_EVENTS.CALENDAR_UPDATED);
};
