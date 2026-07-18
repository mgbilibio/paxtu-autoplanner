import path from 'node:path'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const SAFE_METHODS = new Set(['GET', 'POST'])

export const resolveFolder = (folderPath: unknown): string | null => {
  if (typeof folderPath !== 'string') return null
  const trimmed = folderPath.trim()
  if (!trimmed || trimmed.includes('\0')) return null
  return path.resolve(trimmed)
}

export const resolveDataFile = (
  folderPath: unknown,
  fileName: unknown,
): string | null => {
  const folder = resolveFolder(folderPath)
  if (!folder || typeof fileName !== 'string') return null

  const normalized = path.normalize(fileName.trim())
  const portable = normalized.replace(/\\/g, '/')
  if (!normalized || normalized.includes('\0')) return null
  if (path.isAbsolute(normalized) || portable === '..') return null
  if (portable.startsWith('../') || portable.includes('/../')) return null

  const target = path.resolve(folder, normalized)
  const relative = path.relative(folder, target)
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }
  return target
}

export const isExternalWebUrl = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export const isAllowedOllamaRequest = (
  method: unknown,
  rawUrl: unknown,
): method is string => {
  if (typeof method !== 'string' || typeof rawUrl !== 'string') return false
  if (!SAFE_METHODS.has(method.toUpperCase())) return false
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (!LOOPBACK_HOSTS.has(parsed.hostname)) return false
    return parsed.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

export const clampLimit = (value: unknown, fallback = 20): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(Math.floor(value), 50))
}

export const normalizeSearchQuery = (value: unknown): string => (
  typeof value === 'string' ? value.trim().slice(0, 200) : ''
)
