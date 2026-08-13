import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { UserProfile } from '../../types';
import { getRoleLabel } from '../roleService';
import {
  ACCOUNT_DISABLED_MESSAGE,
  FIREBASE_SETUP_MESSAGE,
  UNKNOWN_EMAIL_MESSAGE,
  getFirebaseAuth,
  isFirebaseConfigured,
  setFirebaseAuthed,
} from './config';
import {
  getInviteByEmail,
  getUserDoc,
  hasAnyAdmin,
  setCachedCloudUser,
  writeBootstrapAdmin,
  writeUserFromInvite,
} from './firestore';
import { CloudUserDoc, cloudUserToProfile } from './types';

let lastAuthError: string | null = null;

export const consumeFirebaseAuthError = (): string | null => {
  const message = lastAuthError;
  lastAuthError = null;
  return message;
};

const setAuthed = (value: boolean): void => {
  setFirebaseAuthed(value);
};

const requireAuth = () => {
  if (!isFirebaseConfigured()) throw new Error(FIREBASE_SETUP_MESSAGE);
  return getFirebaseAuth();
};

const emailOf = (user: User): string =>
  (user.email || '').trim().toLowerCase();

const displayNameOf = (user: User, fallbackEmail: string): string =>
  (user.displayName || '').trim() || fallbackEmail;

export const resolveSignedInUser = async (user: User): Promise<UserProfile> => {
  const email = emailOf(user);
  if (!email) {
    await signOut(requireAuth());
    throw new Error('A conta não informou e-mail. Use Google, X ou e-mail com endereço visível.');
  }

  const existing = await getUserDoc(user.uid);
  if (existing) {
    if (!existing.active) {
      await signOut(requireAuth());
      throw new Error(ACCOUNT_DISABLED_MESSAGE);
    }
    const profile = cloudUserToProfile(user.uid, existing);
    setCachedCloudUser(profile, existing);
    setAuthed(true);
    return profile;
  }

  const invite = await getInviteByEmail(email);
  if (invite) {
    if (!invite.active) {
      await signOut(requireAuth());
      throw new Error(ACCOUNT_DISABLED_MESSAGE);
    }
    const cloud = await writeUserFromInvite(user.uid, invite);
    const profile = cloudUserToProfile(user.uid, cloud);
    setCachedCloudUser(profile, cloud);
    setAuthed(true);
    return profile;
  }

  const adminsExist = await hasAnyAdmin();
  if (!adminsExist) {
    const now = new Date().toISOString();
    const cloud: CloudUserDoc = {
      email,
      displayName: displayNameOf(user, email),
      role: 'ADMINISTRADOR',
      sectionIds: [],
      isAdmin: true,
      active: true,
      createdAt: now,
    };
    await writeBootstrapAdmin(user.uid, cloud);
    const profile = cloudUserToProfile(user.uid, cloud);
    setCachedCloudUser(profile, cloud);
    setAuthed(true);
    return profile;
  }

  await signOut(requireAuth());
  throw new Error(UNKNOWN_EMAIL_MESSAGE);
};

export const subscribeFirebaseAuth = (
  onChange: (profile: UserProfile | null) => void,
): (() => void) => {
  if (!isFirebaseConfigured()) {
    setAuthed(false);
    onChange(null);
    return () => undefined;
  }
  const auth = requireAuth();
  void setPersistence(auth, browserLocalPersistence);
  return onAuthStateChanged(auth, user => {
    if (!user) {
      setAuthed(false);
      setCachedCloudUser(null, null);
      onChange(null);
      return;
    }
    void resolveSignedInUser(user)
      .then(profile => onChange(profile))
      .catch(error => {
        lastAuthError = error instanceof Error ? error.message : UNKNOWN_EMAIL_MESSAGE;
        setAuthed(false);
        setCachedCloudUser(null, null);
        onChange(null);
      });
  });
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  const auth = requireAuth();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return resolveSignedInUser(result.user);
};

export const signInWithX = async (): Promise<UserProfile> => {
  const auth = requireAuth();
  const result = await signInWithPopup(auth, new TwitterAuthProvider());
  return resolveSignedInUser(result.user);
};

export const signInWithEmailPassword = async (email: string, password: string): Promise<UserProfile> => {
  const auth = requireAuth();
  const normalized = email.trim().toLowerCase();
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  try {
    const result = await signInWithEmailAndPassword(auth, normalized, password);
    return resolveSignedInUser(result.user);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/invalid-email') throw new Error('E-mail inválido.');
    if (code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Espere um pouco e tente de novo.');
    if (code === 'auth/wrong-password') throw new Error('E-mail ou senha inválidos.');

    const invite = await getInviteByEmail(normalized);
    const bootstrap = !(await hasAnyAdmin());
    if (!invite && !bootstrap) throw new Error(UNKNOWN_EMAIL_MESSAGE);
    if (invite && !invite.active) throw new Error(ACCOUNT_DISABLED_MESSAGE);

    try {
      const created = await createUserWithEmailAndPassword(auth, normalized, password);
      return resolveSignedInUser(created.user);
    } catch (createErr: unknown) {
      const createCode = (createErr as { code?: string })?.code || '';
      if (createCode === 'auth/email-already-in-use') {
        throw new Error('E-mail ou senha inválidos.');
      }
      throw firebaseAuthError(createErr);
    }
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
};

export const signOutFirebase = async (): Promise<void> => {
  if (!isFirebaseConfigured()) return;
  setAuthed(false);
  setCachedCloudUser(null, null);
  await signOut(getFirebaseAuth());
};

const firebaseAuthError = (error: unknown): Error => {
  const code = (error as { code?: string })?.code || '';
  if (code === 'auth/popup-closed-by-user') return new Error('Login cancelado.');
  if (code === 'auth/popup-blocked') return new Error('O navegador bloqueou a janela de login. Permita pop-ups para este site.');
  if (code === 'auth/operation-not-allowed') return new Error('Este provedor não está ativo no Firebase Console.');
  if (code === 'auth/weak-password') return new Error('A senha precisa ter pelo menos 6 caracteres.');
  if (code === 'auth/invalid-email') return new Error('E-mail inválido.');
  if (code === 'auth/too-many-requests') return new Error('Muitas tentativas. Espere um pouco e tente de novo.');
  if (error instanceof Error && error.message) return error;
  return new Error('Falha no login.');
};

export const mapInviteRole = (label: string): { role: string; isAdmin: boolean } => {
  const normalized = getRoleLabel(label);
  return {
    role: normalized,
    isAdmin: normalized === 'ADMINISTRADOR',
  };
};
