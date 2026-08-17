import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from './config';
import { getFirebaseSessionUid } from './session';
import {
  parseIsoField,
  parseRecentAccesses,
  prependAccess,
} from './accessLogFormat';

export {
  ACCESS_LOG_EMPTY_MESSAGE,
  APP_TIMEZONE,
  formatDateTimeCuiaba,
  formatDateTimeCuiabaOrDash,
  parseIsoField,
  parseRecentAccesses,
} from './accessLogFormat';

const ACCESS_THROTTLE_MS = 30 * 60 * 1000;
const CHANGE_THROTTLE_MS = 10 * 1000;

const lastAccessWriteAt = new Map<string, number>();
const lastChangeWriteAt = new Map<string, number>();

const canWriteActivity = (): boolean =>
  isFirebaseConfigured() && Boolean(getFirebaseAuth().currentUser?.uid);

export const recordLastAccess = async (uidRaw?: string): Promise<void> => {
  if (!canWriteActivity()) return;
  const uid = (uidRaw || getFirebaseAuth().currentUser?.uid || '').trim();
  if (!uid) return;
  const now = Date.now();
  if ((lastAccessWriteAt.get(uid) || 0) > now - ACCESS_THROTTLE_MS) return;
  lastAccessWriteAt.set(uid, now);
  const iso = new Date(now).toISOString();
  try {
    const userRef = doc(getFirestoreDb(), 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    if (data.active !== true) return;
    const recentAccesses = prependAccess(parseRecentAccesses(data.recentAccesses), iso);
    await updateDoc(userRef, { lastAccessAt: iso, recentAccesses });
  } catch {
    lastAccessWriteAt.delete(uid);
  }
};

export const recordDataChange = async (): Promise<void> => {
  if (!canWriteActivity()) return;
  const uid = (getFirebaseSessionUid() || getFirebaseAuth().currentUser?.uid || '').trim();
  if (!uid) return;
  const now = Date.now();
  if ((lastChangeWriteAt.get(uid) || 0) > now - CHANGE_THROTTLE_MS) return;
  lastChangeWriteAt.set(uid, now);
  const iso = new Date(now).toISOString();
  try {
    await updateDoc(doc(getFirestoreDb(), 'users', uid), { lastDataChangeAt: iso });
  } catch {
    lastChangeWriteAt.delete(uid);
  }
};

/** Só para testes: limpa o throttle em memória. */
export const resetAccessLogThrottles = (): void => {
  lastAccessWriteAt.clear();
  lastChangeWriteAt.clear();
};
