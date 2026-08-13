import { ScoutMember } from '../../types';
import { memberFolder, memberProfilePath } from '../dataLayoutService';
import { readAccessibleItems, readSectionItems, writeSectionItems } from '../firebase/sectionData';
import { getAppConfig } from './configStorage';
import { isFileBacked, isFirestoreBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { writeLayoutFile } from './layoutStorage';
import { MEMBERS_FILENAME, MEMBERS_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

const clearMemberCaches = (memberId: string): void => {
  const prefixes = [
    `PAXTU_BLOCO_${memberId}_`,
    `PAXTU_SPECIALTY_${memberId}_`,
    `PAXTU_REC_${memberId}_`,
    `PAXTU_PROG_${memberId}`,
  ];
  Object.keys(localStorage)
    .filter(key => prefixes.some(p => key.startsWith(p)))
    .forEach(key => localStorage.removeItem(key));
};

export const getMembersAsync = async (sectionId?: string): Promise<ScoutMember[]> => {
  if (isFirestoreBacked()) {
    if (sectionId) return readSectionItems<ScoutMember>(sectionId, 'members');
    return readAccessibleItems<ScoutMember>('members');
  }
  const members = await readJsonDoc<ScoutMember[]>(MEMBERS_FILENAME, MEMBERS_KEY, []);
  if (sectionId) return members.filter(member => member.sectionId === sectionId);
  return members;
};

export const findMemberForLayout = async (memberId: string): Promise<ScoutMember | null> => {
  const members = await getMembersAsync();
  return members.find(member => member.id === memberId) || null;
};

export const saveMemberAsync = async (member: ScoutMember): Promise<void> => {
  assertCanWriteSection(member.sectionId);
  if (isFirestoreBacked()) {
    const sectionId = member.sectionId || '';
    await runExclusive(`firestore-members-${sectionId}`, async () => {
      const current = await readSectionItems<ScoutMember>(sectionId, 'members');
      const index = current.findIndex(item => item.id === member.id);
      const updated = index >= 0 ? [...current] : [...current, member];
      if (index >= 0) updated[index] = member;
      await writeSectionItems(sectionId, 'members', updated);
    });
    dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
    return;
  }
  await runExclusive(MEMBERS_FILENAME, async () => {
    const current = await getMembersAsync();
    const index = current.findIndex(item => item.id === member.id);
    const updated = index >= 0 ? [...current] : [...current, member];
    if (index >= 0) updated[index] = member;
    await writeJsonDoc(MEMBERS_FILENAME, MEMBERS_KEY, updated);
  });
  if (isFileBacked()) {
    const path = memberProfilePath(member.sectionId, member.id);
    await writeLayoutFile(path.folder, path.file, member);
  }
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
};

export const purgeMembersOfSection = async (sectionId: string): Promise<void> => {
  if (isFirestoreBacked()) {
    const ofSection = await readSectionItems<ScoutMember>(sectionId, 'members');
    await writeSectionItems(sectionId, 'members', []);
    ofSection.forEach(member => clearMemberCaches(member.id));
    if (ofSection.length > 0) dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
    return;
  }
  const ofSection = await runExclusive(MEMBERS_FILENAME, async () => {
    const all = await getMembersAsync();
    const toRemove = all.filter(member => member.sectionId === sectionId);
    if (toRemove.length === 0) return toRemove;
    await writeJsonDoc(MEMBERS_FILENAME, MEMBERS_KEY, all.filter(member => member.sectionId !== sectionId));
    return toRemove;
  });
  if (ofSection.length === 0) return;
  ofSection.forEach(member => clearMemberCaches(member.id));
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
};

export const deleteMemberAsync = async (id: string): Promise<void> => {
  if (isFirestoreBacked()) {
    const member = await findMemberForLayout(id);
    assertCanWriteSection(member?.sectionId);
    if (member?.sectionId) {
      await runExclusive(`firestore-members-${member.sectionId}`, async () => {
        const current = await readSectionItems<ScoutMember>(member.sectionId!, 'members');
        await writeSectionItems(member.sectionId!, 'members', current.filter(item => item.id !== id));
      });
    }
    clearMemberCaches(id);
    dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
    return;
  }
  const member = await runExclusive(MEMBERS_FILENAME, async () => {
    const current = await getMembersAsync();
    const found = current.find(item => item.id === id);
    assertCanWriteSection(found?.sectionId);
    await writeJsonDoc(MEMBERS_FILENAME, MEMBERS_KEY, current.filter(m => m.id !== id));
    return found;
  });
  const config = getAppConfig();
  if (member && config?.dataFolder && window.fileSystem?.deletePath) {
    await window.fileSystem.deletePath(config.dataFolder, memberFolder(member.sectionId, member.id));
  }
  clearMemberCaches(id);
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
};
