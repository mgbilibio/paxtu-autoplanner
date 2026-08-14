import {
  doc,
  getDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { isWebApp } from '../platform';
import { DATA_EVENTS, dispatchDataEvent } from '../storage/events';
import { getFirebaseAuth, getFirebaseWebConfig, getFirestoreDb } from './config';
import {
  decryptJsonWithPassword,
  encryptJsonWithPassword,
  isEncryptedGroupBackup,
} from './groupBackupCrypto';
import { MEMBER_SUBCOLLECTIONS, listNamedSubcollection } from './sectionData';

export const GROUP_BACKUP_KIND = 'scoutsauto-firestore-backup';
export const GROUP_BACKUP_VERSION = 1;
export const GROUP_BACKUP_MAX_BYTES = 20 * 1024 * 1024;
const BATCH_LIMIT = 400;

export type FirestoreDocMap = Record<string, Record<string, unknown>>;

export interface GroupFirestoreBackup {
  kind: typeof GROUP_BACKUP_KIND;
  version: number;
  exportedAt: string;
  projectId?: string;
  groups: FirestoreDocMap;
  sections: FirestoreDocMap;
  sectionDocs: Record<string, FirestoreDocMap>;
  memberDocs: Record<string, Record<string, Record<string, FirestoreDocMap>>>;
  users: FirestoreDocMap;
  invites: FirestoreDocMap;
}

export interface GroupBackupSummary {
  users: number;
  invites: number;
  groups: number;
  sections: number;
  sectionDocs: number;
  memberDocs: number;
}

export interface ParsedGroupBackup {
  backup: GroupFirestoreBackup;
  encrypted: boolean;
}

const SECRET_KEY_PATTERN =
  /^(api[_-]?key|gemini.*key|xai.*key|ollama.*(?:api)?key|private[_-]?key|password(?:hash|salt)?|password|passwd|client[_-]?secret|auth[_-]?secret|service[_-]?account(?:_?json)?)$/i;

const PRIVATE_KEY_PEM = /BEGIN (RSA )?PRIVATE KEY/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isTimestampLike = (value: unknown): boolean => {
  if (!isPlainObject(value)) return false;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') return true;
  return typeof value.seconds === 'number' && typeof value.nanoseconds === 'number';
};

const timestampToIso = (value: Record<string, unknown>): string => {
  const withDate = value as { toDate?: () => Date };
  if (typeof withDate.toDate === 'function') {
    return withDate.toDate().toISOString();
  }
  const millis = Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds) / 1e6);
  return new Date(millis).toISOString();
};

const isServiceAccountBlob = (value: Record<string, unknown>): boolean =>
  value.type === 'service_account'
  || (typeof value.private_key === 'string' && typeof value.client_email === 'string');

export const stripBackupSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripBackupSecrets);
  if (typeof value === 'string') {
    return PRIVATE_KEY_PEM.test(value) ? '' : value;
  }
  if (!isPlainObject(value)) return value;
  if (isServiceAccountBlob(value)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) continue;
    out[key] = stripBackupSecrets(nested);
  }
  return out;
};

export const serializeBackupValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(serializeBackupValue);
  if (isTimestampLike(value)) return timestampToIso(value as Record<string, unknown>);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = serializeBackupValue(nested);
  }
  return out;
};

const sanitizeDocMap = (docs: FirestoreDocMap): FirestoreDocMap => {
  const out: FirestoreDocMap = {};
  for (const [id, data] of Object.entries(docs)) {
    const serialized = serializeBackupValue(data);
    const stripped = stripBackupSecrets(serialized);
    if (isPlainObject(stripped)) out[id] = stripped;
  }
  return out;
};

const asDocMap = (value: unknown): FirestoreDocMap => {
  if (!isPlainObject(value)) return {};
  const out: FirestoreDocMap = {};
  for (const [id, data] of Object.entries(value)) {
    if (isPlainObject(data)) out[id] = data;
  }
  return out;
};

export const isGroupFirestoreBackup = (value: unknown): value is GroupFirestoreBackup => {
  if (!isPlainObject(value)) return false;
  if (value.kind !== GROUP_BACKUP_KIND) return false;
  if (typeof value.version !== 'number' || value.version < 1) return false;
  return isPlainObject(value.users)
    && isPlainObject(value.invites)
    && isPlainObject(value.groups)
    && isPlainObject(value.sections)
    && isPlainObject(value.sectionDocs)
    && isPlainObject(value.memberDocs);
};

export const summarizeGroupBackup = (backup: GroupFirestoreBackup): GroupBackupSummary => {
  let sectionDocs = 0;
  for (const docs of Object.values(backup.sectionDocs || {})) {
    sectionDocs += Object.keys(docs || {}).length;
  }
  let memberDocs = 0;
  for (const members of Object.values(backup.memberDocs || {})) {
    for (const collections of Object.values(members || {})) {
      for (const docs of Object.values(collections || {})) {
        memberDocs += Object.keys(docs || {}).length;
      }
    }
  }
  return {
    users: Object.keys(backup.users || {}).length,
    invites: Object.keys(backup.invites || {}).length,
    groups: Object.keys(backup.groups || {}).length,
    sections: Object.keys(backup.sections || {}).length,
    sectionDocs,
    memberDocs,
  };
};

const requireWebFirebase = (): void => {
  if (!isWebApp()) {
    throw new Error('O backup do grupo Firestore só existe no site ScoutsAuto.');
  }
  getFirestoreDb();
};

const assertCurrentUserIsAdmin = async (): Promise<{ uid: string; email: string }> => {
  requireWebFirebase();
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Entre como administrador para fazer backup.');
  const snap = await getDoc(doc(getFirestoreDb(), 'users', user.uid));
  const data = snap.data() as DocumentData | undefined;
  if (!snap.exists() || data?.isAdmin !== true) {
    throw new Error('Só o administrador pode exportar ou restaurar o backup do grupo.');
  }
  return { uid: user.uid, email: (user.email || '').trim().toLowerCase() };
};

const memberIdsFromSectionDocs = (docs: FirestoreDocMap): string[] => {
  const ids = new Set<string>();
  const membersDoc = docs.members;
  const items = Array.isArray(membersDoc?.items) ? membersDoc.items : [];
  for (const item of items) {
    if (isPlainObject(item) && typeof item.id === 'string' && item.id.trim()) {
      ids.add(item.id.trim());
    }
  }
  return [...ids];
};

const downloadJson = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const exportCollection = async (name: string): Promise<FirestoreDocMap> =>
  listNamedSubcollection(name);

const exportSectionMemberDocs = async (
  sectionId: string,
  memberIds: string[],
): Promise<Record<string, Record<string, FirestoreDocMap>>> => {
  const byMember: Record<string, Record<string, FirestoreDocMap>> = {};
  for (const memberId of memberIds) {
    const collections: Record<string, FirestoreDocMap> = {};
    for (const collectionName of MEMBER_SUBCOLLECTIONS) {
      const docs = await listNamedSubcollection(
        'sections',
        sectionId,
        'members',
        memberId,
        collectionName,
      );
      if (Object.keys(docs).length > 0) collections[collectionName] = docs;
    }
    if (Object.keys(collections).length > 0) byMember[memberId] = collections;
  }
  return byMember;
};

export const exportGroupFirestoreBackup = async (): Promise<GroupFirestoreBackup> => {
  await assertCurrentUserIsAdmin();
  const [groups, sections, users, invites] = await Promise.all([
    exportCollection('groups'),
    exportCollection('sections'),
    exportCollection('users'),
    exportCollection('invites'),
  ]);

  const sectionDocs: Record<string, FirestoreDocMap> = {};
  const memberDocs: Record<string, Record<string, Record<string, FirestoreDocMap>>> = {};

  for (const sectionId of Object.keys(sections)) {
    const docs = await listNamedSubcollection('sections', sectionId, 'docs');
    sectionDocs[sectionId] = docs;
    const memberIds = memberIdsFromSectionDocs(docs);
    const ofMembers = await exportSectionMemberDocs(sectionId, memberIds);
    if (Object.keys(ofMembers).length > 0) memberDocs[sectionId] = ofMembers;
  }

  const backup: GroupFirestoreBackup = {
    kind: GROUP_BACKUP_KIND,
    version: GROUP_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projectId: getFirebaseWebConfig()?.projectId,
    groups: sanitizeDocMap(groups),
    sections: sanitizeDocMap(sections),
    sectionDocs: Object.fromEntries(
      Object.entries(sectionDocs).map(([id, docs]) => [id, sanitizeDocMap(docs)]),
    ),
    memberDocs: Object.fromEntries(
      Object.entries(memberDocs).map(([sectionId, members]) => [
        sectionId,
        Object.fromEntries(
          Object.entries(members).map(([memberId, collections]) => [
            memberId,
            Object.fromEntries(
              Object.entries(collections).map(([col, docs]) => [col, sanitizeDocMap(docs)]),
            ),
          ]),
        ),
      ]),
    ),
    users: sanitizeDocMap(users),
    invites: sanitizeDocMap(invites),
  };
  return backup;
};

export const downloadGroupFirestoreBackup = async (password: string): Promise<GroupBackupSummary> => {
  const backup = await exportGroupFirestoreBackup();
  const envelope = await encryptJsonWithPassword(backup, password);
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`scoutsauto_grupo_backup_${date}.json`, envelope);
  return summarizeGroupBackup(backup);
};

const isSafeDocId = (id: string): boolean =>
  Boolean(id.trim()) && !id.includes('/') && !id.includes('..');

const protectCurrentAdmin = (
  data: Record<string, unknown>,
  current: { uid: string; email: string },
  path: string[],
): Record<string, unknown> => {
  const isCurrentUserDoc = path[0] === 'users' && path[1] === current.uid;
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const isCurrentInvite = path[0] === 'invites' && (path[1] === current.email || email === current.email);
  if (!isCurrentUserDoc && !isCurrentInvite) return data;
  return {
    ...data,
    isAdmin: true,
    active: true,
    role: 'ADMINISTRADOR',
    pendingApproval: false,
    rejected: false,
  };
};

const collectWriteOps = (
  backup: GroupFirestoreBackup,
  current: { uid: string; email: string },
): Array<{ path: string[]; data: Record<string, unknown> }> => {
  const ops: Array<{ path: string[]; data: Record<string, unknown> }> = [];
  const pushMap = (collectionName: string, docs: FirestoreDocMap) => {
    for (const [id, data] of Object.entries(docs)) {
      if (!isSafeDocId(id)) continue;
      ops.push({ path: [collectionName, id], data: protectCurrentAdmin(data, current, [collectionName, id]) });
    }
  };
  pushMap('groups', asDocMap(backup.groups));
  pushMap('sections', asDocMap(backup.sections));
  pushMap('users', asDocMap(backup.users));
  pushMap('invites', asDocMap(backup.invites));

  for (const [sectionId, docs] of Object.entries(backup.sectionDocs || {})) {
    if (!isSafeDocId(sectionId)) continue;
    for (const [docId, data] of Object.entries(docs || {})) {
      if (!isSafeDocId(docId) || !isPlainObject(data)) continue;
      ops.push({ path: ['sections', sectionId, 'docs', docId], data });
    }
  }

  for (const [sectionId, members] of Object.entries(backup.memberDocs || {})) {
    if (!isSafeDocId(sectionId) || !isPlainObject(members)) continue;
    for (const [memberId, collections] of Object.entries(members)) {
      if (!isSafeDocId(memberId) || !isPlainObject(collections)) continue;
      for (const [collectionName, docs] of Object.entries(collections)) {
        if (!MEMBER_SUBCOLLECTIONS.includes(collectionName as typeof MEMBER_SUBCOLLECTIONS[number])) continue;
        if (!isPlainObject(docs)) continue;
        for (const [docId, data] of Object.entries(docs)) {
          if (!isSafeDocId(docId) || !isPlainObject(data)) continue;
          ops.push({
            path: ['sections', sectionId, 'members', memberId, collectionName, docId],
            data,
          });
        }
      }
    }
  }
  return ops;
};

const commitWrites = async (ops: Array<{ path: string[]; data: Record<string, unknown> }>): Promise<number> => {
  const db = getFirestoreDb();
  let written = 0;
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = ops.slice(i, i + BATCH_LIMIT);
    let added = 0;
    for (const op of chunk) {
      const [first, ...rest] = op.path;
      if (!first || rest.length === 0) continue;
      const ref = doc(db, first, ...rest);
      const data = stripBackupSecrets(serializeBackupValue(op.data));
      if (!isPlainObject(data)) continue;
      batch.set(ref, data);
      added += 1;
    }
    if (added > 0) await batch.commit();
    written += added;
  }
  return written;
};

export const parseGroupFirestoreBackupFile = async (
  file: File,
  password?: string,
): Promise<ParsedGroupBackup> => {
  if (file.size > GROUP_BACKUP_MAX_BYTES) {
    throw new Error('Backup recusado: arquivo muito grande (limite 20 MB).');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Backup recusado: JSON inválido.');
  }
  if (isEncryptedGroupBackup(parsed)) {
    if (!password?.trim()) {
      throw new Error('Este backup está criptografado. Informe a senha.');
    }
    const opened = await decryptJsonWithPassword<unknown>(parsed, password);
    if (!isGroupFirestoreBackup(opened)) {
      throw new Error('Backup recusado: conteúdo descriptografado inválido.');
    }
    return { backup: opened, encrypted: true };
  }
  if (!isGroupFirestoreBackup(parsed)) {
    throw new Error('Backup recusado: não é um backup do grupo ScoutsAuto.');
  }
  return { backup: parsed, encrypted: false };
};

export const importGroupFirestoreBackup = async (backup: GroupFirestoreBackup): Promise<GroupBackupSummary> => {
  const current = await assertCurrentUserIsAdmin();
  if (!isGroupFirestoreBackup(backup)) {
    throw new Error('Backup recusado: formato não reconhecido.');
  }
  const sanitized: GroupFirestoreBackup = {
    ...backup,
    groups: sanitizeDocMap(asDocMap(backup.groups)),
    sections: sanitizeDocMap(asDocMap(backup.sections)),
    users: sanitizeDocMap(asDocMap(backup.users)),
    invites: sanitizeDocMap(asDocMap(backup.invites)),
    sectionDocs: Object.fromEntries(
      Object.entries(backup.sectionDocs || {}).map(([id, docs]) => [id, sanitizeDocMap(asDocMap(docs))]),
    ),
    memberDocs: Object.fromEntries(
      Object.entries(backup.memberDocs || {}).map(([sectionId, members]) => [
        sectionId,
        Object.fromEntries(
          Object.entries(members || {}).map(([memberId, collections]) => [
            memberId,
            Object.fromEntries(
              Object.entries(collections || {}).map(([col, docs]) => [col, sanitizeDocMap(asDocMap(docs))]),
            ),
          ]),
        ),
      ]),
    ),
  };
  if (!sanitized.users[current.uid]) {
    sanitized.users[current.uid] = {
      email: current.email,
      role: 'ADMINISTRADOR',
      isAdmin: true,
      active: true,
      pendingApproval: false,
      rejected: false,
      sectionIds: [],
    };
  }
  const ops = collectWriteOps(sanitized, current);
  await commitWrites(ops);
  Object.values(DATA_EVENTS).forEach(eventName => dispatchDataEvent(eventName));
  return summarizeGroupBackup(sanitized);
};
