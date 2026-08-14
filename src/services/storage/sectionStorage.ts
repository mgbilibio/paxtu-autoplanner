import { ScoutSection } from '../../types';
import { sectionFolder } from '../dataLayoutService';
import {
  deleteSectionDocument,
  listGroupDocuments,
  listSectionDocuments,
  writeSectionDocument,
} from '../firebase/sectionData';
import { getAppConfig } from './configStorage';
import { isFileBacked, isFirestoreBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { purgeMembersOfSection } from './memberStorage';
import { SECTIONS_FILENAME, SECTIONS_KEY } from './names';
import { mergeSectionLists } from './sectionList';
import { runExclusive } from './writeQueue';

export { applySectionsUpdatedDetail, mergeSectionLists } from './sectionList';
export type { SectionsUpdatedDetail } from './sectionList';

/** Seções gravadas nesta sessão. Cobre snapshot/cache do Firestore sem a seção nova. */
const rememberedSections = new Map<string, ScoutSection>();

const rememberSection = (section: ScoutSection): void => {
  rememberedSections.set(section.id, section);
};

const forgetSection = (id: string): void => {
  rememberedSections.delete(id);
};

const emitSectionsUpdated = (detail: { upsert?: ScoutSection; removedId?: string }): void => {
  dispatchDataEvent(DATA_EVENTS.SECTIONS_UPDATED, detail);
};

const groupNameFor = async (section: ScoutSection): Promise<string | undefined> => {
  if (section.groupName) return section.groupName;
  if (!isFirestoreBacked()) return undefined;
  const groups = await listGroupDocuments();
  return groups.find(group => group.id === section.groupId)?.name || groups[0]?.name;
};

export const getSectionsAsync = async (): Promise<ScoutSection[]> => {
  const remote = isFirestoreBacked()
    ? await listSectionDocuments([...rememberedSections.keys()])
    : await readJsonDoc<ScoutSection[]>(SECTIONS_FILENAME, SECTIONS_KEY, []);
  return mergeSectionLists(remote, [...rememberedSections.values()]);
};

export const saveSectionAsync = async (section: ScoutSection): Promise<void> => {
  if (isFirestoreBacked()) {
    await writeSectionDocument(section, await groupNameFor(section));
    rememberSection(section);
    emitSectionsUpdated({ upsert: section });
    return;
  }
  await runExclusive(SECTIONS_FILENAME, async () => {
    const current = await getSectionsAsync();
    const index = current.findIndex(item => item.id === section.id);
    const updated = index >= 0 ? [...current] : [...current, section];
    if (index >= 0) updated[index] = section;
    await writeJsonDoc(SECTIONS_FILENAME, SECTIONS_KEY, updated);
  });
  rememberSection(section);
  emitSectionsUpdated({ upsert: section });
};

export const deleteSectionAsync = async (id: string): Promise<void> => {
  if (isFirestoreBacked()) {
    await purgeMembersOfSection(id);
    await deleteSectionDocument(id);
    forgetSection(id);
    emitSectionsUpdated({ removedId: id });
    return;
  }
  await runExclusive(SECTIONS_FILENAME, async () => {
    const current = await getSectionsAsync();
    await writeJsonDoc(SECTIONS_FILENAME, SECTIONS_KEY, current.filter(section => section.id !== id));
  });
  await purgeMembersOfSection(id);
  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem?.deletePath) {
    await window.fileSystem.deletePath(config.dataFolder, sectionFolder(id));
  }
  forgetSection(id);
  emitSectionsUpdated({ removedId: id });
};
