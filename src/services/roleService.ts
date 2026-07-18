import { UserProfile } from '../types';

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

export const getRoleLabel = (role?: string): UserRole => {
  const normalized = normalizeRole(role);
  if (normalized === 'administrador') return 'ADMINISTRADOR';
  if (normalized === 'diretor' || normalized === 'diretoria') return 'Diretoria';
  if (normalized === 'auditoria') return 'Leitura/Auditoria';
  if (normalized === 'leitura/auditoria') return 'Leitura/Auditoria';
  if (normalized === 'assistente') return 'Assistente';
  return 'Chefe de Seção';
};

export const getPermissions = (user?: UserProfile | null): RolePermissions => {
  const role = getRoleLabel(user?.role);
  const isAdmin = role === 'ADMINISTRADOR';
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
