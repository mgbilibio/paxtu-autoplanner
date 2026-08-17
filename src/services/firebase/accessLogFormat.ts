/** Fuso do grupo (Cuiabá/MT). Usado só na exibição. */
export const APP_TIMEZONE = 'America/Cuiaba';

export const ACCESS_LOG_EMPTY_MESSAGE =
  'Ainda não há registros. Eles passam a aparecer a partir deste deploy.';

export const MAX_RECENT_ACCESSES = 8;

export const parseIsoField = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  }
  return undefined;
};

export const parseRecentAccesses = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const iso = typeof item === 'string'
      ? parseIsoField(item)
      : parseIsoField(item && typeof item === 'object' && 'at' in item ? (item as { at: unknown }).at : item);
    if (!iso || seen.has(iso)) continue;
    seen.add(iso);
    result.push(iso);
    if (result.length >= MAX_RECENT_ACCESSES) break;
  }
  return result;
};

export const formatDateTimeCuiaba = (iso?: string | Date | null): string => {
  if (!iso) return '';
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    timeZone: APP_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export const formatDateTimeCuiabaOrDash = (iso?: string | Date | null): string =>
  formatDateTimeCuiaba(iso) || '—';

export const prependAccess = (previous: string[], iso: string): string[] =>
  [iso, ...previous.filter(item => item !== iso)].slice(0, MAX_RECENT_ACCESSES);
