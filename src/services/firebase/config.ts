import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
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

export const PENDING_ACCESS_MESSAGE =
  'Cadastro enviado. Aguarde o administrador liberar seu acesso.';

export const REJECTED_ACCESS_MESSAGE =
  'Cadastro recusado pelo administrador.';

export const REGISTRATION_CLOSED_MESSAGE =
  'Novos cadastros estão fechados. Peça ao administrador para te convidar.';

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

export const getAppCheckSiteKey = (): string => env('VITE_FIREBASE_APPCHECK_SITE_KEY');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let appCheckStarted = false;

const requireConfig = (): FirebaseWebConfig => {
  const config = getFirebaseWebConfig();
  if (!config) throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
  return config;
};

const startAppCheck = (firebaseApp: FirebaseApp): void => {
  if (appCheckStarted || typeof window === 'undefined') return;
  const siteKey = getAppCheckSiteKey();
  if (!siteKey) return;
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckStarted = true;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    app = initializeApp(requireConfig());
    startAppCheck(app);
  }
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    auth.languageCode = 'pt';
  }
  return auth;
};

export const getFirestoreDb = (): Firestore => {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
};
