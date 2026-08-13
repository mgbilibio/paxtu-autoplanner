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

export const listSectionDocuments = async (): Promise<ScoutSection[]> => {
  const snap = await getDocs(collection(getFirestoreDb(), 'sections'));
  return snap.docs.map(item => withSectionKind({ id: item.id, ...item.data() } as ScoutSection));
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
  await setDoc(doc(getFirestoreDb(), 'sections', sectionId, 'docs', docId), { items });
};

export const readAccessibleItems = async <T>(docId: string): Promise<T[]> => {
  const sections = await listSectionDocuments();
  const batches = await Promise.all(sections.map(section => readSectionItems<T>(section.id, docId)));
  return batches.flat();
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
