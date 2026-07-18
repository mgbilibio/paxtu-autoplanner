import { ScoutBranch } from '../types';
import {
  getMemberBlocoState,
  getMemberSpecialtyState,
  saveMemberBlocoState,
  saveMemberSpecialtyState,
  updateMemberAchievement,
} from './storageService';
import { getOfficialSpecialtyId } from '../data/officialSpecialtyCatalog';

export interface BatchProgressionResult {
  blocos: number;
  especialidadesIniciadas: number;
  legados: number;
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

const startOfficialSpecialty = async (
  memberId: string,
  code: string,
  date: string,
  planTheme: string,
): Promise<boolean> => {
  const especialidadeId = getOfficialSpecialtyId(code);
  if (especialidadeId === null) return false;
  const state = await getMemberSpecialtyState(memberId, especialidadeId);
  if (state) return false;
  await saveMemberSpecialtyState({
    memberId,
    especialidadeId,
    requisitosConcluidos: [],
    notas: `Iniciada em atividade: ${planTheme} (${date}).`,
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
  };
  for (const code of codes) {
    if (await applyBlocoCode(memberId, branch, code)) {
      result.blocos++;
      continue;
    }
    const officialSpecialtyId = getOfficialSpecialtyId(code);
    if (await startOfficialSpecialty(memberId, code, date, planTheme)) {
      result.especialidadesIniciadas++;
      continue;
    }
    if (officialSpecialtyId === null && legacyCode.test(code)) {
      await updateMemberAchievement(memberId, code, date, `Atividade: ${planTheme}`);
      result.legados++;
    }
  }
  return result;
};
