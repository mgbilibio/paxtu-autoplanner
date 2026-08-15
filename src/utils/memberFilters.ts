import { ScoutMember, ScoutSection } from '../types';

/** Normaliza texto para busca: minúsculas, sem acentos, espaços extras. */
export const normalizeSearchText = (value?: string | null): string =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

export interface MemberListFilter {
  sectionId?: string;
  unit?: string;
  name?: string;
}

export const filterMembers = <T extends Pick<ScoutMember, 'name'> & { sectionId?: string; patrol?: string }>(
  members: T[],
  filter: MemberListFilter,
): T[] => {
  const nameQuery = normalizeSearchText(filter.name);
  return members.filter(member => {
    if (filter.sectionId && member.sectionId !== filter.sectionId) return false;
    if (filter.unit && (member.patrol || '') !== filter.unit) return false;
    if (nameQuery && !normalizeSearchText(member.name).includes(nameQuery)) return false;
    return true;
  });
};

/** Unidades (patrulhas/matilhas) da seção escolhida, ou de todas se sectionId vazio. */
export const collectUnits = (
  sections: Pick<ScoutSection, 'id' | 'teams'>[],
  members: { sectionId?: string; patrol?: string }[],
  sectionId?: string,
): string[] => {
  const names = new Set<string>();
  const relevant = sectionId ? sections.filter(section => section.id === sectionId) : sections;
  relevant.forEach(section => {
    section.teams?.forEach(team => {
      if (team.name.trim()) names.add(team.name);
    });
  });
  members.forEach(member => {
    if (sectionId && member.sectionId !== sectionId) return;
    if (member.patrol?.trim()) names.add(member.patrol);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt'));
};
