import { getAppConfig } from './configStorage';
import { readLayoutFile, writeLayoutFile } from './layoutStorage';
import { isWebApp } from '../platform';
import { isFirebaseAuthed } from '../firebase/config';
import { isFirebaseConfigured } from '../firebase/config';
import {
  CATALOG_FILENAME,
  CALENDAR_FILENAME,
  GROUPS_FILENAME,
  MEMBERS_FILENAME,
  PROGRESS_LAUNCHES_FILENAME,
  SECTIONS_FILENAME,
  USERS_FILENAME,
} from './names';
import {
  cloudUsersToProfiles,
  listCloudUsers,
  listGroupsCloud,
  listSectionsCloud,
  readMemberEntity,
  readMergedSectionItems,
  upsertGroupCloud,
  upsertSectionCloud,
  writeGroupedSectionItems,
  writeMemberEntity,
} from '../firebase/firestore';

export const isFileBacked = (): boolean => {
  const config = getAppConfig();
  return Boolean(config?.dataFolder && typeof window !== 'undefined' && window.fileSystem);
};

export const isFirestoreBacked = (): boolean =>
  isWebApp() && isFirebaseConfigured() && isFirebaseAuthed();

const dataNameFor = (filename: string): string | null => {
  if (filename === MEMBERS_FILENAME) return 'members';
  if (filename === CALENDAR_FILENAME) return 'calendar';
  if (filename === CATALOG_FILENAME) return 'catalog';
  if (filename === PROGRESS_LAUNCHES_FILENAME) return 'progressLaunches';
  return null;
};

const readFirestoreDoc = async <T>(filename: string, defaultValue: T): Promise<T> => {
  if (filename === SECTIONS_FILENAME) return await listSectionsCloud() as T;
  if (filename === USERS_FILENAME) return cloudUsersToProfiles(await listCloudUsers()) as T;
  if (filename === GROUPS_FILENAME) return await listGroupsCloud() as T;
  const dataName = dataNameFor(filename);
  if (dataName) return await readMergedSectionItems(dataName) as T;
  return defaultValue;
};

const writeFirestoreDoc = async <T>(filename: string, value: T): Promise<void> => {
  if (filename === SECTIONS_FILENAME) {
    const sections = value as Array<{ id: string }>;
    await Promise.all(sections.map(section => upsertSectionCloud(section as never)));
    return;
  }
  if (filename === USERS_FILENAME) {
    return;
  }
  if (filename === GROUPS_FILENAME) {
    const groups = value as Array<{ id: string }>;
    await Promise.all(groups.map(group => upsertGroupCloud(group as never)));
    return;
  }
  const dataName = dataNameFor(filename);
  if (dataName) {
    await writeGroupedSectionItems(dataName, value as Array<{ sectionId?: string }>);
  }
};

export const readJsonDoc = async <T>(
  filename: string,
  localStorageKey: string | null,
  defaultValue: T,
): Promise<T> => {
  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem) {
    try {
      const raw = await window.fileSystem.readData(config.dataFolder, filename);
      return raw ? JSON.parse(raw) as T : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  if (isFirestoreBacked()) {
    try {
      return await readFirestoreDoc(filename, defaultValue);
    } catch (error) {
      console.error('Firestore leitura:', error);
      return defaultValue;
    }
  }
  if (isWebApp()) return defaultValue;
  if (localStorageKey === null) return defaultValue;
  const raw = localStorage.getItem(localStorageKey);
  return raw ? JSON.parse(raw) as T : defaultValue;
};

export const writeJsonDoc = async <T>(
  filename: string,
  localStorageKey: string | null,
  value: T,
): Promise<void> => {
  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem) {
    await window.fileSystem.writeData(
      config.dataFolder,
      filename,
      JSON.stringify(value, null, 2),
    );
    return;
  }
  if (isFirestoreBacked()) {
    await writeFirestoreDoc(filename, value);
    return;
  }
  if (isWebApp()) return;
  if (localStorageKey !== null) {
    localStorage.setItem(localStorageKey, JSON.stringify(value));
  }
};

interface EntityPaths {
  layout: { folder: string; file: string } | null;
  flat: { folder: string; file: string };
  sectionId?: string;
  memberId?: string;
  progressKind?: 'bloco' | 'specialty' | 'reconhecimento' | 'legacyProgress';
  entityId?: string;
}

export const readCachedEntity = async <T>(
  cacheKey: string,
  resolvePaths: () => Promise<EntityPaths | null>,
  migrate?: (raw: any) => T,
): Promise<T | null> => {
  if (isFirestoreBacked()) {
    const paths = await resolvePaths();
    const sectionId = paths?.sectionId;
    const memberId = paths?.memberId;
    const kind = paths?.progressKind;
    const entityId = paths?.entityId;
    if (sectionId && memberId && kind && entityId) {
      const data = await readMemberEntity<T>(sectionId, memberId, kind, entityId);
      if (!data) return null;
      return migrate ? migrate(data) : data;
    }
    return null;
  }

  const config = getAppConfig();
  const bypassCache = config?.syncMode === 'sharedFolder' && Boolean(config?.dataFolder);
  const cached = bypassCache ? null : (!isWebApp() ? localStorage.getItem(cacheKey) : null);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return migrate ? migrate(parsed) : parsed as T;
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }
  if (!config?.dataFolder || !window.fileSystem) return null;
  try {
    const paths = await resolvePaths();
    if (!paths) return null;
    if (paths.layout) {
      const layoutData = await readLayoutFile<T>(paths.layout.folder, paths.layout.file);
      if (layoutData) {
        const final = migrate ? migrate(layoutData) : layoutData;
        if (!isWebApp()) localStorage.setItem(cacheKey, JSON.stringify(final));
        return final;
      }
    }
    const data = await window.fileSystem.readData(paths.flat.folder, paths.flat.file);
    if (data) {
      if (!isWebApp()) localStorage.setItem(cacheKey, data);
      const parsed = JSON.parse(data);
      return migrate ? migrate(parsed) : parsed as T;
    }
  } catch {
    // Estado ausente ainda e normal.
  }
  return null;
};

export const writeCachedEntity = async <T>(
  cacheKey: string,
  value: T,
  resolvePaths: () => Promise<EntityPaths | null>,
): Promise<void> => {
  if (isFirestoreBacked()) {
    const paths = await resolvePaths();
    if (paths?.sectionId && paths.memberId && paths.progressKind && paths.entityId) {
      await writeMemberEntity(paths.sectionId, paths.memberId, paths.progressKind, paths.entityId, value as object);
    }
    return;
  }

  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem) {
    const paths = await resolvePaths();
    if (paths) {
      if (paths.layout) {
        await writeLayoutFile(paths.layout.folder, paths.layout.file, value);
      }
      await window.fileSystem.writeData(
        paths.flat.folder,
        paths.flat.file,
        JSON.stringify(value, null, 2),
      );
    }
  }
  if (isWebApp()) return;
  localStorage.setItem(cacheKey, JSON.stringify(value));
};
