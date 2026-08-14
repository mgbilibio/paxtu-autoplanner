import {
  Activity,
  EducationalArea,
  GenerationSeed,
  GenerationSeedScheduleItem,
  GenerationSeedScheduleKind,
  MeetingPlan,
  ObjectiveItem,
  PlanningMode,
} from '../types';
import { formatDateBR, newActivityUid } from './meetingScheduleService';
import type { PlanAttachment } from './planAttachments';

export const scheduleKindOf = (activity: Activity): GenerationSeedScheduleKind => {
  if (activity.operationalType === 'opening') return 'opening';
  if (activity.operationalType === 'break') return 'break';
  if (activity.operationalType === 'closing') return 'closing';
  if (activity.isOperational) return 'fixed';
  return 'core';
};

export const isCoreSeedKind = (kind?: GenerationSeedScheduleKind): boolean =>
  kind !== 'opening' && kind !== 'break' && kind !== 'closing';

/** Contagem de miolo do cronograma restaurado — não usar activityCount se o draft tiver mais faixas. */
export const coreCountFromSeed = (seed: GenerationSeed): number => {
  const rows = seed.scheduleDraft || [];
  if (rows.length) return rows.filter(row => isCoreSeedKind(row.kind)).length;
  return seed.activityCount || (seed.activityBriefs || []).filter(brief => String(brief || '').trim()).length || 0;
};

export const plannerDiffersFromSeed = (
  seed: GenerationSeed,
  panel: {
    scheduleDraft: Activity[];
    narrativeTheme: string;
    customInstruction: string;
    activityBriefs: string[];
    meetingObjectives: string;
    technicalContent: string;
  },
): boolean => {
  const seedRows = seed.scheduleDraft || [];
  const draft = panel.scheduleDraft || [];
  if (draft.length !== seedRows.length) return draft.length > 0;
  if (draft.some((row, i) => {
    const saved = seedRows[i];
    if (!saved) return true;
    return String(row.title || '').trim() !== String(saved.title || '').trim()
      || (row.durationMinutes || 0) !== (saved.durationMinutes || 0)
      || String(row.responsible || '').trim() !== String(saved.responsible || '').trim()
      || scheduleKindOf(row) !== (saved.kind || 'core');
  })) return true;
  if (String(panel.narrativeTheme || '').trim() !== String(seed.narrativeTheme || '').trim()) return true;
  if (String(panel.customInstruction || '').trim() !== String(seed.customInstruction || '').trim()) return true;
  if (String(panel.meetingObjectives || '').trim() !== String(seed.objectives || '').trim()) return true;
  if (String(panel.technicalContent || '').trim() !== String(seed.technicalContent || '').trim()) return true;
  const seedBriefs = seed.activityBriefs || [];
  const panelBriefs = panel.activityBriefs || [];
  const max = Math.max(seedBriefs.length, panelBriefs.length);
  for (let i = 0; i < max; i += 1) {
    if (String(seedBriefs[i] || '').trim() !== String(panelBriefs[i] || '').trim()) return true;
  }
  return false;
};

const kindLabel: Record<GenerationSeedScheduleKind, string> = {
  opening: 'abertura',
  break: 'intervalo',
  closing: 'encerramento',
  fixed: 'item fixo',
  core: 'miolo',
};

export interface BuildGenerationSeedInput {
  narrativeTheme?: string;
  customInstruction?: string;
  activityBriefs?: string[];
  planningMode?: PlanningMode;
  activityCount?: number;
  totalDuration?: number;
  participantsCount?: number;
  meetingDate?: string;
  cycleLabel?: string;
  meetingType?: string;
  objectives?: string;
  technicalContent?: string;
  meetingStartTime?: string;
  unitName?: string;
  selectedObjectives?: Array<Pick<ObjectiveItem, 'code' | 'description'>>;
  attachments?: Array<Pick<PlanAttachment, 'name' | 'mime' | 'kind'>>;
  scheduleDraft?: Activity[];
}

/** Monta o pedido persistível. Sem chaves de IA e sem binários de anexo. */
export const buildGenerationSeed = (input: BuildGenerationSeedInput): GenerationSeed => ({
  narrativeTheme: String(input.narrativeTheme || '').trim(),
  customInstruction: String(input.customInstruction || '').trim(),
  activityBriefs: (input.activityBriefs || []).map(brief => String(brief || '')),
  planningMode: input.planningMode,
  activityCount: input.activityCount,
  totalDuration: input.totalDuration,
  participantsCount: input.participantsCount,
  meetingDate: input.meetingDate || '',
  cycleLabel: input.cycleLabel || '',
  meetingType: input.meetingType || '',
  objectives: input.objectives || '',
  technicalContent: input.technicalContent || '',
  meetingStartTime: input.meetingStartTime || '',
  unitName: input.unitName || '',
  selectedObjectives: (input.selectedObjectives || [])
    .map(obj => ({
      code: obj.code ? String(obj.code) : undefined,
      description: String(obj.description || '').trim(),
    }))
    .filter(obj => obj.description || obj.code),
  attachments: (input.attachments || [])
    .map(file => ({
      name: String(file.name || '').trim(),
      type: String(file.mime || file.kind || '').trim(),
    }))
    .filter(file => file.name),
  scheduleDraft: (input.scheduleDraft || []).map(row => ({
    title: String(row.title || '').trim(),
    durationMinutes: Math.max(0, Number(row.durationMinutes) || 0),
    responsible: String(row.responsible || '').trim(),
    kind: scheduleKindOf(row),
    redoNote: String(row.redoNote || '').trim() || undefined,
  })),
});

export const hasGenerationSeed = (plan?: MeetingPlan | null): boolean => {
  const seed = plan?.generationSeed;
  if (!seed) return false;
  return Boolean(
    seed.narrativeTheme
    || seed.customInstruction
    || (seed.activityBriefs || []).some(brief => String(brief || '').trim())
    || (seed.scheduleDraft || []).length
    || (seed.selectedObjectives || []).length
    || seed.objectives
    || seed.technicalContent,
  );
};

export const objectivesFromSeed = (seed: GenerationSeed): ObjectiveItem[] =>
  (seed.selectedObjectives || []).map((obj, i) => ({
    id: `seed-${i}-${obj.code || obj.description || i}`,
    code: obj.code,
    category: 'Pedido salvo',
    description: obj.description || obj.code || `Objetivo ${i + 1}`,
    source: 'generationSeed',
  }));

export const activityFromSeedRow = (item: GenerationSeedScheduleItem, index: number): Activity => {
  const kind = item.kind || 'core';
  const operationalType =
    kind === 'opening' || kind === 'break' || kind === 'closing' ? kind : undefined;
  return {
    _uid: newActivityUid() || `seed-row-${index}`,
    title: item.title || `Item ${index + 1}`,
    durationMinutes: Math.max(0, item.durationMinutes || 0),
    educationalArea: EducationalArea.CARATER,
    description: '',
    materials: [],
    progressionObjective: operationalType ? 'Operacional' : '',
    responsible: item.responsible || '',
    isOperational: kind !== 'core',
    operationalType,
    redoNote: String(item.redoNote || '').trim() || undefined,
  };
};

const planningModeLabel = (mode?: PlanningMode): string => {
  if (mode === 'from_selection') return 'A partir da seleção';
  if (mode === 'auto_link') return 'Tema livre + amarra';
  return mode || '—';
};

const line = (label: string, value?: string | number | null): string => {
  const text = value === undefined || value === null || String(value).trim() === ''
    ? ''
    : String(value).trim();
  return text ? `${label}: ${text}` : '';
};

/** Texto legível em português para HTML exportado e para a chefia reler o pedido. */
export const formatGenerationSeedReadable = (seed: GenerationSeed): string => {
  const briefs = (seed.activityBriefs || [])
    .map((brief, i) => {
      const text = String(brief || '').trim();
      return text ? `  ${i + 1}. ${text}` : `  ${i + 1}. (vazio — a IA inventa esta faixa)`;
    })
    .join('\n');
  const selected = (seed.selectedObjectives || [])
    .map(obj => `  - ${obj.code ? `[${obj.code}] ` : ''}${obj.description}`)
    .join('\n');
  const cronograma = (seed.scheduleDraft || [])
    .map(row => {
      const who = row.responsible ? ` · ${row.responsible}` : '';
      const kind = row.kind ? ` (${kindLabel[row.kind]})` : '';
      const note = row.redoNote ? ` — o que mudar: ${row.redoNote}` : '';
      return `  - ${row.durationMinutes || 0} min · ${row.title || '—'}${who}${kind}${note}`;
    })
    .join('\n');
  const anexos = (seed.attachments || [])
    .map(file => `  - ${file.name}${file.type ? ` (${file.type})` : ''}`)
    .join('\n');

  return [
    line('Tema', seed.narrativeTheme),
    line('Modo', planningModeLabel(seed.planningMode)),
    line(
      'Duração / faixas / jovens',
      [
        seed.totalDuration != null ? `${seed.totalDuration} min` : '',
        seed.activityCount != null ? `${seed.activityCount} atividade(s) de miolo` : '',
        seed.participantsCount != null ? `${seed.participantsCount} jovens` : '',
      ].filter(Boolean).join(' · '),
    ),
    line('Unidade', seed.unitName),
    line('Data', formatDateBR(seed.meetingDate) || seed.meetingDate),
    line('Ciclo', seed.cycleLabel),
    line('Tipo de reunião', seed.meetingType),
    line('Início', seed.meetingStartTime),
    seed.objectives ? `Objetivos da reunião:\n${seed.objectives}` : '',
    seed.technicalContent ? `Conteúdo técnico:\n${seed.technicalContent}` : '',
    seed.customInstruction ? `Instrução especial:\n${seed.customInstruction}` : '',
    selected ? `Objetivos selecionados:\n${selected}` : '',
    cronograma ? `Cronograma:\n${cronograma}` : '',
    briefs ? `Sementes por atividade:\n${briefs}` : '',
    anexos
      ? `Anexos (somente nomes; os arquivos ficam só na sessão):\n${anexos}`
      : '',
  ].filter(Boolean).join('\n\n');
};
