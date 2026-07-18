import {
  MemberBlocoState,
  MEMBER_BLOCO_STATE_SCHEMA_VERSION,
} from '../../types';
import { memberBlocoPath } from '../dataLayoutService';
import { getAppConfig } from './configStorage';
import { readCachedEntity, writeCachedEntity } from './dualBackend';
import { findMemberForLayout } from './memberStorage';
import { BLOCO_PROGRESS_FOLDER, TOTAL_BLOCOS } from './names';
import { assertCanWriteSection } from './sectionLockStorage';

const blocoStateKey = (memberId: string, blocoId: number): string =>
  `PAXTU_BLOCO_${memberId}_${blocoId}`;

const migrateBlocoState = (raw: any): MemberBlocoState => {
  const version = raw.schemaVersion ?? 0;
  // Versao 0 (legado pre-versionamento): podia faltar os arrays de concluidas.
  // Garante os defaults (arrays vazios) para nao quebrar quem itera sobre eles.
  let migrated = raw;
  if (version < 1) {
    migrated = {
      ...raw,
      fixasConcluidas: Array.isArray(raw.fixasConcluidas) ? raw.fixasConcluidas : [],
      variaveisConcluidas: Array.isArray(raw.variaveisConcluidas) ? raw.variaveisConcluidas : [],
    };
  }
  // (futuras versoes: encadear transformacoes adicionais aqui antes do carimbo)
  return {
    ...migrated,
    schemaVersion: MEMBER_BLOCO_STATE_SCHEMA_VERSION,
  } as MemberBlocoState;
};

export const getMemberBlocoState = async (
  memberId: string,
  blocoId: number,
): Promise<MemberBlocoState | null> => {
  return readCachedEntity<MemberBlocoState>(
    blocoStateKey(memberId, blocoId),
    async () => {
      const config = getAppConfig();
      if (!config?.dataFolder) return null;
      const member = await findMemberForLayout(memberId);
      const layout = member
        ? (() => {
            const p = memberBlocoPath(member.sectionId, memberId, blocoId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: `${config.dataFolder}/${BLOCO_PROGRESS_FOLDER}`,
          file: `${memberId}_b${blocoId}.json`,
        },
      };
    },
    migrateBlocoState,
  );
};

export const saveMemberBlocoState = async (
  state: MemberBlocoState,
): Promise<void> => {
  const stamped: MemberBlocoState = {
    ...state,
    schemaVersion: MEMBER_BLOCO_STATE_SCHEMA_VERSION,
    lastUpdate: new Date().toISOString(),
  };
  await writeCachedEntity<MemberBlocoState>(
    blocoStateKey(stamped.memberId, stamped.blocoId),
    stamped,
    async () => {
      const config = getAppConfig();
      if (!config?.dataFolder) return null;
      const member = await findMemberForLayout(stamped.memberId);
      assertCanWriteSection(member?.sectionId);
      const layout = member
        ? (() => {
            const p = memberBlocoPath(member.sectionId, stamped.memberId, stamped.blocoId);
            return { folder: p.folder, file: p.file };
          })()
        : null;
      return {
        layout,
        flat: {
          folder: `${config.dataFolder}/${BLOCO_PROGRESS_FOLDER}`,
          file: `${stamped.memberId}_b${stamped.blocoId}.json`,
        },
      };
    },
  );
};

export const saveMemberBlocoStateOptimistic = async (
  state: MemberBlocoState,
  expectedLastUpdate: string | null,
): Promise<{ ok: true } | { ok: false; conflict: MemberBlocoState }> => {
  const current = await getMemberBlocoState(state.memberId, state.blocoId);
  if (current && expectedLastUpdate && current.lastUpdate) {
    // Comparacao por timestamp numerico (Date.parse) para tolerar offsets de
    // fuso; ordenacao lexicografica de string falharia com "-03:00" vs "Z".
    const currentMs = Date.parse(current.lastUpdate);
    const expectedMs = Date.parse(expectedLastUpdate);
    // Fail-closed: data ilegivel (corrupcao/adulteracao) e tratada como
    // conflito, para nao desligar silenciosamente o controle de concorrencia.
    if (!Number.isFinite(currentMs) || !Number.isFinite(expectedMs) || currentMs > expectedMs) {
      return { ok: false, conflict: current };
    }
  }
  await saveMemberBlocoState(state);
  return { ok: true };
};

export const getAllMemberBlocoStates = async (
  memberId: string,
): Promise<MemberBlocoState[]> => {
  const states = await Promise.all(
    Array.from({ length: TOTAL_BLOCOS }, (_, index) =>
      getMemberBlocoState(memberId, index + 1),
    ),
  );
  return states.filter((state): state is MemberBlocoState => state !== null);
};

export const countConcludedBlocos = async (memberId: string): Promise<number> => {
  const states = await getAllMemberBlocoStates(memberId);
  return states.filter(state => !!state.dataConclusao).length;
};
