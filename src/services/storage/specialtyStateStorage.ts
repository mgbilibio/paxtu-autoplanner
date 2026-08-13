import { MemberSpecialtyState } from '../../types';
import { memberSpecialtyPath } from '../dataLayoutService';
import { readMemberSubdoc, writeMemberSubdoc } from '../firebase/sectionData';
import { getAppConfig } from './configStorage';
import { isFirestoreBacked, readCachedEntity, writeCachedEntity } from './dualBackend';
import { findMemberForLayout } from './memberStorage';
import { SPECIALTY_PROGRESS_FOLDER } from './names';
import { assertCanWriteSection } from './sectionLockStorage';

const specialtyStateKey = (memberId: string, especialidadeId: number): string =>
  `PAXTU_SPECIALTY_${memberId}_${especialidadeId}`;

export const getMemberSpecialtyState = async (
  memberId: string,
  especialidadeId: number,
): Promise<MemberSpecialtyState | null> => {
  if (isFirestoreBacked()) {
    const member = await findMemberForLayout(memberId);
    if (!member?.sectionId) return null;
    return readMemberSubdoc<MemberSpecialtyState>(
      member.sectionId,
      memberId,
      'specialty',
      String(especialidadeId),
    );
  }
  return readCachedEntity<MemberSpecialtyState>(
    specialtyStateKey(memberId, especialidadeId),
    async () => {
      const config = getAppConfig();
      if (!config?.dataFolder) return null;
      const member = await findMemberForLayout(memberId);
      const layout = member
        ? (() => {
            const p = memberSpecialtyPath(member.sectionId, memberId, especialidadeId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: `${config.dataFolder}/${SPECIALTY_PROGRESS_FOLDER}`,
          file: `${memberId}_e${especialidadeId}.json`,
        },
      };
    },
  );
};

export const getMemberSpecialtyStates = async (
  memberId: string,
  especialidadeIds: number[],
): Promise<MemberSpecialtyState[]> => {
  const states = await Promise.all(
    especialidadeIds.map(id => getMemberSpecialtyState(memberId, id)),
  );
  return states.filter((state): state is MemberSpecialtyState => state !== null);
};

export const saveMemberSpecialtyState = async (
  state: MemberSpecialtyState,
): Promise<void> => {
  const stamped = { ...state, lastUpdate: new Date().toISOString() };
  if (isFirestoreBacked()) {
    const member = await findMemberForLayout(stamped.memberId);
    assertCanWriteSection(member?.sectionId);
    if (!member?.sectionId) return;
    await writeMemberSubdoc(
      member.sectionId,
      stamped.memberId,
      'specialty',
      String(stamped.especialidadeId),
      stamped,
    );
    return;
  }
  await writeCachedEntity<MemberSpecialtyState>(
    specialtyStateKey(stamped.memberId, stamped.especialidadeId),
    stamped,
    async () => {
      const config = getAppConfig();
      if (!config?.dataFolder) return null;
      const member = await findMemberForLayout(stamped.memberId);
      assertCanWriteSection(member?.sectionId);
      const layout = member
        ? (() => {
            const p = memberSpecialtyPath(member.sectionId, stamped.memberId, stamped.especialidadeId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: `${config.dataFolder}/${SPECIALTY_PROGRESS_FOLDER}`,
          file: `${stamped.memberId}_e${stamped.especialidadeId}.json`,
        },
      };
    },
  );
};
