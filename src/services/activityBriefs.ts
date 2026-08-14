import { Activity, GenerateScoutActivityParams, MeetingPlan } from '../types';

/** Trim each slot; keep index meaning (empty string = invent that position). */
export const trimActivityBriefs = (briefs: string[] | undefined, count: number): string[] =>
  Array.from({ length: count }, (_, i) => String(briefs?.[i] ?? '').trim());

export const hasAnyActivityBrief = (briefs: string[] | undefined): boolean =>
  (briefs || []).some(brief => String(brief || '').trim().length > 0);

/** Índice da faixa "de miolo" (ignora abertura/intervalo/encerramento). */
export const coreBriefIndex = (plan: MeetingPlan, slotIndex: number): number =>
  (plan.activities || [])
    .slice(0, slotIndex)
    .filter(activity => !activity.isOperational && !activity.operationalType)
    .length;

export const activityBriefsPromptBlock = (briefs: string[] | undefined, count: number): string => {
  const trimmed = trimActivityBriefs(briefs, count);
  if (!trimmed.some(Boolean)) return '';
  const lines = trimmed.map((brief, i) =>
    `- Atividade ${i + 1}: ${brief || '(vazio — invente esta faixa)'}`
  );
  return [
    'SEMENTES POR ATIVIDADE (obrigatório respeitar):',
    `Produza EXATAMENTE ${count} atividades (não mais, não menos).`,
    'Cada semente abaixo é o ponto de partida da atividade nessa posição.',
    'Se a semente estiver vazia, invente essa faixa. Não ignore as sementes preenchidas.',
    'Ainda aplique duração, cerimonial (quando couber), amarração ao catálogo e anexos.',
    ...lines,
  ].join('\n');
};

export const otherActivitiesSummary = (plan: MeetingPlan, skipIndex: number): string =>
  (plan.activities || []).map((activity, i) => {
    if (i === skipIndex) {
      return `- [${i}] (ESTA FAIXA — substituir) ${activity.title}`;
    }
    const tag = activity.operationalType ? ` [${activity.operationalType}]` : '';
    const snippet = String(activity.description || '').replace(/\s+/g, ' ').slice(0, 90);
    return `- [${i}]${tag} ${activity.title} (${activity.durationMinutes || 0} min)${snippet ? ` — ${snippet}` : ''}`;
  }).join('\n');

export const ACTIVITY_JSON_HINT = `{
  "title": "Nome da atividade",
  "durationMinutes": 30,
  "educationalArea": "Físico",
  "description": "Regras detalhadas",
  "materials": ["item 1 com qtde"],
  "progressionObjective": "[CÓDIGO] descrição curta",
  "fundoDeCena": "Conexão com o tema",
  "instrucaoChefia": "Passo-a-passo numerado",
  "objetivoEspecifico": "Ao final o jovem será capaz de...",
  "manualReferencia": "Nome do manual/fonte",
  "preparacaoPrevia": ["imprimir X"],
  "evaluation": {
    "acompanhamento": "como observar",
    "avaliacaoJovens": "perguntas",
    "avaliacaoChefia": "critério da chefia",
    "requisitosObservaveis": ["req 1"],
    "criteriosDeAceite": ["critério 1"],
    "evidenciasSugeridas": ["foto"]
  }
}`;

export const isCeremonialActivity = (activity: Activity): boolean =>
  !!activity.isOperational || !!activity.operationalType;

export const buildSingleActivityPrompt = (params: GenerateScoutActivityParams): string => {
  const { currentPlan, slotIndex, oldActivity } = params;
  const coreCount = (currentPlan.activities || []).filter(a => !isCeremonialActivity(a)).length;
  const count = params.activityCount || coreCount || 1;
  const briefIdx = coreBriefIndex(currentPlan, slotIndex);
  const seed = trimActivityBriefs(params.activityBriefs, count)[briefIdx] || '';
  const contextStr = params.context
    ? `Seção "${params.context.sectionName}" do Grupo "${params.context.groupName}".`
    : '';
  const planningMode =
    params.planningMode === 'from_selection' || params.planningMode === 'auto_link'
      ? params.planningMode
      : ((params.objectives?.length || 0) > 0 ? 'from_selection' : 'auto_link');
  const objectives = (params.objectives || [])
    .map((obj, i) => `- ${obj.code ? `[${obj.code}] ` : ''}${obj.description}`)
    .join('\n');

  return [
    'Você é um Chefe Escoteiro Sênior da UEB.',
    'Refaça APENAS UMA atividade de um roteiro já existente. Não redesenhe o plano.',
    'Retorne APENAS um objeto JSON (não array) no formato abaixo.',
    ACTIVITY_JSON_HINT,
    '',
    `Ramo: ${params.branch}. ${contextStr}`,
    `Modo: ${planningMode}.`,
    `Tema do roteiro: ${currentPlan.theme || params.narrativeTheme || 'livre'}.`,
    currentPlan.fundoDeCena ? `Fundo de cena: ${currentPlan.fundoDeCena}` : '',
    currentPlan.generalNotes ? `Notas gerais: ${currentPlan.generalNotes}` : '',
    params.customInstruction ? `INSTRUÇÃO ESPECIAL: ${params.customInstruction}` : '',
    seed
      ? `SEMENTE DESTA FAIXA (obrigatório usar como ponto de partida): ${seed}`
      : 'Sem semente nesta faixa — invente uma atividade nova, coerente com o tema, sem copiar as outras.',
    '',
    `Índice da faixa no plano (0-based): ${slotIndex}.`,
    'Atividade atual a substituir:',
    JSON.stringify({
      title: oldActivity.title,
      durationMinutes: oldActivity.durationMinutes,
      educationalArea: oldActivity.educationalArea,
      description: oldActivity.description,
      progressionObjective: oldActivity.progressionObjective,
    }),
    '',
    'Outras faixas do plano (mantenha coerência; não as copie nem as descarte):',
    otherActivitiesSummary(currentPlan, slotIndex),
    '',
    objectives ? `Objetivos/preferências:\n${objectives}` : '',
    params.catalogDigest || '',
    'Ainda aplique duração razoável, amarração ao catálogo e o contexto dos anexos se houver.',
    'Não marque a atividade como operacional (abertura/intervalo/encerramento).',
    'Preencha evaluation completa.',
  ].filter(Boolean).join('\n');
};
