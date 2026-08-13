import { UserProfile } from '../types';
import { USER_ROLES, UserRole } from './roleService';

export const WEB_ACCOUNTS_KEY = 'PAXTU_WEB_ACCOUNTS';
export const WEB_SESSION_KEY = 'PAXTU_WEB_SESSION';

const KDF_NAME = 'PBKDF2' as const;
const HASH_BITS = 256;
const SALT_BYTES = 16;
const DEFAULT_ITERATIONS = 100_000;
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export interface WebAccount {
  id: string;
  username: string;
  displayName: string;
  role: string;
  sectionId: string;
  disabled: boolean;
  passwordSalt: string;
  passwordHash: string;
  kdf: typeof KDF_NAME;
  iterations: number;
  createdAt: string;
  authProvider?: 'password' | 'google';
  email?: string;
  googleSub?: string;
}

export interface WebAccountsExport {
  version: 1;
  kind: 'paxtu-web-accounts';
  exportedAt: string;
  accounts: WebAccount[];
}

export interface WebSession {
  accountId: string;
  loggedInAt: string;
}

const bytesToB64 = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
};

const b64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

const derivePasswordHash = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    HASH_BITS,
  );
  return new Uint8Array(bits);
};

export const normalizeUsername = (raw: string): string =>
  raw.trim().toLowerCase();

export const validateUsername = (raw: string): string | null => {
  const username = normalizeUsername(raw);
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
};

export const hashNewPassword = async (password: string): Promise<{ salt: string; hash: string; iterations: number }> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(password, salt, DEFAULT_ITERATIONS);
  return {
    salt: bytesToB64(salt),
    hash: bytesToB64(hash),
    iterations: DEFAULT_ITERATIONS,
  };
};

export const verifyPassword = async (account: WebAccount, password: string): Promise<boolean> => {
  try {
    const salt = b64ToBytes(account.passwordSalt);
    const expected = b64ToBytes(account.passwordHash);
    const actual = await derivePasswordHash(password, salt, account.iterations || DEFAULT_ITERATIONS);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

const newId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

const isWebAccount = (value: unknown): value is WebAccount => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.password === 'string' && item.password.length > 0) return false;
  const base =
    typeof item.id === 'string'
    && typeof item.username === 'string'
    && typeof item.displayName === 'string'
    && typeof item.role === 'string'
    && typeof item.sectionId === 'string'
    && typeof item.disabled === 'boolean'
    && typeof item.createdAt === 'string';
  if (!base) return false;
  if (item.authProvider === 'google') {
    return typeof item.email === 'string' && typeof item.googleSub === 'string';
  }
  return (
    typeof item.passwordSalt === 'string'
    && typeof item.passwordHash === 'string'
    && item.kdf === KDF_NAME
    && typeof item.iterations === 'number'
  );
};

export const listWebAccounts = (): WebAccount[] => {
  const raw = localStorage.getItem(WEB_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWebAccount);
  } catch {
    return [];
  }
};

const persistAccounts = (accounts: WebAccount[]): void => {
  localStorage.setItem(WEB_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const hasWebAccounts = (): boolean => listWebAccounts().length > 0;

export const findWebAccountByUsername = (username: string): WebAccount | undefined => {
  const normalized = normalizeUsername(username);
  return listWebAccounts().find(account => account.username === normalized);
};

export const findWebAccountById = (id: string): WebAccount | undefined =>
  listWebAccounts().find(account => account.id === id);

export const countAdmins = (accounts = listWebAccounts()): number =>
  accounts.filter(account => account.role === 'ADMINISTRADOR' && !account.disabled).length;

export interface CreateWebAccountInput {
  username: string;
  password: string;
  displayName: string;
  role?: string;
  sectionId?: string;
}

export const createWebAccount = async (input: CreateWebAccountInput): Promise<WebAccount> => {
  const usernameError = validateUsername(input.username);
  if (usernameError) throw new Error(usernameError);
  const passwordError = validatePassword(input.password);
  if (passwordError) throw new Error(passwordError);
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Informe o nome de exibição.');

  const username = normalizeUsername(input.username);
  const current = listWebAccounts();
  if (current.some(account => account.username === username)) {
    throw new Error('Este nome de usuário já existe.');
  }

  const isFirst = current.length === 0;
  const role = isFirst ? 'ADMINISTRADOR' : (input.role || 'Chefe de Seção');
  if (!isFirst && !(USER_ROLES as readonly string[]).includes(role)) {
    throw new Error('Papel inválido.');
  }

  const hashed = await hashNewPassword(input.password);
  const account: WebAccount = {
    id: newId(),
    username,
    displayName,
    role,
    sectionId: input.sectionId || (role === 'ADMINISTRADOR' ? 'ADMIN_GLOBAL' : ''),
    disabled: false,
    passwordSalt: hashed.salt,
    passwordHash: hashed.hash,
    kdf: KDF_NAME,
    iterations: hashed.iterations,
    createdAt: new Date().toISOString(),
  };
  persistAccounts([...current, account]);
  return account;
};

export const setWebAccountDisabled = (id: string, disabled: boolean): WebAccount => {
  const current = listWebAccounts();
  const index = current.findIndex(account => account.id === id);
  if (index < 0) throw new Error('Conta não encontrada.');
  const account = current[index];
  if (disabled && account.role === 'ADMINISTRADOR' && countAdmins(current) <= 1) {
    throw new Error('Não é possível desativar o último administrador.');
  }
  const updated = { ...account, disabled };
  current[index] = updated;
  persistAccounts(current);
  return updated;
};

export const resetWebAccountPassword = async (id: string, newPassword: string): Promise<void> => {
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);
  const current = listWebAccounts();
  const index = current.findIndex(account => account.id === id);
  if (index < 0) throw new Error('Conta não encontrada.');
  const hashed = await hashNewPassword(newPassword);
  current[index] = {
    ...current[index],
    passwordSalt: hashed.salt,
    passwordHash: hashed.hash,
    iterations: hashed.iterations,
  };
  persistAccounts(current);
};

export const updateWebAccountProfile = (
  id: string,
  patch: Partial<Pick<WebAccount, 'displayName' | 'role' | 'sectionId'>>,
): WebAccount => {
  const current = listWebAccounts();
  const index = current.findIndex(account => account.id === id);
  if (index < 0) throw new Error('Conta não encontrada.');
  const account = current[index];
  const nextRole = patch.role ?? account.role;
  if (account.role === 'ADMINISTRADOR' && nextRole !== 'ADMINISTRADOR' && countAdmins(current) <= 1) {
    throw new Error('Não é possível rebaixar o último administrador.');
  }
  const updated: WebAccount = {
    ...account,
    displayName: patch.displayName?.trim() || account.displayName,
    role: nextRole,
    sectionId: patch.sectionId ?? account.sectionId,
  };
  current[index] = updated;
  persistAccounts(current);
  return updated;
};

export const loginWebAccount = async (username: string, password: string): Promise<WebAccount> => {
  const account = findWebAccountByUsername(username);
  if (account?.authProvider === 'google' && !account.passwordHash) {
    throw new Error('Esta conta entra com o Google. Use “Entrar com Google”.');
  }
  const ok = account ? await verifyPassword(account, password) : false;
  if (!account || !ok) {
    throw new Error('Usuário ou senha inválidos.');
  }
  if (account.disabled) {
    throw new Error('Esta conta está desativada. Peça a um administrador.');
  }
  writeWebSession({ accountId: account.id, loggedInAt: new Date().toISOString() });
  return account;
};

export const loginWithGoogleIdentity = async (identity: {
  sub: string;
  email: string;
  name: string;
}): Promise<WebAccount> => {
  const email = identity.email.trim().toLowerCase();
  const current = listWebAccounts();
  let account = current.find(item => item.googleSub === identity.sub || item.email === email);
  if (!account) {
    const isFirst = current.length === 0;
    account = {
      id: identity.sub,
      username: email,
      displayName: identity.name.trim() || email,
      role: isFirst ? 'ADMINISTRADOR' : 'Chefe de Seção',
      sectionId: isFirst ? 'ADMIN_GLOBAL' : '',
      disabled: false,
      passwordSalt: '',
      passwordHash: '',
      kdf: KDF_NAME,
      iterations: 0,
      createdAt: new Date().toISOString(),
      authProvider: 'google',
      email,
      googleSub: identity.sub,
    };
    persistAccounts([...current, account]);
  } else if (account.disabled) {
    throw new Error('Esta conta está desativada. Peça a um administrador.');
  } else if (!account.googleSub) {
    account = { ...account, authProvider: account.authProvider || 'google', email, googleSub: identity.sub };
    persistAccounts(current.map(item => (item.id === account!.id ? account! : item)));
  }
  writeWebSession({ accountId: account.id, loggedInAt: new Date().toISOString() });
  return account;
};

export const writeWebSession = (session: WebSession): void => {
  sessionStorage.setItem(WEB_SESSION_KEY, JSON.stringify(session));
};

export const readWebSession = (): WebSession | null => {
  const raw = sessionStorage.getItem(WEB_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WebSession;
    if (!parsed?.accountId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearWebSession = (): void => {
  sessionStorage.removeItem(WEB_SESSION_KEY);
};

export const restoreWebSessionAccount = (): WebAccount | null => {
  const session = readWebSession();
  if (!session) return null;
  const account = findWebAccountById(session.accountId);
  if (!account || account.disabled) {
    clearWebSession();
    return null;
  }
  return account;
};

export const webAccountToProfile = (account: WebAccount): UserProfile => ({
  id: account.id,
  name: account.displayName,
  role: account.role,
  sectionId: account.sectionId || 'ADMIN_GLOBAL',
});

export const exportWebAccounts = (): WebAccountsExport => ({
  version: 1,
  kind: 'paxtu-web-accounts',
  exportedAt: new Date().toISOString(),
  accounts: listWebAccounts(),
});

export const parseWebAccountsImport = (raw: unknown): WebAccount[] => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Arquivo inválido.');
  }
  const payload = raw as Record<string, unknown>;
  if (payload.kind !== 'paxtu-web-accounts') {
    throw new Error('Este JSON não é uma lista de contas Paxtu.');
  }
  if (!Array.isArray(payload.accounts)) {
    throw new Error('Lista de contas ausente.');
  }
  const accounts = payload.accounts.filter(isWebAccount);
  if (accounts.length === 0) {
    throw new Error('Nenhuma conta válida no arquivo (hashes apenas; senhas em texto são recusadas).');
  }
  return accounts;
};

export const importWebAccounts = (raw: unknown, mode: 'replace' | 'merge' = 'replace'): number => {
  const incoming = parseWebAccountsImport(raw);
  if (mode === 'replace') {
    persistAccounts(incoming);
    return incoming.length;
  }
  const current = listWebAccounts();
  const byUsername = new Map(current.map(account => [account.username, account]));
  let added = 0;
  for (const account of incoming) {
    if (byUsername.has(account.username)) continue;
    byUsername.set(account.username, account);
    added++;
  }
  persistAccounts([...byUsername.values()]);
  return added;
};

export const assignableWebRoles = (): UserRole[] => [...USER_ROLES];
