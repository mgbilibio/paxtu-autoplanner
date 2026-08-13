import { CatalogAnnotation, MeetingPlan } from '../../types';
import { getAppConfig } from './configStorage';
import { isFileBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { CATALOG_FILENAME, STORAGE_KEY, TRACKER_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';

// Parse tolerante: descarta a chave corrompida e devolve o default em vez de
// derrubar a leitura inteira (padrao de readCachedEntity).
const parseOrDefault = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export const getCatalogSync = (): MeetingPlan[] =>
  parseOrDefault<MeetingPlan[]>(STORAGE_KEY, []);

export const getCatalogAsync = async (): Promise<MeetingPlan[]> => {
  if (isFileBacked()) {
    try {
      const config = getAppConfig();
      const content = await window.fileSystem?.readData(config!.dataFolder, CATALOG_FILENAME);
      return content ? JSON.parse(content) : [];
    } catch {
      return getCatalogSync();
    }
  }
  return readJsonDoc<MeetingPlan[]>(CATALOG_FILENAME, STORAGE_KEY, []);
};

export const savePlanToCatalog = async (plan: MeetingPlan): Promise<void> => {
  assertCanWriteSection(plan.sectionId);
  // Remove o campo de UI _uid das atividades antes de persistir (e reatribuido na
  // normalizacao ao carregar) — mantem o JSON do catalogo/backup limpo.
  const toSave: MeetingPlan = {
    ...plan,
    activities: (plan.activities || []).map(({ _uid, ...rest }) => rest),
  };
  const currentCatalog = await getCatalogAsync();
  const index = currentCatalog.findIndex(item => item.id === toSave.id);
  const updatedCatalog = index >= 0
    ? currentCatalog.map((item, i) => (i === index ? toSave : item))
    : [toSave, ...currentCatalog];
  await writeJsonDoc(CATALOG_FILENAME, STORAGE_KEY, updatedCatalog);
  dispatchDataEvent(DATA_EVENTS.CATALOG_UPDATED);
};

export const clonePlan = (orig: MeetingPlan): MeetingPlan => ({
  ...orig,
  id: Date.now().toString(),
  createdAt: new Date().toISOString(),
  theme: `${orig.theme} (cópia)`,
  sectionId: undefined,
  authorId: undefined,
  authorName: undefined,
});

export const deleteFromCatalog = async (id: string): Promise<void> => {
  const current = await getCatalogAsync();
  const updated = current.filter(plan => plan.id !== id);
  await writeJsonDoc(CATALOG_FILENAME, STORAGE_KEY, updated);
  dispatchDataEvent(DATA_EVENTS.CATALOG_UPDATED);
};

export const exportCatalogBackup = (): void => {
  const data = getCatalogSync();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Paxtu_Catalog_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const rebuildCatalogFromFolder = async (): Promise<number> => {
  const config = getAppConfig();
  if (!config?.dataFolder || !window.fileSystem) return 0;
  try {
    const allFiles = await window.fileSystem.listFiles(config.dataFolder);
    const planFiles = allFiles.filter(file =>
      file.startsWith('Roteiro_') && file.endsWith('.json'),
    );
    const reconstructedCatalog: MeetingPlan[] = [];
    for (const file of planFiles) {
      try {
        const content = await window.fileSystem.readData(config.dataFolder, file);
        if (content) {
          const plan = JSON.parse(content) as MeetingPlan;
          if (plan.theme && plan.activities) reconstructedCatalog.push(plan);
        }
      } catch {
        // Arquivo invalido nao deve impedir reconstrucao dos demais roteiros.
      }
    }
    reconstructedCatalog.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    if (reconstructedCatalog.length === 0) return 0;
    await window.fileSystem.writeData(
      config.dataFolder,
      CATALOG_FILENAME,
      JSON.stringify(reconstructedCatalog, null, 2),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reconstructedCatalog));
    dispatchDataEvent(DATA_EVENTS.CATALOG_UPDATED);
    return reconstructedCatalog.length;
  } catch {
    return 0;
  }
};

export const getAnnotations = (): Record<string, CatalogAnnotation> =>
  parseOrDefault<Record<string, CatalogAnnotation>>(TRACKER_KEY, {});

export const saveAnnotation = (
  annotation: CatalogAnnotation,
): Record<string, CatalogAnnotation> => {
  const current = getAnnotations();
  current[annotation.code] = annotation;
  localStorage.setItem(TRACKER_KEY, JSON.stringify(current));
  return current;
};
