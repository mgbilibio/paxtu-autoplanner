import { ScoutBranch } from '../../types.ts';
import {
  ACOES_FIXAS_2025,
  ACOES_VARIAVEIS_2025,
  BLOCOS_2025,
  RAMOS_2025,
} from '../../data/generated/progressao_2025.ts';
import { ESPECIALIDADES_UEB_2026 } from '../../data/generated/especialidades_ueb_2026.ts';
import { ESPECIALIDADES_GUIA } from '../../data/generated/especialidades_guia.ts';

const blockCode = /^B(\d+)\.(F|V)(\d+)$/;
const legacyCode = /^(?:SP-[A-Z]{2}-[A-Z0-9-]+|[A-Z]{1,3}-[A-Z]{2,8}-[A-Z0-9-]{2,10})$/;

export type ResolvedProgressionCode =
  | { ok: true; kind: 'bloco'; code: string; blocoOrdem: number; slot: 'F' | 'V'; index: number; ramoId: number }
  | { ok: true; kind: 'specialty-ueb2026'; code: string; specialtyId: number }
  | { ok: true; kind: 'specialty-guia'; code: string; specialtyId: number }
  | { ok: true; kind: 'legacy'; code: string }
  | { ok: false; code: string; reason: string };

const ramoIdForBranch = (branch: ScoutBranch): number | null => {
  if (branch === ScoutBranch.LOBINHO) return RAMOS_2025.find(ramo => ramo.slug === 'lobinho')?.id ?? 1;
  if (branch === ScoutBranch.ESCOTEIRO) return RAMOS_2025.find(ramo => ramo.slug === 'escoteiro')?.id ?? 2;
  return null;
};

export const resolveProgressionCode = (code: string, branch: ScoutBranch): ResolvedProgressionCode => {
  const trimmed = code.trim();
  const ramoId = ramoIdForBranch(branch);
  const block = trimmed.match(blockCode);
  if (block) {
    if (ramoId === null) {
      return { ok: false, code: trimmed, reason: 'ramo incompatível com ação de bloco POR 2025+' };
    }
    const ordem = Number(block[1]);
    const slot = block[2] as 'F' | 'V';
    const index = Number(block[3]);
    const bloco = BLOCOS_2025.find(item => item.ordemGlobal === ordem);
    if (!bloco) return { ok: false, code: trimmed, reason: 'bloco inexistente no catálogo vigente' };
    const actions = slot === 'F' ? ACOES_FIXAS_2025 : ACOES_VARIAVEIS_2025;
    const ofBloco = actions.filter(item => item.blocoId === bloco.id && item.ramoId === ramoId);
    if (index < 1 || index > ofBloco.length) {
      return { ok: false, code: trimmed, reason: 'ação inexistente neste bloco e ramo' };
    }
    return { ok: true, kind: 'bloco', code: trimmed, blocoOrdem: ordem, slot, index, ramoId };
  }

  const ueb = trimmed.match(/^ESP-UEB26-(\d+)(?:-N[1-3])?$/);
  if (ueb) {
    const specialtyId = Number(ueb[1]);
    const exists = ESPECIALIDADES_UEB_2026.especialidades.some(item => item.id === specialtyId);
    if (!exists) return { ok: false, code: trimmed, reason: 'especialidade UEB 2026 inexistente' };
    return { ok: true, kind: 'specialty-ueb2026', code: trimmed, specialtyId };
  }

  const guia = trimmed.match(/^ESP-GUIA-(\d+)(?:-N[1-3])?$/);
  if (guia) {
    const specialtyId = Number(guia[1]);
    const exists = ESPECIALIDADES_GUIA.some(item => item.id === specialtyId);
    if (!exists) return { ok: false, code: trimmed, reason: 'especialidade de transição inexistente' };
    return { ok: true, kind: 'specialty-guia', code: trimmed, specialtyId };
  }

  if (trimmed.startsWith('ESP-')) {
    return { ok: false, code: trimmed, reason: 'especialidade inexistente no catálogo da edição' };
  }
  if (legacyCode.test(trimmed)) {
    return { ok: true, kind: 'legacy', code: trimmed };
  }
  return { ok: false, code: trimmed, reason: 'código não reconhecido no catálogo' };
};

export const assertProgressionCodes = (codes: string[], branch: ScoutBranch): string[] => {
  const resolved = codes.map(code => resolveProgressionCode(code, branch));
  const rejected = resolved.filter((item): item is Extract<ResolvedProgressionCode, { ok: false }> => !item.ok);
  if (rejected.length > 0) {
    throw new Error(`Código de progressão recusado: ${rejected.map(item => `${item.code} (${item.reason})`).join('; ')}`);
  }
  return resolved.map(item => item.code);
};
