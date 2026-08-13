import { ScoutBranch, ScoutSection, UserProfile } from '../../types';

export type SectionKind = 'alcateia' | 'tropa' | 'tropa_senior' | 'cla' | 'outra';

export interface CloudUserDoc {
  email: string;
  displayName: string;
  role: string;
  sectionIds: string[];
  isAdmin: boolean;
  active: boolean;
  createdAt: string;
}

export interface CloudInviteDoc {
  email: string;
  displayName: string;
  role: string;
  sectionIds: string[];
  isAdmin: boolean;
  active: boolean;
  createdAt: string;
  createdByUid: string;
}

export interface CloudSectionDoc extends ScoutSection {
  kind: SectionKind;
  groupName: string;
}

export const kindFromBranch = (branch: ScoutBranch | string): SectionKind => {
  if (branch === ScoutBranch.LOBINHO || branch === 'Lobinho') return 'alcateia';
  if (branch === ScoutBranch.ESCOTEIRO || branch === 'Escoteiro') return 'tropa';
  if (branch === ScoutBranch.SENIOR || branch === 'Sênior') return 'tropa_senior';
  if (branch === ScoutBranch.PIONEIRO || branch === 'Pioneiro') return 'cla';
  return 'outra';
};

export const cloudUserToProfile = (uid: string, doc: CloudUserDoc): UserProfile => ({
  id: uid,
  name: doc.displayName,
  role: doc.isAdmin ? 'ADMINISTRADOR' : doc.role,
  sectionId: doc.sectionIds[0] || (doc.isAdmin ? 'ADMIN_GLOBAL' : ''),
  email: doc.email,
  sectionIds: doc.sectionIds,
  active: doc.active,
});
