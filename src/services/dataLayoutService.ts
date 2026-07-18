export const DATA_LAYOUT_VERSION = 1;

const safeSegment = (value?: string): string =>
  (value || 'sem-vinculo')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 90) || 'sem-vinculo';

export const sectionFolder = (sectionId?: string): string =>
  `sections/${safeSegment(sectionId)}`;

export const memberFolder = (sectionId: string | undefined, memberId: string): string =>
  `${sectionFolder(sectionId)}/jovens/${safeSegment(memberId)}`;

export const adultFolder = (sectionId: string | undefined, userId: string): string =>
  `${sectionFolder(sectionId)}/adultos/${safeSegment(userId)}`;

export const sectionEditLockPath = (sectionId: string | undefined) => ({
  folder: sectionFolder(sectionId),
  file: 'paxtu_edit_lock.json',
});

export const memberProfilePath = (sectionId: string | undefined, memberId: string) => ({
  folder: memberFolder(sectionId, memberId),
  file: 'perfil.json',
});

export const adultProfilePath = (sectionId: string | undefined, userId: string) => ({
  folder: adultFolder(sectionId, userId),
  file: 'perfil.json',
});

export const memberBlocoPath = (
  sectionId: string | undefined,
  memberId: string,
  blocoId: number,
) => ({
  folder: `${memberFolder(sectionId, memberId)}/progressao_2025`,
  file: `bloco_${String(blocoId).padStart(2, '0')}.json`,
});

export const memberReconhecimentoPath = (
  sectionId: string | undefined,
  memberId: string,
  reconhecimentoId: number,
) => ({
  folder: `${memberFolder(sectionId, memberId)}/progressao_2025`,
  file: `reconhecimento_${reconhecimentoId}.json`,
});

export const memberSpecialtyPath = (
  sectionId: string | undefined,
  memberId: string,
  especialidadeId: number,
) => ({
  folder: `${memberFolder(sectionId, memberId)}/especialidades`,
  file: `especialidade_${especialidadeId}.json`,
});
