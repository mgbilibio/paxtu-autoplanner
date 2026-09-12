export type ImportCheckpoint = {
  sectionId: string;
  fingerprint: string;
  savedIds: string[];
};

export const fingerprintPackMembers = (ids: string[]): string =>
  [...ids].sort().join('|');

export const remainingImportItems = <T extends { id: string }>(
  items: T[],
  checkpoint?: ImportCheckpoint | null,
): T[] => {
  if (!checkpoint) return items;
  const done = new Set(checkpoint.savedIds);
  return items.filter(item => !done.has(item.id));
};

export const appendImportedId = (checkpoint: ImportCheckpoint, id: string): ImportCheckpoint => ({
  ...checkpoint,
  savedIds: checkpoint.savedIds.includes(id) ? checkpoint.savedIds : [...checkpoint.savedIds, id],
});

export const sameImportFingerprint = (checkpoint: ImportCheckpoint, fingerprint: string, sectionId: string): boolean =>
  checkpoint.fingerprint === fingerprint && checkpoint.sectionId === sectionId;
