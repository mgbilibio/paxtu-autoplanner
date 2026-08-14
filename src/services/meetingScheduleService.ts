import { Activity, EducationalArea, MeetingPlan } from '../types';
import { isCeremonialActivity } from './activityBriefs';

export interface ScheduleOptions {
  includeOpening: boolean;
  includeBreaks: boolean;
  includeClosing: boolean;
  startTime: string;
  openingMinutes: number;
  breakMinutes: number;
  closingMinutes: number;
}

export const defaultScheduleOptions: ScheduleOptions = {
  includeOpening: true,
  includeBreaks: true,
  includeClosing: true,
  startTime: '15:30',
  openingMinutes: 15,
  breakMinutes: 5,
  closingMinutes: 15,
};

export const OPENING_TITLE = 'IBEAGU (Inspeção, Bandeira, Espiritualidade, Avisos, Grito)';
export const BREAK_TITLE = 'Hidratação / banheiro';
export const CLOSING_TITLE = 'IBOAGUCL (Inspeção, Oração, Bandeira)';

export const estimateOperationalMinutes = (
  activityCount: number,
  options: ScheduleOptions,
): number => {
  const breaks = options.includeBreaks ? Math.max(0, activityCount - 1) * options.breakMinutes : 0;
  return (options.includeOpening ? options.openingMinutes : 0) +
    breaks +
    (options.includeClosing ? options.closingMinutes : 0);
};

export const timeToMinutes = (value: string): number => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return ((hours || 0) * 60) + (minutes || 0);
};

export const minutesToTime = (value: number): string => {
  const normalized = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

export const formatDateBR = (value?: string): string => {
  if (!value) return '';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return value;
};

export const formatPaperDuration = (start?: string, minutes?: number): string => {
  const clock = start || '';
  const dur = Math.max(0, minutes || 0);
  if (clock && dur) return `${clock} – ${dur}’`;
  if (clock) return clock;
  if (dur) return `${dur}’`;
  return '—';
};

export const tomorrowISODate = (from: Date = new Date()): string => {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const cycleLabelFromDate = (isoDate?: string): string => {
  const raw = isoDate || tomorrowISODate();
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (!match) return '';
  return `${match[2]}/${match[1]}`;
};

export const resolveMeetingStartTime = (plan: Pick<MeetingPlan, 'meetingStartTime' | 'activities'>): string =>
  plan.meetingStartTime
  || plan.activities?.[0]?.scheduledStartTime
  || defaultScheduleOptions.startTime;

export const isCoreScheduleSlot = (activity: Activity): boolean =>
  !isCeremonialActivity(activity);

const emptyEvaluation = () => ({
  acompanhamento: 'Chefia acompanha organização, segurança, pontualidade e participação.',
  avaliacaoJovens: 'Jovens avaliam rapidamente postura, prontidão e cuidado coletivo.',
  avaliacaoChefia: 'Registrar apenas observações relevantes para condução da reunião.',
  requisitosObservaveis: ['Participação organizada', 'Respeito aos combinados', 'Segurança mantida'],
  criteriosDeAceite: ['Bloco executado no tempo previsto e sem perda de controle da seção'],
  evidenciasSugeridas: ['Anotação de ocorrência se houver'],
});

export const scheduleRow = (
  title: string,
  minutes: number,
  extras: Partial<Activity> = {},
): Activity => {
  const { title: _ignoredTitle, durationMinutes: _ignoredDuration, ...rest } = extras;
  return {
    educationalArea: EducationalArea.CARATER,
    description: '',
    materials: [],
    progressionObjective: rest.isOperational ? 'Operacional' : '',
    responsible: '',
    _uid: `act-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    evaluation: rest.isOperational ? emptyEvaluation() : undefined,
    ...rest,
    title,
    durationMinutes: minutes,
  };
};

const operationalActivity = (
  title: string,
  minutes: number,
  type: Activity['operationalType'],
  description: string,
): Activity => scheduleRow(title, minutes, {
  isOperational: true,
  operationalType: type,
  description,
  materials: type === 'break' ? ['Água disponível', 'Acesso ao banheiro'] : ['Bandeira', 'Apito', 'Livro de cerimônias'],
  progressionObjective: 'Operacional',
});

export const applyOperationalSchedule = (
  plan: MeetingPlan,
  options: ScheduleOptions,
): MeetingPlan => {
  const core = plan.activities || [];
  const activities: Activity[] = [];
  if (options.includeOpening) {
    activities.push(operationalActivity(
      OPENING_TITLE,
      options.openingMinutes,
      'opening',
      'Recepção, inspeção breve, organização da seção, espiritualidade, avisos e grito de seção.',
    ));
  }
  core.forEach((activity, index) => {
    activities.push(activity);
    if (options.includeBreaks && index < core.length - 1) {
      activities.push(operationalActivity(
        BREAK_TITLE,
        options.breakMinutes,
        'break',
        'Pausa curta entre atividades para água, banheiro, reorganização de materiais e transição segura.',
      ));
    }
  });
  if (options.includeClosing) {
    activities.push(operationalActivity(
      CLOSING_TITLE,
      options.closingMinutes,
      'closing',
      'Fechamento da reunião, oração, avisos finais e encerramento da bandeira.',
    ));
  }
  return stampScheduleTimes({ ...plan, activities }, options.startTime);
};

/** Recalcula horários no array atual (não insere abertura/intervalos/encerramento). */
export const stampScheduleTimes = (
  plan: MeetingPlan,
  startTime: string = defaultScheduleOptions.startTime,
): MeetingPlan => {
  const scheduled = stampActivities(plan.activities || [], startTime);
  return {
    ...plan,
    meetingStartTime: startTime,
    activities: scheduled,
    totalDuration: scheduled.reduce((sum, activity) => sum + (activity.durationMinutes || 0), 0),
  };
};

export const stampActivities = (activities: Activity[], startTime: string): Activity[] => {
  let cursor = timeToMinutes(startTime || defaultScheduleOptions.startTime);
  return activities.map(activity => {
    const start = cursor;
    cursor += Math.max(0, activity.durationMinutes || 0);
    return {
      ...activity,
      scheduledStartTime: minutesToTime(start),
      scheduledEndTime: minutesToTime(cursor),
    };
  });
};

export const corePlaceholder = (index: number, minutes: number): Activity =>
  scheduleRow(`Atividade ${index + 1}`, minutes, {
    description: '',
    progressionObjective: '',
  });

const splitCoreMinutes = (activityCount: number, coreDuration: number): number[] => {
  const count = Math.max(1, activityCount);
  const base = Math.max(5, Math.floor(Math.max(coreDuration, count * 5) / count));
  const leftover = Math.max(0, coreDuration - base * count);
  return Array.from({ length: count }, (_, i) => base + (i === count - 1 ? leftover : 0));
};

export const buildDefaultCronograma = (
  activityCount: number,
  coreDuration: number,
  options: ScheduleOptions,
): Activity[] => {
  const minutes = splitCoreMinutes(activityCount, coreDuration);
  const core = minutes.map((mins, i) => corePlaceholder(i, mins));
  return applyOperationalSchedule({
    theme: '',
    totalDuration: 0,
    generalNotes: '',
    activities: core,
    studyGuide: [],
  }, options).activities;
};

/** Esqueleto no formato do formulário de papel — títulos genéricos, sem nomes de jovens. */
export const buildPaperShapedCronograma = (
  activityCount: number,
  options: ScheduleOptions,
): Activity[] => {
  const count = Math.max(1, activityCount);
  const rows: Activity[] = [
    operationalActivity(
      OPENING_TITLE,
      options.openingMinutes,
      'opening',
      'Inspeção, bandeira, espiritualidade, avisos e grito.',
    ),
    scheduleRow('Quebra gelo / canção', 15, {
      isOperational: true,
      description: 'Aquecimento e canção para abrir o clima da reunião.',
    }),
    scheduleRow('Cerimônia', 15, {
      isOperational: true,
      description: 'Cerimônia prevista para esta reunião.',
    }),
    scheduleRow('Avaliação do ciclo', 30, {
      isOperational: true,
      description: 'Avaliação do ciclo, ênfase e combinados da seção.',
    }),
    scheduleRow('Entrega de cordões', 15, {
      isOperational: true,
      description: 'Entrega de cordões ou distintivos, se houver.',
    }),
    scheduleRow('Recepção', 15, {
      isOperational: true,
      description: 'Acolhida de novos integrantes, se houver.',
    }),
    operationalActivity(
      BREAK_TITLE,
      options.breakMinutes,
      'break',
      'Hidratação e banheiro antes das atividades de miolo.',
    ),
  ];
  const mioloMinutes = splitCoreMinutes(count, Math.max(count * 15, 30));
  mioloMinutes.forEach((mins, i) => {
    rows.push(corePlaceholder(i, mins));
  });
  rows.push(operationalActivity(
    'Preparar hasteamento (hidratação + banheiro)',
    options.breakMinutes,
    'break',
    'Pausa curta para hidratação, banheiro e organização do hasteamento.',
  ));
  rows.push(operationalActivity(
    CLOSING_TITLE,
    options.closingMinutes,
    'closing',
    'Inspeção, oração e encerramento da bandeira.',
  ));
  return stampActivities(rows, options.startTime);
};

export const syncCoreSlotCount = (activities: Activity[], activityCount: number): Activity[] => {
  const count = Math.max(1, Math.min(10, activityCount));
  const next = [...activities];
  const coreIndexes = next
    .map((activity, index) => (isCoreScheduleSlot(activity) ? index : -1))
    .filter(index => index >= 0);

  if (coreIndexes.length < count) {
    const toAdd = count - coreIndexes.length;
    const insertAt = coreIndexes.length > 0
      ? coreIndexes[coreIndexes.length - 1] + 1
      : Math.max(0, next.findIndex(a => a.operationalType === 'closing'));
    const at = insertAt < 0 ? next.length : insertAt;
    const extras = Array.from({ length: toAdd }, (_, i) =>
      corePlaceholder(coreIndexes.length + i, 15),
    );
    next.splice(at, 0, ...extras);
  } else if (coreIndexes.length > count) {
    const remove = coreIndexes.slice(count).reverse();
    remove.forEach(index => next.splice(index, 1));
  }

  let coreN = 0;
  return next.map(activity => {
    if (!isCoreScheduleSlot(activity)) return activity;
    const title = activity.title?.trim() || '';
    const isDefault = /^atividade\s+\d+$/i.test(title) || !title;
    coreN += 1;
    return isDefault ? { ...activity, title: `Atividade ${coreN}` } : activity;
  });
};

export const mergeGeneratedIntoCronograma = (
  draft: Activity[],
  generatedCore: Activity[],
  startTime: string,
): Activity[] => {
  let coreIdx = 0;
  const merged = (draft.length ? draft : generatedCore).map(row => {
    if (!isCoreScheduleSlot(row)) return row;
    const generated = generatedCore[coreIdx++];
    if (!generated) return row;
    return {
      ...generated,
      durationMinutes: row.durationMinutes || generated.durationMinutes,
      responsible: row.responsible || generated.responsible,
      scheduledStartTime: undefined,
      scheduledEndTime: undefined,
      isOperational: false,
      operationalType: undefined,
      _uid: row._uid || generated._uid,
    };
  });
  while (coreIdx < generatedCore.length) {
    merged.push({
      ...generatedCore[coreIdx],
      isOperational: false,
      operationalType: undefined,
    });
    coreIdx += 1;
  }
  return stampActivities(merged, startTime);
};

export const briefsFromCronograma = (draft: Activity[], existingBriefs: string[]): string[] => {
  const cores = draft.filter(isCoreScheduleSlot);
  return cores.map((activity, i) => {
    const existing = String(existingBriefs[i] || '').trim();
    if (existing) return existing;
    const title = String(activity.title || '').trim();
    if (title && !/^atividade\s+\d+$/i.test(title)) return title;
    return '';
  });
};

export const applyMeetingHeader = (
  plan: MeetingPlan,
  header: Pick<MeetingPlan, 'unitName' | 'meetingDate' | 'cycleLabel' | 'meetingType' | 'objectives' | 'technicalContent' | 'meetingStartTime' | 'theme'>,
): MeetingPlan => ({
  ...plan,
  unitName: header.unitName || plan.unitName,
  meetingDate: header.meetingDate || plan.meetingDate,
  cycleLabel: header.cycleLabel || plan.cycleLabel,
  meetingType: header.meetingType || plan.meetingType,
  objectives: header.objectives ?? plan.objectives,
  technicalContent: header.technicalContent ?? plan.technicalContent,
  meetingStartTime: header.meetingStartTime || plan.meetingStartTime,
  theme: header.theme?.trim() ? header.theme : plan.theme,
});
