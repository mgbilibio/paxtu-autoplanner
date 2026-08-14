import { CatalogAnnotation, MeetingPlan } from '../../types';
import { isWebApp } from '../platform';
import { listSectionDocuments, readAccessibleItems, readSectionItems, writeSectionItems } from '../firebase/sectionData';
import { getAppConfig } from './configStorage';
import { isFileBacked, isFirestoreBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { CATALOG_FILENAME, STORAGE_KEY, TRACKER_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

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

const isPersistableSectionId = (id?: string): id is string =>
  !!id && id !== 'GLOBAL' && id !== 'ADMIN_GLOBAL';

export const getCatalogAsync = async (preferredSectionId?: string): Promise<MeetingPlan[]> => {
  if (isFirestoreBacked()) {
    const knownId = isPersistableSectionId(preferredSectionId) ? preferredSectionId : undefined;
    const items = await readAccessibleItems<MeetingPlan>('catalog', knownId ? [knownId] : undefined);
    if (items.length === 0 && knownId) {
      return readSectionItems<MeetingPlan>(knownId, 'catalog');
    }
    return items;
  }
  if (isFileBacked()) {
    try {
      const config = getAppConfig();
      const content = await window.fileSystem?.readData(config!.dataFolder, CATALOG_FILENAME);
      return content ? JSON.parse(content) : [];
    } catch {
      return getCatalogSync();
    }
  }
  return getCatalogSync();
};

const upsertCatalog = (current: MeetingPlan[], toSave: MeetingPlan): MeetingPlan[] => {
  const index = current.findIndex(item => item.id === toSave.id);
  return index >= 0
    ? current.map((item, i) => (i === index ? toSave : item))
    : [toSave, ...current];
};

const sanitizePlanForCatalog = (plan: MeetingPlan): MeetingPlan => {
  const raw = { ...plan } as MeetingPlan & { attachments?: unknown; activityBriefs?: unknown };
  delete raw.attachments;
  delete raw.activityBriefs;
  // generationSeed permanece: é JSON puro (sem binários nem chaves de IA).
  return {
    ...raw,
    id: raw.id || `${Date.now()}`,
    createdAt: raw.createdAt || new Date().toISOString(),
    activities: (raw.activities || []).map(({ _uid, ...activity }) => activity),
  };
};

export const savePlanToCatalog = async (
  plan: MeetingPlan,
  fallbackSectionId?: string,
): Promise<MeetingPlan> => {
  const toSave = sanitizePlanForCatalog(plan);
  let sectionId = isPersistableSectionId(toSave.sectionId)
    ? toSave.sectionId
    : (isPersistableSectionId(fallbackSectionId) ? fallbackSectionId : undefined);
  if (!sectionId && isFirestoreBacked()) {
    const sections = await listSectionDocuments();
    sectionId = sections.find(section => isPersistableSectionId(section.id))?.id;
  }
  if (!sectionId && (isFirestoreBacked() || isWebApp())) {
    throw new Error('Selecione uma seção antes de salvar o roteiro.');
  }
  if (sectionId) toSave.sectionId = sectionId;
  assertCanWriteSection(toSave.sectionId);
  if (isFirestoreBacked()) {
    await runExclusive(`firestore-catalog-${sectionId}`, async () => {
      const current = await readSectionItems<MeetingPlan>(sectionId!, 'catalog');
      await writeSectionItems(sectionId!, 'catalog', upsertCatalog(current, toSave));
    });
    dispatchDataEvent(DATA_EVENTS.CATALOG_UPDATED);
    return toSave;
  }
  const currentCatalog = await getCatalogAsync();
  const updatedCatalog = upsertCatalog(currentCatalog, toSave);
  if (isFileBacked()) {
    try {
      await writeJsonDoc(CATALOG_FILENAME, STORAGE_KEY, updatedCatalog);
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCatalog));
    }
  } else {
    await writeJsonDoc(CATALOG_FILENAME, STORAGE_KEY, updatedCatalog);
  }
  dispatchDataEvent(DATA_EVENTS.CATALOG_UPDATED);
  return toSave;
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
  if (isFirestoreBacked()) {
    const sections = await listSectionDocuments();
    await Promise.all(sections.map(async section => {
      const current = await readSectionItems<MeetingPlan>(section.id, 'catalog');
      if (!current.some(plan => plan.id === id)) return;
      await writeSectionItems(section.id, 'catalog', current.filter(plan => plan.id !== id));
    }));
    dispatchDataEvent(DATA_EVENTS.CATALOG_UPDATED);
    return;
  }
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
