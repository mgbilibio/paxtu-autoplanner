import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const env = (key: string): string => String(import.meta.env[key] || '').trim();

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const BACKEND_NOT_CONFIGURED_MESSAGE =
  'O backend do ScoutsAuto ainda não está configurado. Peça ao administrador para criar o projeto Firebase scoutsauto (plano Spark) na conta Google dele e definir as variáveis públicas VITE_FIREBASE_* no GitHub Actions (Pages).';

export const NOT_INVITED_MESSAGE =
  'Peça ao administrador do grupo para te cadastrar.';

export const getFirebaseWebConfig = (): FirebaseWebConfig | null => {
  const apiKey = env('VITE_FIREBASE_API_KEY');
  const authDomain = env('VITE_FIREBASE_AUTH_DOMAIN');
  const projectId = env('VITE_FIREBASE_PROJECT_ID');
  const storageBucket = env('VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = env('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = env('VITE_FIREBASE_APP_ID');
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
};

export const isFirebaseConfigured = (): boolean => getFirebaseWebConfig() !== null;

export const isXSignInEnabled = (): boolean => {
  const flag = env('VITE_FIREBASE_AUTH_X').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const requireConfig = (): FirebaseWebConfig => {
  const config = getFirebaseWebConfig();
  if (!config) throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
  return config;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    app = initializeApp(requireConfig());
  }
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
};

export const getFirestoreDb = (): Firestore => {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
};
