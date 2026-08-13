import { MemberSpecialtyState } from '../../types';
import { memberSpecialtyPath } from '../dataLayoutService';
import { getAppConfig } from './configStorage';
import { readCachedEntity, writeCachedEntity } from './dualBackend';
import { findMemberForLayout } from './memberStorage';
import { SPECIALTY_PROGRESS_FOLDER } from './names';
import { assertCanWriteSection } from './sectionLockStorage';

const specialtyStateKey = (memberId: string, especialidadeId: number): string =>
  `PAXTU_SPECIALTY_${memberId}_${especialidadeId}`;

export const getMemberSpecialtyState = async (
  memberId: string,
  especialidadeId: number,
): Promise<MemberSpecialtyState | null> => {
  return readCachedEntity<MemberSpecialtyState>(
    specialtyStateKey(memberId, especialidadeId),
    async () => {
      const config = getAppConfig();
      const member = await findMemberForLayout(memberId);
      const layout = member && config?.dataFolder
        ? (() => {
            const p = memberSpecialtyPath(member.sectionId, memberId, especialidadeId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: config?.dataFolder ? `${config.dataFolder}/${SPECIALTY_PROGRESS_FOLDER}` : '',
          file: `${memberId}_e${especialidadeId}.json`,
        },
        sectionId: member?.sectionId,
        memberId,
        progressKind: 'specialty' as const,
        entityId: String(especialidadeId),
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
  await writeCachedEntity<MemberSpecialtyState>(
    specialtyStateKey(stamped.memberId, stamped.especialidadeId),
    stamped,
    async () => {
      const config = getAppConfig();
      const member = await findMemberForLayout(stamped.memberId);
      assertCanWriteSection(member?.sectionId);
      const layout = member && config?.dataFolder
        ? (() => {
            const p = memberSpecialtyPath(member.sectionId, stamped.memberId, stamped.especialidadeId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: config?.dataFolder ? `${config.dataFolder}/${SPECIALTY_PROGRESS_FOLDER}` : '',
          file: `${stamped.memberId}_e${stamped.especialidadeId}.json`,
        },
        sectionId: member?.sectionId,
        memberId: stamped.memberId,
        progressKind: 'specialty' as const,
        entityId: String(stamped.especialidadeId),
      };
    },
  );
};
