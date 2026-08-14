import { ScoutMember, ScoutSection, ScoutTeam, UserProfile } from '../../types';
import { newMemberId, resolveTroopRole } from '../../utils/memberQuickAdd';
import { getRoleLabel } from '../roleService';
import { getMembersAsync, saveMemberAsync } from '../storage/memberStorage';
import { getSectionsAsync, saveSectionAsync } from '../storage/sectionStorage';
import { stripBackupSecrets } from './groupBackup';
import { firestoreWriteError, sanitizeMemberForFirestore } from './sanitizeFirestoreMember';

export const SECTION_PACK_KIND = 'scoutsauto-section-pack';
export const SECTION_PACK_VERSION = 2;
export const SECTION_PACK_MAX_BYTES = 8 * 1024 * 1024;

export interface SectionPackSection {
  id?: string;
  name?: string;
  branch?: ScoutSection['branch'];
  kind?: ScoutSection['kind'];
  progressionSystem?: ScoutSection['progressionSystem'];
  teams?: ScoutTeam[];
}

export interface SectionPack {
  kind: typeof SECTION_PACK_KIND;
  version: number;
  exportedAt: string;
  section: SectionPackSection;
  members: ScoutMember[];
}

export interface SectionPackSummary {
  members: number;
  teams: number;
  withOfficial: number;
  created: number;
  updated: number;
}

export interface SectionPackMergeResult {
  members: ScoutMember[];
  created: number;
  updated: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const canManageSectionPack = (user?: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  const role = getRoleLabel(user.role);
  return role === 'ADMINISTRADOR' || role === 'Chefe de Seção';
};

export const canPickSectionForPack = (user?: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return getRoleLabel(user.role) === 'ADMINISTRADOR';
};

export const sectionIdForPack = (
  user?: UserProfile | null,
  currentSection?: ScoutSection | null,
): string => {
  if (canPickSectionForPack(user)) return currentSection?.id || user?.sectionId || user?.sectionIds?.[0] || '';
  return currentSection?.id || user?.sectionId || user?.sectionIds?.[0] || '';
};

export const normalizePackName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const definedEntries = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested !== undefined) out[key] = nested;
  }
  return out as Partial<T>;
};

const asTeams = (value: unknown): ScoutTeam[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!isPlainObject(item)) return null;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : newMemberId();
      return { id, name } as ScoutTeam;
    })
    .filter((item): item is ScoutTeam => !!item);
};

const asMembers = (value: unknown): ScoutMember[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ScoutMember => {
      if (!isPlainObject(item)) return false;
      return typeof item.id === 'string' || typeof item.name === 'string';
    })
    .map(sanitizeMemberForFirestore);
};

export const isSectionPack = (value: unknown): value is SectionPack => {
  if (!isPlainObject(value)) return false;
  if (value.kind !== SECTION_PACK_KIND) return false;
  if (typeof value.version !== 'number' || value.version < 1) return false;
  const members = asMembers(value.members);
  const nested = isPlainObject(value.section) ? asMembers(value.section.members) : [];
  return members.length > 0 || nested.length > 0 || isPlainObject(value.section);
};

export const parseSectionPack = (value: unknown): SectionPack => {
  if (!isSectionPack(value)) {
    throw new Error('Pacote recusado: não é um pacote de seção ScoutsAuto.');
  }
  const raw = value as unknown as Record<string, unknown>;
  const sectionRaw = isPlainObject(raw.section) ? raw.section : {};
  const members = asMembers(raw.members).length > 0
    ? asMembers(raw.members)
    : asMembers(sectionRaw.members);
  const teams = asTeams(sectionRaw.teams).length > 0
    ? asTeams(sectionRaw.teams)
    : asTeams(raw.teams);
  return {
    kind: SECTION_PACK_KIND,
    version: value.version,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    section: {
      id: typeof sectionRaw.id === 'string' ? sectionRaw.id : undefined,
      name: typeof sectionRaw.name === 'string' ? sectionRaw.name : undefined,
      branch: sectionRaw.branch as ScoutSection['branch'] | undefined,
      kind: sectionRaw.kind as ScoutSection['kind'] | undefined,
      progressionSystem: sectionRaw.progressionSystem as ScoutSection['progressionSystem'] | undefined,
      teams,
    },
    members,
  };
};

export const summarizeSectionPack = (
  pack: SectionPack,
  merge?: { created: number; updated: number },
): SectionPackSummary => ({
  members: pack.members.length,
  teams: pack.section.teams?.length || 0,
  withOfficial: pack.members.filter(member => member.official && Object.keys(member.official).length > 0).length,
  created: merge?.created || 0,
  updated: merge?.updated || 0,
});

const findMemberMatch = (incoming: ScoutMember, existing: ScoutMember[]): ScoutMember | undefined => {
  const register = (incoming.registerNumber || '').trim();
  if (register) {
    const byRegister = existing.find(item => (item.registerNumber || '').trim() === register);
    if (byRegister) return byRegister;
  }
  if (incoming.id) {
    const byId = existing.find(item => item.id === incoming.id);
    if (byId) return byId;
  }
  const name = normalizePackName(incoming.name || '');
  if (name) {
    return existing.find(item => normalizePackName(item.name || '') === name);
  }
  return undefined;
};

const mergeOfficial = (
  current?: ScoutMember['official'],
  incoming?: ScoutMember['official'],
): ScoutMember['official'] | undefined => {
  if (!incoming) return current;
  if (!current) return incoming;
  return { ...current, ...incoming };
};

export const mergeSectionPackMembers = (
  existing: ScoutMember[],
  incoming: ScoutMember[],
  sectionId: string,
): SectionPackMergeResult => {
  const next = [...existing];
  let created = 0;
  let updated = 0;
  const used = new Set<string>();

  for (const raw of incoming) {
    const incomingMember = raw as ScoutMember;
    if (!(incomingMember.name || '').trim() && !incomingMember.id && !(incomingMember.registerNumber || '').trim()) {
      continue;
    }
    const match = findMemberMatch(incomingMember, next.filter(item => !used.has(item.id)));
    if (match) {
      used.add(match.id);
      const idx = next.findIndex(item => item.id === match.id);
      const merged: ScoutMember = {
        ...match,
        ...definedEntries(incomingMember as unknown as Record<string, unknown>),
        id: match.id,
        sectionId,
        role: resolveTroopRole(incomingMember.role || match.role, match.role),
        official: mergeOfficial(match.official, incomingMember.official),
      };
      next[idx] = merged;
      updated += 1;
      continue;
    }
    const idTaken = next.some(item => item.id === incomingMember.id);
    const id = incomingMember.id && !idTaken ? incomingMember.id : newMemberId();
    next.push({
      ...incomingMember,
      id,
      sectionId,
      role: resolveTroopRole(incomingMember.role),
    });
    created += 1;
  }

  return { members: next, created, updated };
};

export const mergeSectionTeams = (existing: ScoutTeam[] | undefined, incoming: ScoutTeam[] | undefined): ScoutTeam[] => {
  const out = [...(existing || [])];
  for (const team of incoming || []) {
    const byId = out.find(item => item.id && item.id === team.id);
    if (byId) {
      if (team.name) byId.name = team.name;
      continue;
    }
    const byName = out.find(item => normalizePackName(item.name) === normalizePackName(team.name));
    if (byName) continue;
    out.push({
      id: team.id || newMemberId(),
      name: team.name,
    });
  }
  return out;
};

const downloadJson = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const sanitizeMember = (member: ScoutMember): ScoutMember => {
  const stripped = stripBackupSecrets(member);
  return (isPlainObject(stripped) ? stripped : member) as ScoutMember;
};

export const exportSectionPack = async (sectionId: string): Promise<SectionPack> => {
  if (!sectionId) throw new Error('Selecione uma seção para exportar o pacote.');
  const sections = await getSectionsAsync();
  const section = sections.find(item => item.id === sectionId);
  if (!section) throw new Error('Seção não encontrada.');
  const members = (await getMembersAsync(sectionId)).map(sanitizeMember);
  return {
    kind: SECTION_PACK_KIND,
    version: SECTION_PACK_VERSION,
    exportedAt: new Date().toISOString(),
    section: {
      id: section.id,
      name: section.name,
      branch: section.branch,
      kind: section.kind,
      progressionSystem: section.progressionSystem,
      teams: section.teams || [],
    },
    members,
  };
};

export const downloadSectionPack = async (sectionId: string): Promise<SectionPackSummary> => {
  const pack = await exportSectionPack(sectionId);
  const safeName = (pack.section.name || 'secao')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'secao';
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`scoutsauto_secao_${safeName}_${date}.json`, pack);
  return summarizeSectionPack(pack);
};

export const parseSectionPackFile = async (file: File): Promise<SectionPack> => {
  if (file.size > SECTION_PACK_MAX_BYTES) {
    throw new Error('Pacote recusado: arquivo muito grande (limite 8 MB).');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Pacote recusado: JSON inválido.');
  }
  return parseSectionPack(parsed);
};

export const importSectionPack = async (
  pack: SectionPack,
  sectionId: string,
): Promise<SectionPackSummary> => {
  if (!sectionId) throw new Error('Selecione uma seção para importar o pacote.');
  const parsed = parseSectionPack(pack);
  const sections = await getSectionsAsync();
  const section = sections.find(item => item.id === sectionId);
  if (!section) throw new Error('Seção não encontrada.');

  const currentMembers = await getMembersAsync(sectionId);
  const merged = mergeSectionPackMembers(currentMembers, parsed.members, sectionId);
  try {
    for (const member of merged.members) {
      const wasExisting = currentMembers.some(item => item.id === member.id);
      if (!wasExisting || JSON.stringify(currentMembers.find(item => item.id === member.id)) !== JSON.stringify(member)) {
        await saveMemberAsync(sanitizeMemberForFirestore(member));
      }
    }
  } catch (error) {
    throw firestoreWriteError(error, 'pacote da seção');
  }

  const teams = mergeSectionTeams(section.teams, parsed.section.teams);
  if (JSON.stringify(teams) !== JSON.stringify(section.teams || [])) {
    await saveSectionAsync({ ...section, teams });
  }

  return summarizeSectionPack(parsed, { created: merged.created, updated: merged.updated });
};
