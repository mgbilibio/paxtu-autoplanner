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
import {
  deleteProgressLaunchAsync,
  getProgressLaunchesAsync,
  saveProgressLaunchAsync,
} from './storage/progressLaunchStorage';

export interface BatchProgressionResult {
  blocos: number;
  especialidadesIniciadas: number;
  legados: number;
  codesApplied: string[];
  codesCredited: string[];
  specialtyIdsStarted: number[];
  specialtyIdsCredited: number[];
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
    /\bESP-UEB26-\d+(?:-N[1-3])?\b/g,
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
): Promise<{ applied: boolean; credited: boolean }> => {
  const match = code.match(blockCode);
  const ramoId = ramoIdForBranch(branch);
  if (!match || ramoId === null) return { applied: false, credited: false };

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
  if (base[key].includes(index)) return { applied: false, credited: true };
  await saveMemberBlocoState({
    ...base,
    [key]: [...base[key], index].sort((left, right) => left - right),
  });
  return { applied: true, credited: true };
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
  if (state) return { applied: false, specialtyId: especialidadeId };
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
    codesCredited: [],
    specialtyIdsStarted: [],
    specialtyIdsCredited: [],
  };
  for (const code of codes) {
    const block = await applyBlocoCode(memberId, branch, code);
    if (block.credited) {
      result.codesCredited.push(code);
      if (block.applied) {
        result.blocos++;
        result.codesApplied.push(code);
      }
      continue;
    }
    const officialSpecialtyId = getOfficialSpecialtyId(code);
    const started = await startOfficialSpecialty(memberId, code, date, planTheme);
    if (started.specialtyId != null) {
      result.codesCredited.push(code);
      result.specialtyIdsCredited.push(started.specialtyId);
      if (started.applied) {
        result.especialidadesIniciadas++;
        result.codesApplied.push(code);
        result.specialtyIdsStarted.push(started.specialtyId);
      }
      continue;
    }
    if (officialSpecialtyId === null && legacyCode.test(code)) {
      const legacy = await getMemberProgressIndividual(memberId);
      const already = legacy?.achievements?.some(a => a.code === code);
      result.codesCredited.push(code);
      if (!already) {
        await updateMemberAchievement(memberId, code, date, `Atividade: ${planTheme}`);
        result.legados++;
        result.codesApplied.push(code);
      }
    }
  }
  return result;
};

const mergeUnique = <T,>(...arrays: Array<Array<T> | undefined>): T[] => (
  [...new Set(arrays.flatMap(items => items || []))]
);

const creditedCodesFor = (launch: ProgressLaunch, memberId: string): string[] => {
  const apply = launch.applies.find(item => item.memberId === memberId);
  if (apply?.codesCredited?.length) return apply.codesCredited;
  if (launch.creditedMemberIds.includes(memberId)) return launch.codes;
  return [];
};

const creditedSpecialtiesFor = (launch: ProgressLaunch, memberId: string): number[] => (
  creditedCodesFor(launch, memberId)
    .map(code => getOfficialSpecialtyId(code))
    .filter((id): id is number => id !== null)
);

const launchOwnsCode = (
  launches: ProgressLaunch[],
  memberId: string,
  code: string,
): boolean => launches.some(launch =>
  launch.applies.some(apply =>
    apply.memberId === memberId && (apply.codesApplied || []).includes(code)
  )
);

const launchOwnsSpecialty = (
  launches: ProgressLaunch[],
  memberId: string,
  specialtyId: number,
): boolean => launches.some(launch =>
  launch.applies.some(apply =>
    apply.memberId === memberId && (apply.specialtyIdsStarted || []).includes(specialtyId)
  )
);

type ReverseOptions = {
  allLaunches: ProgressLaunch[];
  currentLaunch: ProgressLaunch;
};

export const reverseProgressionApply = async (
  memberId: string,
  apply: ProgressLaunchApply,
  options: ReverseOptions,
): Promise<ProgressLaunchApply> => {
  const protectedCodes = new Set(
    options.allLaunches
      .filter(launch => launch.id !== options.currentLaunch.id)
      .filter(launch => launch.creditedMemberIds.includes(memberId))
      .flatMap(launch => creditedCodesFor(launch, memberId))
  );
  const nextApply: ProgressLaunchApply = {
    ...apply,
    reversedCodes: [...(apply.reversedCodes || [])],
    specialtyIdsReversed: [...(apply.specialtyIdsReversed || [])],
  };
  const currentCodes = mergeUnique(
    apply.codesApplied,
    apply.codesCredited,
    creditedCodesFor(options.currentLaunch, memberId),
  );

  for (const code of currentCodes) {
    if (protectedCodes.has(code)) continue;
    if (!launchOwnsCode(options.allLaunches, memberId, code)) continue;
    if (blockCode.test(code)) {
      if (await reverseBlocoCode(memberId, code)) {
        nextApply.reversedCodes = mergeUnique(nextApply.reversedCodes, [code]);
      }
      continue;
    }
    if (legacyCode.test(code) && !code.startsWith('ESP-')) {
      const legacy = await getMemberProgressIndividual(memberId);
      if (legacy?.achievements) {
        const before = legacy.achievements.length;
        const next = {
          ...legacy,
          achievements: legacy.achievements.filter(a => a.code !== code),
        };
        await saveMemberProgressIndividual(next);
        if (next.achievements.length < before) {
          nextApply.reversedCodes = mergeUnique(nextApply.reversedCodes, [code]);
        }
      }
    }
  }
  const protectedSpecialties = new Set(
    options.allLaunches
      .filter(launch => launch.id !== options.currentLaunch.id)
      .filter(launch => launch.creditedMemberIds.includes(memberId))
      .flatMap(launch => creditedSpecialtiesFor(launch, memberId))
  );
  const currentSpecialties = mergeUnique(
    apply.specialtyIdsStarted,
    apply.specialtyIdsCredited,
    creditedSpecialtiesFor(options.currentLaunch, memberId),
  );
  for (const sid of currentSpecialties) {
    if (protectedSpecialties.has(sid)) continue;
    if (!launchOwnsSpecialty(options.allLaunches, memberId, sid)) continue;
    if (await reverseOfficialSpecialtyStart(memberId, sid)) {
      nextApply.specialtyIdsReversed = mergeUnique(nextApply.specialtyIdsReversed, [sid]);
    }
  }
  return nextApply;
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
      codesCredited: result.codesCredited,
      specialtyIdsStarted: result.specialtyIdsStarted,
      specialtyIdsCredited: result.specialtyIdsCredited,
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
  const allLaunches = await getProgressLaunchesAsync();

  // Excluir
  for (const memberId of prev) {
    if (next.has(memberId)) continue;
    const applyIndex = applies.findIndex(a => a.memberId === memberId);
    if (applyIndex >= 0) {
      applies[applyIndex] = await reverseProgressionApply(
        memberId,
        applies[applyIndex],
        { allLaunches, currentLaunch: launch },
      );
    }
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
    const existing = existingIdx >= 0 ? applies[existingIdx] : undefined;
    const preservedCodesApplied = (existing?.codesApplied || [])
      .filter(code => !(existing?.reversedCodes || []).includes(code));
    const preservedSpecialtiesStarted = (existing?.specialtyIdsStarted || [])
      .filter(id => !(existing?.specialtyIdsReversed || []).includes(id));
    const row: ProgressLaunchApply = {
      memberId,
      codesApplied: mergeUnique(preservedCodesApplied, result.codesApplied),
      codesCredited: result.codesCredited,
      reversedCodes: (existing?.reversedCodes || [])
        .filter(code => !result.codesApplied.includes(code)),
      specialtyIdsStarted: mergeUnique(preservedSpecialtiesStarted, result.specialtyIdsStarted),
      specialtyIdsCredited: result.specialtyIdsCredited,
      specialtyIdsReversed: (existing?.specialtyIdsReversed || [])
        .filter(id => !result.specialtyIdsStarted.includes(id)),
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

export const deleteProgressLaunchAndReverse = async (
  launch: ProgressLaunch,
): Promise<void> => {
  const allLaunches = await getProgressLaunchesAsync();
  const applies = [...launch.applies];
  for (const memberId of launch.creditedMemberIds) {
    const apply = applies.find(item => item.memberId === memberId) || {
      memberId,
      codesApplied: [],
      codesCredited: launch.codes,
    };
    await reverseProgressionApply(memberId, apply, { allLaunches, currentLaunch: launch });
  }
  await deleteProgressLaunchAsync(launch.id);
};
