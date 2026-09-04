import { Activity, GenerateScoutActivityParams, MeetingPlan } from '../types';

/** Trim each slot; keep index meaning (empty string = invent that position). */
export const trimActivityBriefs = (briefs: string[] | undefined, count: number): string[] =>
  Array.from({ length: count }, (_, i) => String(briefs?.[i] ?? '').trim());

export const hasAnyActivityBrief = (briefs: string[] | undefined): boolean =>
  (briefs || []).some(brief => String(brief || '').trim().length > 0);

/** Rotinas e itens fixos são preservados; somente atividades são completadas pela IA. */
export const isCeremonialActivity = (activity: Activity): boolean =>
  Boolean(activity.isOperational)
  || activity.operationalType === 'opening'
  || activity.operationalType === 'break'
  || activity.operationalType === 'closing';

/** Índice da atividade editável (ignora rotinas e itens fixos). */
export const coreBriefIndex = (plan: MeetingPlan, slotIndex: number): number =>
  (plan.activities || [])
    .slice(0, slotIndex)
    .filter(activity => !isCeremonialActivity(activity))
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
    'Se a semente nomear pessoas, canções, frutas ou patrulhas, use esses nomes. Não invente cerimônias extras.',
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
  "description": "Como a atividade RODA: regras, papéis, espaço — não um slogan",
  "materials": ["item 1 com qtde"],
  "progressionObjective": "[CÓDIGO] descrição curta",
  "objetivoEspecifico": "Ao final o jovem será capaz de...",
  "instrucaoChefia": "informações práticas adicionais para a chefia",
  "safetyNotes": "cuidados específicos, ou vazio",
  "manualReferencia": "fonte real consultada, ou vazio",
  "preparacaoPrevia": ["somente o que precisa ocorrer antes"]
}`;

/**
 * Regras duras de conteúdo prático (etapa 2 e refazer uma faixa).
 * Produto: ScoutsAuto. Paxtu é só a fonte oficial UEB — não chamar o app de Paxtu.
 */
export const PRACTICAL_CONTENT_RULES = `
CONTEÚDO ESSENCIAL (ScoutsAuto — escreva para uso real em campo):
Cada atividade precisa de nome, duração, objetivo curto, descrição detalhada, materiais,
referência de progressão quando houver e informações adicionais úteis para a chefia.
Não invente código de progressão, página, manual ou regra. Quando não houver fonte segura, deixe o campo vazio.
Segurança, preparação prévia e avaliação são contextuais: inclua somente quando forem úteis.
Proibido: "conduzir canções dinâmicas e conhecidas", "imprimir letras", "apresentar conceitos",
"distribuir estudos de caso", "elaborar cartões", "cantar canções conhecidas" — sem o conteúdo em si.
Se a semente já nomeia pessoas, canções, frutas, patrulhas ou cerimônias, USE esses nomes. Não invente cerimônias extras.

1) Canção / jogo / quebra-gelo: nomeie UMA canção (ou UM jogo) concreta deste dia.
   Inclua a letra (ou os 2–3 primeiros versos + refrão) OU as regras exatas do jogo
   (como se joga, como termina, quem começa). Coloque isso em conteudoPronto.
2) Oficina / tema técnico (ECA, nós, orientação, etc.): escreva o material pronto:
   3–6 fatos ou artigos curtos (no ECA, cite o número do artigo e o texto resumido);
   2–4 cartões de caso COM O TEXTO que a patrulha vai ler; perguntas; e um fechamento de 1 min em plenária.
   Não diga "elaborar cartões" — ESCREVA os cartões em conteudoPronto.
3) Cerimônia / entrega / recepção: escreva o SCRIPT FALADO (quem diz o quê), a formação,
   a ordem dos nomes se a semente trouxer nomes, e marcas de minuto dentro da faixa.
4) instrucaoChefia contém divisões de tarefa, adaptações, alertas e decisões práticas.
   Use roteiro cronometrado apenas quando a atividade realmente precisar dele.
5) description = como a atividade realmente roda (regras, papéis, espaço), não uma declaração de missão.
6) Faixas operacionais (IBEAGU, hidratação, IBOAGUCL): CURTAS. Um parágrafo + materiais.
   NÃO invente bloco de avaliação para elas. Sem requisitos/critérios/evidências.
7) evaluation SÓ quando houver algo específico a observar (não "participação organizada" em todo cartão).
   No máximo 2 itens observáveis. Se não couber avaliação, omita o campo evaluation.
8) fundoDeCena: UMA frase, diferente em cada atividade. Proibido repetir "energia total", "mística" ou "legado".
9) O produto se chama ScoutsAuto. Paxtu é só a fonte oficial da UEB. Nunca escreva "sistema PAXTU".
10) Use conteudoPronto e passos apenas quando trouxerem conteúdo efetivamente pronto e necessário.
`.trim();

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
    'Você é um Chefe Escoteiro Sênior no ScoutsAuto. Paxtu é só a fonte oficial da UEB.',
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
    (params.redoNote || oldActivity.redoNote || '').trim()
      ? `PEDIDO DESTE QUADRO (obrigatório cumprir — só esta faixa):\n${String(params.redoNote || oldActivity.redoNote).trim()}\nAplique com conteúdo prático (letra, cartões, script falado). Não ignore este pedido.`
      : '',
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
    PRACTICAL_CONTENT_RULES,
    'Retorne SOMENTE o objeto JSON pedido, sem markdown e sem texto extra.',
  ].filter(Boolean).join('\n');
};
