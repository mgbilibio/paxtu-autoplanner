import {
  EQUIVALENCIA_BLOCOS,
  ETAPA_POR_BLOCOS,
  UEB_NOME_ALIASES,
  normalizeCode,
  type EquivalenciaBloco,
  type EtapaEscoteiro,
} from '../data/uebEquivalenciaEscoteiro';
import {
  MemberOfficialRecord,
  OfficialProgressItem,
  OfficialSpecialtyRecord,
  ScoutMember,
} from '../types';

export interface EquivalenciaBlocoSugestao {
  blocoId: number;
  suggested: boolean;
  reasons: string[];
  matchedSpecialties: string[];
  matchedInsignias: string[];
  matchedCodes: string[];
}

export interface EquivalenciaSuggestion {
  officialEtapa: EtapaEscoteiro | null;
  derivedEtapaFromBlocos: EtapaEscoteiro | null;
  keepOfficialEtapa: boolean;
  canAutoClose: false;
  blocos: EquivalenciaBlocoSugestao[];
}

export interface OfficialSpecialtyView {
  nome: string;
  nivelOficial?: number;
  nivel2025?: 1 | 2 | null;
  date?: string;
}

export interface OfficialEtapaTrailItem {
  etapa: EtapaEscoteiro;
  conquistado: boolean;
  date?: string;
}

export interface OfficialEtapaOtherItem {
  nome: string;
  conquistado: boolean;
  date?: string;
}

export const PAXTU_HISTORICO_AVISO =
  'O Paxtu trouxe etapa e especialidade, não o item a item (I22…). Equivalência de bloco é sugestão; a chefia confirma.';

const CONCLUDED_STATUS = new Set([
  'concluido',
  'concluída',
  'concluida',
  'cumprido',
  'feito',
  'ok',
  'done',
  'completed',
  'conquistado',
  'homologado',
]);

const PENDING_STATUS = new Set([
  'pendente',
  'andamento',
  'em_andamento',
  'em andamento',
  'cancelado',
  'ignorado',
]);

const ETAPA_ORDEM: readonly EtapaEscoteiro[] = ETAPA_POR_BLOCOS.map(item => item.etapa);

export const normalizeKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const etapaFromBlocoCount = (concluded: number): EtapaEscoteiro => {
  const n = Number.isFinite(concluded) ? Math.max(0, Math.floor(concluded)) : 0;
  const found = ETAPA_POR_BLOCOS.find(item => n >= item.min && n <= item.max);
  if (found) return found.etapa;
  return n > 18 ? 'Travessia' : 'Pistas';
};

export const etapaOrdem = (nome?: string | null): number => {
  if (!nome) return 0;
  const key = normalizeKey(nome);
  const idx = ETAPA_ORDEM.findIndex(item => normalizeKey(item) === key);
  return idx >= 0 ? idx + 1 : 0;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const isEtapaEscoteiro = (value: unknown): value is EtapaEscoteiro =>
  typeof value === 'string' && etapaOrdem(value) > 0;

const officialFrom = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | EtapaEscoteiro | null,
): MemberOfficialRecord | undefined => {
  if (!memberOrOfficial || typeof memberOrOfficial === 'string') return undefined;
  if ('official' in memberOrOfficial) return memberOrOfficial.official;
  return memberOrOfficial as MemberOfficialRecord;
};

/** Conquistado/concluído conta; Pendente (e afins) não. Sem status = legado, conta. */
export const isOfficialStatusConcluded = (status?: string | null): boolean => {
  if (!status || !String(status).trim()) return true;
  const key = normalizeKey(status);
  if (PENDING_STATUS.has(key)) return false;
  return CONCLUDED_STATUS.has(key) || key.includes('conclu') || key.includes('conquist');
};

interface CollectedOfficialEtapa {
  nome: string;
  status?: string;
  date?: string;
}

const collectEtapaRecords = (official?: MemberOfficialRecord): CollectedOfficialEtapa[] => {
  if (!official) return [];
  const records: CollectedOfficialEtapa[] = [];

  const push = (raw: unknown, fallbackNome?: string) => {
    if (typeof raw === 'string' && raw.trim()) {
      records.push({ nome: raw.trim() });
      return;
    }
    const rec = asRecord(raw);
    if (!rec) return;
    const nome = pickString(rec.nome, rec.name, rec.etapa, rec.atual, rec.current, rec.titulo, rec.etapaAtual)
      || fallbackNome;
    if (!nome) return;
    records.push({
      nome,
      status: pickString(rec.status, rec.situacao, rec.estado),
      date: pickString(rec.date, rec.data, rec.dataConquista, rec.conquistadoEm),
    });
  };

  const etapas = official.etapas;
  if (typeof etapas === 'string') {
    push(etapas);
  } else if (Array.isArray(etapas)) {
    etapas.forEach(item => push(item));
  } else if (asRecord(etapas)) {
    const rec = asRecord(etapas)!;
    const skipKeys = new Set(['atual', 'current', 'nome', 'name', 'etapa', 'status', 'situacao', 'estado']);
    for (const [key, value] of Object.entries(rec)) {
      if (etapaOrdem(key) > 0) {
        if (value === true || value === 1) {
          records.push({ nome: key });
        } else if (typeof value === 'string') {
          const keyNorm = normalizeKey(value);
          const looksStatus = PENDING_STATUS.has(keyNorm)
            || CONCLUDED_STATUS.has(keyNorm)
            || keyNorm.includes('conclu')
            || keyNorm.includes('conquist')
            || keyNorm.includes('pendente');
          records.push(looksStatus ? { nome: key, status: value } : { nome: key, date: value });
        } else if (asRecord(value) || value) {
          push(value, key);
        }
      } else if (!skipKeys.has(normalizeKey(key))) {
        push(value);
      }
    }
    if (records.length === 0) {
      push(rec.atual || rec.current || rec.nome || rec.name);
    }
  }

  const vida = official.vidaEscoteira;
  if (records.length === 0) {
    if (typeof vida === 'string') push(vida);
    else if (asRecord(vida)) push(vida);
  } else if (asRecord(vida)) {
    const rec = asRecord(vida)!;
    if (pickString(rec.status, rec.situacao, rec.estado)) push(vida);
  }

  return records;
};

/** Só nomes de etapas com status conquistado/concluído (Pendente não entra). */
const collectEtapaNames = (official?: MemberOfficialRecord): string[] =>
  collectEtapaRecords(official)
    .filter(item => isOfficialStatusConcluded(item.status))
    .map(item => item.nome);

export const listOfficialEtapas = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): EtapaEscoteiro[] => {
  const official = officialFrom(memberOrOfficial);
  const seen = new Set<EtapaEscoteiro>();
  for (const nome of collectEtapaNames(official)) {
    const ordem = etapaOrdem(nome);
    if (ordem > 0) seen.add(ETAPA_ORDEM[ordem - 1]);
  }
  return ETAPA_ORDEM.filter(item => seen.has(item));
};

export const officialEtapaEscoteiro = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | EtapaEscoteiro | null,
): EtapaEscoteiro | null => {
  if (isEtapaEscoteiro(memberOrOfficial)) return memberOrOfficial;
  const official = officialFrom(memberOrOfficial);
  let best: EtapaEscoteiro | null = null;
  let bestOrdem = 0;
  for (const nome of collectEtapaNames(official)) {
    const ordem = etapaOrdem(nome);
    if (ordem > bestOrdem) {
      bestOrdem = ordem;
      best = ETAPA_ORDEM[ordem - 1];
    }
  }
  return best;
};

export const formatOfficialDate = (raw?: string): string | undefined => {
  if (!raw?.trim()) return undefined;
  const text = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return text;
};

/** Trilha Pistas → Travessia. Outras etapas do dump ficam de fora (ver listOtherOfficialEtapas). */
export const listOfficialEtapaTrail = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): OfficialEtapaTrailItem[] => {
  const official = officialFrom(memberOrOfficial);
  const records = collectEtapaRecords(official);
  return ETAPA_ORDEM.map(etapa => {
    const matches = records.filter(item => etapaOrdem(item.nome) === etapaOrdem(etapa));
    const done = matches.find(item => isOfficialStatusConcluded(item.status));
    return {
      etapa,
      conquistado: !!done,
      date: done?.date || matches.find(item => item.date)?.date,
    };
  });
};

export const listOtherOfficialEtapas = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): OfficialEtapaOtherItem[] => {
  const official = officialFrom(memberOrOfficial);
  const seen = new Set<string>();
  const others: OfficialEtapaOtherItem[] = [];
  for (const item of collectEtapaRecords(official)) {
    if (etapaOrdem(item.nome) > 0) continue;
    const key = normalizeKey(item.nome);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    others.push({
      nome: item.nome,
      conquistado: isOfficialStatusConcluded(item.status),
      date: item.date,
    });
  }
  return others;
};

/** Só compara quando há etapa derivada. derived nulo/ausente nunca mantém etapa. */
export const mustKeepOfficialEtapa = (
  official: ScoutMember | MemberOfficialRecord | EtapaEscoteiro | null | undefined,
  derived?: EtapaEscoteiro | null,
): boolean => {
  if (!derived) return false;
  const officialEtapa = officialEtapaEscoteiro(official);
  if (!officialEtapa) return false;
  return etapaOrdem(officialEtapa) > etapaOrdem(derived);
};

/** N1 → 1; N2 ou N3 → 2; N0 ou inválido → null. */
export const mapSpecialtyLevel = (oldLevel: unknown): 1 | 2 | null => {
  const n = typeof oldLevel === 'number'
    ? oldLevel
    : typeof oldLevel === 'string'
      ? Number.parseInt(oldLevel.replace(/\D/g, ''), 10)
      : NaN;
  if (n === 1) return 1;
  if (n === 2 || n === 3) return 2;
  return null;
};

const specialtyNome = (item: OfficialSpecialtyRecord | string): string => {
  if (typeof item === 'string') return item.trim();
  return pickString(item.nome, item.name, item.titulo) || '';
};

const specialtyNivel = (item: OfficialSpecialtyRecord | string): number | undefined => {
  if (typeof item === 'string') return undefined;
  const raw = item.nivel ?? item.level;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const specialtyDate = (item: OfficialSpecialtyRecord | string): string | undefined => {
  if (typeof item === 'string') return undefined;
  return pickString(item.date, item.data);
};

export const listOfficialSpecialties = (member?: ScoutMember | null): OfficialSpecialtyView[] => {
  const list = member?.official?.especialidades;
  if (!Array.isArray(list)) return [];
  return list
    .map(item => {
      const nome = specialtyNome(item);
      if (!nome) return null;
      const nivelOficial = specialtyNivel(item);
      return {
        nome,
        nivelOficial,
        nivel2025: nivelOficial === undefined ? null : mapSpecialtyLevel(nivelOficial),
        date: specialtyDate(item),
      } as OfficialSpecialtyView;
    })
    .filter((item): item is OfficialSpecialtyView => !!item);
};

const namedEntries = (values?: Array<string | Record<string, unknown>>): string[] => {
  if (!Array.isArray(values)) return [];
  return values
    .map(item => {
      if (typeof item === 'string') return item.trim();
      const rec = asRecord(item);
      return rec ? pickString(rec.nome, rec.name, rec.titulo, rec.title) || '' : '';
    })
    .filter(Boolean);
};

const isItemConcluded = (item: OfficialProgressItem): boolean => {
  const status = normalizeKey(item.status || '');
  if (!status) return true;
  if (PENDING_STATUS.has(status)) return false;
  return CONCLUDED_STATUS.has(status) || status.includes('conclu');
};

const officialItemCodes = (official?: MemberOfficialRecord): Array<{ group?: 'PT' | 'RT'; token: string; raw: string }> => {
  if (!Array.isArray(official?.items)) return [];
  const out: Array<{ group?: 'PT' | 'RT'; token: string; raw: string }> = [];
  for (const item of official.items) {
    if (!item?.code || !isItemConcluded(item)) continue;
    const token = normalizeCode(item.code);
    if (!/^[FICSAE]\d+$/.test(token)) continue;
    const area = normalizeKey(item.area || '');
    const prefix = item.code.trim().match(/^\s*(pt|rt)\b/i)?.[1]?.toUpperCase() as 'PT' | 'RT' | undefined;
    let group = prefix;
    if (!group) {
      if (area.includes('rumo') || area.includes('travessia') || area === 'rt') group = 'RT';
      else if (area.includes('pista') || area.includes('trilha') || area === 'pt') group = 'PT';
    }
    out.push({ group, token, raw: item.code.trim() });
  }
  return out;
};

const aliasKeysFor = (normalized: string): string[] => {
  const keys = [normalized];
  for (const [canon, aliases] of Object.entries(UEB_NOME_ALIASES)) {
    if (canon === normalized || aliases.includes(normalized)) {
      keys.push(canon, ...aliases);
    }
  }
  return [...new Set(keys)];
};

const namesMatch = (left: string, right: string): boolean => {
  const a = normalizeKey(left);
  const b = normalizeKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const aKeys = aliasKeysFor(a);
  const bKeys = aliasKeysFor(b);
  if (aKeys.some(key => bKeys.includes(key))) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length >= 8 && long.includes(short)) return true;
  return false;
};

const matchNames = (owned: string[], catalog: readonly string[]): string[] => {
  const matched: string[] = [];
  for (const expected of catalog) {
    if (owned.some(item => namesMatch(item, expected))) matched.push(expected);
  }
  return matched;
};

const suggestBloco = (
  official: MemberOfficialRecord | undefined,
  mapping: EquivalenciaBloco,
  specialties: string[],
  badges: string[],
): EquivalenciaBlocoSugestao => {
  if (!official) {
    return {
      blocoId: mapping.blocoId,
      suggested: false,
      reasons: [],
      matchedSpecialties: [],
      matchedInsignias: [],
      matchedCodes: [],
    };
  }

  const matchedSpecialties = matchNames(specialties, mapping.especialidades);
  const matchedInsignias = matchNames(badges, mapping.insignias);
  const codes = officialItemCodes(official);
  const matchedCodes: string[] = [];
  for (const item of codes) {
    const inPt = mapping.complementares.pt.includes(item.token);
    const inRt = mapping.complementares.rt.includes(item.token);
    const ok = item.group === 'PT' ? inPt : item.group === 'RT' ? inRt : inPt || inRt;
    if (ok && !matchedCodes.includes(item.raw)) matchedCodes.push(item.raw);
  }

  const reasons: string[] = [];
  if (matchedSpecialties.length) {
    reasons.push(`Especialidade oficial: ${matchedSpecialties.join(', ')}`);
  }
  if (matchedInsignias.length) {
    reasons.push(`Insígnia/conquista oficial: ${matchedInsignias.join(', ')}`);
  }
  if (matchedCodes.length) {
    reasons.push(`Itens oficiais: ${matchedCodes.join(', ')}`);
  }

  return {
    blocoId: mapping.blocoId,
    suggested: reasons.length > 0,
    reasons,
    matchedSpecialties,
    matchedInsignias,
    matchedCodes,
  };
};

/**
 * Sugestões por bloco + comparação de etapa.
 * Sem `blocosConcluidos`, derivedEtapaFromBlocos = null e keepOfficialEtapa = false
 * (não tratar etapa derivada ausente como motivo para manter a oficial).
 * Nunca fecha bloco: canAutoClose é sempre false; o chamador não deve gravar dataConclusao.
 */
export const suggestEquivalencia = (
  member: ScoutMember | null | undefined,
  blocosConcluidos?: number,
): EquivalenciaSuggestion => {
  const official = member?.official;
  const officialEtapa = officialEtapaEscoteiro(member);
  const derivedEtapaFromBlocos = blocosConcluidos === undefined
    ? null
    : etapaFromBlocoCount(blocosConcluidos);
  const keepOfficialEtapa = derivedEtapaFromBlocos
    ? mustKeepOfficialEtapa(official || member, derivedEtapaFromBlocos)
    : false;

  const specialties = listOfficialSpecialties(member).map(item => item.nome);
  const badges = official
    ? [...namedEntries(official.conquistas), ...namedEntries(official.condecoracoes), ...specialties]
    : [];

  return {
    officialEtapa,
    derivedEtapaFromBlocos,
    keepOfficialEtapa,
    canAutoClose: false,
    blocos: EQUIVALENCIA_BLOCOS.map(mapping => suggestBloco(official, mapping, specialties, badges)),
  };
};

export const hasOfficialLayer = (member?: ScoutMember | null): boolean =>
  !!member?.official && Object.keys(member.official).length > 0;
