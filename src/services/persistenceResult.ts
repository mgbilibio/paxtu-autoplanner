export type PersistenceKind = 'network' | 'permission' | 'conflict' | 'missing' | 'validation' | 'unknown';

export class PersistenceError extends Error {
  readonly kind: PersistenceKind;
  constructor(message: string, kind: PersistenceKind = 'unknown') {
    super(message);
    this.name = 'PersistenceError';
    this.kind = kind;
  }
}

export type LoadResult<T> =
  | { status: 'ready'; data: T }
  | { status: 'empty' }
  | { status: 'error'; error: string; kind: PersistenceKind };

export const classifyPersistenceError = (error: unknown): PersistenceError => {
  if (error instanceof PersistenceError) return error;
  const text = String((error as Error)?.message || error || '');
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code: string }).code)
    : '';
  if (/permission-denied|insufficient permissions|missing or insufficient/i.test(text + code)) {
    return new PersistenceError('Sem permissão para ler ou gravar estes dados.', 'permission');
  }
  if (/unavailable|network|failed to fetch|offline/i.test(text + code)) {
    return new PersistenceError('Falha de rede ao acessar os dados.', 'network');
  }
  if (text.includes('WriteConflict') || /conflict/i.test(code)) {
    return new PersistenceError(text || 'Conflito de gravação.', 'conflict');
  }
  return new PersistenceError(text || 'Falha ao acessar os dados.', 'unknown');
};

export const assertWriteCompleted = (written: boolean, label: string): void => {
  if (!written) {
    throw new PersistenceError(`A gravação de ${label} não foi confirmada.`, 'missing');
  }
};
