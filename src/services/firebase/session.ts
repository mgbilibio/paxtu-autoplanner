import { isWebApp } from '../platform';
import { isFirebaseConfigured } from './config';

let sessionUid: string | null = null;

export const setFirebaseSessionUid = (uid: string | null): void => {
  sessionUid = uid;
};

export const getFirebaseSessionUid = (): string | null => sessionUid;

/** Web + Firebase configurado + sessão autenticada. Electron nunca entra aqui. */
export const isFirestoreBacked = (): boolean =>
  isWebApp() && isFirebaseConfigured() && Boolean(sessionUid);
