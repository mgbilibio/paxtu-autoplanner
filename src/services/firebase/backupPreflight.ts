export const GROUP_BACKUP_KIND = 'scoutsauto-firestore-backup';
export const GROUP_BACKUP_VERSION = 1;
export const SUPPORTED_BACKUP_VERSIONS = [GROUP_BACKUP_VERSION] as const;

export type BackupPreflight = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  createCount: number;
  updateCount: number;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const preflightGroupBackup = (
  backup: unknown,
  current: { projectId?: string; uid: string },
): BackupPreflight => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isPlainObject(backup)) {
    return { ok: false, errors: ['Backup recusado: não é um objeto.'], warnings, createCount: 0, updateCount: 0 };
  }
  if (backup.kind !== GROUP_BACKUP_KIND) {
    errors.push('Backup recusado: tipo desconhecido.');
  }
  if (typeof backup.version !== 'number' || !SUPPORTED_BACKUP_VERSIONS.includes(backup.version as 1)) {
    errors.push('Backup recusado: versão não suportada.');
  }
  for (const key of ['users', 'invites', 'groups', 'sections', 'sectionDocs', 'memberDocs']) {
    if (!isPlainObject(backup[key])) errors.push(`Backup recusado: ${key} inválido.`);
  }
  const projectId = typeof backup.projectId === 'string' ? backup.projectId : '';
  if (projectId && current.projectId && projectId !== current.projectId) {
    errors.push('Backup de outro projeto Firebase. Confirme a migração explicitamente.');
  }
  const users = isPlainObject(backup.users) ? backup.users : {};
  let createCount = Object.keys(users).length;
  let updateCount = 0;
  for (const [id, data] of Object.entries(users)) {
    if (!id || !isPlainObject(data)) {
      errors.push('Backup recusado: referência de usuário inválida.');
      continue;
    }
    if (id === current.uid) updateCount += 1;
  }
  const sections = isPlainObject(backup.sections) ? backup.sections : {};
  const memberDocs = isPlainObject(backup.memberDocs) ? backup.memberDocs : {};
  for (const sectionId of Object.keys(memberDocs)) {
    if (!isPlainObject(sections[sectionId]) && !sections[sectionId]) {
      errors.push(`Backup recusado: memberDocs sem seção pai ${sectionId}.`);
    }
  }
  createCount += Object.keys(sections).length;
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    createCount,
    updateCount,
  };
};
