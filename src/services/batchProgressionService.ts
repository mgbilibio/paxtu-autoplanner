import { ProgressLaunch, ProgressLaunchApply, ScoutBranch } from '../types';
import {
  getMemberBlocoState,
  getMemberSpecialtyState,
  saveMemberBlocoState,
  saveMemberSpecialtyState,
  updateMemberAchievement,
  getMemberProgressIndividual,
  saveMemberProgressIndividual,
} from './storageService';
import { getOfficialSpecialtyId } from '../data/officialSpecialtyCatalog';
import { saveProgressLaunchAsync } from './storage/progressLaunchStorage';

export interface BatchProgressionResult {
  blocos: number;
  especialidadesIniciadas: number;
  legados: number;
  codesApplied: string[];
  specialtyIdsStarted: number[];
}

const blockCode = /^B(\d+)\.(F|V)(\d+)$/;
const legacyCode = /^(?:SP-[A-Z]{2}-[A-Z0-9-]+|[A-Z]{1,3}-[A-Z]{2,8}-[A-Z0-9-]{2,10})$/;

const ramoIdForBranch = (branch: ScoutBranch): number | null => {
  if (branch === ScoutBranch.LOBINHO) return 1;
  if (branch === ScoutBranch.ESCOTEIRO) return 2;
  return null;
};

export const extractProgressionCodes = (text: string): string[] => {
  const patterns = [
    /\bB\d+\.(?:F|V)\d+\b/g,
    /\bESP-GUIA-\d+(?:-N[1-3])?\b/g,
    /\bSP-[A-Z]{2}-[A-Z0-9-]+\b/g,
    /\b[A-Z]{1,3}-[A-Z]{2,8}-[A-Z0-9-]{2,10}\b/g,
  ];
  return [...new Set(patterns.flatMap(pattern => text.match(pattern) || []))];
};

const applyBlocoCode = async (
  memberId: string,
  branch: ScoutBranch,
  code: string,
): Promise<boolean> => {
  const match = code.match(blockCode);
  const ramoId = ramoIdForBranch(branch);
  if (!match || ramoId === null) return false;

  const blocoId = Number(match[1]);
  const index = Number(match[3]);
  const state = await getMemberBlocoState(memberId, blocoId);
  const base = state || {
    memberId,
    blocoId,
    ramoId,
    fixasConcluidas: [],
    variaveisConcluidas: [],
    lastUpdate: new Date().toISOString(),
  };
  const key = match[2] === 'F' ? 'fixasConcluidas' : 'variaveisConcluidas';
  if (base[key].includes(index)) return false;
  await saveMemberBlocoState({
    ...base,
    [key]: [...base[key], index].sort((left, right) => left - right),
  });
  return true;
};

const reverseBlocoCode = async (memberId: string, code: string): Promise<boolean> => {
  const match = code.match(blockCode);
  if (!match) return false;
  const blocoId = Number(match[1]);
  const index = Number(match[3]);
  const state = await getMemberBlocoState(memberId, blocoId);
  if (!state) return false;
  const key = match[2] === 'F' ? 'fixasConcluidas' : 'variaveisConcluidas';
  if (!state[key].includes(index)) return false;
  await saveMemberBlocoState({
    ...state,
    [key]: state[key].filter(i => i !== index),
    lastUpdate: new Date().toISOString(),
  });
  return true;
};

const startOfficialSpecialty = async (
  memberId: string,
  code: string,
  date: string,
  planTheme: string,
): Promise<{ applied: boolean; specialtyId?: number }> => {
  const especialidadeId = getOfficialSpecialtyId(code);
  if (especialidadeId === null) return { applied: false };
  const state = await getMemberSpecialtyState(memberId, especialidadeId);
  if (state) return { applied: false };
  await saveMemberSpecialtyState({
    memberId,
    especialidadeId,
    requisitosConcluidos: [],
    notas: `Iniciada em atividade: ${planTheme} (${date}).`,
    lastUpdate: new Date().toISOString(),
  });
  return { applied: true, specialtyId: especialidadeId };
};

/** Anota desfazimento do início se ainda não há requisitos concluídos (estado permanece para auditoria). */
const reverseOfficialSpecialtyStart = async (
  memberId: string,
  specialtyId: number,
): Promise<boolean> => {
  const state = await getMemberSpecialtyState(memberId, specialtyId);
  if (!state) return false;
  if ((state.requisitosConcluidos || []).length > 0) return false;
  const note = '[Início desfeito: excluído do crédito da atividade.]';
  if ((state.notas || '').includes(note)) return true;
  await saveMemberSpecialtyState({
    ...state,
    notas: `${state.notas || ''} ${note}`.trim(),
    lastUpdate: new Date().toISOString(),
  });
  return true;
};

export const applyProgressionCodes = async (
  memberId: string,
  branch: ScoutBranch,
  codes: string[],
  date: string,
  planTheme: string,
): Promise<BatchProgressionResult> => {
  const result: BatchProgressionResult = {
    blocos: 0,
    especialidadesIniciadas: 0,
    legados: 0,
    codesApplied: [],
    specialtyIdsStarted: [],
  };
  for (const code of codes) {
    if (await applyBlocoCode(memberId, branch, code)) {
      result.blocos++;
      result.codesApplied.push(code);
      continue;
    }
    const officialSpecialtyId = getOfficialSpecialtyId(code);
    const started = await startOfficialSpecialty(memberId, code, date, planTheme);
    if (started.applied) {
      result.especialidadesIniciadas++;
      result.codesApplied.push(code);
      if (started.specialtyId != null) result.specialtyIdsStarted.push(started.specialtyId);
      continue;
    }
    if (officialSpecialtyId === null && legacyCode.test(code)) {
      const legacy = await getMemberProgressIndividual(memberId);
      const already = legacy?.achievements?.some(a => a.code === code);
      if (!already) {
        await updateMemberAchievement(memberId, code, date, `Atividade: ${planTheme}`);
        result.legados++;
        result.codesApplied.push(code);
      }
    }
  }
  return result;
};

export const reverseProgressionApply = async (
  memberId: string,
  apply: ProgressLaunchApply,
): Promise<void> => {
  for (const code of apply.codesApplied || []) {
    if (blockCode.test(code)) {
      await reverseBlocoCode(memberId, code);
      continue;
    }
    // legado: remove achievement se existir
    if (legacyCode.test(code) && !code.startsWith('ESP-')) {
      const legacy = await getMemberProgressIndividual(memberId);
      if (legacy?.achievements) {
        const next = {
          ...legacy,
          achievements: legacy.achievements.filter(a => a.code !== code),
        };
        await saveMemberProgressIndividual(next);
      }
    }
  }
  for (const sid of apply.specialtyIdsStarted || []) {
    await reverseOfficialSpecialtyStart(memberId, sid);
  }
};

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

/** Cria lançamento e aplica códigos a todos os membros creditados. */
export const createAndApplyProgressLaunch = async (params: {
  eventId: string;
  sectionId: string;
  date: string;
  planId?: string;
  planTheme: string;
  codes: string[];
  memberIds: string[];
  members: Array<{ id: string; branch: ScoutBranch }>;
}): Promise<ProgressLaunch> => {
  const applies: ProgressLaunchApply[] = [];
  for (const memberId of params.memberIds) {
    const member = params.members.find(m => m.id === memberId);
    if (!member) continue;
    const result = await applyProgressionCodes(
      memberId,
      member.branch,
      params.codes,
      params.date,
      params.planTheme,
    );
    applies.push({
      memberId,
      codesApplied: result.codesApplied,
      specialtyIdsStarted: result.specialtyIdsStarted,
    });
  }
  const now = new Date().toISOString();
  const launch: ProgressLaunch = {
    id: newId(),
    eventId: params.eventId,
    sectionId: params.sectionId,
    date: params.date,
    planId: params.planId,
    planTheme: params.planTheme,
    codes: params.codes,
    creditedMemberIds: [...params.memberIds],
    excludedMemberIds: [],
    applies,
    createdAt: now,
    updatedAt: now,
  };
  await saveProgressLaunchAsync(launch);
  return launch;
};

/**
 * Atualiza o conjunto creditado: exclui quem saiu (reverte apply) e re-inclui quem voltou.
 */
export const syncProgressLaunchCredits = async (
  launch: ProgressLaunch,
  nextCreditedIds: string[],
  members: Array<{ id: string; branch: ScoutBranch }>,
): Promise<ProgressLaunch> => {
  const prev = new Set(launch.creditedMemberIds);
  const next = new Set(nextCreditedIds);
  const applies = [...launch.applies];

  // Excluir
  for (const memberId of prev) {
    if (next.has(memberId)) continue;
    const apply = applies.find(a => a.memberId === memberId);
    if (apply) await reverseProgressionApply(memberId, apply);
  }

  // Re-incluir
  for (const memberId of next) {
    if (prev.has(memberId)) continue;
    const member = members.find(m => m.id === memberId);
    if (!member) continue;
    const result = await applyProgressionCodes(
      memberId,
      member.branch,
      launch.codes,
      launch.date,
      launch.planTheme || '',
    );
    const existingIdx = applies.findIndex(a => a.memberId === memberId);
    const row: ProgressLaunchApply = {
      memberId,
      codesApplied: result.codesApplied,
      specialtyIdsStarted: result.specialtyIdsStarted,
    };
    if (existingIdx >= 0) applies[existingIdx] = row;
    else applies.push(row);
  }

  const allEver = new Set([
    ...launch.creditedMemberIds,
    ...launch.excludedMemberIds,
    ...nextCreditedIds,
  ]);
  const excluded = [...allEver].filter(id => !next.has(id));

  const updated: ProgressLaunch = {
    ...launch,
    creditedMemberIds: [...next],
    excludedMemberIds: excluded,
    applies,
    updatedAt: new Date().toISOString(),
  };
  await saveProgressLaunchAsync(updated);
  return updated;
};
