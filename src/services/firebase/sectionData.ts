import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { ScoutGroup, ScoutSection } from '../../types';
import { getFirestoreDb } from './config';
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

export const listSectionDocuments = async (): Promise<ScoutSection[]> => {
  // getDocs na coleção inteira falha para chefia: as regras só liberam
  // sections/{id} em sectionIds. Não enfraquecer as regras — ler por id.
  try {
    const snap = await getDocs(collection(getFirestoreDb(), 'sections'));
    const listed = snap.docs.map(item => withSectionKind({ id: item.id, ...item.data() } as ScoutSection));
    if (listed.length > 0) return listed;
  } catch {
    // query da coleção negada ou vazia: cai nos ids do usuário autenticado
  }
  return listSectionsByIds(await readSignedInSectionIds());
};

export const writeSectionDocument = async (section: ScoutSection, groupName?: string): Promise<void> => {
  const payload = withSectionKind(section, groupName);
  await setDoc(doc(getFirestoreDb(), 'sections', section.id), stripUndefined({ ...payload }));
};

export const deleteSectionDocument = async (sectionId: string): Promise<void> => {
  await deleteDoc(doc(getFirestoreDb(), 'sections', sectionId));
};

export const readSectionItems = async <T>(sectionId: string, docId: string): Promise<T[]> => {
  const snap = await getDoc(doc(getFirestoreDb(), 'sections', sectionId, 'docs', docId));
  if (!snap.exists()) return [];
  const data = snap.data() as Record<string, unknown>;
  return Array.isArray(data[ITEMS_FIELD]) ? data[ITEMS_FIELD] as T[] : [];
};

export const writeSectionItems = async <T>(sectionId: string, docId: string, items: T[]): Promise<void> => {
  if (!sectionId) {
    throw new Error('Seção não definida para gravar os dados.');
  }
  // Firestore rejeita `undefined` em qualquer campo (inclusive aninhados em
  // Activity.evaluation). JSON.stringify em stripUndefined remove esses campos.
  await setDoc(
    doc(getFirestoreDb(), 'sections', sectionId, 'docs', docId),
    stripUndefined({ items }),
  );
};

export const readAccessibleItems = async <T>(
  docId: string,
  fallbackSectionIds?: string[],
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
  const batches = await Promise.all(ids.map(id => readSectionItems<T>(id, docId)));
  const items = batches.flat();
  if (items.length > 0) return items;
  // Lista agregada vazia: ainda tenta a seção atual / sectionIds do login.
  const extra = uniqueIds([
    ...(fallbackSectionIds || []),
    ...(await readSignedInSectionIds()),
  ]).filter(id => !seen.has(id));
  if (extra.length === 0) return items;
  const extraBatches = await Promise.all(extra.map(id => readSectionItems<T>(id, docId)));
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

export const MEMBER_SUBCOLLECTIONS = ['bloco', 'progress', 'specialty', 'reconhecimento'] as const;

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
