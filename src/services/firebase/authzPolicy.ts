import { USER_ROLES, type UserRole } from '../roleService.ts';

export const EMAIL_NOT_VERIFIED_MESSAGE =
  'Confirme o e-mail desta conta antes de concluir o convite.';

export const BOOTSTRAP_NOT_AUTHORIZED_MESSAGE =
  'Inicialização do grupo não autorizada para esta conta. O UID precisa estar na allowlist em meta/settings.';

export const INVITE_PRIVILEGE_MISMATCH_MESSAGE =
  'O cadastro não confere com o convite. Peça um novo convite ao administrador.';

export type AuthzActor = {
  uid: string;
  email: string;
  emailVerified: boolean;
};

export type InviteRecord = {
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  sectionIds: string[];
  consumedByUid?: string;
};

export type UserCreatePayload = {
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  pendingApproval: boolean;
  rejected: boolean;
  sectionIds: string[];
};

const sameStringList = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((item, index) => item === right[index]);

export const isKnownRole = (role?: string): role is UserRole =>
  (USER_ROLES as readonly string[]).includes((role || '').trim());

export const inviteSectionIds = (invite: {
  sectionIds?: unknown;
  sectionId?: unknown;
}): string[] => {
  if (Array.isArray(invite.sectionIds)) {
    return invite.sectionIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }
  if (typeof invite.sectionId === 'string' && invite.sectionId) return [invite.sectionId];
  return [];
};

export const userCreateMatchesInvite = (
  payload: UserCreatePayload,
  invite: InviteRecord,
  actor: AuthzActor,
): boolean => {
  if (!actor.emailVerified) return false;
  if (!invite.active) return false;
  if (payload.email !== actor.email || payload.email !== invite.email) return false;
  if (payload.role !== invite.role) return false;
  if (payload.isAdmin !== invite.isAdmin) return false;
  if (payload.active !== true) return false;
  if (payload.pendingApproval !== false) return false;
  if (payload.rejected !== false) return false;
  if (invite.isAdmin) return payload.sectionIds.length === 0;
  return sameStringList(payload.sectionIds, invite.sectionIds);
};

export const pendingSelfPayloadAllowed = (
  payload: UserCreatePayload,
  actor: AuthzActor,
): boolean =>
  payload.email === actor.email
  && payload.active === false
  && payload.isAdmin === false
  && payload.pendingApproval === true
  && payload.rejected === false
  && payload.role === ''
  && payload.sectionIds.length === 0;

export const bootstrapPayloadAllowed = (
  payload: UserCreatePayload,
  actor: AuthzActor,
  allowedBootstrapUid?: string,
): boolean =>
  actor.emailVerified
  && !!allowedBootstrapUid
  && allowedBootstrapUid === actor.uid
  && payload.email === actor.email
  && payload.active === true
  && payload.isAdmin === true
  && payload.role === 'ADMINISTRADOR'
  && payload.pendingApproval === false
  && payload.sectionIds.length === 0;

export const inviteConsumePatchAllowed = (
  before: InviteRecord,
  after: { active: boolean; consumedByUid?: string },
  actor: AuthzActor,
): boolean => {
  if (!actor.emailVerified) return false;
  if (before.email !== actor.email) return false;
  if (!before.active && before.consumedByUid === actor.uid && after.active === false && after.consumedByUid === actor.uid) {
    return true;
  }
  return before.active === true
    && after.active === false
    && after.consumedByUid === actor.uid;
};

export const selfAdminLockViolation = (
  targetUid: string,
  actorUid: string,
  before: { isAdmin?: boolean; active?: boolean },
  after: { isAdmin?: boolean; active?: boolean },
): boolean =>
  actorUid === targetUid
  && before.isAdmin === true
  && (after.isAdmin !== true || after.active !== true);

export const buildInviteUserPayload = (
  actor: AuthzActor,
  invite: InviteRecord,
  displayName: string,
): UserCreatePayload => ({
  email: actor.email,
  role: invite.role,
  isAdmin: invite.isAdmin,
  active: true,
  pendingApproval: false,
  rejected: false,
  sectionIds: invite.isAdmin ? [] : [...invite.sectionIds],
  ...(displayName ? {} : {}),
});
