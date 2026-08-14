import { MemberOfficialRecord, ScoutMember } from '../../types';

export const OFFICIAL_COLLECTION = 'official';
export const OFFICIAL_PAXTU_DOC = 'paxtu';
export const OFFICIAL_COMPETENCIAS_DOC = 'competencias';
export const OFFICIAL_VIDA_DOC = 'vida';

/** Folga abaixo do teto de 1 MB do Firestore (índices e metadados). */
export const OFFICIAL_DOC_SOFT_LIMIT = 900 * 1024;

const ETAPA_SUMMARY_KEYS = [
  'nome',
  'name',
  'etapa',
  'titulo',
  'status',
  'situacao',
  'estado',
  'data',
  'date',
  'dataConquista',
  'conquistadoEm',
  'atual',
  'current',
] as const;

const BULKY_KEYS = new Set([
  'itens',
  'items',
  'competencias',
  'vidaescoteira',
  'historico',
  'historicoescoteiro',
  'registros',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isScalar = (value: unknown): value is string | number | boolean => {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
};

export const officialPayloadBytes = (value: unknown): number => {
  if (value == null) return 0;
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
};

const hasEtapaIdentity = (value: Record<string, unknown>): boolean =>
  ETAPA_SUMMARY_KEYS.some(key => value[key] != null);

const summarizeEtapas = (value: unknown): unknown => {
  if (value == null) return undefined;
  if (isScalar(value)) return value;
  if (Array.isArray(value)) {
    const rows = value.map(summarizeEtapas).filter(item => item !== undefined);
    return rows.length > 0 ? rows : undefined;
  }
  if (!isPlainObject(value)) return undefined;

  if (hasEtapaIdentity(value)) {
    const out: Record<string, unknown> = {};
    for (const key of ETAPA_SUMMARY_KEYS) {
      if (isScalar(value[key])) out[key] = value[key];
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (BULKY_KEYS.has(key.toLowerCase())) continue;
    if (isScalar(nested)) {
      out[key] = nested;
      continue;
    }
    const summarized = summarizeEtapas(nested);
    if (summarized !== undefined) out[key] = summarized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Resumo minúsculo para `docs/members`: source + nomes/datas de etapa, sem árvores Paxtu. */
export const summarizeOfficial = (
  official?: MemberOfficialRecord | null,
): MemberOfficialRecord | undefined => {
  if (!official || !isPlainObject(official)) return undefined;
  const out: MemberOfficialRecord = {};
  if (typeof official.source === 'string' && official.source.trim()) {
    out.source = official.source;
  }
  if (official.etapas !== undefined) {
    const etapas = summarizeEtapas(official.etapas);
    if (etapas !== undefined) {
      out.etapas = etapas as MemberOfficialRecord['etapas'];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Grava o blob só quando há mais do que o resumo (itens, competências, histórico, etc.). */
export const shouldPersistOfficial = (official?: MemberOfficialRecord | null): boolean => {
  if (!official || !isPlainObject(official)) return false;
  return officialPayloadBytes(official) > officialPayloadBytes(summarizeOfficial(official)) + 48;
};

export const splitOfficialDocs = (
  official: MemberOfficialRecord,
): {
  paxtu: Record<string, unknown>;
  competencias?: Record<string, unknown>;
  vida?: Record<string, unknown>;
} => {
  const asRecord = { ...official } as Record<string, unknown>;
  if (officialPayloadBytes(asRecord) <= OFFICIAL_DOC_SOFT_LIMIT) {
    return { paxtu: asRecord };
  }
  const { competencias, vidaEscoteira, ...rest } = asRecord;
  const shards: {
    paxtu: Record<string, unknown>;
    competencias?: Record<string, unknown>;
    vida?: Record<string, unknown>;
  } = { paxtu: rest };
  if (competencias !== undefined) shards.competencias = { competencias };
  if (vidaEscoteira !== undefined) shards.vida = { vidaEscoteira };
  return shards;
};

export const mergeOfficialShards = (
  paxtu?: Record<string, unknown> | MemberOfficialRecord | null,
  competencias?: Record<string, unknown> | null,
  vida?: Record<string, unknown> | null,
): MemberOfficialRecord | undefined => {
  if (!isPlainObject(paxtu) && !isPlainObject(competencias) && !isPlainObject(vida)) {
    return undefined;
  }
  const merged: Record<string, unknown> = isPlainObject(paxtu) ? { ...paxtu } : {};
  if (isPlainObject(competencias)) {
    if ('competencias' in competencias) {
      merged.competencias = competencias.competencias;
    } else {
      Object.assign(merged, competencias);
    }
  }
  if (isPlainObject(vida)) {
    if ('vidaEscoteira' in vida) {
      merged.vidaEscoteira = vida.vidaEscoteira;
    } else {
      Object.assign(merged, vida);
    }
  }
  return Object.keys(merged).length > 0 ? merged as MemberOfficialRecord : undefined;
};

export const leanMemberForList = <T extends { official?: MemberOfficialRecord }>(member: T): T => {
  if (!member.official) return member;
  const summary = summarizeOfficial(member.official);
  if (summary) return { ...member, official: summary };
  if (shouldPersistOfficial(member.official)) {
    const source = typeof member.official.source === 'string' && member.official.source.trim()
      ? member.official.source
      : 'paxtu';
    return { ...member, official: { source } };
  }
  const { official: _official, ...rest } = member;
  return rest as T;
};

export const hydrateMemberOfficial = <T extends ScoutMember>(
  member: T,
  paxtu?: Record<string, unknown> | MemberOfficialRecord | null,
  competencias?: Record<string, unknown> | null,
  vida?: Record<string, unknown> | null,
): T => {
  const fromShards = mergeOfficialShards(paxtu, competencias, vida);
  if (!fromShards) return member;
  return {
    ...member,
    official: { ...member.official, ...fromShards },
  };
};
