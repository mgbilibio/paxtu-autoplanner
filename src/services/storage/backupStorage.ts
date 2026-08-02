import {
  MemberBlocoState,
  MEMBER_BLOCO_STATE_SCHEMA_VERSION,
  MemberReconhecimentoState,
  MemberSpecialtyState,
} from '../../types';
import { saveMemberBlocoState } from './blocoProgressStorage';
import { CONFIG_KEY } from './configStorage';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { saveMemberReconhecimento } from './reconhecimentoStorage';
import { saveMemberSpecialtyState } from './specialtyStateStorage';
import {
  isLocalAppBackup,
  isProgressBackup,
  isSafeStorageEntry,
  isValidBlocoStateEntry,
  isValidReconhecimentoEntry,
} from './backupValidation';

export interface ProgressBackup {
  version: number;
  exportedAt: string;
  blocoStates: MemberBlocoState[];
  reconhecimentos: MemberReconhecimentoState[];
  specialtyStates?: MemberSpecialtyState[];
}

// Valida um estado de especialidade vindo de backup antes de persistir: impede
// memberId arbitrario (que criaria pastas no workspace) e especialidadeId invalido.
const isValidSpecialtyStateEntry = (state: any): boolean => (
  !!state
  && typeof state.memberId === 'string'
  && state.memberId.trim().length > 0
  && Number.isInteger(state.especialidadeId)
  && state.especialidadeId > 0
  && Array.isArray(state.requisitosConcluidos)
);

export interface LocalAppBackup {
  kind: 'paxtu-local-app-backup';
  version: number;
  exportedAt: string;
  localStorage: Record<string, string>;
}

export const exportProgressBackup = async (
  memberIds?: string[],
): Promise<ProgressBackup> => {
  const allKeys = Object.keys(localStorage);
  const blocoStates: MemberBlocoState[] = [];
  const reconhecimentos: MemberReconhecimentoState[] = [];
  const specialtyStates: MemberSpecialtyState[] = [];

  for (const key of allKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    if (key.startsWith('PAXTU_BLOCO_')) {
      const state = JSON.parse(raw) as MemberBlocoState;
      if (!memberIds || memberIds.includes(state.memberId)) {
        blocoStates.push(state);
      }
    }
    if (key.startsWith('PAXTU_REC_')) {
      const state = JSON.parse(raw) as MemberReconhecimentoState;
      if (!memberIds || memberIds.includes(state.memberId)) {
        reconhecimentos.push(state);
      }
    }
    if (key.startsWith('PAXTU_SPECIALTY_')) {
      const state = JSON.parse(raw) as MemberSpecialtyState;
      if (!memberIds || memberIds.includes(state.memberId)) {
        specialtyStates.push(state);
      }
    }
  }

  return {
    version: MEMBER_BLOCO_STATE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    blocoStates,
    reconhecimentos,
    specialtyStates,
  };
};

export const importProgressBackup = async (
  backup: ProgressBackup,
): Promise<{
  blocosImportados: number;
  reconhecimentosImportados: number;
  especialidadesImportadas: number;
}> => {
  if (!isProgressBackup(backup)) {
    return {
      blocosImportados: 0,
      reconhecimentosImportados: 0,
      especialidadesImportadas: 0,
    };
  }
  let blocosImportados = 0;
  let reconhecimentosImportados = 0;
  let especialidadesImportadas = 0;
  for (const state of backup.blocoStates) {
    // Ignora itens invalidos/adulterados (memberId arbitrario, blocoId fora de faixa).
    if (!isValidBlocoStateEntry(state)) continue;
    await saveMemberBlocoState(state);
    blocosImportados++;
  }
  for (const state of backup.reconhecimentos) {
    if (!isValidReconhecimentoEntry(state)) continue;
    await saveMemberReconhecimento(state);
    reconhecimentosImportados++;
  }
  // specialtyStates e opcional: backups antigos nao trazem o campo.
  for (const state of backup.specialtyStates || []) {
    if (!isValidSpecialtyStateEntry(state)) continue;
    await saveMemberSpecialtyState(state);
    especialidadesImportadas++;
  }
  return { blocosImportados, reconhecimentosImportados, especialidadesImportadas };
};

const downloadJson = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const backupValueWithoutSecrets = (key: string, value: string): string => {
  if (key !== CONFIG_KEY) return value;
  try {
    const config = JSON.parse(value);
    return JSON.stringify({
      ...config,
      apiKey: '',
      ollamaCloudApiKey: '',
    });
  } catch {
    return value;
  }
};

export const downloadProgressBackup = async (): Promise<void> => {
  const backup = await exportProgressBackup();
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`paxtu_progress_backup_${date}.json`, backup);
};

export const exportLocalAppBackup = (): LocalAppBackup => {
  const payload: Record<string, string> = {};
  Object.keys(localStorage)
    .filter(key => key.startsWith('PAXTU_'))
    .sort()
    .forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) payload[key] = backupValueWithoutSecrets(key, value);
    });
  return {
    kind: 'paxtu-local-app-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: payload,
  };
};

export const downloadLocalAppBackup = (): void => {
  const backup = exportLocalAppBackup();
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`paxtu_app_backup_${date}.json`, backup);
};

export const importLocalAppBackup = (backup: LocalAppBackup): number => {
  if (!isLocalAppBackup(backup)) return 0;
  let imported = 0;
  Object.entries(backup.localStorage || {}).forEach(([key, value]) => {
    if (!isSafeStorageEntry(key, value)) return;
    // Reaplica a limpeza de segredos na importacao: um backup adulterado (ou de
    // terceiro) nao deve reintroduzir uma apiKey na config local.
    localStorage.setItem(key, backupValueWithoutSecrets(key, value));
    imported++;
  });
  Object.values(DATA_EVENTS).forEach(eventName => dispatchDataEvent(eventName));
  return imported;
};
