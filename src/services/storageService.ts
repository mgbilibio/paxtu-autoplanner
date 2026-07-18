export {
  getAppConfig,
  getStoredApiKey,
  normalizePath,
  saveAppConfig,
} from './storage/configStorage';

export { DATA_EVENTS } from './storage/events';

export {
  ensureWorkspaceMetadata,
} from './storage/workspaceStorage';

export type {
  WorkspaceMetadata,
} from './storage/workspaceStorage';

export {
  acquireSectionEditLock,
  assertCanWriteSection,
  canWriteSection,
  getActiveSectionEditLock,
  releaseSectionEditLock,
  renewSectionEditLock,
} from './storage/sectionLockStorage';

export type {
  EditLock,
  EditLockResult,
} from './storage/sectionLockStorage';

export {
  clonePlan,
  deleteFromCatalog,
  exportCatalogBackup,
  getAnnotations,
  getCatalogAsync,
  getCatalogSync,
  rebuildCatalogFromFolder,
  saveAnnotation,
  savePlanToCatalog,
} from './storage/catalogStorage';

export {
  deleteSectionAsync,
  getSectionsAsync,
  saveSectionAsync,
} from './storage/sectionStorage';

export {
  getGroupsAsync,
  saveGroupAsync,
} from './storage/groupStorage';

export {
  deleteUserAsync,
  getUsersAsync,
  saveUserAsync,
} from './storage/userStorage';

export {
  deleteMemberAsync,
  findMemberForLayout,
  getMembersAsync,
  saveMemberAsync,
} from './storage/memberStorage';

export {
  deleteCalendarEventAsync,
  getCalendarEventsAsync,
  saveCalendarEventAsync,
} from './storage/calendarStorage';

export {
  getMemberProgress,
  getMemberProgressIndividual,
  saveMemberProgressIndividual,
  updateMemberAchievement,
} from './storage/legacyProgressStorage';

export {
  countConcludedBlocos,
  getAllMemberBlocoStates,
  getMemberBlocoState,
  saveMemberBlocoState,
  saveMemberBlocoStateOptimistic,
} from './storage/blocoProgressStorage';

export {
  getMemberReconhecimento,
  saveMemberReconhecimento,
} from './storage/reconhecimentoStorage';

export {
  downloadLocalAppBackup,
  downloadProgressBackup,
  exportLocalAppBackup,
  exportProgressBackup,
  importLocalAppBackup,
  importProgressBackup,
} from './storage/backupStorage';

export type {
  LocalAppBackup,
  ProgressBackup,
} from './storage/backupStorage';

export {
  getMemberSpecialtyState,
  getMemberSpecialtyStates,
  saveMemberSpecialtyState,
} from './storage/specialtyStateStorage';
