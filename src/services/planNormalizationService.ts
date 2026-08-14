import { Activity, ActivityEvaluation, MeetingPlan } from '../types';
import { isCeremonialActivity } from './activityBriefs';
import { resolveMeetingStartTime, stampScheduleTimes } from './meetingScheduleService';

const asList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean)
    : [];

const asPassos = (value: unknown): { minuto: string; acao: string }[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const row = item && typeof item === 'object' ? item as { minuto?: unknown; acao?: unknown } : {};
      return {
        minuto: String(row.minuto ?? '').trim(),
        acao: String(row.acao ?? '').trim(),
      };
    })
    .filter(row => row.minuto || row.acao);
};

export const hasMeaningfulEvaluation = (evaluation?: ActivityEvaluation | null): boolean => {
  if (!evaluation) return false;
  return Boolean(
    String(evaluation.acompanhamento || '').trim()
    || String(evaluation.avaliacaoJovens || '').trim()
    || String(evaluation.avaliacaoChefia || '').trim()
    || (evaluation.requisitosObservaveis || []).some(item => String(item || '').trim())
    || (evaluation.criteriosDeAceite || []).some(item => String(item || '').trim())
    || (evaluation.evidenciasSugeridas || []).some(item => String(item || '').trim()),
  );
};

/** Avaliação genérica que se repetia em todo cartão (IBEAGU incluso). */
export const isBoilerplateEvaluation = (evaluation?: ActivityEvaluation | null): boolean => {
  if (!evaluation) return false;
  const reqs = (evaluation.requisitosObservaveis || []).join(' ').toLowerCase();
  const follow = String(evaluation.acompanhamento || '').toLowerCase();
  return reqs.includes('participação organizada')
    && (follow.includes('organização, segurança') || follow.includes('pontualidade e participação'));
};

const normalizeEvaluation = (evaluation?: ActivityEvaluation | null): ActivityEvaluation | undefined => {
  if (!evaluation) return undefined;
  const next: ActivityEvaluation = {
    acompanhamento: evaluation.acompanhamento || '',
    avaliacaoJovens: evaluation.avaliacaoJovens || '',
    avaliacaoChefia: evaluation.avaliacaoChefia || '',
    requisitosObservaveis: asList(evaluation.requisitosObservaveis),
    criteriosDeAceite: asList(evaluation.criteriosDeAceite),
    evidenciasSugeridas: asList(evaluation.evidenciasSugeridas),
  };
  if (!hasMeaningfulEvaluation(next) || isBoilerplateEvaluation(next)) return undefined;
  return next;
};

export const normalizeActivityForUse = (activity: Activity, index: number): Activity => {
  const operational = isCeremonialActivity(activity);
  const passos = asPassos(activity.passos);
  const conteudoPronto = String(activity.conteudoPronto || '').trim();
  return {
    ...activity,
    _uid: activity._uid || `act-${index}`,
    conteudoPronto: conteudoPronto || undefined,
    passos: passos.length ? passos : undefined,
    evaluation: operational ? undefined : normalizeEvaluation(activity.evaluation),
  };
};

export const normalizePlanForUse = (plan: MeetingPlan): MeetingPlan => {
  const normalized: MeetingPlan = {
    ...plan,
    activities: (plan.activities || []).map((a, i) => normalizeActivityForUse(a, i)),
    studyGuide: plan.studyGuide || [],
    generationSeed: plan.generationSeed,
  };
  if (normalized.meetingStartTime || normalized.activities.some(activity => activity.scheduledStartTime)) {
    return stampScheduleTimes(normalized, resolveMeetingStartTime(normalized));
  }
  return normalized;
};
