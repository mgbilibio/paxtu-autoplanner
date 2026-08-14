import { ScoutMember } from '../../types';
import { resolveTroopRole } from '../../utils/memberQuickAdd';
import { memberFolder, memberProfilePath } from '../dataLayoutService';
import { firestoreWriteError, sanitizeMemberForFirestore } from '../firebase/sanitizeFirestoreMember';
import {
  hydrateMemberOfficialFromSection,
  readAccessibleItems,
  readSectionItems,
  writeSectionItems,
  type ReadSectionItemsOptions,
} from '../firebase/sectionData';
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

export type GetMembersOptions = ReadSectionItemsOptions;

const LEAN_MEMBERS: GetMembersOptions = { hydrateOfficial: false };

export const getMembersAsync = async (
  sectionId?: string,
  options?: GetMembersOptions,
): Promise<ScoutMember[]> => {
  if (isFirestoreBacked()) {
    if (sectionId) return readSectionItems<ScoutMember>(sectionId, 'members', options);
    return readAccessibleItems<ScoutMember>('members', undefined, options);
  }
  const members = await readJsonDoc<ScoutMember[]>(MEMBERS_FILENAME, MEMBERS_KEY, []);
  if (sectionId) return members.filter(member => member.sectionId === sectionId);
  return members;
};

/** Só precisa de id/sectionId para achar o path. Nunca hidratar official aqui. */
export const findMemberForLayout = async (memberId: string): Promise<ScoutMember | null> => {
  const members = await getMembersAsync(undefined, LEAN_MEMBERS);
  return members.find(member => member.id === memberId) || null;
};

/** Hidrata official de um jovem (ficha). No backend de arquivo o membro já vem completo. */
export const hydrateMemberOfficialAsync = async (member: ScoutMember): Promise<ScoutMember> => {
  if (!isFirestoreBacked() || !member.sectionId || !member.id) return member;
  return hydrateMemberOfficialFromSection(member.sectionId, member);
};

export const saveMemberAsync = async (member: ScoutMember): Promise<void> => {
  // Espalha o registro inteiro: official e campos extras do Firestore não podem ser apagados.
  const toSave: ScoutMember = sanitizeMemberForFirestore({
    ...member,
    role: resolveTroopRole(member.role),
  });
  assertCanWriteSection(toSave.sectionId);
  if (isFirestoreBacked()) {
    const sectionId = toSave.sectionId || '';
    try {
      await runExclusive(`firestore-members-${sectionId}`, async () => {
        const current = await readSectionItems<ScoutMember>(sectionId, 'members', LEAN_MEMBERS);
        const index = current.findIndex(item => item.id === toSave.id);
        const updated = (index >= 0 ? [...current] : [...current, toSave])
          .map(sanitizeMemberForFirestore);
        if (index >= 0) updated[index] = toSave;
        await writeSectionItems(sectionId, 'members', updated);
      });
    } catch (error) {
      throw firestoreWriteError(error, 'efetivo');
    }
    dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
    return;
  }
  await runExclusive(MEMBERS_FILENAME, async () => {
    const current = await getMembersAsync();
    const index = current.findIndex(item => item.id === toSave.id);
    const updated = index >= 0 ? [...current] : [...current, toSave];
    if (index >= 0) updated[index] = toSave;
    await writeJsonDoc(MEMBERS_FILENAME, MEMBERS_KEY, updated);
  });
  if (isFileBacked()) {
    const path = memberProfilePath(toSave.sectionId, toSave.id);
    await writeLayoutFile(path.folder, path.file, toSave);
  }
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
};

export const purgeMembersOfSection = async (sectionId: string): Promise<void> => {
  if (isFirestoreBacked()) {
    const ofSection = await readSectionItems<ScoutMember>(sectionId, 'members', LEAN_MEMBERS);
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
        const current = await readSectionItems<ScoutMember>(member.sectionId!, 'members', LEAN_MEMBERS);
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
