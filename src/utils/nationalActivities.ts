import { NATIONAL_ACTIVITIES_2026 } from '../data/nationalActivities2026.ts';
import type { NationalActivityWindow } from '../data/nationalActivities2026.ts';
import type { CalendarEvent, ScoutBranch } from '../types';

const isoToBrParts = (iso: string): { d: string; m: string; y: string } | null => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { y: match[1], m: match[2], d: match[3] };
};

export const formatOfficialWindow = (start: string, end: string): string => {
  const from = isoToBrParts(start);
  const to = isoToBrParts(end);
  if (!from || !to) return `${start} a ${end}`;
  if (from.y === to.y) return `${from.d}/${from.m} a ${to.d}/${to.m}/${to.y}`;
  return `${from.d}/${from.m}/${from.y} a ${to.d}/${to.m}/${to.y}`;
};

export const officialWindowNotes = (start: string, end: string): string =>
  `Janela oficial UEB: ${formatOfficialWindow(start, end)}. Caderno de Atividades 2026.`;

export const activityAppliesToBranch = (
  activity: Pick<NationalActivityWindow, 'ramos'>,
  branch: ScoutBranch,
): boolean => activity.ramos === 'all' || activity.ramos.includes(branch);

export const nationalActivitiesForBranch = (
  branch: ScoutBranch,
  catalog: NationalActivityWindow[] = NATIONAL_ACTIVITIES_2026,
): NationalActivityWindow[] => catalog.filter(item => activityAppliesToBranch(item, branch));

export const nationalActivityAlreadyOnSection = (
  events: CalendarEvent[],
  sectionId: string,
  activity: Pick<NationalActivityWindow, 'title' | 'start'>,
): CalendarEvent | undefined =>
  events.find(event =>
    event.title === activity.title &&
    event.date === activity.start &&
    (!event.sectionId || event.sectionId === sectionId),
  );

export const selectNationalActivitiesToInclude = (
  selected: NationalActivityWindow[],
  existing: CalendarEvent[],
  sectionId: string,
): NationalActivityWindow[] =>
  selected.filter(item => !nationalActivityAlreadyOnSection(existing, sectionId, item));

export const buildNationalActivityEvent = (
  activity: NationalActivityWindow,
  sectionId: string,
  branch: ScoutBranch,
  id?: string,
): CalendarEvent => ({
  id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  sectionId,
  date: activity.start,
  title: activity.title,
  branch,
  attendance: [],
  notes: officialWindowNotes(activity.start, activity.end),
});
