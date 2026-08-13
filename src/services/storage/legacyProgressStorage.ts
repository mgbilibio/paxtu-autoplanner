import { MemberProgress } from '../../types';
import { readMemberSubdoc, writeMemberSubdoc } from '../firebase/sectionData';
import { getAppConfig } from './configStorage';
import { DATA_EVENTS, dispatchDataEvent } from './events';
import { isFirestoreBacked } from './dualBackend';
import { findMemberForLayout } from './memberStorage';
import { PROGRESSION_FOLDER } from './names';
import { assertCanWriteSection } from './sectionLockStorage';

const progressCacheKey = (memberId: string): string => `PAXTU_PROG_${memberId}`;
const PROGRESS_CACHE_KEY = 'PAXTU_PROG_CACHE';

// Parse tolerante: descarta a chave corrompida e devolve o default em vez de
// derrubar a leitura inteira (padrao de readCachedEntity).
const parseOrDefault = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const getMemberProgressLegacy = (): MemberProgress[] =>
  parseOrDefault<MemberProgress[]>(PROGRESS_CACHE_KEY, []);

export const getMemberProgress = (): MemberProgress[] => getMemberProgressLegacy();

export const getMemberProgressIndividual = async (
  memberId: string,
): Promise<MemberProgress | null> => {
  if (isFirestoreBacked()) {
    const member = await findMemberForLayout(memberId);
    if (!member?.sectionId) return null;
    return readMemberSubdoc<MemberProgress>(member.sectionId, memberId, 'progress', 'legacy');
  }
  const cacheKey = progressCacheKey(memberId);
  const cached = parseOrDefault<MemberProgress | null>(cacheKey, null);
  if (cached) return cached;

  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem) {
    try {
      const data = await window.fileSystem.readData(
        `${config.dataFolder}/${PROGRESSION_FOLDER}`,
        `${memberId}.json`,
      );
      if (data) {
        localStorage.setItem(cacheKey, data);
        return JSON.parse(data);
      }
    } catch {
      // Arquivo individual ainda pode nao existir.
    }
  }
  return getMemberProgressLegacy().find(p => p.memberId === memberId) || null;
};

export const saveMemberProgressIndividual = async (
  progress: MemberProgress,
): Promise<void> => {
  if (isFirestoreBacked()) {
    const member = await findMemberForLayout(progress.memberId);
    assertCanWriteSection(member?.sectionId);
    if (!member?.sectionId) return;
    await writeMemberSubdoc(member.sectionId, progress.memberId, 'progress', 'legacy', progress);
    return;
  }
  localStorage.setItem(progressCacheKey(progress.memberId), JSON.stringify(progress));
  const config = getAppConfig();
  if (config?.dataFolder && window.fileSystem) {
    await window.fileSystem.writeData(
      `${config.dataFolder}/${PROGRESSION_FOLDER}`,
      `${progress.memberId}.json`,
      JSON.stringify(progress, null, 2),
    );
  }
};

export const updateMemberAchievement = async (
  memberId: string,
  code: string,
  date: string,
  notes?: string,
  remove = false,
  checkedTasks?: number[],
): Promise<MemberProgress> => {
  const member = await findMemberForLayout(memberId);
  assertCanWriteSection(member?.sectionId);
  let memberData = await getMemberProgressIndividual(memberId);
  if (!memberData) memberData = { memberId, achievements: [] };

  if (remove) {
    memberData.achievements = memberData.achievements.filter(item => item.code !== code);
  } else {
    const index = memberData.achievements.findIndex(item => item.code === code);
    const next = { code, date, notes, checkedTasks };
    if (index >= 0) {
      memberData.achievements[index] = {
        ...memberData.achievements[index],
        ...next,
        checkedTasks: checkedTasks || memberData.achievements[index].checkedTasks,
      };
    } else {
      memberData.achievements.push(next);
    }
  }

  await saveMemberProgressIndividual(memberData);
  const allProgress = getMemberProgressLegacy();
  const index = allProgress.findIndex(item => item.memberId === memberId);
  if (index >= 0) allProgress[index] = memberData;
  else allProgress.push(memberData);
  localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(allProgress));
  dispatchDataEvent(DATA_EVENTS.MEMBERS_UPDATED);
  return memberData;
};
