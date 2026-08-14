import { Activity, ActivityEvaluation, MeetingPlan } from '../types';

const emptyEvaluation = (): ActivityEvaluation => ({
  acompanhamento: '',
  avaliacaoJovens: '',
  avaliacaoChefia: '',
  requisitosObservaveis: [],
  criteriosDeAceite: [],
  evidenciasSugeridas: [],
});

const asList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean)
    : [];

export const normalizeActivityForUse = (activity: Activity, index: number): Activity => {
  const current = activity.evaluation || emptyEvaluation();
  return {
    ...activity,
    _uid: activity._uid || `act-${index}`,
    evaluation: {
      acompanhamento: current.acompanhamento || '',
      avaliacaoJovens: current.avaliacaoJovens || '',
      avaliacaoChefia: current.avaliacaoChefia || '',
      requisitosObservaveis: asList(current.requisitosObservaveis),
      criteriosDeAceite: asList(current.criteriosDeAceite),
      evidenciasSugeridas: asList(current.evidenciasSugeridas),
    },
  };
};

export const normalizePlanForUse = (plan: MeetingPlan): MeetingPlan => ({
  ...plan,
  activities: (plan.activities || []).map((a, i) => normalizeActivityForUse(a, i)),
  studyGuide: plan.studyGuide || [],
});
