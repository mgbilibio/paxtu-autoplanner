import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { UserProfile } from '../../types';
import { getRoleLabel, USER_ROLES, type UserRole } from '../roleService';
import {
  BACKEND_NOT_CONFIGURED_MESSAGE,
  getFirebaseAuth,
  getFirebaseWebConfig,
  getFirestoreDb,
  isFirebaseConfigured,
  isXSignInEnabled,
  NOT_INVITED_MESSAGE,
  PENDING_ACCESS_MESSAGE,
  REGISTRATION_CLOSED_MESSAGE,
  REJECTED_ACCESS_MESSAGE,
} from './config';
import { readGroupWebSettings } from './groupSettings';
import { setFirebaseSessionUid } from './session';
import { recordDataChange, recordLastAccess } from './accessLog';
import { parseIsoField, parseRecentAccesses } from './accessLogFormat';

export {
  BACKEND_NOT_CONFIGURED_MESSAGE,
  isFirebaseConfigured,
  isXSignInEnabled,
  NOT_INVITED_MESSAGE,
  PENDING_ACCESS_MESSAGE,
  REGISTRATION_CLOSED_MESSAGE,
  REJECTED_ACCESS_MESSAGE,
};

export const MIN_PASSWORD_LENGTH = 10;

export const WEB_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'Chefe de Seção', label: 'Chefe' },
  { value: 'Assistente', label: 'Assistente' },
  { value: 'Diretoria', label: 'Diretoria' },
  { value: 'Leitura/Auditoria', label: 'Leitura' },
  { value: 'ADMINISTRADOR', label: 'ADMINISTRADOR' },
];

export interface GroupPerson {
  email: string;
  displayName: string;
  role: string;
  sectionIds: string[];
  isAdmin: boolean;
  active: boolean;
  uid?: string;
  pending: boolean;
  awaitingApproval: boolean;
  rejected: boolean;
  requestedAt?: Date | null;
  lastAccessAt?: string;
  lastDataChangeAt?: string;
  recentAccesses?: string[];
}

const emailKey = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\//g, '_');

const isValidEmail = (raw: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

export const normalizeEmail = (raw: string): string => emailKey(raw);

const requireFirebase = (): void => {
  if (!isFirebaseConfigured()) throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
};

const requirePasswordStrength = (password: string): void => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
};

const authEmailOf = (user: User): string => {
  const email = (user.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Esta conta não enviou um e-mail. Use Google ou e-mail e senha com o endereço cadastrado pelo administrador.');
  }
  return email;
};

const roleIsAdmin = (role: string): boolean => getRoleLabel(role) === 'ADMINISTRADOR';

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
};

const personToProfile = (person: GroupPerson, uid: string): UserProfile => {
  const awaiting = person.awaitingApproval === true;
  const rejected = person.rejected === true;
  const active = person.active === true && !awaiting && !rejected;
  return {
    id: uid,
    name: person.displayName,
    role: active ? getRoleLabel(person.role) : '',
    sectionId: active && (person.isAdmin || roleIsAdmin(person.role))
      ? 'ADMIN_GLOBAL'
      : (active ? (person.sectionIds[0] || '') : ''),
    sectionIds: active ? person.sectionIds : [],
    email: person.email,
    isAdmin: active && (person.isAdmin || roleIsAdmin(person.role)),
    active,
    pendingApproval: awaiting,
    rejected,
    lastAccessAt: person.lastAccessAt,
    lastDataChangeAt: person.lastDataChangeAt,
    recentAccesses: person.recentAccesses,
  };
};

export const groupPersonToProfile = (person: GroupPerson): UserProfile =>
  personToProfile(person, person.uid || person.email);

export const isAwaitingAccess = (profile: UserProfile | null | undefined): boolean =>
  !!profile && (profile.pendingApproval === true || profile.rejected === true);

const inviteFromData = (email: string, data: Record<string, unknown>): GroupPerson => {
  const sectionIds = Array.isArray(data.sectionIds)
    ? (data.sectionIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : (typeof data.sectionId === 'string' && data.sectionId ? [data.sectionId] : []);
  const role = typeof data.role === 'string' ? data.role : 'Chefe de Seção';
  const awaitingApproval = data.pendingApproval === true;
  const rejected = data.rejected === true;
  const isAdmin = !awaitingApproval && !rejected && (data.isAdmin === true || roleIsAdmin(role));
  return {
    email,
    displayName: typeof data.displayName === 'string' ? data.displayName : email,
    role: awaitingApproval ? '' : getRoleLabel(role),
    sectionIds: isAdmin ? [] : sectionIds,
    isAdmin,
    active: !awaitingApproval && !rejected && data.active !== false,
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    pending: typeof data.uid !== 'string',
    awaitingApproval,
    rejected,
    requestedAt: timestampToDate(data.requestedAt),
    lastAccessAt: parseIsoField(data.lastAccessAt),
    lastDataChangeAt: parseIsoField(data.lastDataChangeAt),
    recentAccesses: parseRecentAccesses(data.recentAccesses),
  };
};

const userFromData = (uid: string, data: Record<string, unknown>): GroupPerson => {
  const email = typeof data.email === 'string' ? data.email : '';
  const person = inviteFromData(email, data);
  return { ...person, uid, pending: false };
};

const applySession = (profile: UserProfile, uid: string): UserProfile => {
  if (profile.active && !profile.pendingApproval && !profile.rejected) {
    setFirebaseSessionUid(uid);
  } else {
    setFirebaseSessionUid(null);
  }
  return profile;
};

const failClosed = async (authUser: User, message: string): Promise<never> => {
  setFirebaseSessionUid(null);
  const created = Date.parse(authUser.metadata.creationTime || '');
  const signed = Date.parse(authUser.metadata.lastSignInTime || '');
  const justCreated = Number.isFinite(created) && Number.isFinite(signed) && Math.abs(signed - created) < 15_000;
  if (justCreated) {
    try {
      await authUser.delete();
    } catch {
      // a regra de app já recusou o acesso
    }
  }
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // já está fora
  }
  throw new Error(message);
};

const claimBootstrap = async (user: User, email: string): Promise<UserProfile> => {
  const db = getFirestoreDb();
  const bootstrapRef = doc(db, 'meta', 'bootstrap');
  const userRef = doc(db, 'users', user.uid);
  const displayName = (user.displayName || email.split('@')[0] || 'Administrador').trim();

  await runTransaction(db, async tx => {
    const existing = await tx.get(bootstrapRef);
    if (existing.exists()) {
      throw new Error(NOT_INVITED_MESSAGE);
    }
    tx.set(bootstrapRef, {
      uid: user.uid,
      at: serverTimestamp(),
    });
    tx.set(userRef, {
      email,
      displayName,
      role: 'ADMINISTRADOR',
      sectionIds: [],
      isAdmin: true,
      active: true,
      pendingApproval: false,
      createdAt: serverTimestamp(),
    });
  });

  return personToProfile({
    email,
    displayName,
    role: 'ADMINISTRADOR',
    sectionIds: [],
    isAdmin: true,
    active: true,
    uid: user.uid,
    pending: false,
    awaitingApproval: false,
    rejected: false,
  }, user.uid);
};

const claimInvite = async (user: User, email: string, invite: GroupPerson): Promise<UserProfile> => {
  if (!invite.active) {
    throw new Error('Esta conta está desativada. Peça a um administrador.');
  }
  const db = getFirestoreDb();
  const userRef = doc(db, 'users', user.uid);
  const inviteRef = doc(db, 'invites', email);
  const displayName = (user.displayName || invite.displayName || email.split('@')[0]).trim();
  const payload = {
    email,
    displayName,
    role: invite.role,
    sectionIds: invite.isAdmin ? [] : invite.sectionIds,
    isAdmin: invite.isAdmin,
    active: true,
    pendingApproval: false,
    rejected: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, payload);
  await updateDoc(inviteRef, { uid: user.uid, displayName }).catch(async () => {
    await setDoc(inviteRef, { ...invite, uid: user.uid, displayName, email }, { merge: true });
  });
  return personToProfile({ ...invite, displayName, uid: user.uid, pending: false, awaitingApproval: false, rejected: false }, user.uid);
};

const createPendingMembership = async (user: User, email: string): Promise<UserProfile> => {
  const settings = await readGroupWebSettings();
  if (!settings.openRegistration) {
    throw new Error(REGISTRATION_CLOSED_MESSAGE);
  }
  const db = getFirestoreDb();
  const userRef = doc(db, 'users', user.uid);
  const displayName = (user.displayName || email.split('@')[0]).trim();
  await runTransaction(db, async tx => {
    const existing = await tx.get(userRef);
    if (existing.exists()) return;
    tx.set(userRef, {
      email,
      displayName,
      role: '',
      sectionIds: [],
      isAdmin: false,
      active: false,
      pendingApproval: true,
      rejected: false,
      requestedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return personToProfile(userFromData(user.uid, snap.data() as Record<string, unknown>), user.uid);
  }
  return personToProfile({
    email,
    displayName,
    role: '',
    sectionIds: [],
    isAdmin: false,
    active: false,
    uid: user.uid,
    pending: false,
    awaitingApproval: true,
    rejected: false,
    requestedAt: new Date(),
  }, user.uid);
};

export const resolveMembership = async (user: User): Promise<UserProfile> => {
  requireFirebase();
  const email = authEmailOf(user);
  const db = getFirestoreDb();

  const userSnap = await getDoc(doc(db, 'users', user.uid));
  if (userSnap.exists()) {
    const person = userFromData(user.uid, userSnap.data() as Record<string, unknown>);
    if (person.active) {
      return applySession(personToProfile(person, user.uid), user.uid);
    }
    if (person.awaitingApproval || person.rejected) {
      return applySession(personToProfile(person, user.uid), user.uid);
    }
    return failClosed(user, 'Esta conta está desativada. Peça a um administrador.');
  }

  const inviteSnap = await getDoc(doc(db, 'invites', email));
  if (inviteSnap.exists()) {
    const invite = inviteFromData(email, inviteSnap.data() as Record<string, unknown>);
    const profile = await claimInvite(user, email, invite);
    return applySession(profile, user.uid);
  }

  const bootstrapSnap = await getDoc(doc(db, 'meta', 'bootstrap'));
  if (!bootstrapSnap.exists()) {
    try {
      const profile = await claimBootstrap(user, email);
      return applySession(profile, user.uid);
    } catch (err) {
      if (!(err instanceof Error && err.message === NOT_INVITED_MESSAGE)) {
        throw err;
      }
    }
  }

  const profile = await createPendingMembership(user, email);
  return applySession(profile, user.uid);
};

const translateAuthError = (err: unknown, fallback: string): Error => {
  if (err instanceof Error && (
    err.message === NOT_INVITED_MESSAGE
    || err.message === BACKEND_NOT_CONFIGURED_MESSAGE
    || err.message === PENDING_ACCESS_MESSAGE
    || err.message === REJECTED_ACCESS_MESSAGE
    || err.message === REGISTRATION_CLOSED_MESSAGE
    || err.message.startsWith('Esta conta')
    || err.message.startsWith('Peça ao administrador')
    || err.message.startsWith('O backend')
    || err.message.startsWith('Informe')
    || err.message.startsWith('A senha')
    || err.message.startsWith('Novos cadastros')
    || err.message.startsWith('Este e-mail já tem conta')
  )) {
    return err;
  }
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new Error('Login cancelado.');
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return new Error('Este e-mail já entra por outro provedor. Use a mesma forma de acesso cadastrada.');
  }
  if (code === 'auth/user-disabled') {
    return new Error('Esta conta está desativada. Peça a um administrador.');
  }
  if (
    code === 'auth/invalid-credential'
    || code === 'auth/wrong-password'
    || code === 'auth/user-not-found'
    || code === 'auth/invalid-email'
    || code === 'auth/invalid-login-credentials'
  ) {
    return new Error('E-mail ou senha inválidos.');
  }
  if (code === 'auth/email-already-in-use') {
    return new Error('Este e-mail já tem conta. Entre com a senha.');
  }
  if (code === 'auth/weak-password') {
    return new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (code === 'auth/too-many-requests') {
    return new Error('Muitas tentativas. Aguarde um pouco e tente de novo.');
  }
  if (code === 'auth/operation-not-allowed') {
    return new Error('Este provedor de login ainda não está ligado no Firebase Authentication.');
  }
  if (err instanceof Error && err.message) return err;
  return new Error(fallback);
};

const afterAuth = async (user: User): Promise<UserProfile> => {
  try {
    return await resolveMembership(user);
  } catch (err) {
    throw translateAuthError(err, NOT_INVITED_MESSAGE);
  }
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  requireFirebase();
  try {
    const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    return await afterAuth(result.user);
  } catch (err) {
    throw translateAuthError(err, 'Falha no login Google.');
  }
};

export const signInWithX = async (): Promise<UserProfile> => {
  requireFirebase();
  if (!isXSignInEnabled()) {
    throw new Error('Login com X não está habilitado neste site.');
  }
  try {
    const result = await signInWithPopup(getFirebaseAuth(), new TwitterAuthProvider());
    return await afterAuth(result.user);
  } catch (err) {
    throw translateAuthError(err, 'Falha no login com X.');
  }
};

export const signInWithEmailPassword = async (emailRaw: string, password: string): Promise<UserProfile> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) throw new Error('Informe um e-mail válido.');
  if (!password) throw new Error('Informe a senha.');
  try {
    const existing = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return await afterAuth(existing.user);
  } catch (err) {
    throw translateAuthError(err, 'Falha no login.');
  }
};

export const registerWithEmailPassword = async (
  emailRaw: string,
  password: string,
  displayNameRaw: string,
): Promise<UserProfile> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  const displayName = displayNameRaw.trim();
  if (!displayName) throw new Error('Informe o nome de exibição.');
  if (!isValidEmail(email)) throw new Error('Informe um e-mail válido.');
  if (!password) throw new Error('Informe a senha.');
  requirePasswordStrength(password);
  try {
    const created = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    try {
      await updateProfile(created.user, { displayName });
      await created.user.reload();
    } catch {
      // o documento do grupo ainda recebe o nome no primeiro write
    }
    return await afterAuth(created.user);
  } catch (err) {
    throw translateAuthError(err, 'Falha no cadastro.');
  }
};

export const signOutGroup = async (): Promise<void> => {
  setFirebaseSessionUid(null);
  if (!isFirebaseConfigured()) return;
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // sessão local já limpa
  }
};

export const subscribeGroupAuth = (onChange: (profile: UserProfile | null) => void): (() => void) => {
  if (!isFirebaseConfigured()) {
    onChange(null);
    return () => undefined;
  }
  let cancelled = false;
  let unsubDoc: (() => void) | null = null;
  const unsubAuth = onAuthStateChanged(getFirebaseAuth(), async user => {
    unsubDoc?.();
    unsubDoc = null;
    if (!user) {
      setFirebaseSessionUid(null);
      if (!cancelled) onChange(null);
      return;
    }
    try {
      const profile = await resolveMembership(user);
      if (cancelled) return;
      onChange(profile);
      if (profile.active && !profile.pendingApproval && !profile.rejected) {
        void recordLastAccess(user.uid);
      }
      unsubDoc = onSnapshot(doc(getFirestoreDb(), 'users', user.uid), snap => {
        if (cancelled) return;
        if (!snap.exists()) return;
        const person = userFromData(user.uid, snap.data() as Record<string, unknown>);
        if (!person.active && !person.awaitingApproval && !person.rejected) {
          setFirebaseSessionUid(null);
          void signOut(getFirebaseAuth());
          onChange(null);
          return;
        }
        onChange(applySession(personToProfile(person, user.uid), user.uid));
      });
    } catch {
      setFirebaseSessionUid(null);
      try {
        await signOut(getFirebaseAuth());
      } catch {
        if (!cancelled) onChange(null);
        return;
      }
      if (!cancelled) onChange(null);
    }
  });
  return () => {
    cancelled = true;
    unsubDoc?.();
    unsubAuth();
  };
};

export const listGroupPeople = async (): Promise<GroupPerson[]> => {
  requireFirebase();
  const db = getFirestoreDb();
  const [usersSnap, invitesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'invites')),
  ]);
  const byEmail = new Map<string, GroupPerson>();
  invitesSnap.forEach(item => {
    const data = item.data() as Record<string, unknown>;
    const email = typeof data.email === 'string' ? normalizeEmail(data.email) : item.id;
    byEmail.set(email, inviteFromData(email, data));
  });
  usersSnap.forEach(item => {
    const person = userFromData(item.id, item.data() as Record<string, unknown>);
    const key = person.email || item.id;
    const prev = byEmail.get(key);
    byEmail.set(key, {
      ...prev,
      ...person,
      pending: false,
      uid: item.id,
      awaitingApproval: person.awaitingApproval,
      rejected: person.rejected,
      requestedAt: person.requestedAt ?? prev?.requestedAt,
      lastAccessAt: person.lastAccessAt ?? prev?.lastAccessAt,
      lastDataChangeAt: person.lastDataChangeAt ?? prev?.lastDataChangeAt,
      recentAccesses: person.recentAccesses?.length ? person.recentAccesses : prev?.recentAccesses,
    });
  });
  return [...byEmail.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
};

const createAuthUserViaRest = async (email: string, password: string): Promise<string | undefined> => {
  requirePasswordStrength(password);
  const config = getFirebaseWebConfig();
  if (!config) throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const payload = await response.json() as { localId?: string; error?: { message?: string } };
  if (payload.localId) return payload.localId;
  const message = payload.error?.message || '';
  if (message === 'EMAIL_EXISTS') return undefined;
  if (message.startsWith('WEAK_PASSWORD')) {
    throw new Error(`A senha inicial precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  throw new Error('Não foi possível criar o acesso por e-mail e senha.');
};

export interface InvitePersonInput {
  email: string;
  displayName: string;
  role: string;
  sectionIds: string[];
  password?: string;
}

export const inviteGroupPerson = async (input: InvitePersonInput): Promise<GroupPerson> => {
  requireFirebase();
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error('Informe o e-mail pessoal da pessoa (qualquer domínio).');
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Informe o nome de exibição.');
  if (!(USER_ROLES as readonly string[]).includes(input.role)) {
    throw new Error('Papel inválido.');
  }
  const isAdmin = roleIsAdmin(input.role);
  const sectionIds = isAdmin ? [] : input.sectionIds.filter(Boolean);
  if (!isAdmin && sectionIds.length === 0) {
    throw new Error('Escolha a seção (tropa, alcateia etc.).');
  }

  let uid: string | undefined;
  const password = input.password?.trim();
  if (password) {
    uid = await createAuthUserViaRest(email, password);
  }

  const db = getFirestoreDb();
  const person: GroupPerson = {
    email,
    displayName,
    role: input.role,
    sectionIds,
    isAdmin,
    active: true,
    uid,
    pending: !uid,
    awaitingApproval: false,
    rejected: false,
  };
  await setDoc(doc(db, 'invites', email), {
    email,
    displayName,
    role: input.role,
    sectionIds,
    isAdmin,
    active: true,
    uid: uid || null,
    createdAt: serverTimestamp(),
    createdBy: getFirebaseAuth().currentUser?.uid || null,
  });
  if (uid) {
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName,
      role: input.role,
      sectionIds,
      isAdmin,
      active: true,
      pendingApproval: false,
      rejected: false,
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
  void recordDataChange();
  return person;
};

const requireRoleAndSection = (role: string, sectionIdsInput: string[]): { isAdmin: boolean; sectionIds: string[] } => {
  if (!(USER_ROLES as readonly string[]).includes(role)) {
    throw new Error('Papel inválido.');
  }
  const isAdmin = roleIsAdmin(role);
  const sectionIds = isAdmin ? [] : sectionIdsInput.filter(Boolean);
  if (!isAdmin && sectionIds.length === 0) {
    throw new Error('Escolha a seção (tropa, alcateia etc.).');
  }
  return { isAdmin, sectionIds };
};

export const approvePendingPerson = async (
  uid: string,
  input: { role: string; sectionIds: string[] },
): Promise<void> => {
  requireFirebase();
  if (!uid) throw new Error('Pedido sem identificação.');
  const { isAdmin, sectionIds } = requireRoleAndSection(input.role, input.sectionIds);
  const db = getFirestoreDb();
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Pedido não encontrado.');
  await updateDoc(userRef, {
    role: input.role,
    sectionIds,
    isAdmin,
    active: true,
    pendingApproval: false,
    rejected: false,
    approvedAt: serverTimestamp(),
    approvedBy: getFirebaseAuth().currentUser?.uid || null,
  });
  void recordDataChange();
};

export const rejectPendingPerson = async (uid: string): Promise<void> => {
  requireFirebase();
  if (!uid) throw new Error('Pedido sem identificação.');
  const db = getFirestoreDb();
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Pedido não encontrado.');
  await updateDoc(userRef, {
    active: false,
    isAdmin: false,
    sectionIds: [],
    pendingApproval: false,
    rejected: true,
    rejectedAt: serverTimestamp(),
    rejectedBy: getFirebaseAuth().currentUser?.uid || null,
  });
  void recordDataChange();
};

export const setPersonActive = async (emailRaw: string, active: boolean): Promise<void> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  const db = getFirestoreDb();
  const people = await listGroupPeople();
  const person = people.find(item => item.email === email);
  if (!person) throw new Error('Pessoa não encontrada.');
  if (!active && person.isAdmin) {
    const admins = people.filter(item => item.isAdmin && item.active);
    if (admins.length <= 1) throw new Error('Não é possível desativar o último administrador.');
  }
  const currentUid = getFirebaseAuth().currentUser?.uid;
  if (!active && person.uid && currentUid && person.uid === currentUid) {
    throw new Error('Não dá para desativar o próprio acesso de administrador.');
  }
  await setDoc(doc(db, 'invites', email), { email, active }, { merge: true });
  if (person.uid) {
    await updateDoc(doc(db, 'users', person.uid), { active });
  }
  void recordDataChange();
};

export type PersonProfilePatch = {
  displayName?: string;
  email?: string;
  role?: string;
  sectionIds?: string[];
};

export type PersonProfileUpdateResult = {
  emailChanged: boolean;
  authEmailUnchanged: boolean;
};

export const updatePersonProfile = async (
  emailRaw: string,
  patch: PersonProfilePatch,
): Promise<PersonProfileUpdateResult> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  const people = await listGroupPeople();
  const person = people.find(item => item.email === email);
  if (!person) throw new Error('Pessoa não encontrada.');
  const nextRole = patch.role ?? person.role;
  if (!(USER_ROLES as readonly string[]).includes(nextRole)) throw new Error('Papel inválido.');
  const isAdmin = roleIsAdmin(nextRole);
  if (person.isAdmin && !isAdmin) {
    const admins = people.filter(item => item.isAdmin && item.active);
    if (admins.length <= 1) throw new Error('Não é possível rebaixar o último administrador.');
  }
  const currentUid = getFirebaseAuth().currentUser?.uid;
  if (person.isAdmin && !isAdmin && person.uid && currentUid && person.uid === currentUid) {
    throw new Error('Não dá para rebaixar o próprio acesso de administrador.');
  }
  const sectionIds = isAdmin ? [] : (patch.sectionIds ?? person.sectionIds);
  const displayName = patch.displayName?.trim() || person.displayName;

  let nextEmail = email;
  if (patch.email !== undefined) {
    nextEmail = normalizeEmail(patch.email);
    if (!isValidEmail(nextEmail)) throw new Error('Informe um e-mail válido.');
    if (nextEmail !== email) {
      const taken = people.some(item => item.email === nextEmail);
      if (taken) throw new Error('Este e-mail já pertence a outra pessoa.');
    }
  }

  const db = getFirestoreDb();
  const payload = { email: nextEmail, displayName, role: nextRole, sectionIds, isAdmin };
  const emailChanged = nextEmail !== email;

  if (emailChanged) {
    const oldRef = doc(db, 'invites', email);
    const newRef = doc(db, 'invites', nextEmail);
    await runTransaction(db, async tx => {
      const oldSnap = await tx.get(oldRef);
      const newSnap = await tx.get(newRef);
      if (newSnap.exists()) throw new Error('Este e-mail já pertence a outra pessoa.');
      const previous = oldSnap.exists() ? oldSnap.data() : {};
      tx.set(newRef, { ...previous, ...payload });
      if (oldSnap.exists()) tx.delete(oldRef);
    });
  } else {
    await setDoc(doc(db, 'invites', email), payload, { merge: true });
  }

  if (person.uid) {
    await updateDoc(doc(db, 'users', person.uid), payload);
  }

  void recordDataChange();
  return { emailChanged, authEmailUnchanged: emailChanged && !!person.uid };
};

export const deletePersonAccess = async (emailRaw: string): Promise<void> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  const currentUid = getFirebaseAuth().currentUser?.uid;
  const currentEmail = normalizeEmail(getFirebaseAuth().currentUser?.email || '');
  const people = await listGroupPeople();
  const person = people.find(item => item.email === email);
  if (!person) throw new Error('Pessoa não encontrada.');
  const isSelf = (!!currentUid && person.uid === currentUid) || (!!currentEmail && person.email === currentEmail);
  if (isSelf) {
    throw new Error('Não dá para excluir o próprio acesso.');
  }
  if (person.isAdmin && person.active) {
    const admins = people.filter(item => item.isAdmin && item.active);
    if (admins.length <= 1) throw new Error('Não é possível excluir o último administrador.');
  }
  const db = getFirestoreDb();
  const inviteRef = doc(db, 'invites', email);
  const inviteSnap = await getDoc(inviteRef);
  if (inviteSnap.exists()) {
    await deleteDoc(inviteRef);
  }
  if (person.uid) {
    await deleteDoc(doc(db, 'users', person.uid));
  }
  void recordDataChange();
};

export const sendPersonPasswordReset = async (emailRaw: string): Promise<void> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) throw new Error('E-mail inválido.');
  const auth = getFirebaseAuth();
  auth.languageCode = 'pt';
  try {
    await sendPasswordResetEmail(auth, email, {
      url: 'https://mgbilibio.github.io/paxtu-autoplanner/',
      handleCodeInApp: false,
    });
  } catch (err) {
    throw translateAuthError(err, 'Não foi possível enviar a redefinição.');
  }
};

export const countActiveAdmins = (people: GroupPerson[]): number =>
  people.filter(person => person.isAdmin && person.active).length;
