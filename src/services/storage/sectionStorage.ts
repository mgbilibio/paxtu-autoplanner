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
import { runExclusive } from './writeQueue';

const groupNameFor = async (section: ScoutSection): Promise<string | undefined> => {
  if (section.groupName) return section.groupName;
  if (!isFirestoreBacked()) return undefined;
  const groups = await listGroupDocuments();
  return groups.find(group => group.id === section.groupId)?.name || groups[0]?.name;
};

export const getSectionsAsync = async (): Promise<ScoutSection[]> => {
  if (isFirestoreBacked()) return listSectionDocuments();
  return readJsonDoc<ScoutSection[]>(SECTIONS_FILENAME, SECTIONS_KEY, []);
};

export const saveSectionAsync = async (section: ScoutSection): Promise<void> => {
  if (isFirestoreBacked()) {
    await writeSectionDocument(section, await groupNameFor(section));
    dispatchDataEvent(DATA_EVENTS.SECTIONS_UPDATED);
    return;
  }
  await runExclusive(SECTIONS_FILENAME, async () => {
    const current = await getSectionsAsync();
    const index = current.findIndex(item => item.id === section.id);
    const updated = index >= 0 ? [...current] : [...current, section];
    if (index >= 0) updated[index] = section;
    await writeJsonDoc(SECTIONS_FILENAME, SECTIONS_KEY, updated);
  });
  dispatchDataEvent(DATA_EVENTS.SECTIONS_UPDATED);
};

export const deleteSectionAsync = async (id: string): Promise<void> => {
  if (isFirestoreBacked()) {
    await purgeMembersOfSection(id);
    await deleteSectionDocument(id);
    dispatchDataEvent(DATA_EVENTS.SECTIONS_UPDATED);
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
  dispatchDataEvent(DATA_EVENTS.SECTIONS_UPDATED);
};
