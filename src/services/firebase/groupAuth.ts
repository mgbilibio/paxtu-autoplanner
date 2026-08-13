import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
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
} from './config';
import { setFirebaseSessionUid } from './session';

export { BACKEND_NOT_CONFIGURED_MESSAGE, isFirebaseConfigured, isXSignInEnabled, NOT_INVITED_MESSAGE };

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
}

const emailKey = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\//g, '_');

const isValidEmail = (raw: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

export const normalizeEmail = (raw: string): string => emailKey(raw);

const requireFirebase = (): void => {
  if (!isFirebaseConfigured()) throw new Error(BACKEND_NOT_CONFIGURED_MESSAGE);
};

const authEmailOf = (user: User): string => {
  const email = (user.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Esta conta não enviou um e-mail. Use Google ou e-mail e senha com o endereço cadastrado pelo administrador.');
  }
  return email;
};

const roleIsAdmin = (role: string): boolean => getRoleLabel(role) === 'ADMINISTRADOR';

const personToProfile = (person: GroupPerson, uid: string): UserProfile => ({
  id: uid,
  name: person.displayName,
  role: getRoleLabel(person.role),
  sectionId: person.isAdmin || roleIsAdmin(person.role)
    ? 'ADMIN_GLOBAL'
    : (person.sectionIds[0] || ''),
  sectionIds: person.sectionIds,
  email: person.email,
  isAdmin: person.isAdmin || roleIsAdmin(person.role),
  active: person.active,
});

export const groupPersonToProfile = (person: GroupPerson): UserProfile =>
  personToProfile(person, person.uid || person.email);

const inviteFromData = (email: string, data: Record<string, unknown>): GroupPerson => {
  const sectionIds = Array.isArray(data.sectionIds)
    ? (data.sectionIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : (typeof data.sectionId === 'string' && data.sectionId ? [data.sectionId] : []);
  const role = typeof data.role === 'string' ? data.role : 'Chefe de Seção';
  const isAdmin = data.isAdmin === true || roleIsAdmin(role);
  return {
    email,
    displayName: typeof data.displayName === 'string' ? data.displayName : email,
    role: getRoleLabel(role),
    sectionIds: isAdmin ? [] : sectionIds,
    isAdmin,
    active: data.active !== false,
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    pending: typeof data.uid !== 'string',
  };
};

const userFromData = (uid: string, data: Record<string, unknown>): GroupPerson => {
  const email = typeof data.email === 'string' ? data.email : '';
  const person = inviteFromData(email, data);
  return { ...person, uid, pending: false };
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
      email,
      at: serverTimestamp(),
    });
    tx.set(userRef, {
      email,
      displayName,
      role: 'ADMINISTRADOR',
      sectionIds: [],
      isAdmin: true,
      active: true,
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
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, payload);
  await updateDoc(inviteRef, { uid: user.uid, displayName }).catch(async () => {
    await setDoc(inviteRef, { ...invite, uid: user.uid, displayName, email }, { merge: true });
  });
  return personToProfile({ ...invite, displayName, uid: user.uid, pending: false }, user.uid);
};

export const resolveMembership = async (user: User): Promise<UserProfile> => {
  requireFirebase();
  const email = authEmailOf(user);
  const db = getFirestoreDb();

  const userSnap = await getDoc(doc(db, 'users', user.uid));
  if (userSnap.exists()) {
    const person = userFromData(user.uid, userSnap.data() as Record<string, unknown>);
    if (!person.active) {
      return failClosed(user, 'Esta conta está desativada. Peça a um administrador.');
    }
    setFirebaseSessionUid(user.uid);
    return personToProfile(person, user.uid);
  }

  const inviteSnap = await getDoc(doc(db, 'invites', email));
  if (inviteSnap.exists()) {
    const invite = inviteFromData(email, inviteSnap.data() as Record<string, unknown>);
    const profile = await claimInvite(user, email, invite);
    setFirebaseSessionUid(user.uid);
    return profile;
  }

  const bootstrapSnap = await getDoc(doc(db, 'meta', 'bootstrap'));
  if (!bootstrapSnap.exists()) {
    const profile = await claimBootstrap(user, email);
    setFirebaseSessionUid(user.uid);
    return profile;
  }

  return failClosed(user, NOT_INVITED_MESSAGE);
};

const translateAuthError = (err: unknown, fallback: string): Error => {
  if (err instanceof Error && (
    err.message === NOT_INVITED_MESSAGE
    || err.message === BACKEND_NOT_CONFIGURED_MESSAGE
    || err.message.startsWith('Esta conta')
    || err.message.startsWith('Peça ao administrador')
    || err.message.startsWith('O backend')
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
  if (code === 'auth/too-many-requests') {
    return new Error('Muitas tentativas. Aguarde um pouco e tente de novo.');
  }
  if (code === 'auth/operation-not-allowed') {
    return new Error('Este provedor de login ainda não foi ligado no Firebase Authentication.');
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
  const auth = getFirebaseAuth();
  try {
    const existing = await signInWithEmailAndPassword(auth, email, password);
    return await afterAuth(existing.user);
  } catch (signInErr) {
    const code = typeof signInErr === 'object' && signInErr && 'code' in signInErr
      ? String((signInErr as { code: string }).code)
      : '';
    const maybeFirstLogin = [
      'auth/user-not-found',
      'auth/invalid-credential',
      'auth/invalid-login-credentials',
    ].includes(code);
    if (!maybeFirstLogin) throw translateAuthError(signInErr, 'Falha no login.');

    try {
      const created = await createUserWithEmailAndPassword(auth, email, password);
      return await afterAuth(created.user);
    } catch (createErr) {
      const createCode = typeof createErr === 'object' && createErr && 'code' in createErr
        ? String((createErr as { code: string }).code)
        : '';
      if (createCode === 'auth/email-already-in-use') {
        throw new Error('E-mail ou senha inválidos.');
      }
      throw translateAuthError(createErr, 'Falha no login.');
    }
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
  return onAuthStateChanged(getFirebaseAuth(), async user => {
    if (!user) {
      setFirebaseSessionUid(null);
      onChange(null);
      return;
    }
    try {
      const profile = await resolveMembership(user);
      onChange(profile);
    } catch {
      setFirebaseSessionUid(null);
      try {
        await signOut(getFirebaseAuth());
      } catch {
        onChange(null);
        return;
      }
      onChange(null);
    }
  });
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
    });
  });
  return [...byEmail.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
};

const createAuthUserViaRest = async (email: string, password: string): Promise<string | undefined> => {
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
  if (message === 'WEAK_PASSWORD : Password should be at least 6 characters') {
    throw new Error('A senha inicial precisa ter pelo menos 6 caracteres (exigência do Firebase).');
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
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
  return person;
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
  await setDoc(doc(db, 'invites', email), { email, active }, { merge: true });
  if (person.uid) {
    await updateDoc(doc(db, 'users', person.uid), { active });
  }
};

export const updatePersonProfile = async (
  emailRaw: string,
  patch: { displayName?: string; role?: string; sectionIds?: string[] },
): Promise<void> => {
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
  const sectionIds = isAdmin ? [] : (patch.sectionIds ?? person.sectionIds);
  const displayName = patch.displayName?.trim() || person.displayName;
  const db = getFirestoreDb();
  const payload = { email, displayName, role: nextRole, sectionIds, isAdmin };
  await setDoc(doc(db, 'invites', email), payload, { merge: true });
  if (person.uid) {
    await updateDoc(doc(db, 'users', person.uid), payload);
  }
};

export const sendPersonPasswordReset = async (emailRaw: string): Promise<void> => {
  requireFirebase();
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) throw new Error('E-mail inválido.');
  await sendPasswordResetEmail(getFirebaseAuth(), email);
};

export const countActiveAdmins = (people: GroupPerson[]): number =>
  people.filter(person => person.isAdmin && person.active).length;
