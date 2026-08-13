import { ScoutMember, ScoutBranch, ScoutSection, ProgressionRecord } from "../types";
import { isYouthMember } from "../utils/memberQuickAdd";
import {
  getCalendarEventsAsync,
  getMembersAsync,
  getAllMemberBlocoStates,
  getMemberProgressIndividual,
  getMemberSpecialtyStates,
} from "./storageService";
import { getCatalogForSection } from "./catalogService";
import { escapeHtml, safeFileName } from "./htmlExportCommon";
import {
  UPDATED_ESPECIALIDADES_GUIA,
  UPDATED_SPECIALTY_PREFIX,
} from '../data/updatedSpecialtyCatalog';
import { getOfficialSpecialtyLevel } from '../data/officialSpecialtyCatalog';

export interface ProgressionHit {
  code: string;
  date: string;
  activityTitle: string;
  planTheme: string;
}

export interface ScoutProgressProfile {
  member: ScoutMember;
  completedCodes: ProgressionHit[]; // Lista de códigos realizados
  attendanceRate: number; // % de presença
  totalEvents: number;
  attendedEvents: number;
}

// Conjunto de codigos de catalogo HOMOLOGADOS por um membro, unindo as duas
// fontes reais de verdade (nao mais inferencia por presenca):
//  - blocos POR 2025 (PAXTU_BLOCO_*): fixas/variaveis concluidas + bloco fechado;
//  - conquistas legadas POR 2020 (PAXTU_PROG_*): achievements homologados.
export const getMemberHomologatedCodes = async (memberId: string): Promise<Set<string>> => {
  const codes = new Set<string>();
  const states = await getAllMemberBlocoStates(memberId);
  states.forEach(s => {
    (s.fixasConcluidas || []).forEach(idx => codes.add(`B${s.blocoId}.F${idx}`));
    (s.variaveisConcluidas || []).forEach(idx => codes.add(`B${s.blocoId}.V${idx}`));
    if (s.substituidoPor) codes.add(`B${s.blocoId}.SUB`);
    if (s.dataConclusao) codes.add(`B${s.blocoId}`);
  });
  const legacy = await getMemberProgressIndividual(memberId);
  legacy?.achievements.forEach(a => codes.add(a.code));
  return codes;
};

export const getTroopProgressData = async (branchFilter?: ScoutBranch, sectionId?: string): Promise<ScoutProgressProfile[]> => {
  const [events, members] = await Promise.all([
    getCalendarEventsAsync(sectionId),
    getMembersAsync(sectionId)
  ]);

  const activeMembers = members.filter(m => {
    if (!isYouthMember(m) || m.isArchived) return false;
    return branchFilter ? m.branch === branchFilter : true;
  });

  return Promise.all(activeMembers.map(async member => {
    // Frequencia: ignora eventos anteriores ao ingresso do membro (M14).
    const joined = member.admissionDate ? Date.parse(member.admissionDate) : NaN;
    let totalEvents = 0;
    let attendedEvents = 0;
    events.forEach(event => {
        if (Number.isFinite(joined) && Date.parse(event.date) < joined) return;
        totalEvents++;
        if (event.attendance.find(a => a.memberId === member.id)?.present) attendedEvents++;
    });

    // Progressao REAL homologada (blocos + conquistas legadas), nao por presenca.
    // CONTRATO: os codes abaixo (`B{n}...`) usam s.blocoId, e por convenicao do
    // dominio MemberBlocoState.blocoId === bloco.ordemGlobal (ver catalogService:38).
    // Os codes do catalogo (getCatalogCodesForBranch) tambem sao gerados a partir
    // de ordemGlobal, entao as duas pontas casam. Se blocoId deixar de espelhar
    // ordemGlobal, este cruzamento quebra e o percentual fica errado.
    const completedHits: ProgressionHit[] = [];
    const states = await getAllMemberBlocoStates(member.id);
    states.forEach(s => {
        const when = s.dataConclusao || s.lastUpdate;
        (s.fixasConcluidas || []).forEach(idx => completedHits.push({
            code: `B${s.blocoId}.F${idx}`, date: when, activityTitle: s.avaliador || 'Homologação', planTheme: s.notas || ''
        }));
        (s.variaveisConcluidas || []).forEach(idx => completedHits.push({
            code: `B${s.blocoId}.V${idx}`, date: when, activityTitle: s.avaliador || 'Homologação', planTheme: s.notas || ''
        }));
        if (s.substituidoPor) completedHits.push({
            code: `B${s.blocoId}.SUB`, date: when, activityTitle: `Substituído por ${s.substituidoPor.nome}`, planTheme: s.notas || ''
        });
        if (s.dataConclusao) completedHits.push({
            code: `B${s.blocoId}`, date: s.dataConclusao, activityTitle: s.avaliador || 'Bloco concluído', planTheme: s.notas || ''
        });
    });
    const legacy = await getMemberProgressIndividual(member.id);
    legacy?.achievements.forEach(a => completedHits.push({
        code: a.code, date: a.date || new Date().toISOString().slice(0, 10), activityTitle: 'Conquista registrada', planTheme: ''
    }));
    const specialtyStates = await getMemberSpecialtyStates(
      member.id,
      UPDATED_ESPECIALIDADES_GUIA.map(item => item.id),
    );
    specialtyStates.forEach(state => {
      const level = state.nivelAtual || getOfficialSpecialtyLevel(
        state.especialidadeId,
        state.requisitosConcluidos.length,
      );
      if (level > 0) {
        completedHits.push({
          code: `${UPDATED_SPECIALTY_PREFIX}${state.especialidadeId}`,
          date: state.dataConclusao || state.lastUpdate,
          activityTitle: `Especialidade nível ${level}`,
          planTheme: state.notas || '',
        });
      }
    });

    return {
        member,
        completedCodes: completedHits,
        attendanceRate: totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0,
        totalEvents,
        attendedEvents
    };
  }));
};

export const getCatalogCodesForBranch = (branch: ScoutBranch, section?: ScoutSection | null): {code: string, category: string, desc: string}[] => {
    const catalog = getCatalogForSection(branch, section);
    if (!catalog) return [];
    
    const allItems: {code: string, category: string, desc: string}[] = [];
    catalog.forEach(cat => {
        cat.items.forEach(item => {
            allItems.push({
                code: item.code,
                category: cat.name,
                desc: item.description
            });
        });
    });
    return allItems;
};

// Conta itens DISTINTOS do catalogo concluidos por um perfil. Deduplica (um code
// pode ter varios hits) e descarta codes fora do catalogo desta secao — ex.: codes
// de bloco POR 2025 numa secao legada nao casam e seriam ruido que infla o total.
// Centralizado aqui para que Dashboard/IndividualReport/TroopStats contem igual.
export const completedCatalogCount = (
  profile: ScoutProgressProfile,
  catalogCodeSet: Set<string>,
): number =>
  new Set(profile.completedCodes.map(h => h.code).filter(c => catalogCodeSet.has(c))).size;

// --- PRINTABLE REPORT GENERATOR ---

export const generatePrintableHistory = (
  member: ScoutMember, 
  section: ScoutSection | null | undefined, 
  achievements: ProgressionRecord[]
) => {
  const catalog = getCatalogForSection(member.branch, section);
  const date = new Date().toLocaleDateString();
  const completedCodes = new Set(achievements.map(a => a.code));
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Ficha de Progressão - ${escapeHtml(member.name)}</title>
    <style>
        body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.4; }
        .header { border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .header-info h1 { margin: 0; color: #1e293b; font-size: 24px; }
        .member-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .data-label { font-weight: bold; color: #64748b; font-size: 10px; text-transform: uppercase; display: block; }
        .data-value { font-size: 14px; font-weight: bold; }
        .section-title { background: #1e293b; color: white; padding: 5px 15px; font-size: 12px; border-radius: 4px; margin: 20px 0 10px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .item { border: 1px solid #f1f5f9; padding: 6px; border-radius: 4px; display: flex; gap: 8px; font-size: 10px; }
        .item.completed { background: #f0fdf4; border-color: #bbf7d0; }
        .check { width: 14px; height: 14px; border: 1px solid #cbd5e1; border-radius: 2px; text-align: center; line-height: 14px; font-size: 10px; }
        .completed .check { background: #22c55e; border-color: #22c55e; color: white; }
        .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
        @media print { .no-print { display: none; } .item { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-info">
            <h1>⚜️ Ficha de Progressão Individual</h1>
            <p>${escapeHtml(section?.name || 'Seção')} • ${escapeHtml(member.branch)} • Gerado em ${escapeHtml(date)}</p>
        </div>
        <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background: #1e293b; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Imprimir</button>
    </div>
    <div class="member-card">
        <div><span class="data-label">Nome</span><span class="data-value">${escapeHtml(member.name)}</span></div>
        <div><span class="data-label">Patrulha</span><span class="data-value">${escapeHtml(member.patrol || '---')}</span></div>
        <div><span class="data-label">Registro</span><span class="data-value">${escapeHtml(member.registerNumber || '---')}</span></div>
        <div><span class="data-label">Status</span><span class="data-value">${achievements.length} itens conquistados</span></div>
    </div>
    ${catalog.map(cat => `
        <div class="section-title">${escapeHtml(cat.name)}</div>
        <div class="grid">
            ${cat.items.map(item => {
                const isDone = completedCodes.has(item.code);
                return `
                    <div class="item ${isDone ? 'completed' : ''}">
                        <div class="check">${isDone ? '✓' : ''}</div>
                        <div><strong>${escapeHtml(item.code)}</strong> ${escapeHtml(item.description)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('')}
    <div class="footer">Gerado pelo Paxtu AutoPlanner • ${escapeHtml(section?.progressionSystem || 'POR 2025')}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ficha_${safeFileName(member.name)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
