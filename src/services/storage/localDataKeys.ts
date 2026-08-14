/** Chaves de config/dispositivo que podem ficar no navegador. */
const LOCAL_DEVICE_KEYS = new Set([
  'PAXTU_AUTOPLANNER_CONFIG',
  'PAXTU_SEARCH_INDEX_V1',
  'PAXTU_SHOW_LEGACY',
]);

const OPERATIONAL_EXACT = new Set([
  'PAXTU_AUTOPLANNER_CATALOG',
  'PAXTU_AUTOPLANNER_TRACKER',
  'PAXTU_AUTOPLANNER_MEMBERS',
  'PAXTU_AUTOPLANNER_CALENDAR',
  'PAXTU_AUTOPLANNER_SECTIONS',
  'PAXTU_AUTOPLANNER_USERS',
  'PAXTU_AUTOPLANNER_PROGRESS_LAUNCHES',
  'PAXTU_AUTOPLANNER_GROUPS',
  'PAXTU_PROG_CACHE',
]);

const OPERATIONAL_PREFIXES = [
  'PAXTU_PROG_',
  'PAXTU_BLOCO_',
  'PAXTU_SPECIALTY_',
  'PAXTU_REC_',
];

export const isOperationalLocalKey = (key: string): boolean => {
  if (LOCAL_DEVICE_KEYS.has(key)) return false;
  if (OPERATIONAL_EXACT.has(key)) return true;
  return OPERATIONAL_PREFIXES.some(prefix => key.startsWith(prefix));
};
