import { ScoutMember } from '../../types';
import { memberFolder, memberProfilePath } from '../dataLayoutService';
import { getAppConfig } from './configStorage';
import { isFileBacked, readJsonDoc, writeJsonDoc } from './dualBackend';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { writeLayoutFile } from './layoutStorage';
import { MEMBERS_FILENAME, MEMBERS_KEY } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { runExclusive } from './writeQueue';

// Remove do localStorage todas as chaves de cache deste membro (bloco,
// especialidade, reconhecimento e progressao legada).
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
  // Secao critica serializada por chave: relê o agregado ATUAL aqui dentro
  // (nao antes da fila) para nao perder updates concorrentes de outro membro.
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

// Remove do agregado todos os membros de uma secao e limpa seus caches. Usado
// ao excluir a secao (a pasta FS dos jovens e removida por deleteSectionAsync).
export const purgeMembersOfSection = async (sectionId: string): Promise<void> => {
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
  const member = await runExclusive(MEMBERS_FILENAME, async () => {
    const current = await getMembersAsync();
    const found = current.find(item => item.id === id);
    assertCanWriteSection(found?.sectionId);
    await writeJsonDoc(MEMBERS_FILENAME, MEMBERS_KEY, current.filter(m => m.id !== id));
    return found;
  });
  // LGPD: remove a pasta do jovem (perfil + progressao + especialidades) no
  // filesystem e limpa o cache local, para nao deixar dados de menor orfaos.
  const config = getAppConfig();
  if (member && config?.dataFolder && window.fileSystem?.deletePath) {
    await window.fileSystem.deletePath(config.dataFolder, memberFolder(member.sectionId, member.id));
  }
  clearMemberCaches(id);
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
};
