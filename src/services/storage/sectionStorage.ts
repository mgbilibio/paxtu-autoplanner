import { ScoutSection } from '../../types';
import { sectionFolder } from '../dataLayoutService';
import { getAppConfig } from './configStorage';
import { isFirestoreBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { purgeMembersOfSection } from './memberStorage';
import { SECTIONS_FILENAME, SECTIONS_KEY } from './names';
import { runExclusive } from './writeQueue';
import { deleteSectionCloud } from '../firebase/firestore';

export const getSectionsAsync = async (): Promise<ScoutSection[]> => {
  return readJsonDoc<ScoutSection[]>(SECTIONS_FILENAME, SECTIONS_KEY, []);
};

export const saveSectionAsync = async (section: ScoutSection): Promise<void> => {
  // Releitura dentro da secao critica serializada por chave (anti lost update).
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
  await runExclusive(SECTIONS_FILENAME, async () => {
    const current = await getSectionsAsync();
    await writeJsonDoc(SECTIONS_FILENAME, SECTIONS_KEY, current.filter(section => section.id !== id));
  });
  // Remove membros desta secao do agregado + limpa caches (LGPD) antes de apagar
  // a pasta da secao (lock, jovens, adultos) no filesystem.
  await purgeMembersOfSection(id);
  if (isFirestoreBacked()) {
    await deleteSectionCloud(id);
  }
  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem?.deletePath) {
    await window.fileSystem.deletePath(config.dataFolder, sectionFolder(id));
  }
  dispatchDataEvent(DATA_EVENTS.SECTIONS_UPDATED);
};
