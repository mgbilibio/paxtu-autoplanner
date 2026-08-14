const HISTORICO_KEYS = new Set(['historico', 'historicoescoteiro', 'registros']);
const HISTORICO_FIELDS = ['dataInicio', 'dataFim', 'atividade', 'local', 'certificado'] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const cellText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const normalizeHeader = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Cabeçalho da tabela Paxtu de vida escoteira ("Data de início", …). */
export const looksLikeHistoricoHeader = (row: unknown): boolean => {
  const cells = Array.isArray(row)
    ? row.map(cellText)
    : isPlainObject(row)
      ? HISTORICO_FIELDS.map(field => cellText(row[field]))
      : [cellText(row)];
  return cells.some(cell => {
    const normalized = normalizeHeader(cell);
    return normalized === 'data de inicio' || normalized.startsWith('data de inicio');
  });
};

const looksLikeTableRow = (value: unknown): value is unknown[] => {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(cell => {
    if (cell == null) return true;
    const type = typeof cell;
    return type === 'string' || type === 'number' || type === 'boolean';
  });
};

const historicoFromRow = (row: unknown[]): Record<string, string> => ({
  dataInicio: cellText(row[0]),
  dataFim: cellText(row[1]),
  atividade: cellText(row[2]),
  local: cellText(row[3]),
  certificado: cellText(row[4]),
});

const columnsFromRow = (row: unknown[]): Record<string, string> => {
  const out: Record<string, string> = {};
  row.forEach((cell, index) => {
    out[`c${index}`] = cellText(cell);
  });
  return out;
};

const flattenInnerArray = (row: unknown[]): Record<string, string> | string => {
  const cells = row.map(cell => {
    if (Array.isArray(cell)) {
      const inner = flattenInnerArray(cell);
      return typeof inner === 'string' ? inner : Object.values(inner).join(' | ');
    }
    return cell;
  });
  if (looksLikeTableRow(cells) || cells.every(cell => cell == null || typeof cell !== 'object')) {
    return columnsFromRow(cells);
  }
  return cells
    .map(cell => {
      if (isPlainObject(cell)) {
        return Object.values(cell).map(cellText).filter(Boolean).join(' ');
      }
      return cellText(cell);
    })
    .filter(Boolean)
    .join(' | ');
};

const flattenNestedArray = (value: unknown[], key?: string): unknown[] => {
  const isHistorico = !!key && HISTORICO_KEYS.has(key.toLowerCase());
  const rows = value.length > 0 && looksLikeHistoricoHeader(value[0]) ? value.slice(1) : value;
  return rows
    .filter(item => !looksLikeHistoricoHeader(item))
    .map(item => {
      if (!Array.isArray(item)) return sanitizeNestedArrays(item);
      if (isHistorico) return historicoFromRow(item);
      return flattenInnerArray(item);
    });
};

/** Converte arrays aninhados (Firestore rejeita) sem achatar arrays de objetos. */
export const sanitizeNestedArrays = (value: unknown, key?: string): unknown => {
  if (Array.isArray(value)) {
    if (value.some(Array.isArray)) return flattenNestedArray(value, key);
    return value.map(item => sanitizeNestedArrays(item));
  }
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [nestedKey, nested] of Object.entries(value)) {
    out[nestedKey] = sanitizeNestedArrays(nested, nestedKey);
  }
  return out;
};

export const sanitizeMemberForFirestore = <T>(member: T): T =>
  sanitizeNestedArrays(member) as T;

const alreadyPortuguese = (message: string): boolean =>
  /[À-ú]|seção|secao|recusad|não conseg|nao conseg|ScoutsAuto/i.test(message);

/** Mensagem de UI se o setDoc ainda falhar (sem PII de jovens). */
export const firestoreWriteError = (error: unknown, context = 'efetivo'): Error => {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (/nested arrays are not supported/i.test(raw)) {
    return new Error(
      `O ScoutsAuto não conseguiu gravar o ${context}: o Firestore não aceita listas dentro de listas. Importe o pacote de novo. Se o erro continuar, avise a chefia.`,
    );
  }
  if (error instanceof Error && alreadyPortuguese(error.message)) return error;
  const detail = raw.trim() ? ` ${raw}` : '';
  return new Error(`O ScoutsAuto não conseguiu gravar o ${context}.${detail}`);
};
