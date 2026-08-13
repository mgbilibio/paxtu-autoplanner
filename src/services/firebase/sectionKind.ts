import { ScoutBranch, ScoutSection } from '../../types';

export type SectionKind = 'alcateia' | 'tropa' | 'cla' | 'outra';

export const kindFromBranch = (branch: ScoutBranch | string): SectionKind => {
  if (branch === ScoutBranch.LOBINHO || branch === 'Lobinho') return 'alcateia';
  if (branch === ScoutBranch.PIONEIRO || branch === 'Pioneiro') return 'cla';
  if (branch === ScoutBranch.ESCOTEIRO || branch === 'Escoteiro') return 'tropa';
  if (branch === ScoutBranch.SENIOR || branch === 'Sênior') return 'tropa';
  return 'outra';
};

export const withSectionKind = (
  section: ScoutSection,
  groupName?: string,
): ScoutSection => ({
  ...section,
  kind: section.kind || kindFromBranch(section.branch),
  groupName: section.groupName || groupName,
});
