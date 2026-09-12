export const requireExplicitSectionId = (
  sectionId?: string | null,
  action: 'importar' | 'exportar' | 'usar' = 'importar',
): string => {
  const id = (sectionId || '').trim();
  if (!id) throw new Error(`Selecione uma seção para ${action} o pacote.`);
  return id;
};

export const normalizePackName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const packNameDiffersFromSection = (
  packName?: string,
  sectionName?: string,
): boolean => {
  const pack = typeof packName === 'string' ? packName.trim() : '';
  if (!pack) return false;
  const target = typeof sectionName === 'string' ? sectionName.trim() : '';
  if (!target) return false;
  return normalizePackName(pack) !== normalizePackName(target);
};

export type PackKind = 'alcateia' | 'tropa' | 'cla' | 'outra';

const kindFromBranchValue = (branch?: string): PackKind | undefined => {
  if (!branch) return undefined;
  if (branch === 'Lobinho') return 'alcateia';
  if (branch === 'Pioneiro') return 'cla';
  if (branch === 'Escoteiro' || branch === 'Sênior') return 'tropa';
  return 'outra';
};

export const resolveSectionKind = (
  kind?: PackKind,
  branch?: string,
): PackKind | undefined => kind || kindFromBranchValue(branch);

export const packKindDiffersFromSection = (
  pack: { kind?: PackKind; branch?: string },
  section: { kind?: PackKind; branch?: string },
): boolean => {
  const packKind = resolveSectionKind(pack.kind, pack.branch);
  const targetKind = resolveSectionKind(section.kind, section.branch);
  if (packKind && targetKind && packKind !== 'outra' && targetKind !== 'outra' && packKind !== targetKind) {
    return true;
  }
  if (pack.branch && section.branch && pack.branch !== section.branch) return true;
  return false;
};

const kindPhrase = (kind?: PackKind, branch?: string): string => {
  const resolved = resolveSectionKind(kind, branch);
  if (resolved === 'alcateia') return 'Alcateia (Lobinho)';
  if (resolved === 'cla') return 'Clã (Pioneiro)';
  if (resolved === 'tropa' && branch === 'Sênior') return 'Tropa (Sênior)';
  if (resolved === 'tropa') return 'Tropa (Escoteiro)';
  return typeof branch === 'string' && branch.trim() ? branch : '';
};

export const describeSectionPackMismatch = (
  pack: { section: { name?: string; kind?: PackKind; branch?: string } },
  section: { name?: string; kind?: PackKind; branch?: string },
): string | null => {
  const nameMismatch = packNameDiffersFromSection(pack.section.name, section.name);
  const kindMismatch = packKindDiffersFromSection(pack.section, section);
  if (!nameMismatch && !kindMismatch) return null;

  const packName = (pack.section.name || '').trim() || 'seção do arquivo';
  const targetName = (section.name || '').trim() || 'seção escolhida';
  let text = `Este pacote é da seção «${packName}». Você escolheu «${targetName}». Jovens e chefia serão gravados na seção escolhida, não na do arquivo.`;
  if (kindMismatch) {
    const from = kindPhrase(pack.section.kind, pack.section.branch);
    const to = kindPhrase(section.kind, section.branch);
    if (from && to) {
      text += ` O pacote é de ${from} e a seção escolhida é ${to}. As chefias dessas seções devem permanecer independentes.`;
    }
  }
  return text;
};

/** Never returns the first listed section unless it is the current/allowed one. */
export const suggestPackSectionId = (opts: {
  canPick: boolean;
  currentSectionId?: string;
  allowedSectionIds?: string[];
  sectionIds: string[];
}): string => {
  const known = (id?: string): id is string =>
    !!id && (opts.sectionIds.length === 0 || opts.sectionIds.includes(id));
  if (opts.canPick) {
    return known(opts.currentSectionId) ? opts.currentSectionId : '';
  }
  const allowed = (opts.allowedSectionIds || []).filter(Boolean);
  if (known(opts.currentSectionId) && allowed.includes(opts.currentSectionId)) {
    return opts.currentSectionId;
  }
  return allowed[0] || '';
};

export const membersOfTargetSection = <T extends { sectionId?: string }>(
  members: T[],
  sectionId: string,
): T[] => {
  const targetId = requireExplicitSectionId(sectionId);
  return members.filter(item => !item.sectionId || item.sectionId === targetId);
};

export const SUPPORTED_SECTION_PACK_VERSIONS = [1, 2] as const;

export const isSupportedSectionPackVersion = (version: unknown): version is number =>
  typeof version === 'number' && (SUPPORTED_SECTION_PACK_VERSIONS as readonly number[]).includes(version);

export type MemberIdentity = {
  id?: string;
  name?: string;
  registerNumber?: string;
};

export type MemberMatch<T extends MemberIdentity> =
  | { kind: 'register' | 'id'; member: T }
  | { kind: 'ambiguous-name'; candidates: T[] }
  | { kind: 'none' };

/** Identidade estável only. Nome nunca funde sozinho. */
export const matchIncomingMember = <T extends MemberIdentity>(
  incoming: T,
  existing: T[],
): MemberMatch<T> => {
  const register = (incoming.registerNumber || '').trim();
  if (register) {
    const byRegister = existing.filter(item => (item.registerNumber || '').trim() === register);
    if (byRegister.length === 1) return { kind: 'register', member: byRegister[0] };
    return { kind: 'none' };
  }
  if (incoming.id) {
    const byId = existing.filter(item => item.id === incoming.id);
    if (byId.length === 1) {
      const liveRegister = (byId[0].registerNumber || '').trim();
      if (liveRegister && incoming.registerNumber && liveRegister !== (incoming.registerNumber || '').trim()) {
        return { kind: 'none' };
      }
      return { kind: 'id', member: byId[0] };
    }
  }
  const name = normalizePackName(incoming.name || '');
  if (!name) return { kind: 'none' };
  const byName = existing.filter(item => normalizePackName(item.name || '') === name);
  if (byName.length > 0) return { kind: 'ambiguous-name', candidates: byName };
  return { kind: 'none' };
};
