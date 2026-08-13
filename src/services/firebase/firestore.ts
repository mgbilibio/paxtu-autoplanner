import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ScoutGroup, ScoutSection, UserProfile } from '../../types';
import { getFirebaseDb, emailDocId } from './config';
import { CloudInviteDoc, CloudSectionDoc, CloudUserDoc, kindFromBranch } from './types';

const db = () => getFirebaseDb();

export const bootstrapRef = () => doc(db(), 'meta', 'bootstrap');
export const userRef = (uid: string) => doc(db(), 'users', uid);
export const inviteRef = (email: string) => doc(db(), 'invites', emailDocId(email));
export const sectionRef = (sectionId: string) => doc(db(), 'sections', sectionId);
export const groupRef = (groupId: string) => doc(db(), 'groups', groupId);
export const sectionDataRef = (sectionId: string, name: string) =>
  doc(db(), 'sections', sectionId, 'data', name);
export const memberProgressRef = (
  sectionId: string,
  memberId: string,
  kind: 'bloco' | 'specialty' | 'reconhecimento' | 'legacyProgress',
  entityId: string,
) => doc(db(), 'sections', sectionId, 'members', memberId, kind, entityId);

let cachedProfile: UserProfile | null = null;
let cachedUserDoc: CloudUserDoc | null = null;

export const setCachedCloudUser = (profile: UserProfile | null, cloud?: CloudUserDoc | null): void => {
  cachedProfile = profile;
  cachedUserDoc = cloud || null;
};

export const getCachedCloudUser = (): UserProfile | null => cachedProfile;

export const getCachedCloudUserDoc = (): CloudUserDoc | null => cachedUserDoc;

export const isCloudAdmin = (): boolean =>
  Boolean(cachedUserDoc?.isAdmin && cachedUserDoc.active);

export const accessibleSectionIds = async (): Promise<string[]> => {
  if (cachedUserDoc?.isAdmin) {
    const snap = await getDocs(collection(db(), 'sections'));
    return snap.docs.map(item => item.id);
  }
  return cachedUserDoc?.sectionIds || cachedProfile?.sectionIds || [];
};

export const getUserDoc = async (uid: string): Promise<CloudUserDoc | null> => {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? snap.data() as CloudUserDoc : null;
};

export const getInviteByEmail = async (email: string): Promise<CloudInviteDoc | null> => {
  const snap = await getDoc(inviteRef(email));
  return snap.exists() ? snap.data() as CloudInviteDoc : null;
};

export const hasAnyAdmin = async (): Promise<boolean> => {
  const boot = await getDoc(bootstrapRef());
  if (boot.exists()) return true;
  const snap = await getDocs(query(collection(db(), 'users'), where('isAdmin', '==', true)));
  return !snap.empty;
};

export const writeBootstrapAdmin = async (uid: string, data: CloudUserDoc): Promise<void> => {
  const batch = writeBatch(db());
  batch.set(bootstrapRef(), { adminUid: uid, createdAt: data.createdAt });
  batch.set(userRef(uid), data);
  await batch.commit();
};

export const writeUserFromInvite = async (uid: string, invite: CloudInviteDoc): Promise<CloudUserDoc> => {
  const data: CloudUserDoc = {
    email: invite.email,
    displayName: invite.displayName,
    role: invite.role,
    sectionIds: invite.sectionIds,
    isAdmin: invite.isAdmin,
    active: invite.active,
    createdAt: invite.createdAt,
  };
  await setDoc(userRef(uid), data);
  return data;
};

export const listCloudUsers = async (): Promise<Array<CloudUserDoc & { id: string }>> => {
  const snap = await getDocs(collection(db(), 'users'));
  return snap.docs.map(item => ({ id: item.id, ...(item.data() as CloudUserDoc) }));
};

export const listInvites = async (): Promise<Array<CloudInviteDoc & { id: string }>> => {
  const snap = await getDocs(collection(db(), 'invites'));
  return snap.docs.map(item => ({ id: item.id, ...(item.data() as CloudInviteDoc) }));
};

export const upsertInvite = async (invite: CloudInviteDoc): Promise<void> => {
  await setDoc(inviteRef(invite.email), invite);
};

export const disableInvite = async (email: string, active: boolean): Promise<void> => {
  await updateDoc(inviteRef(email), { active });
};

export const disableCloudUser = async (uid: string, active: boolean): Promise<void> => {
  await updateDoc(userRef(uid), { active });
};

export const updateCloudUser = async (
  uid: string,
  patch: Partial<Pick<CloudUserDoc, 'displayName' | 'role' | 'sectionIds' | 'isAdmin' | 'active'>>,
): Promise<void> => {
  await updateDoc(userRef(uid), patch);
};

export const listSectionsCloud = async (): Promise<ScoutSection[]> => {
  const ids = await accessibleSectionIds();
  if (ids.length === 0) {
    const snap = await getDocs(collection(db(), 'sections'));
    return snap.docs.map(item => item.data() as ScoutSection);
  }
  const docs = await Promise.all(ids.map(id => getDoc(sectionRef(id))));
  return docs.filter(item => item.exists()).map(item => item.data() as ScoutSection);
};

export const upsertSectionCloud = async (section: ScoutSection, groupName = ''): Promise<void> => {
  const payload: CloudSectionDoc = {
    ...section,
    kind: kindFromBranch(section.branch),
    groupName,
  };
  await setDoc(sectionRef(section.id), payload);
};

export const deleteSectionCloud = async (sectionId: string): Promise<void> => {
  const names = ['members', 'calendar', 'catalog', 'progressLaunches', 'lock'];
  await Promise.all(names.map(name => deleteDoc(sectionDataRef(sectionId, name)).catch(() => undefined)));
  await deleteDoc(sectionRef(sectionId));
};

export const listGroupsCloud = async (): Promise<ScoutGroup[]> => {
  const snap = await getDocs(collection(db(), 'groups'));
  return snap.docs.map(item => item.data() as ScoutGroup);
};

export const upsertGroupCloud = async (group: ScoutGroup): Promise<void> => {
  await setDoc(groupRef(group.id), group);
};

export const readSectionItems = async <T>(sectionId: string, name: string): Promise<T[]> => {
  const snap = await getDoc(sectionDataRef(sectionId, name));
  if (!snap.exists()) return [];
  const data = snap.data() as { items?: T[] };
  return Array.isArray(data.items) ? data.items : [];
};

export const writeSectionItems = async <T>(sectionId: string, name: string, items: T[]): Promise<void> => {
  await setDoc(sectionDataRef(sectionId, name), { items });
};

export const readMergedSectionItems = async <T>(name: string): Promise<T[]> => {
  const ids = await accessibleSectionIds();
  const lists = await Promise.all(ids.map(id => readSectionItems<T>(id, name)));
  return lists.flat();
};

export const writeGroupedSectionItems = async <T extends { sectionId?: string }>(
  name: string,
  items: T[],
): Promise<void> => {
  const bySection = new Map<string, T[]>();
  for (const item of items) {
    const sectionId = item.sectionId;
    if (!sectionId) continue;
    const list = bySection.get(sectionId) || [];
    list.push(item);
    bySection.set(sectionId, list);
  }
  const known = await accessibleSectionIds();
  await Promise.all(known.map(async id => {
    await writeSectionItems(id, name, bySection.get(id) || []);
  }));
  await Promise.all([...bySection.entries()]
    .filter(([id]) => !known.includes(id))
    .map(([id, list]) => writeSectionItems(id, name, list)));
};

export const readMemberEntity = async <T>(
  sectionId: string,
  memberId: string,
  kind: 'bloco' | 'specialty' | 'reconhecimento' | 'legacyProgress',
  entityId: string,
): Promise<T | null> => {
  const snap = await getDoc(memberProgressRef(sectionId, memberId, kind, entityId));
  return snap.exists() ? snap.data() as T : null;
};

export const writeMemberEntity = async <T extends object>(
  sectionId: string,
  memberId: string,
  kind: 'bloco' | 'specialty' | 'reconhecimento' | 'legacyProgress',
  entityId: string,
  value: T,
): Promise<void> => {
  await setDoc(memberProgressRef(sectionId, memberId, kind, entityId), value);
};

export const cloudUsersToProfiles = (users: Array<CloudUserDoc & { id: string }>): UserProfile[] =>
  users.filter(item => item.active).map(item => ({
    id: item.id,
    name: item.displayName,
    role: item.isAdmin ? 'ADMINISTRADOR' : item.role,
    sectionId: item.sectionIds[0] || (item.isAdmin ? 'ADMIN_GLOBAL' : ''),
    email: item.email,
    sectionIds: item.sectionIds,
    active: item.active,
  }));
