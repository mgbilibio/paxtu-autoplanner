import { MemberReconhecimentoState } from '../../types';
import { memberReconhecimentoPath } from '../dataLayoutService';
import { readCachedEntity, writeCachedEntity } from './dualBackend';
import { findMemberForLayout } from './memberStorage';
import { BLOCO_PROGRESS_FOLDER } from './names';
import { assertCanWriteSection } from './sectionLockStorage';
import { getAppConfig } from './configStorage';

const recKey = (memberId: string, recId: number): string =>
  `PAXTU_REC_${memberId}_${recId}`;

const resolveReadPaths = (memberId: string, reconhecimentoId: number) => async () => {
  const config = getAppConfig();
  if (!config?.dataFolder) return null;
  const member = await findMemberForLayout(memberId);
  const layout = member
    ? (() => {
        const p = memberReconhecimentoPath(member.sectionId, memberId, reconhecimentoId);
        return { folder: p.folder, file: p.file };
      })()
    : null;
  return {
    layout,
    flat: {
      folder: `${config.dataFolder}/${BLOCO_PROGRESS_FOLDER}`,
      file: `${memberId}_rec${reconhecimentoId}.json`,
    },
  };
};

export const getMemberReconhecimento = async (
  memberId: string,
  reconhecimentoId: number,
): Promise<MemberReconhecimentoState | null> => {
  return readCachedEntity<MemberReconhecimentoState>(
    recKey(memberId, reconhecimentoId),
    resolveReadPaths(memberId, reconhecimentoId),
  );
};

export const saveMemberReconhecimento = async (
  state: MemberReconhecimentoState,
): Promise<void> => {
  await writeCachedEntity<MemberReconhecimentoState>(
    recKey(state.memberId, state.reconhecimentoId),
    state,
    async () => {
      const config = getAppConfig();
      if (!config?.dataFolder) return null;
      const member = await findMemberForLayout(state.memberId);
      assertCanWriteSection(member?.sectionId);
      const layout = member
        ? (() => {
            const p = memberReconhecimentoPath(member.sectionId, state.memberId, state.reconhecimentoId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: `${config.dataFolder}/${BLOCO_PROGRESS_FOLDER}`,
          file: `${state.memberId}_rec${state.reconhecimentoId}.json`,
        },
      };
    },
  );
};
