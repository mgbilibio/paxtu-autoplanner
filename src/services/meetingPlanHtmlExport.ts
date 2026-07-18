import { MeetingPlan } from '../types';
import { downloadHtml, escapeHtml, htmlShell, renderList, renderText, safeFileName } from './htmlExportCommon';

const renderEvaluation = (activity: MeetingPlan['activities'][number]): string => {
  const evaluation = activity.evaluation;
  if (!evaluation) return '';
  return `<div class="box">
    <h3>Acompanhamento e avaliação</h3>
    <p><strong>Acompanhamento:</strong> ${renderText(evaluation.acompanhamento)}</p>
    <div class="grid small">
      <div><strong>Jovens</strong><p>${renderText(evaluation.avaliacaoJovens)}</p></div>
      <div><strong>Chefia</strong><p>${renderText(evaluation.avaliacaoChefia)}</p></div>
    </div>
    <div class="grid small">
      <div><strong>Requisitos observáveis</strong>${renderList(evaluation.requisitosObservaveis)}</div>
      <div><strong>Critérios de aceite</strong>${renderList(evaluation.criteriosDeAceite)}</div>
    </div>
    <div class="small"><strong>Evidências sugeridas</strong>${renderList(evaluation.evidenciasSugeridas)}</div>
  </div>`;
};

const renderActivity = (activity: MeetingPlan['activities'][number], index: number, start: number): string => {
  const end = start + (activity.durationMinutes || 0);
  const clock = activity.scheduledStartTime && activity.scheduledEndTime
    ? `${activity.scheduledStartTime} - ${activity.scheduledEndTime}`
    : `${start} a ${end} min`;
  return `<section class="activity ${activity.operationalType || ''}">
    <div class="activity-title">
      <h3>${index + 1}. ${escapeHtml(activity.title)}</h3>
      <span class="clock">${escapeHtml(clock)}</span>
    </div>
    <div class="meta">
      <span class="pill">${activity.durationMinutes || 0} min</span>
      <span class="pill">${escapeHtml(activity.educationalArea)}</span>
      <span class="pill">${escapeHtml(activity.progressionObjective || 'Geral')}</span>
      ${activity.isOperational ? '<span class="tag warn">Rotina da reunião</span>' : ''}
    </div>
    <p>${renderText(activity.description)}</p>
    ${activity.fundoDeCena ? `<div class="box"><strong>Fundo de cena</strong><p>${renderText(activity.fundoDeCena)}</p></div>` : ''}
    ${activity.instrucaoChefia ? `<div class="box"><strong>Instrução para chefia</strong><p>${renderText(activity.instrucaoChefia)}</p></div>` : ''}
    ${activity.objetivoEspecifico ? `<p><span class="tag">Objetivo</span> ${renderText(activity.objetivoEspecifico)}</p>` : ''}
    ${renderEvaluation(activity)}
    <div class="grid small">
      <div><strong>Materiais</strong>${renderList(activity.materials)}</div>
      <div><strong>Preparação prévia</strong>${renderList(activity.preparacaoPrevia)}</div>
    </div>
    ${activity.manualReferencia ? `<p class="small muted"><strong>Referência:</strong> ${renderText(activity.manualReferencia)}</p>` : ''}
  </section>`;
};

export const buildMeetingPlanHtml = (plan: MeetingPlan): string => {
  let elapsed = 0;
  const activities = (plan.activities || []).map((activity, index) => {
    const html = renderActivity(activity, index, elapsed);
    elapsed += activity.durationMinutes || 0;
    return html;
  }).join('');
  const study = (plan.studyGuide || []).map(item => `<div class="box">
    <h3>${escapeHtml(item.activityTitle)}</h3>
    <p>${renderText(item.conceptExplainer)}</p>
    <p class="small"><strong>Dicas:</strong> ${renderText(item.teachingTips)}</p>
    <div class="small"><strong>Buscas usadas</strong>${renderList(item.searchQueriesUsed)}</div>
  </div>`).join('');
  return htmlShell(plan.theme || 'Roteiro', `
    <section class="hero">
      <h1>${escapeHtml(plan.theme || 'Roteiro')}</h1>
      <p>Roteiro operacional para uso em campo, com horários, materiais, avaliação e guia da chefia.</p>
      <div class="meta">
        <span class="pill">${escapeHtml(plan.branch || '')}</span>
        <span class="pill">${escapeHtml(plan.totalDuration)} minutos</span>
        <span class="pill">${escapeHtml(plan.createdAt ? new Date(plan.createdAt).toLocaleString('pt-BR') : '')}</span>
      </div>
    </section>
    <div class="content">
      <div class="box"><strong>Notas gerais</strong><p>${renderText(plan.generalNotes)}</p></div>
      ${plan.fundoDeCena ? `<div class="box"><strong>Fundo de cena</strong><p>${renderText(plan.fundoDeCena)}</p></div>` : ''}
      ${plan.preparacaoChefia ? `<div class="box"><strong>Preparação da chefia</strong><p>${renderText(plan.preparacaoChefia)}</p></div>` : ''}
      ${plan.educationalRationale ? `<div class="box"><strong>Intencionalidade educativa</strong><p>${renderText(plan.educationalRationale)}</p></div>` : ''}
    </div>
    <h2>Atividades</h2><div class="content">${activities}</div>
    <h2>Guia da chefia</h2><div class="content">${study || '<p class="muted">Sem guia de estudo registrado.</p>'}</div>
  `);
};

export const exportMeetingPlanHtml = (plan: MeetingPlan): void => {
  const date = new Date().toISOString().slice(0, 10);
  downloadHtml(`Roteiro_${safeFileName(plan.theme)}_${date}.html`, buildMeetingPlanHtml(plan));
};
