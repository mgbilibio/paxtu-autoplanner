import type { LocalAppBackup, ProgressBackup } from './backupStorage';
import { TOTAL_BLOCOS } from './names';

const MAX_BACKUP_KEYS = 10000;
const MAX_KEY_LENGTH = 180;
const MAX_VALUE_LENGTH = 2 * 1024 * 1024;

export const isSafeStorageEntry = (key: string, value: unknown): boolean => {
  if (!key.startsWith('PAXTU_')) return false;
  if (key.length > MAX_KEY_LENGTH || /[\x00-\x1F]/.test(key)) return false;
  return typeof value === 'string' && value.length <= MAX_VALUE_LENGTH;
};

export const isLocalAppBackup = (value: any): value is LocalAppBackup => {
  if (!value || value.kind !== 'paxtu-local-app-backup') return false;
  if (!value.localStorage || typeof value.localStorage !== 'object') return false;
  return Object.keys(value.localStorage).length <= MAX_BACKUP_KEYS;
};

export const isProgressBackup = (value: any): value is ProgressBackup => (
  value
  && Array.isArray(value.blocoStates)
  && Array.isArray(value.reconhecimentos)
);

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_KEY_LENGTH;

// Valida um estado de bloco vindo de backup antes de persistir: impede injecao
// de memberId arbitrario (que criaria pastas no workspace) e blocoId fora do
// intervalo 1..TOTAL_BLOCOS.
export const isValidBlocoStateEntry = (state: any): boolean => (
  !!state
  && isNonEmptyString(state.memberId)
  && Number.isInteger(state.blocoId) && state.blocoId >= 1 && state.blocoId <= TOTAL_BLOCOS
  && Array.isArray(state.fixasConcluidas)
  && Array.isArray(state.variaveisConcluidas)
);

export const isValidReconhecimentoEntry = (state: any): boolean => (
  !!state
  && isNonEmptyString(state.memberId)
  && Number.isInteger(state.reconhecimentoId)
  && state.reconhecimentoId >= 1 && state.reconhecimentoId <= 99
);
