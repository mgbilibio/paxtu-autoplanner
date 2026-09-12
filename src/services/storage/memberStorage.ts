import { ScoutMember } from '../../types';
import { resolveTroopRole } from '../../utils/memberQuickAdd';
import { memberFolder, memberProfilePath } from '../dataLayoutService';
import { firestoreWriteError, sanitizeMemberForFirestore } from '../firebase/sanitizeFirestoreMember';
import {
  copyMemberSubdocs,
  deleteMemberSubdoc,
  hydrateMemberOfficialFromSection,
  patchSectionItem,
  purgeMemberSubdocs,
  readAccessibleItems,
  readMemberSubdoc,
  readSectionItems,
  writeMemberSubdoc,
  writeSectionItems,
  type ReadSectionItemsOptions,
} from '../firebase/sectionData';
import { PersistenceError } from '../persistenceResult';
import {
  advanceTransferJournal,
  applyMembershipTransfer,
  assertTransferJournalAllows,
  beginTransferJournal,
  isTransferPhaseDone,
  type TransferJournal,
} from './transferMember';
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

export type GetMembersOptions = ReadSectionItemsOptions & { includeArchived?: boolean };

const LEAN_MEMBERS: GetMembersOptions = { hydrateOfficial: false };

const visibleMembers = (members: ScoutMember[], options?: GetMembersOptions): ScoutMember[] =>
  options?.includeArchived ? members : members.filter(member => !member.isArchived);

export const getMembersAsync = async (
  sectionId?: string,
  options?: GetMembersOptions,
): Promise<ScoutMember[]> => {
  if (isFirestoreBacked()) {
    const loaded = sectionId
      ? await readSectionItems<ScoutMember>(sectionId, 'members', options)
      : await readAccessibleItems<ScoutMember>('members', undefined, options);
    return visibleMembers(loaded, options);
  }
  const members = await readJsonDoc<ScoutMember[]>(MEMBERS_FILENAME, MEMBERS_KEY, []);
  const scoped = sectionId ? members.filter(member => member.sectionId === sectionId) : members;
  return visibleMembers(scoped, options);
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
    if (!sectionId) throw new PersistenceError('Seção não definida para gravar o efetivo.', 'validation');
    try {
      await runExclusive(`firestore-members-${sectionId}`, async () => {
        await patchSectionItem(sectionId, 'members', { kind: 'upsert', item: toSave });
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
    await writeSectionItems(sectionId, 'members', [], { replace: true });
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

export const archiveMemberAsync = async (id: string): Promise<void> => {
  const member = await findMemberForLayout(id);
  if (!member) throw new PersistenceError('Jovem não encontrado para arquivar.', 'missing');
  await saveMemberAsync({ ...member, isArchived: true });
};

export const purgeMemberAsync = async (id: string): Promise<void> => {
  const member = await findMemberForLayout(id);
  if (!member?.sectionId) throw new PersistenceError('Jovem não encontrado para exclusão definitiva.', 'missing');
  assertCanWriteSection(member.sectionId);
  if (isFirestoreBacked()) {
    await purgeMemberSubdocs(member.sectionId, id);
  }
  await deleteMemberAsync(id);
};

const TRANSFER_COL = 'transfer';
const TRANSFER_DOC = 'current';

const readTransferJournal = async (sectionId: string, memberId: string): Promise<TransferJournal | null> => {
  if (!isFirestoreBacked()) return null;
  return readMemberSubdoc<TransferJournal>(sectionId, memberId, TRANSFER_COL, TRANSFER_DOC);
};

const writeTransferJournal = async (sectionId: string, memberId: string, journal: TransferJournal): Promise<void> => {
  await writeMemberSubdoc(sectionId, memberId, TRANSFER_COL, TRANSFER_DOC, journal);
};

const clearTransferJournal = async (sectionId: string, memberId: string): Promise<void> => {
  await deleteMemberSubdoc(sectionId, memberId, TRANSFER_COL, TRANSFER_DOC);
};

export const transferMemberAsync = async (args: {
  memberId: string;
  fromSectionId: string;
  toSectionId: string;
  toBranch?: ScoutMember['branch'];
}): Promise<ScoutMember> => {
  const at = new Date().toISOString();
  assertCanWriteSection(args.fromSectionId);
  assertCanWriteSection(args.toSectionId);
  const command = { ...args, at };
  const existingJournal = (await readTransferJournal(args.fromSectionId, args.memberId))
    || (await readTransferJournal(args.toSectionId, args.memberId));
  assertTransferJournalAllows(existingJournal, command);
  if (existingJournal && existingJournal.phase !== 'done' && existingJournal.at) {
    command.at = existingJournal.at;
  }

  const fromMembers = await getMembersAsync(args.fromSectionId, { ...LEAN_MEMBERS, includeArchived: true });
  const toMembers = await getMembersAsync(args.toSectionId, { ...LEAN_MEMBERS, includeArchived: true });
  const member = fromMembers.find(item => item.id === args.memberId)
    || toMembers.find(item => item.id === args.memberId)
    || await findMemberForLayout(args.memberId);
  if (!member) throw new PersistenceError('Jovem não encontrado para transferir.', 'missing');
  const result = applyMembershipTransfer({
    member,
    fromMembers,
    toMembers,
    command,
  });

  if (isFirestoreBacked()) {
    let journal = existingJournal && existingJournal.phase !== 'done'
      ? existingJournal
      : beginTransferJournal(command);
    if (!existingJournal || existingJournal.phase === 'done') {
      await writeTransferJournal(args.fromSectionId, args.memberId, journal);
    }
    if (!isTransferPhaseDone(journal, 'copied-subdocs')) {
      await copyMemberSubdocs(args.memberId, args.fromSectionId, args.toSectionId);
      journal = advanceTransferJournal(journal, 'copied-subdocs');
      await writeTransferJournal(args.fromSectionId, args.memberId, journal);
    }
    if (!isTransferPhaseDone(journal, 'dest-upserted')) {
      const destLive = await readSectionItems<ScoutMember>(args.toSectionId, 'members', LEAN_MEMBERS);
      const destBase = destLive.find(item => item.id === args.memberId) || null;
      if (!destBase || destBase.sectionId !== args.toSectionId) {
        await patchSectionItem(args.toSectionId, 'members', {
          kind: 'upsert',
          item: result.transferred,
          baseItem: destBase,
        });
      }
      journal = advanceTransferJournal(journal, 'dest-upserted');
      await writeTransferJournal(args.toSectionId, args.memberId, journal);
    }
    if (!isTransferPhaseDone(journal, 'source-removed')) {
      const sourceLive = await readSectionItems<ScoutMember>(args.fromSectionId, 'members', LEAN_MEMBERS);
      const sourceItem = sourceLive.find(item => item.id === args.memberId);
      if (sourceItem) {
        await patchSectionItem(args.fromSectionId, 'members', {
          kind: 'delete',
          item: sourceItem,
          baseItem: sourceItem,
        });
      }
      journal = advanceTransferJournal(journal, 'source-removed');
      await writeTransferJournal(args.toSectionId, args.memberId, journal);
    }
    if (!isTransferPhaseDone(journal, 'source-purged')) {
      await purgeMemberSubdocs(args.fromSectionId, args.memberId);
      await clearTransferJournal(args.fromSectionId, args.memberId);
      journal = advanceTransferJournal(journal, 'source-purged');
      await writeTransferJournal(args.toSectionId, args.memberId, journal);
    }
    await clearTransferJournal(args.toSectionId, args.memberId);
    await clearTransferJournal(args.fromSectionId, args.memberId);
  } else {
    await runExclusive(MEMBERS_FILENAME, async () => {
      const all = await getMembersAsync(undefined, { includeArchived: true });
      const fromNow = all.filter(item => item.sectionId === args.fromSectionId);
      const toNow = all.filter(item => item.sectionId === args.toSectionId);
      const liveMember = fromNow.find(item => item.id === args.memberId)
        || toNow.find(item => item.id === args.memberId)
        || member;
      const next = applyMembershipTransfer({
        member: liveMember,
        fromMembers: fromNow,
        toMembers: toNow,
        command,
      });
      const others = all.filter(item =>
        item.id !== args.memberId
        && item.sectionId !== args.fromSectionId
        && item.sectionId !== args.toSectionId,
      );
      await writeJsonDoc(MEMBERS_FILENAME, MEMBERS_KEY, [...others, ...next.fromMembers, ...next.toMembers]);
    });
  }
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
  return result.transferred;
};

export const deleteMemberAsync = async (id: string): Promise<void> => {
  if (isFirestoreBacked()) {
    const member = await findMemberForLayout(id);
    assertCanWriteSection(member?.sectionId);
    if (member?.sectionId) {
      await runExclusive(`firestore-members-${member.sectionId}`, async () => {
        const current = await readSectionItems<ScoutMember>(member.sectionId!, 'members', LEAN_MEMBERS);
        const baseItem = current.find(item => item.id === id) || null;
        if (baseItem) {
          await patchSectionItem(member.sectionId!, 'members', { kind: 'delete', item: baseItem, baseItem });
        }
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
