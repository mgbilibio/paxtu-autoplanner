export type RestoreCheckpoint = {
  fingerprint: string;
  written: number;
};

export const restoreFingerprint = (opCount: number, version: number): string =>
  `${version}:${opCount}`;

export const nextRestoreSlice = <T>(ops: T[], written: number, limit = 400): T[] =>
  ops.slice(written, written + limit);

export const advanceCheckpoint = (checkpoint: RestoreCheckpoint, added: number): RestoreCheckpoint => ({
  ...checkpoint,
  written: checkpoint.written + added,
});
