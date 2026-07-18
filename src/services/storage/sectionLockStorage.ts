import { sectionEditLockPath } from '../dataLayoutService';
import { getAppConfig } from './configStorage';
import { readLayoutFile, writeLayoutFile } from './layoutStorage';

const ACTIVE_SECTION_LOCK_KEY = 'PAXTU_ACTIVE_SECTION_LOCK';

export interface EditLock {
  sectionId: string;
  userId: string;
  userName: string;
  startedAt: string;
  expiresAt: string;
  releasedAt?: string;
}

export interface EditLockResult {
  ok: boolean;
  lock?: EditLock;
  conflict?: EditLock;
}

const isActiveLock = (lock: EditLock | null): lock is EditLock => {
  if (!lock || lock.releasedAt) return false;
  return new Date(lock.expiresAt).getTime() > Date.now();
};

const parseLock = (raw: string | null): EditLock | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditLock;
  } catch {
    // Lock corrompido no sessionStorage (escrita parcial/edicao manual): descarta.
    sessionStorage.removeItem(ACTIVE_SECTION_LOCK_KEY);
    return null;
  }
};

export const getActiveSectionEditLock = (): EditLock | null => {
  const lock = parseLock(sessionStorage.getItem(ACTIVE_SECTION_LOCK_KEY));
  return lock && isActiveLock(lock) ? lock : null;
};

// Revalida o lock em sessionStorage contra o arquivo de lock no FS antes de
// autorizar uma escrita sensivel. Se o dono do lock no disco divergir (outro
// usuario assumiu a secao), invalida o sessionStorage para forcar modo consulta.
export const revalidateActiveSectionEditLock = async (
  sectionId?: string,
): Promise<EditLock | null> => {
  const local = getActiveSectionEditLock();
  if (!local) return null;
  const config = getAppConfig();
  if (config?.syncMode !== 'sharedFolder') return local;
  if (!config.dataFolder || !window.fileSystem) return local;
  const target = sectionId || local.sectionId;
  const remote = await readSectionLock(target);
  if (!isActiveLock(remote) || remote.userId !== local.userId) {
    sessionStorage.removeItem(ACTIVE_SECTION_LOCK_KEY);
    return null;
  }
  return local;
};

export const canWriteSection = (sectionId?: string): boolean => {
  const config = getAppConfig();
  if (config?.syncMode !== 'sharedFolder') return true;
  if (!sectionId || sectionId === 'ADMIN_GLOBAL') return true;
  const lock = getActiveSectionEditLock();
  return !!lock && lock.sectionId === sectionId;
};

export const assertCanWriteSection = (sectionId?: string): void => {
  if (canWriteSection(sectionId)) return;
  window.dispatchEvent(new CustomEvent('paxtu:storage-blocked', {
    detail: { sectionId },
  }));
  throw new Error(
    'A seção está em modo consulta ou sem lock de edição ativo.',
  );
};

const buildLock = (
  sectionId: string,
  userId: string,
  userName: string,
  startedAt?: string,
): EditLock => {
  const now = new Date();
  return {
    sectionId,
    userId,
    userName,
    startedAt: startedAt || now.toISOString(),
    expiresAt: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
  };
};

const readSectionLock = async (sectionId: string): Promise<EditLock | null> => {
  const path = sectionEditLockPath(sectionId);
  return readLayoutFile<EditLock>(path.folder, path.file);
};

const writeSectionLock = async (lock: EditLock): Promise<void> => {
  const path = sectionEditLockPath(lock.sectionId);
  await writeLayoutFile(path.folder, path.file, lock);
  sessionStorage.setItem(ACTIVE_SECTION_LOCK_KEY, JSON.stringify(lock));
};

export const acquireSectionEditLock = async (
  sectionId: string,
  userId: string,
  userName: string,
  force = false,
): Promise<EditLockResult> => {
  const config = getAppConfig();
  if (config?.syncMode !== 'sharedFolder') return { ok: true };
  if (!config.dataFolder || !window.fileSystem) return { ok: true };
  const existing = await readSectionLock(sectionId);
  if (!force && isActiveLock(existing) && existing.userId !== userId) {
    return { ok: false, conflict: existing };
  }
  const lock = buildLock(sectionId, userId, userName);
  await writeSectionLock(lock);
  return { ok: true, lock };
};

export const renewSectionEditLock = async (
  sectionId: string,
  userId: string,
  userName: string,
): Promise<EditLockResult> => {
  const config = getAppConfig();
  if (config?.syncMode !== 'sharedFolder') return { ok: true };
  if (!config.dataFolder || !window.fileSystem) return { ok: true };
  const existing = await readSectionLock(sectionId);
  if (isActiveLock(existing) && existing.userId !== userId) {
    return { ok: false, conflict: existing };
  }
  const lock = buildLock(sectionId, userId, userName, existing?.startedAt);
  await writeSectionLock(lock);
  return { ok: true, lock };
};

export const releaseSectionEditLock = async (
  sectionId: string,
  userId: string,
): Promise<void> => {
  const config = getAppConfig();
  if (config?.syncMode !== 'sharedFolder') return;
  if (!config.dataFolder || !window.fileSystem) return;
  const existing = await readSectionLock(sectionId);
  if (!existing || existing.userId !== userId) return;
  await writeLayoutFile(sectionEditLockPath(sectionId).folder,
    sectionEditLockPath(sectionId).file, {
      ...existing,
      releasedAt: new Date().toISOString(),
    });
  const active = getActiveSectionEditLock();
  if (active?.sectionId === sectionId && active.userId === userId) {
    sessionStorage.removeItem(ACTIVE_SECTION_LOCK_KEY);
  }
};
