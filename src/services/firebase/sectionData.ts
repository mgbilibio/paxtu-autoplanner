import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { ScoutGroup, ScoutMember, ScoutSection } from '../../types';
import { getFirestoreDb } from './config';
import {
  OFFICIAL_COLLECTION,
  OFFICIAL_COMPETENCIAS_DOC,
  OFFICIAL_PAXTU_DOC,
  OFFICIAL_VIDA_DOC,
  hydrateMemberOfficial,
  leanMemberForList,
  shouldPersistOfficial,
  splitOfficialDocs,
} from './memberOfficial';
import { firestoreWriteError, sanitizeMemberForFirestore } from './sanitizeFirestoreMember';
import { withSectionKind } from './sectionKind';
import { getFirebaseSessionUid } from './session';

const ITEMS_FIELD = 'items';

const stripUndefined = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const listGroupDocuments = async (): Promise<ScoutGroup[]> => {
  const snap = await getDocs(collection(getFirestoreDb(), 'groups'));
  return snap.docs.map(item => ({ id: item.id, ...item.data() } as ScoutGroup));
};

export const writeGroupDocument = async (group: ScoutGroup): Promise<void> => {
  await setDoc(doc(getFirestoreDb(), 'groups', group.id), stripUndefined({ ...group }));
};

const uniqueIds = (ids: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || id === 'ADMIN_GLOBAL' || id === 'GLOBAL' || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
};

/** IDs que as regras já permitem ler: users/{uid}.sectionIds (getDoc pontual). */
export const readSignedInSectionIds = async (): Promise<string[]> => {
  const uid = getFirebaseSessionUid();
  if (!uid) return [];
  try {
    const snap = await getDoc(doc(getFirestoreDb(), 'users', uid));
    if (!snap.exists()) return [];
    const data = snap.data() as Record<string, unknown>;
    const fromList = Array.isArray(data.sectionIds)
      ? (data.sectionIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];
    const single = typeof data.sectionId === 'string' ? data.sectionId : undefined;
    return uniqueIds([...fromList, single]);
  } catch {
    return [];
  }
};

const readSectionDocument = async (sectionId: string): Promise<ScoutSection | null> => {
  try {
    const snap = await getDoc(doc(getFirestoreDb(), 'sections', sectionId));
    if (!snap.exists()) return null;
    return withSectionKind({ id: snap.id, ...snap.data() } as ScoutSection);
  } catch {
    return null;
  }
};

const listSectionsByIds = async (ids: string[]): Promise<ScoutSection[]> => {
  const docs = await Promise.all(ids.map(readSectionDocument));
  return docs.filter((section): section is ScoutSection => section !== null);
};

export const listSectionDocuments = async (extraIds: string[] = []): Promise<ScoutSection[]> => {
  // getDocs na coleção inteira falha para chefia: as regras só liberam
  // sections/{id} em sectionIds. Não enfraquecer as regras — ler por id.
  // Snapshot da coleção também pode vir do cache sem a seção recém-criada:
  // completar com getDoc dos ids conhecidos (login + overlay da gravação).
  let listed: ScoutSection[] = [];
  try {
    const snap = await getDocs(collection(getFirestoreDb(), 'sections'));
    listed = snap.docs.map(item => withSectionKind({ id: item.id, ...item.data() } as ScoutSection));
  } catch {
    // query da coleção negada ou vazia: cai nos ids pontuais
  }
  const missing = uniqueIds([...extraIds, ...(await readSignedInSectionIds())])
    .filter(id => !listed.some(item => item.id === id));
  if (missing.length > 0) {
    listed = [...listed, ...(await listSectionsByIds(missing))];
  }
  return listed;
};

export const writeSectionDocument = async (section: ScoutSection, groupName?: string): Promise<void> => {
  const payload = withSectionKind(section, groupName);
  await setDoc(doc(getFirestoreDb(), 'sections', section.id), stripUndefined({ ...payload }));
};

export const deleteSectionDocument = async (sectionId: string): Promise<void> => {
  await deleteDoc(doc(getFirestoreDb(), 'sections', sectionId));
};

export type ReadSectionItemsOptions = {
  /** Default true: ficha / import still get the official tree. Lists/stats pass false. */
  hydrateOfficial?: boolean;
};

const OFFICIAL_HYDRATE_BATCH = 6;

const hydrateOneMemberOfficial = async (
  sectionId: string,
  member: ScoutMember,
): Promise<ScoutMember> => {
  if (!member?.id) return member;
  try {
    const docs = await listNamedSubcollection(
      'sections',
      sectionId,
      'members',
      member.id,
      OFFICIAL_COLLECTION,
    );
    return hydrateMemberOfficial(
      member,
      docs[OFFICIAL_PAXTU_DOC],
      docs[OFFICIAL_COMPETENCIAS_DOC],
      docs[OFFICIAL_VIDA_DOC],
    );
  } catch {
    return member;
  }
};

/** Hidrata o Paxtu oficial de um jovem (ficha 📜). Não usar em lista da tropa. */
export const hydrateMemberOfficialFromSection = async (
  sectionId: string,
  member: ScoutMember,
): Promise<ScoutMember> => hydrateOneMemberOfficial(sectionId, member);

const hydrateMembersOfficial = async (
  sectionId: string,
  members: ScoutMember[],
): Promise<ScoutMember[]> => {
  const hydrated: ScoutMember[] = [];
  for (let i = 0; i < members.length; i += OFFICIAL_HYDRATE_BATCH) {
    const chunk = members.slice(i, i + OFFICIAL_HYDRATE_BATCH);
    hydrated.push(...await Promise.all(chunk.map(member => hydrateOneMemberOfficial(sectionId, member))));
  }
  return hydrated;
};

const persistMembersOfficial = async (sectionId: string, members: ScoutMember[]): Promise<void> => {
  await Promise.all(members.map(async member => {
    if (!member?.id || !shouldPersistOfficial(member.official)) return;
    const shards = splitOfficialDocs(member.official!);
    try {
      await writeMemberSubdoc(sectionId, member.id, OFFICIAL_COLLECTION, OFFICIAL_PAXTU_DOC, shards.paxtu);
      if (shards.competencias) {
        await writeMemberSubdoc(
          sectionId,
          member.id,
          OFFICIAL_COLLECTION,
          OFFICIAL_COMPETENCIAS_DOC,
          shards.competencias,
        );
      } else {
        await deleteMemberSubdoc(sectionId, member.id, OFFICIAL_COLLECTION, OFFICIAL_COMPETENCIAS_DOC);
      }
      if (shards.vida) {
        await writeMemberSubdoc(
          sectionId,
          member.id,
          OFFICIAL_COLLECTION,
          OFFICIAL_VIDA_DOC,
          shards.vida,
        );
      } else {
        await deleteMemberSubdoc(sectionId, member.id, OFFICIAL_COLLECTION, OFFICIAL_VIDA_DOC);
      }
    } catch (error) {
      throw firestoreWriteError(error, 'histórico oficial');
    }
  }));
};

export const readSectionItems = async <T>(
  sectionId: string,
  docId: string,
  options?: ReadSectionItemsOptions,
): Promise<T[]> => {
  const snap = await getDoc(doc(getFirestoreDb(), 'sections', sectionId, 'docs', docId));
  if (!snap.exists()) return [];
  const data = snap.data() as Record<string, unknown>;
  const items = Array.isArray(data[ITEMS_FIELD]) ? data[ITEMS_FIELD] as T[] : [];
  if (docId !== 'members') return items;
  if (options?.hydrateOfficial === false) return items;
  return hydrateMembersOfficial(sectionId, items as ScoutMember[]) as Promise<T[]>;
};

export const writeSectionItems = async <T>(sectionId: string, docId: string, items: T[]): Promise<void> => {
  if (!sectionId) {
    throw new Error('Seção não definida para gravar os dados.');
  }
  // Firestore rejeita `undefined` e arrays aninhados. stripUndefined remove
  // undefined; membros passam pelo sanitizer (historico Paxtu string[][]).
  // official gordo vai para sections/{id}/members/{memberId}/official/*;
  // docs/members fica só com o resumo (source + nomes/datas de etapa).
  const payload = docId === 'members'
    ? (items as ScoutMember[]).map(sanitizeMemberForFirestore)
    : items;
  try {
    const toWrite = docId === 'members'
      ? (payload as ScoutMember[]).map(leanMemberForList)
      : payload;
    if (docId === 'members') {
      await persistMembersOfficial(sectionId, payload as ScoutMember[]);
    }
    await setDoc(
      doc(getFirestoreDb(), 'sections', sectionId, 'docs', docId),
      stripUndefined({ items: toWrite }),
    );
  } catch (error) {
    throw firestoreWriteError(error, docId === 'members' ? 'efetivo' : 'dados da seção');
  }
};

export const readAccessibleItems = async <T>(
  docId: string,
  fallbackSectionIds?: string[],
  options?: ReadSectionItemsOptions,
): Promise<T[]> => {
  const sections = await listSectionDocuments();
  const seen = new Set<string>();
  const ids: string[] = [];
  const add = (id?: string) => {
    if (!id || id === 'ADMIN_GLOBAL' || id === 'GLOBAL' || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  sections.forEach(section => add(section.id));
  (fallbackSectionIds || []).forEach(add);
  if (ids.length === 0) {
    (await readSignedInSectionIds()).forEach(add);
  }
  if (ids.length === 0) return [];
  const batches = await Promise.all(ids.map(id => readSectionItems<T>(id, docId, options)));
  const items = batches.flat();
  if (items.length > 0) return items;
  // Lista agregada vazia: ainda tenta a seção atual / sectionIds do login.
  const extra = uniqueIds([
    ...(fallbackSectionIds || []),
    ...(await readSignedInSectionIds()),
  ]).filter(id => !seen.has(id));
  if (extra.length === 0) return items;
  const extraBatches = await Promise.all(extra.map(id => readSectionItems<T>(id, docId, options)));
  return extraBatches.flat();
};

export const readMemberSubdoc = async <T>(
  sectionId: string,
  memberId: string,
  collectionName: string,
  docId: string,
): Promise<T | null> => {
  const snap = await getDoc(doc(getFirestoreDb(), 'sections', sectionId, 'members', memberId, collectionName, docId));
  if (!snap.exists()) return null;
  return snap.data() as T;
};

export const writeMemberSubdoc = async (
  sectionId: string,
  memberId: string,
  collectionName: string,
  docId: string,
  value: object,
): Promise<void> => {
  await setDoc(
    doc(getFirestoreDb(), 'sections', sectionId, 'members', memberId, collectionName, docId),
    stripUndefined(value) as Record<string, unknown>,
  );
};

export const deleteMemberSubdoc = async (
  sectionId: string,
  memberId: string,
  collectionName: string,
  docId: string,
): Promise<void> => {
  try {
    await deleteDoc(
      doc(getFirestoreDb(), 'sections', sectionId, 'members', memberId, collectionName, docId),
    );
  } catch {
    // Ausente ou ilegível: a hidratação trata shard em falta como vazio.
  }
};

export const MEMBER_SUBCOLLECTIONS = ['bloco', 'progress', 'specialty', 'reconhecimento', 'official'] as const;

export const listNamedSubcollection = async (
  ...path: [string, ...string[]]
): Promise<Record<string, Record<string, unknown>>> => {
  const [first, ...rest] = path;
  const snap = await getDocs(collection(getFirestoreDb(), first, ...rest));
  const result: Record<string, Record<string, unknown>> = {};
  snap.forEach(item => {
    result[item.id] = item.data() as Record<string, unknown>;
  });
  return result;
};
