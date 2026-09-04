import type { Activity } from '../types';

export interface ManualPlanCheck {
  errors: string[];
  warnings: string[];
}

/** Confere somente lacunas que impedem outra pessoa de aplicar uma atividade. */
export const validateManualActivities = (activities: Activity[]): ManualPlanCheck => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const core = activities.filter(activity => !activity.isOperational && !activity.operationalType);

  if (!core.length) errors.push('Adicione pelo menos uma atividade ao cronograma.');
  core.forEach((activity, index) => {
    const label = `Atividade ${index + 1}`;
    if (!String(activity.title || '').trim()) errors.push(`${label}: informe o nome.`);
    if (!String(activity.description || '').trim()) errors.push(`${label}: descreva como fazer.`);
    if (!(activity.materials || []).some(item => String(item || '').trim())) {
      errors.push(`${label}: informe os materiais ou escreva “nenhum”.`);
    }
    if (!String(activity.progressionObjective || '').trim()) {
      warnings.push(`${label}: sem referência de progressão.`);
    }
    if (!String(activity.instrucaoChefia || '').trim()) {
      warnings.push(`${label}: sem informação adicional para a chefia.`);
    }
  });
  return { errors, warnings };
};
