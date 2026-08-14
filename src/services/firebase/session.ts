import { isWebApp } from '../platform';
import { isFirebaseConfigured } from './config';

let sessionUid: string | null = null;

export const setFirebaseSessionUid = (uid: string | null): void => {
  sessionUid = uid;
};

export const getFirebaseSessionUid = (): string | null => sessionUid;

/** Site ScoutsAuto com Firebase ligado — a tropa não mora no navegador. */
export const isWebFirebaseMode = (): boolean =>
  isWebApp() && isFirebaseConfigured();

/** Web + Firebase configurado + sessão autenticada. Electron nunca entra aqui. */
export const isFirestoreBacked = (): boolean =>
  isWebFirebaseMode() && Boolean(sessionUid);
