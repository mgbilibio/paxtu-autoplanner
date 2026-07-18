import { ScoutBranch } from '../types';
import { MeetingCycle } from './geminiService';
import { downloadHtml, escapeHtml, htmlShell, renderList, renderText, safeFileName } from './htmlExportCommon';

export const buildCycleHtml = (cycle: MeetingCycle, branch: ScoutBranch, startDate?: string): string => {
  const meetings = cycle.meetings.map((meeting, index) => {
    const date = startDate ? new Date(`${startDate}T12:00:00`) : null;
    if (date) date.setDate(date.getDate() + (index * 7));
    const dateText = date ? date.toLocaleDateString('pt-BR') : 'sem data definida';
    return `<section class="activity">
      <h3>Semana ${index + 1}: ${escapeHtml(meeting.theme)}</h3>
      <div class="meta">
        <span class="pill">${dateText}</span>
        <span class="pill">${escapeHtml(meeting.progressionObjective || 'Sem foco definido')}</span>
      </div>
      <p>${renderText(meeting.generalNotes)}</p>
      <div class="box">
        <h3>Acompanhamento e avaliação</h3>
        <p><strong>Acompanhamento:</strong> ${renderText(meeting.acompanhamento)}</p>
        <div class="grid small">
          <div><strong>Jovens</strong><p>${renderText(meeting.avaliacaoJovens)}</p></div>
          <div><strong>Chefia</strong><p>${renderText(meeting.avaliacaoChefia)}</p></div>
        </div>
        <div class="grid small">
          <div><strong>Requisitos observáveis</strong>${renderList(meeting.requisitosObservaveis)}</div>
          <div><strong>Critérios de aceite</strong>${renderList(meeting.criteriosDeAceite)}</div>
        </div>
      </div>
    </section>`;
  }).join('');
  return htmlShell(`Ciclo - ${cycle.theme}`, `
    <h1>Ciclo: ${escapeHtml(cycle.theme)}</h1>
    <div class="meta">
      <span class="pill">${escapeHtml(branch)}</span>
      <span class="pill">${cycle.meetings.length} reuniões</span>
      <span class="pill">1ª reunião: ${escapeHtml(startDate || 'não definida')}</span>
    </div>
    <div class="box"><strong>Racional</strong><p>${renderText(cycle.rational)}</p></div>
    <h2>Reuniões do ciclo</h2>${meetings}
  `);
};

export const exportCycleHtml = (cycle: MeetingCycle, branch: ScoutBranch, startDate?: string): void => {
  const date = new Date().toISOString().slice(0, 10);
  downloadHtml(`Ciclo_${safeFileName(cycle.theme)}_${date}.html`, buildCycleHtml(cycle, branch, startDate));
};
