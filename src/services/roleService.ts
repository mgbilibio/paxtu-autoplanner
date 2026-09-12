import type { UserProfile } from '../types';

export const USER_ROLES = [
  'Chefe de Seção',
  'Assistente',
  'Diretoria',
  'Leitura/Auditoria',
  'ADMINISTRADOR',
] as const;

export type UserRole = typeof USER_ROLES[number];

export interface RolePermissions {
  canConfigure: boolean;
  canEditYouth: boolean;
  canPlan: boolean;
  canRecordEvaluation: boolean;
  canHomologate: boolean;
  canViewReports: boolean;
  canExport: boolean;
  isGlobal: boolean;
  isReadOnly: boolean;
}

const normalizeRole = (role?: string): string =>
  (role || '').trim().toLowerCase();

const DENY_ALL: RolePermissions = {
  canConfigure: false,
  canEditYouth: false,
  canPlan: false,
  canRecordEvaluation: false,
  canHomologate: false,
  canViewReports: false,
  canExport: false,
  isGlobal: false,
  isReadOnly: true,
};

export const getRoleLabel = (role?: string): UserRole | '' => {
  const normalized = normalizeRole(role);
  if (normalized === 'administrador') return 'ADMINISTRADOR';
  if (normalized === 'diretor' || normalized === 'diretoria') return 'Diretoria';
  if (normalized === 'auditoria' || normalized === 'leitura') return 'Leitura/Auditoria';
  if (normalized === 'leitura/auditoria') return 'Leitura/Auditoria';
  if (normalized === 'assistente') return 'Assistente';
  if (normalized === 'chefe' || normalized === 'chefe de seção' || normalized === 'chefe de secao') {
    return 'Chefe de Seção';
  }
  return '';
};

export const getPermissions = (user?: UserProfile | null): RolePermissions => {
  if (!user || user.active === false || user.pendingApproval === true || user.rejected === true) {
    return { ...DENY_ALL };
  }
  const role = getRoleLabel(user.role);
  if (!role) return { ...DENY_ALL };
  const isAdmin = role === 'ADMINISTRADOR' || user.isAdmin === true;
  const isChief = role === 'Chefe de Seção';
  const isAssistant = role === 'Assistente';
  const isBoard = role === 'Diretoria';
  const isReadOnly = role === 'Leitura/Auditoria' || isBoard;

  return {
    canConfigure: isAdmin || isChief,
    canEditYouth: isAdmin || isChief || isAssistant,
    canPlan: isAdmin || isChief || isAssistant,
    canRecordEvaluation: isAdmin || isChief || isAssistant,
    canHomologate: isAdmin || isChief,
    canViewReports: true,
    canExport: true,
    isGlobal: isAdmin || isBoard,
    isReadOnly,
  };
};

export const isOperationalProfile = (user?: UserProfile | null): boolean => {
  const permissions = getPermissions(user);
  return permissions.canPlan || permissions.canEditYouth;
};

/** ADMINISTRADOR (e flag isAdmin) ou Diretoria em consulta. Chefe/Assistente não. */
export const canViewAccessLog = (user?: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const role = getRoleLabel(user.role);
  return role === 'ADMINISTRADOR' || role === 'Diretoria';
};
