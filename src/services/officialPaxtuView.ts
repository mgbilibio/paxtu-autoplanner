import {
  MemberOfficialRecord,
  ScoutMember,
} from '../types';
import { escapeHtml } from './htmlExportCommon';
import {
  formatOfficialDate,
  isOfficialStatusConcluded,
  normalizeKey,
  officialStatusLabel,
  type OfficialEtapaItemView,
  type OfficialEtapaTrailItem,
} from './equivalenciaService';

export const PAXTU_CAMINHOS = [
  'Período introdutório',
  'Pista e trilha',
  'Rumo e travessia',
] as const;

export type PaxtuCaminho = (typeof PAXTU_CAMINHOS)[number];

export interface OfficialAtividadeView {
  id?: string | number;
  descricao: string;
  status?: string;
  date?: string;
  conquistado: boolean;
}

export interface OfficialCompetenciaView {
  id?: string | number;
  nome: string;
  caminho: string;
  date?: string;
  status?: string;
  conquistado: boolean;
  feito: number;
  falta: number;
  atividades: OfficialAtividadeView[];
}

export interface OfficialCaminhoSection {
  caminho: string;
  competencias: OfficialCompetenciaView[];
}

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

const pickId = (...values: unknown[]): string | number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const officialFrom = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): MemberOfficialRecord | undefined => {
  if (!memberOrOfficial) return undefined;
  if ('official' in memberOrOfficial) return memberOrOfficial.official;
  return memberOrOfficial as MemberOfficialRecord;
};

const canonicalCaminho = (raw?: string): string => {
  if (!raw?.trim()) return 'Outras competências';
  const key = normalizeKey(raw);
  if (key.includes('introdut')) return 'Período introdutório';
  if (key.includes('pista') || key.includes('trilha')) return 'Pista e trilha';
  if (key.includes('rumo') || key.includes('travess')) return 'Rumo e travessia';
  return raw.trim();
};

const caminhoOrdem = (caminho: string): number => {
  const idx = PAXTU_CAMINHOS.findIndex(item => normalizeKey(item) === normalizeKey(caminho));
  return idx >= 0 ? idx : PAXTU_CAMINHOS.length;
};

/** Atividade: flag explícita vence; senão status; senão data. Sem nada = pendente. */
export const isOfficialAtividadeConcluded = (
  status?: string | null,
  conquistado?: boolean,
  date?: string,
): boolean => {
  if (typeof conquistado === 'boolean') return conquistado;
  if (status && String(status).trim()) return isOfficialStatusConcluded(status);
  return !!date?.trim();
};

export const officialAtividadeStatusLabel = (
  status?: string,
  conquistado?: boolean,
  date?: string,
): string => {
  if (status?.trim()) {
    const key = normalizeKey(status);
    if (key.includes('pendente') || key.includes('andamento') || key.includes('cancel') || key.includes('ignor')) {
      return 'Pendente';
    }
    if (isOfficialStatusConcluded(status)) return 'Concluída';
  }
  return isOfficialAtividadeConcluded(status, conquistado, date) ? 'Concluída' : 'Pendente';
};

const parseAtividade = (raw: unknown): OfficialAtividadeView | null => {
  if (typeof raw === 'string' && raw.trim()) {
    return { descricao: raw.trim(), conquistado: false };
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  const descricao = pickString(rec.descricao, rec.description, rec.nome, rec.name);
  if (!descricao) return null;
  const status = pickString(rec.status, rec.situacao, rec.estado);
  const date = pickString(rec.date, rec.data);
  const conquistado = isOfficialAtividadeConcluded(
    status,
    typeof rec.conquistado === 'boolean' ? rec.conquistado : undefined,
    date,
  );
  return {
    id: pickId(rec.id),
    descricao,
    status,
    date,
    conquistado,
  };
};

const parseCompetencia = (raw: unknown): OfficialCompetenciaView | null => {
  const rec = asRecord(raw);
  if (!rec) return null;
  const nome = pickString(rec.nome, rec.name, rec.titulo);
  if (!nome) return null;
  const caminho = canonicalCaminho(pickString(rec.caminho, rec.path, rec.trilha));
  const status = pickString(rec.status, rec.situacao, rec.estado);
  const date = pickString(rec.date, rec.data);
  const rawAtividades = rec.atividades ?? rec.activities ?? rec.itens ?? rec.items;
  const atividades = Array.isArray(rawAtividades)
    ? rawAtividades.map(parseAtividade).filter((item): item is OfficialAtividadeView => !!item)
    : [];
  const feito = atividades.filter(item => item.conquistado).length;
  const falta = Math.max(0, atividades.length - feito);
  return {
    id: pickId(rec.id),
    nome,
    caminho,
    date,
    status,
    conquistado: status ? isOfficialStatusConcluded(status) : !!date,
    feito,
    falta,
    atividades,
  };
};

/** Árvore Paxtu por caminho. Vazio se `official.competencias` não veio. */
export const listOfficialCompetenciaTree = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): OfficialCaminhoSection[] => {
  const official = officialFrom(memberOrOfficial);
  const raw = official?.competencias;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const grouped = new Map<string, OfficialCompetenciaView[]>();
  for (const item of raw) {
    const competencia = parseCompetencia(item);
    if (!competencia) continue;
    const list = grouped.get(competencia.caminho) || [];
    list.push(competencia);
    grouped.set(competencia.caminho, list);
  }

  return [...grouped.entries()]
    .sort((a, b) => {
      const diff = caminhoOrdem(a[0]) - caminhoOrdem(b[0]);
      if (diff !== 0) return diff;
      return normalizeKey(a[0]).localeCompare(normalizeKey(b[0]), 'pt');
    })
    .map(([caminho, competencias]) => ({ caminho, competencias }));
};

export const hasOfficialCompetenciaTree = (
  memberOrOfficial?: ScoutMember | MemberOfficialRecord | null,
): boolean => listOfficialCompetenciaTree(memberOrOfficial).length > 0;

export const competenciaCountLabel = (item: OfficialCompetenciaView): string => {
  const total = item.feito + item.falta;
  if (total === 0) return 'sem atividades';
  return `${item.feito} feito · ${item.falta} falta`;
};

const atividadeRowsHtml = (atividades: OfficialAtividadeView[]): string => {
  if (atividades.length === 0) {
    return '<tr><td colspan="3">Nenhuma atividade nesta competência.</td></tr>';
  }
  return atividades.map(item => `
    <tr>
      <td>${escapeHtml(item.descricao)}</td>
      <td>${escapeHtml(officialAtividadeStatusLabel(item.status, item.conquistado, item.date))}</td>
      <td>${escapeHtml(formatOfficialDate(item.date) || '')}</td>
    </tr>
  `).join('');
};

/** HTML da árvore (impressão / export). Sem PII além do que já está na ficha. */
export const officialCompetenciaTreeHtml = (sections: OfficialCaminhoSection[]): string => {
  if (sections.length === 0) return '';
  return sections.map(section => `
    <h3>${escapeHtml(section.caminho)}</h3>
    ${section.competencias.map(comp => `
      <p><strong>${escapeHtml(comp.nome)}</strong>
        ${comp.status || comp.conquistado
          ? ` · ${escapeHtml(officialStatusLabel(comp.status, comp.conquistado))}`
          : ''}
        ${comp.date ? ` · ${escapeHtml(formatOfficialDate(comp.date) || '')}` : ''}
        · ${escapeHtml(competenciaCountLabel(comp))}
      </p>
      <table>
        <thead><tr><th>Descrição</th><th>Status</th><th>Data</th></tr></thead>
        <tbody>${atividadeRowsHtml(comp.atividades)}</tbody>
      </table>
    `).join('')}
  `).join('');
};

const etapaItemRowsHtml = (itens: OfficialEtapaItemView[]): string =>
  itens.map(item => `
    <tr>
      <td>${escapeHtml(item.codigo || '')}</td>
      <td>${escapeHtml(item.nome)}</td>
      <td>${escapeHtml(officialStatusLabel(item.status, item.conquistado))}</td>
      <td>${escapeHtml(formatOfficialDate(item.date) || '')}</td>
    </tr>
  `).join('');

/** Fallback de impressão quando não há `official.competencias`. */
export const officialEtapaItensFallbackHtml = (trail: OfficialEtapaTrailItem[]): string => {
  const withItens = trail.filter(item => item.itens.length > 0);
  if (withItens.length === 0) return '';
  return withItens.map(item => `
    <h3>${escapeHtml(item.etapa)}</h3>
    <table>
      <thead><tr><th></th><th>Item</th><th>Situação</th><th>Data</th></tr></thead>
      <tbody>${etapaItemRowsHtml(item.itens)}</tbody>
    </table>
  `).join('');
};
