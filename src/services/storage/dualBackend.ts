import { getAppConfig } from './configStorage';
import { readLayoutFile, writeLayoutFile } from './layoutStorage';

export const isFileBacked = (): boolean => {
  const config = getAppConfig();
  return Boolean(config?.dataFolder && typeof window !== 'undefined' && window.fileSystem);
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
  if (localStorageKey !== null) {
    localStorage.setItem(localStorageKey, JSON.stringify(value));
  }
};

interface EntityPaths {
  layout: { folder: string; file: string } | null;
  flat: { folder: string; file: string };
}

export const readCachedEntity = async <T>(
  cacheKey: string,
  resolvePaths: () => Promise<EntityPaths | null>,
  migrate?: (raw: any) => T,
): Promise<T | null> => {
  // Em sharedFolder (Drive/OneDrive/Dropbox) o estado pode ter sido alterado por
  // outra maquina; o cache do localStorage fica defasado e a comparacao de
  // conflito (saveMemberBlocoStateOptimistic) usaria um snapshot velho. Nesse
  // modo, ignora o cache de leitura e vai direto ao FS, que e a fonte da verdade.
  const config = getAppConfig();
  const bypassCache = config?.syncMode === 'sharedFolder' && Boolean(config?.dataFolder);
  const cached = bypassCache ? null : localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return migrate ? migrate(parsed) : parsed as T;
    } catch {
      // Cache corrompido (escrita parcial, quota, edicao manual): descarta e
      // cai para o filesystem em vez de derrubar a leitura inteira.
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
        localStorage.setItem(cacheKey, JSON.stringify(final));
        return final;
      }
    }
    const data = await window.fileSystem.readData(paths.flat.folder, paths.flat.file);
    if (data) {
      localStorage.setItem(cacheKey, data);
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
  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem) {
    // resolvePaths pode chamar assertCanWriteSection (lock de secao): roda ANTES
    // de tocar o cache, para que escrita bloqueada nao deixe cache divergente.
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
  // Cache atualizado apenas apos o filesystem ter sucesso (ou em modo
  // localStorage-only). Se o FS lancar acima, o cache nao e atualizado.
  localStorage.setItem(cacheKey, JSON.stringify(value));
};
