import type { ScoutBranch, ScoutSection } from '../../types';

export type SectionKind = 'alcateia' | 'tropa' | 'cla' | 'outra';

export const kindFromBranch = (branch: ScoutBranch | string): SectionKind => {
  if (branch === 'Lobinho') return 'alcateia';
  if (branch === 'Pioneiro') return 'cla';
  if (branch === 'Escoteiro') return 'tropa';
  if (branch === 'Sênior') return 'tropa';
  return 'outra';
};

/** tropa → Escoteiro, alcateia → Lobinho, clã → Pioneiro. Sênior usa section.branch. */
export const branchFromKind = (kind?: SectionKind | string): ScoutBranch | undefined => {
  if (kind === 'alcateia') return 'Lobinho' as ScoutBranch;
  if (kind === 'tropa') return 'Escoteiro' as ScoutBranch;
  if (kind === 'cla') return 'Pioneiro' as ScoutBranch;
  return undefined;
};

export const resolveSectionBranch = (
  section?: Pick<ScoutSection, 'branch' | 'kind'> | null,
  fallback?: ScoutBranch,
): ScoutBranch => {
  if (section?.branch) return section.branch;
  return branchFromKind(section?.kind) ?? fallback ?? ('Escoteiro' as ScoutBranch);
};

export const withSectionKind = (
  section: ScoutSection,
  groupName?: string,
): ScoutSection => ({
  ...section,
  kind: section.kind || kindFromBranch(section.branch),
  groupName: section.groupName || groupName,
});
