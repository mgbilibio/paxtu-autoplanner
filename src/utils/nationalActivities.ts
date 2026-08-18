import { NATIONAL_ACTIVITIES_2026 } from '../data/nationalActivities2026.ts';
import type { NationalActivityWindow } from '../data/nationalActivities2026.ts';
import {
  NATIONAL_ACTIVITY_FICHAS_2026,
} from '../data/nationalActivityFichas2026.ts';
import type { NationalActivityFicha, NationalFichaRamo } from '../data/nationalActivityFichas2026.ts';
import { ScoutBranch, type CalendarEvent, type GenerationSeed, type GenerationSeedScheduleItem } from '../types.ts';

const cycleLabelFromDate = (isoDate?: string): string => {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})/);
  return match ? `${match[2]}/${match[1]}` : '';
};

export type { NationalActivityFicha, NationalFichaRamo };

export const CADERNO_ATIVIDADES_2026_URL =
  'https://www.escoteiros.org.br/wp-content/uploads/2026/04/Caderno-de-Atividades-2026-Escoteiros-do-Brasil-4.pdf';

export const MISSING_SECTION_DATE_ERROR = 'Escolha o dia desta seção.';
export const OUTSIDE_WINDOW_WARNING = 'Fora da janela oficial — a UEL pode deslocar';

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

export const cadernoPageUrl = (page?: number): string =>
  page && page > 0 ? `${CADERNO_ATIVIDADES_2026_URL}#page=${page}` : CADERNO_ATIVIDADES_2026_URL;

export const isDateInOfficialWindow = (date: string, start: string, end: string): boolean =>
  Boolean(date) && date >= start && date <= end;

export const activityAppliesToBranch = (
  activity: Pick<NationalActivityWindow, 'ramos'>,
  branch: ScoutBranch,
): boolean => activity.ramos === 'all' || activity.ramos.includes(branch);

export const nationalActivitiesForBranch = (
  branch: ScoutBranch,
  catalog: NationalActivityWindow[] = NATIONAL_ACTIVITIES_2026,
): NationalActivityWindow[] => catalog.filter(item => activityAppliesToBranch(item, branch));

export const campaignKeyForTitle = (title: string): string | null => {
  const found = NATIONAL_ACTIVITIES_2026.find(item => item.title === title);
  if (!found) return null;
  if (found.title.includes('Sangue') && found.title.includes('REDOME')) return 'sangue';
  if (found.title === 'Semana Escoteira 2026') return 'semana';
  if (found.title === '10º EducAção Escoteira') return 'educacao';
  if (found.title === '12º Grande Jogo Aéreo') return 'gja';
  if (found.title.includes('Ação Ecológica')) return 'ecologica';
  if (found.title.includes('Field Day')) return 'sfd';
  if (found.title === '9º Dia do Amigo') return 'amigo';
  if (found.title.includes('Jogo Naval')) return 'naval';
  if (found.title.includes('Echolink') || found.title.includes('Radioescotismo')) return 'radio';
  if (found.title.includes('Ação Comunitária')) return 'comunitaria';
  if (found.title.includes('JOTA')) return 'jota';
  return null;
};

export const mapFichaRamoToBranch = (ramo: NationalFichaRamo): ScoutBranch => {
  if (ramo === 'filhotes' || ramo === 'lobinho') return ScoutBranch.LOBINHO;
  if (ramo === 'escoteiro') return ScoutBranch.ESCOTEIRO;
  if (ramo === 'senior') return ScoutBranch.SENIOR;
  return ScoutBranch.PIONEIRO;
};

export const fichaAppliesToBranch = (
  ficha: Pick<NationalActivityFicha, 'ramos'>,
  branch: ScoutBranch,
): boolean => {
  if (ficha.ramos === 'all') return true;
  return ficha.ramos.some(ramo => mapFichaRamoToBranch(ramo) === branch);
};

export const fichasForCampaignAndBranch = (
  campaignTitle: string,
  branch: ScoutBranch,
  catalog: NationalActivityFicha[] = NATIONAL_ACTIVITY_FICHAS_2026,
): NationalActivityFicha[] => {
  const key = campaignKeyForTitle(campaignTitle);
  if (!key || key === 'jota') return [];
  return catalog.filter(ficha => ficha.campaignKey === key && fichaAppliesToBranch(ficha, branch));
};

export const nationalActivityAlreadyOnSection = (
  events: CalendarEvent[],
  sectionId: string,
  activity: Pick<NationalActivityWindow, 'title'>,
): CalendarEvent | undefined =>
  events.find(event =>
    event.title === activity.title &&
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
  chosenDate: string,
  id?: string,
): CalendarEvent => ({
  id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  sectionId,
  date: chosenDate,
  title: activity.title,
  branch,
  attendance: [],
  notes: officialWindowNotes(activity.start, activity.end),
});

const formatFichaBrief = (ficha: NationalActivityFicha): string => {
  const materials = ficha.materials.length
    ? `Materiais: ${ficha.materials.join('; ')}`
    : '';
  const steps = ficha.steps.length
    ? `Como fazer:\n${ficha.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`
    : '';
  return [
    `${ficha.title} (${ficha.durationMin} min)`,
    ficha.objective ? `Objetivo: ${ficha.objective}` : '',
    materials,
    steps,
  ].filter(Boolean).join('\n');
};

const officialCustomInstruction = (cadernoUrl: string): string =>
  `Siga os passos oficiais do Caderno de Atividades 2026. Não invente personagens de franquia, letras de música nem bases extras. Use os nomes oficiais das atividades. Caderno: ${cadernoUrl}`;

export const buildNationalActivitySeed = (input: {
  activity: Pick<NationalActivityWindow, 'title' | 'cadernoPage'>;
  meetingDate: string;
  fichas: NationalActivityFicha[];
}): GenerationSeed => {
  const cadernoUrl = cadernoPageUrl(input.activity.cadernoPage);
  const fichas = input.fichas;
  const fichaTitles = fichas.map(ficha => ficha.title).filter(Boolean);
  const narrativeTheme = fichaTitles.length
    ? `${input.activity.title} — ${fichaTitles.join(' + ')}`
    : input.activity.title;
  const objectives = fichas
    .map(ficha => (ficha.objective ? `${ficha.title}: ${ficha.objective}` : ''))
    .filter(Boolean)
    .join('\n');
  const technicalContent = fichas.length
    ? fichas.map(formatFichaBrief).join('\n\n')
    : `Consulte o Caderno de Atividades 2026. ${cadernoUrl}`;
  const scheduleDraft: GenerationSeedScheduleItem[] = fichas.length
    ? fichas.map(ficha => ({
      title: ficha.title,
      durationMinutes: ficha.durationMin,
      kind: 'core',
      description: ficha.steps.join('\n'),
      materials: [...ficha.materials],
      progressionObjective: ficha.objective,
      instrucaoChefia: ficha.steps.map((step, index) => `${index + 1}. ${step}`).join('\n') || undefined,
    }))
    : [{
      title: input.activity.title,
      durationMinutes: 60,
      kind: 'core',
      description: `Consulte o Caderno de Atividades 2026. ${cadernoUrl}`,
    }];
  const coreMinutes = fichas.reduce((sum, ficha) => sum + (ficha.durationMin || 0), 0);

  return {
    narrativeTheme,
    customInstruction: officialCustomInstruction(cadernoUrl),
    activityBriefs: fichas.map(formatFichaBrief),
    planningMode: 'auto_link',
    activityCount: Math.max(1, fichas.length),
    totalDuration: coreMinutes || undefined,
    meetingDate: input.meetingDate,
    cycleLabel: cycleLabelFromDate(input.meetingDate),
    meetingType: 'Normal',
    objectives,
    technicalContent,
    scheduleDraft,
  };
};
