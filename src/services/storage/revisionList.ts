export class WriteConflictError extends Error {
  constructor(message = 'Outra alteração foi gravada neste documento. Recarregue e tente de novo.') {
    super(message);
    this.name = 'WriteConflictError';
  }
}

export type RevisionedList<T> = {
  revision: number;
  items: T[];
};

export type Identified = { id: string };

const fingerprint = (value: unknown): string => JSON.stringify(value);

export const emptyRevisionedList = <T>(): RevisionedList<T> => ({ revision: 0, items: [] });

export const parseRevisionedList = <T>(data: Record<string, unknown> | null | undefined, field = 'items'): RevisionedList<T> => {
  const items = Array.isArray(data?.[field]) ? data[field] as T[] : [];
  const revision = typeof data?.revision === 'number' && Number.isFinite(data.revision) ? data.revision : 0;
  return { revision, items };
};

/** Aplica upsert/delete de um item. Conflito se o mesmo id mudou em relação à base lida. */
export const applyIdentifiedPatch = <T extends Identified>(
  current: RevisionedList<T>,
  patch: {
    kind: 'upsert' | 'delete';
    item: T;
    baseItem?: T | null;
  },
): RevisionedList<T> => {
  const index = current.items.findIndex(row => row.id === patch.item.id);
  if (patch.kind === 'upsert' && index >= 0 && patch.baseItem) {
    const live = current.items[index];
    if (fingerprint(live) !== fingerprint(patch.baseItem)) {
      throw new WriteConflictError();
    }
  }
  if (patch.kind === 'delete' && index >= 0 && patch.baseItem) {
    const live = current.items[index];
    if (fingerprint(live) !== fingerprint(patch.baseItem)) {
      throw new WriteConflictError();
    }
  }
  let items: T[];
  if (patch.kind === 'delete') {
    items = current.items.filter(row => row.id !== patch.item.id);
  } else if (index >= 0) {
    items = current.items.map((row, i) => (i === index ? patch.item : row));
  } else {
    items = [...current.items, patch.item];
  }
  return { revision: current.revision + 1, items };
};

export type ReplaceListOptions<T> = {
  /** Substitui de propósito (ex.: purga da seção). */
  replace?: boolean;
  expectedRevision?: number;
  /** Snapshot lido pelo caller; se o live divergiu, recusa last-write. */
  baseItems?: T[];
};

/** Full-list write: exige prova de frescura, senão conflito. */
export const replaceRevisionedList = <T>(
  current: RevisionedList<T>,
  nextItems: T[],
  options: ReplaceListOptions<T> = {},
): RevisionedList<T> => {
  if (options.replace) {
    return { revision: current.revision + 1, items: nextItems };
  }
  if (options.expectedRevision !== undefined && options.expectedRevision !== current.revision) {
    throw new WriteConflictError();
  }
  if (options.baseItems && fingerprint(options.baseItems) !== fingerprint(current.items)) {
    throw new WriteConflictError();
  }
  if (options.baseItems === undefined && options.expectedRevision === undefined) {
    throw new WriteConflictError();
  }
  return { revision: current.revision + 1, items: nextItems };
};
