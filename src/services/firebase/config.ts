import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

export const FIREBASE_SETUP_MESSAGE =
  'Este site ainda não tem o Firebase configurado. Peça ao administrador do grupo para definir as variáveis públicas VITE_FIREBASE_* no GitHub Pages (Actions → Variables) e ativar Authentication + Firestore no console Firebase (plano Spark). Sem isso o planejador na web não guarda dados da tropa.';

export const UNKNOWN_EMAIL_MESSAGE =
  'Peça ao administrador do grupo para te cadastrar.';

export const ACCOUNT_DISABLED_MESSAGE =
  'Esta conta está desativada. Peça ao administrador do grupo.';

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const readConfig = (): { cfg: FirebaseWebConfig; missing: string[] } => {
  const cfg: FirebaseWebConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  };
  const missing = (Object.keys(cfg) as Array<keyof FirebaseWebConfig>).filter(key => !cfg[key]);
  return { cfg, missing };
};

export const getFirebasePublicConfig = (): { cfg: FirebaseWebConfig; missing: string[] } => readConfig();

export const isFirebaseConfigured = (): boolean => readConfig().missing.length === 0;

/** Twitter/X no Firebase Console + flag pública. Sem a flag o botão some. */
export const isXLoginEnabled = (): boolean =>
  import.meta.env.VITE_FIREBASE_ENABLE_X === 'true';

export const getFirebaseApp = (): FirebaseApp => {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }
  if (getApps().length > 0) return getApp();
  return initializeApp(readConfig().cfg);
};

export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());

export const getFirebaseDb = (): Firestore => getFirestore(getFirebaseApp());

let firebaseAuthed = false;

export const isFirebaseAuthed = (): boolean => firebaseAuthed;

export const setFirebaseAuthed = (value: boolean): void => {
  firebaseAuthed = value;
};

export const emailDocId = (email: string): string => email.trim().toLowerCase();
