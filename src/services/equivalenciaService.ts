import {
  ETAPAS_ESCOTEIRO_ORDEM,
  UEB_NOME_ALIASES,
  getUebBlocoEquivalencia,
  type EtapaEscoteiroNome,
} from '../data/uebEquivalenciaEscoteiro';
import {
  MemberOfficialRecord,
  OfficialProgressItem,
  OfficialSpecialtyRecord,
  ScoutMember,
} from '../types';

export interface EquivalenciaSuggestion {
  blocoId: number;
  suggested: boolean;
  reasons: string[];
  matchedSpecialties: string[];
  matchedInsignias: string[];
  matchedCodes: string[];
}

export interface OfficialSpecialtyView {
  nome: string;
  nivelOficial?: number;
  nivel2025?: 1 | 2;
}

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

export const normalizeKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const etapaFromBlocoCount = (concluded: number): EtapaEscoteiroNome => {
  const n = Number.isFinite(concluded) ? Math.max(0, Math.floor(concluded)) : 0;
  if (n >= 13) return 'Travessia';
  if (n >= 8) return 'Rumo';
  if (n >= 4) return 'Trilha';
  return 'Pistas';
};

export const etapaOrdem = (nome?: string | null): number => {
  if (!nome) return 0;
  const key = normalizeKey(nome);
  const idx = ETAPAS_ESCOTEIRO_ORDEM.findIndex(item => normalizeKey(item) === key);
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

const collectEtapaNames = (official?: MemberOfficialRecord): string[] => {
  if (!official) return [];
  const names: string[] = [];
  const push = (raw: unknown) => {
    if (typeof raw === 'string' && raw.trim()) {
      names.push(raw.trim());
      return;
    }
    const rec = asRecord(raw);
    if (!rec) return;
    const nome = pickString(rec.nome, rec.name, rec.etapa, rec.atual, rec.current, rec.titulo);
    if (nome) names.push(nome);
  };

  const etapas = official.etapas;
  if (typeof etapas === 'string') push(etapas);
  else if (Array.isArray(etapas)) etapas.forEach(push);
  else if (asRecord(etapas)) {
    const rec = asRecord(etapas)!;
    push(rec.atual || rec.current || rec.nome || rec.name);
    for (const [key, value] of Object.entries(rec)) {
      if (etapaOrdem(key) > 0 && value) names.push(key);
      else push(value);
    }
  }

  const vida = official.vidaEscoteira;
  if (typeof vida === 'string') push(vida);
  else if (asRecord(vida)) {
    const rec = asRecord(vida)!;
    push(pickString(rec.etapa, rec.etapaAtual, rec.atual, rec.nome));
  }

  return names;
};

export const officialEtapaEscoteiro = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): EtapaEscoteiroNome | undefined => {
  const official = memberOrOfficial && 'official' in memberOrOfficial
    ? memberOrOfficial.official
    : memberOrOfficial as MemberOfficialRecord | undefined;
  let best: EtapaEscoteiroNome | undefined;
  let bestOrdem = 0;
  for (const nome of collectEtapaNames(official)) {
    const ordem = etapaOrdem(nome);
    if (ordem > bestOrdem) {
      bestOrdem = ordem;
      best = ETAPAS_ESCOTEIRO_ORDEM[ordem - 1];
    }
  }
  return best;
};

export const mustKeepOfficialEtapa = (
  memberOrOfficial: ScoutMember | MemberOfficialRecord | null | undefined,
  concludedBlocos: number,
): boolean => {
  const official = officialEtapaEscoteiro(memberOrOfficial);
  if (!official) return false;
  return etapaOrdem(official) > etapaOrdem(etapaFromBlocoCount(concludedBlocos));
};

export const mapSpecialtyLevel = (oldLevel: unknown): 1 | 2 | undefined => {
  const n = typeof oldLevel === 'number'
    ? oldLevel
    : typeof oldLevel === 'string'
      ? Number.parseInt(oldLevel.replace(/\D/g, ''), 10)
      : NaN;
  if (n === 1) return 1;
  if (n === 2 || n === 3) return 2;
  return undefined;
};

const specialtyNome = (item: OfficialSpecialtyRecord | string): string => {
  if (typeof item === 'string') return item.trim();
  return pickString(item.nome, item.name, item.titulo) || '';
};

const specialtyNivel = (item: OfficialSpecialtyRecord | string): number | undefined => {
  if (typeof item === 'string') return undefined;
  const raw = item.nivel ?? item.level;
  if (typeof raw === 'number' && raw > 0) return raw;
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw.replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
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
        nivel2025: mapSpecialtyLevel(nivelOficial),
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

const CODE_RE = /(?:\b(pt|rt)\b[\s-]*)?([ficsae])\s*-?\s*(\d{1,3})\b/i;

export const parseOfficialCode = (
  raw: string,
): { group?: 'PT' | 'RT'; token: string } | null => {
  const match = raw.trim().match(CODE_RE);
  if (!match) return null;
  const group = match[1] ? match[1].toUpperCase() as 'PT' | 'RT' : undefined;
  const token = `${match[2].toUpperCase()}${Number.parseInt(match[3], 10)}`;
  return { group, token };
};

const officialItemCodes = (official?: MemberOfficialRecord): Array<{ group?: 'PT' | 'RT'; token: string; raw: string }> => {
  if (!Array.isArray(official?.items)) return [];
  const out: Array<{ group?: 'PT' | 'RT'; token: string; raw: string }> = [];
  for (const item of official.items) {
    if (!item?.code || !isItemConcluded(item)) continue;
    const parsed = parseOfficialCode(item.code);
    if (!parsed) continue;
    const area = normalizeKey(item.area || '');
    let group = parsed.group;
    if (!group) {
      if (area.includes('rumo') || area.includes('travessia') || area === 'rt') group = 'RT';
      else if (area.includes('pista') || area.includes('trilha') || area === 'pt') group = 'PT';
    }
    out.push({ group, token: parsed.token, raw: item.code.trim() });
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

export const suggestEquivalencia = (
  member: ScoutMember | null | undefined,
  blocoId: number,
): EquivalenciaSuggestion => {
  const empty: EquivalenciaSuggestion = {
    blocoId,
    suggested: false,
    reasons: [],
    matchedSpecialties: [],
    matchedInsignias: [],
    matchedCodes: [],
  };
  const mapping = getUebBlocoEquivalencia(blocoId);
  const official = member?.official;
  if (!mapping || !official) return empty;

  const specialties = listOfficialSpecialties(member).map(item => item.nome);
  const badges = [
    ...namedEntries(official.conquistas),
    ...namedEntries(official.condecoracoes),
    ...specialties,
  ];

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
    blocoId,
    suggested: reasons.length > 0,
    reasons,
    matchedSpecialties,
    matchedInsignias,
    matchedCodes,
  };
};

export const hasOfficialLayer = (member?: ScoutMember | null): boolean =>
  !!member?.official && Object.keys(member.official).length > 0;
