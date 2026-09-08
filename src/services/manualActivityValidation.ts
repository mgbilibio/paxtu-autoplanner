import type { Activity } from '../types';

export interface ManualPlanCheck {
  warnings: string[];
}

/** Sempre true: rascunho incompleto pode (e deve) ser gravado. */
export const canPersistManualDraft = (_activities?: Activity[]): true => true;

/** Confere lacunas só para aviso. Nunca decide se o salvamento segue. */
export const validateManualActivities = (activities: Activity[]): ManualPlanCheck => {
  const warnings: string[] = [];
  const core = activities.filter(activity => !activity.isOperational && !activity.operationalType);

  if (!core.length) {
    warnings.push('Nenhuma atividade no cronograma ainda. O rascunho pode ser salvo assim mesmo.');
  }
  core.forEach((activity, index) => {
    const label = `Atividade ${index + 1}`;
    if (!String(activity.title || '').trim()) warnings.push(`${label}: informe o nome.`);
    if (!String(activity.description || '').trim()) warnings.push(`${label}: descreva como fazer.`);
    if (!(activity.materials || []).some(item => String(item || '').trim())) {
      warnings.push(`${label}: materiais ainda vazios.`);
    }
    if (!String(activity.progressionObjective || '').trim()) {
      warnings.push(`${label}: sem referência de progressão.`);
    }
    if (!String(activity.instrucaoChefia || '').trim()) {
      warnings.push(`${label}: sem informação adicional para a chefia.`);
    }
  });
  return { warnings };
};
