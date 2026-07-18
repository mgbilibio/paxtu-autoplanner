import { CalendarEvent, MeetingPlan, ScoutMember } from '../types';
import { downloadHtml, escapeHtml, htmlShell, renderList, renderText, safeFileName } from './htmlExportCommon';
import { buildMeetingPlanHtml } from './meetingPlanHtmlExport';

export const exportCalendarEventHtml = (
  event: CalendarEvent,
  plan: MeetingPlan | undefined,
  members: ScoutMember[],
): void => {
  if (plan) {
    downloadHtml(`Agenda_${event.date}_${safeFileName(plan.theme)}.html`, buildMeetingPlanHtml(plan));
    return;
  }
  const presentIds = new Set(event.attendance.filter(item => item.present).map(item => item.memberId));
  const presentNames = members.filter(member => presentIds.has(member.id)).map(member => member.name);
  const absentNames = members.filter(member => !presentIds.has(member.id)).map(member => member.name);
  const html = htmlShell(`Agenda - ${event.title}`, `
    <h1>${escapeHtml(event.title)}</h1>
    <div class="meta">
      <span class="pill">${escapeHtml(event.branch)}</span>
      <span class="pill">${escapeHtml(event.date.split('-').reverse().join('/'))}</span>
      <span class="pill">${presentNames.length} presentes</span>
    </div>
    <div class="box"><strong>Anotações</strong><p>${renderText(event.notes)}</p></div>
    <h2>Presença</h2>
    <div class="grid">
      <div class="box"><strong>Presentes</strong>${renderList(presentNames)}</div>
      <div class="box"><strong>Ausentes</strong>${renderList(absentNames)}</div>
    </div>
  `);
  downloadHtml(`Agenda_${event.date}_${safeFileName(event.title)}.html`, html);
};
