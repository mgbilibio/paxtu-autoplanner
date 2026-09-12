import type { Activity, MeetingPlan } from '../types.ts';
import { ScoutBranch } from '../types.ts';
import { resolveProgressionCode } from './progression/codeResolver.ts';

const MAX_ACTIVITIES = 40;
const MAX_DURATION_MINUTES = 24 * 60;

export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PlanValidationError('Resposta da IA não é um objeto de plano.');
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') throw new PlanValidationError(`Campo ${field} inválido.`);
  return value;
};

export const assertPlanJson = (value: unknown, branch: ScoutBranch): MeetingPlan => {
  const raw = asObject(value);
  if (!Array.isArray(raw.activities)) {
    throw new PlanValidationError('activities precisa ser uma lista.');
  }
  if (raw.activities.length > MAX_ACTIVITIES) {
    throw new PlanValidationError('Lista de atividades excessiva.');
  }
  const activities = raw.activities.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new PlanValidationError(`Atividade ${index + 1} inválida.`);
    }
    const activity = item as Record<string, unknown>;
    const duration = Number(activity.durationMinutes);
    if (!Number.isFinite(duration) || duration < 0 || duration > MAX_DURATION_MINUTES) {
      throw new PlanValidationError(`Duração inválida na atividade ${index + 1}.`);
    }
    const codes = Array.isArray(activity.objectiveCodes)
      ? activity.objectiveCodes.map(code => String(code))
      : [];
    for (const code of codes) {
      const resolved = resolveProgressionCode(code, branch);
      if (!resolved.ok) {
        throw new PlanValidationError(`Código inexistente na atividade ${index + 1}: ${code}`);
      }
    }
    return {
      ...activity,
      title: asString(activity.title ?? activity.nome ?? `Atividade ${index + 1}`, 'title'),
      durationMinutes: duration,
    } as Activity;
  });
  const totalDuration = Number(raw.totalDuration ?? activities.reduce((sum, item) => sum + (item.durationMinutes || 0), 0));
  if (!Number.isFinite(totalDuration) || totalDuration < 0) {
    throw new PlanValidationError('Duração total inválida.');
  }
  const theme = asString(raw.theme ?? raw.tema ?? 'Reunião', 'theme');
  return {
    ...(raw as unknown as MeetingPlan),
    theme,
    branch,
    activities,
    totalDuration,
  };
};
