export const GROUP_BACKUP_ENVELOPE_KIND = 'scoutsauto-firestore-backup-encrypted'
export const GROUP_BACKUP_MIN_PASSWORD = 10
const PBKDF2_ITERATIONS = 210_000

export interface EncryptedGroupBackup {
  kind: typeof GROUP_BACKUP_ENVELOPE_KIND
  version: number
  alg: 'AES-GCM'
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string
  iv: string
  ciphertext: string
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const bytesToB64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const b64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const isEncryptedGroupBackup = (value: unknown): value is EncryptedGroupBackup => {
  if (!isPlainObject(value)) return false
  return value.kind === GROUP_BACKUP_ENVELOPE_KIND
    && value.version === 1
    && value.alg === 'AES-GCM'
    && value.kdf === 'PBKDF2-SHA256'
    && typeof value.iter === 'number'
    && typeof value.salt === 'string'
    && typeof value.iv === 'string'
    && typeof value.ciphertext === 'string'
}

const deriveKey = async (password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> => {
  const base = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const encryptJsonWithPassword = async (
  payload: unknown,
  password: string,
): Promise<EncryptedGroupBackup> => {
  const trimmed = password.trim()
  if (trimmed.length < GROUP_BACKUP_MIN_PASSWORD) {
    throw new Error(`A senha do backup precisa ter pelo menos ${GROUP_BACKUP_MIN_PASSWORD} caracteres.`)
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(trimmed, salt, PBKDF2_ITERATIONS)
  const plain = textEncoder.encode(JSON.stringify(payload))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
  return {
    kind: GROUP_BACKUP_ENVELOPE_KIND,
    version: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(cipher)),
  }
}

export const decryptJsonWithPassword = async <T>(
  envelope: EncryptedGroupBackup,
  password: string,
): Promise<T> => {
  const trimmed = password.trim()
  if (!trimmed) throw new Error('Informe a senha do backup.')
  try {
    const salt = b64ToBytes(envelope.salt)
    const iv = b64ToBytes(envelope.iv)
    const key = await deriveKey(trimmed, salt, envelope.iter || PBKDF2_ITERATIONS)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      b64ToBytes(envelope.ciphertext) as BufferSource,
    )
    return JSON.parse(textDecoder.decode(plain)) as T
  } catch {
    throw new Error('Não foi possível abrir o backup. Senha errada ou arquivo adulterado.')
  }
}
