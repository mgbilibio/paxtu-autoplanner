import { ScoutBranch, ScoutSection, CatalogCategory, TroopRole, MemberBlocoState } from '../types';
import { getUnifiedCatalog as _getUnifiedCatalog } from '../data/catalog';
import { getAllMemberBlocoStates } from './storageService';

/**
 * Retorna o catálogo para PROGRESSÃO INDIVIDUAL (mAPPa).
 */
export const getMemberCatalog = (member: { branch: ScoutBranch, role: TroopRole }, section?: ScoutSection | null): CatalogCategory[] => {
  const system = section?.progressionSystem || 'POR_2025';
  return _getUnifiedCatalog(member.branch, system, member.role);
};

/**
 * R7: variante async de getMemberCatalog que enriquece os items com status de progresso
 * baseado no MemberBlocoState do jovem (POR 2025+ apenas). Codes esperados: B{N}, B{N}.F{n}, B{N}.V{n}.
 */
export const getMemberCatalogWithProgress = async (
  member: { id: string; branch: ScoutBranch; role: TroopRole },
  section?: ScoutSection | null,
): Promise<CatalogCategory[]> => {
  const system = section?.progressionSystem || 'POR_2025';
  const baseCatalog = _getUnifiedCatalog(member.branch, system, member.role);
  if (system !== 'POR_2025') return baseCatalog;

  const states = await getAllMemberBlocoStates(member.id);
  if (states.length === 0) return baseCatalog;

  return baseCatalog.map(cat => ({
    ...cat,
    items: cat.items.map(item => {
      // Tentamos casar codes do tipo B{N}, B{N}.F{n}, B{N}.V{n}, B{N}.SUB
      const m = item.code.match(/^B(\d+)(?:\.(F|V|SUB)(\d+)?)?$/);
      if (!m) return item;
      const blocoOrdem = parseInt(m[1], 10);
      const tipo = m[2]; // 'F' | 'V' | 'SUB' | undefined
      const idx = m[3] ? parseInt(m[3], 10) : null;

      // Encontra estado do bloco — o MemberBlocoState usa blocoId que = ordemGlobal
      const state = states.find(s => s.blocoId === blocoOrdem);
      if (!state) return item;

      let progressStatus: 'concluido' | 'em_andamento' | 'pendente' = 'pendente';
      let progressDate: string | undefined = state.dataConclusao;

      if (!tipo) {
        // Cabeçalho do bloco
        progressStatus = state.dataConclusao ? 'concluido'
          : (state.fixasConcluidas.length + state.variaveisConcluidas.length > 0) ? 'em_andamento'
          : 'pendente';
      } else if (tipo === 'F' && idx !== null) {
        progressStatus = state.fixasConcluidas.includes(idx) ? 'concluido' : 'pendente';
      } else if (tipo === 'V' && idx !== null) {
        progressStatus = state.variaveisConcluidas.includes(idx) ? 'concluido' : 'pendente';
      } else if (tipo === 'SUB') {
        progressStatus = state.substituidoPor ? 'concluido' : 'pendente';
      }

      return { ...item, progressStatus, progressDate };
    }),
  }));
};

/**
 * R7: filtra um catálogo enriquecido removendo items já concluídos.
 * Útil para passar à IA somente o que falta.
 */
export const filterPendingItems = (catalog: CatalogCategory[]): CatalogCategory[] => {
  return catalog
    .map(cat => ({ ...cat, items: cat.items.filter(i => i.progressStatus !== 'concluido') }))
    .filter(cat => cat.items.length > 0);
};

/**
 * R7: lista resumo de items concluídos para incluir no prompt da IA como contexto.
 */
export const summarizeConcluded = (states: MemberBlocoState[]): string => {
  if (states.length === 0) return '';
  const concluidos = states.filter(s => s.dataConclusao);
  const emAndamento = states.filter(s => !s.dataConclusao && (s.fixasConcluidas.length > 0 || s.variaveisConcluidas.length > 0));
  const linhas: string[] = [];
  if (concluidos.length > 0) {
    linhas.push(`Blocos JÁ CONCLUÍDOS pelo jovem (não repetir): ${concluidos.map(s => `B${s.blocoId}`).join(', ')}.`);
  }
  if (emAndamento.length > 0) {
    linhas.push(`Blocos em andamento: ${emAndamento.map(s => `B${s.blocoId} (${s.fixasConcluidas.length} fixas + ${s.variaveisConcluidas.length} variáveis feitas)`).join(', ')}.`);
  }
  return linhas.join('\n');
};

/**
 * Retorna o catálogo para PLANEJAMENTO DE ATIVIDADES.
 */
export const getPlanningCatalog = (branch: ScoutBranch, system: 'LEGACY_2020' | 'POR_2025' | string): CatalogCategory[] => {
  return _getUnifiedCatalog(branch, system, TroopRole.JUVENIL);
};

/**
 * Compacta o catálogo em linhas "COD | categoria | descrição" para o LLM
 * amarrar atividades no modo auto_link (contexto 256k+ comporta bem).
 */
export const buildCatalogDigest = (
  catalog: CatalogCategory[],
  options?: { maxItems?: number; maxDescLen?: number },
): string => {
  const maxItems = options?.maxItems ?? 450;
  const maxDescLen = options?.maxDescLen ?? 90;
  const lines: string[] = [];
  for (const cat of catalog) {
    const catName = (cat.name || 'Geral').slice(0, 40);
    for (const item of cat.items || []) {
      if (lines.length >= maxItems) break;
      const code = (item.code || '—').trim();
      const desc = (item.description || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxDescLen);
      if (!desc && code === '—') continue;
      lines.push(`${code} | ${catName} | ${desc}`);
    }
    if (lines.length >= maxItems) break;
  }
  if (lines.length === 0) {
    return '(Catálogo vazio para este ramo — invente atividades coerentes sem códigos.)';
  }
  return [
    `CATÁLOGO DE CÓDIGOS (${lines.length} itens — use códigos EXATOS em progressionObjective quando couber):`,
    ...lines,
  ].join('\n');
};

/**
 * Atalho para compatibilidade legada.
 */
export const getCatalogForSection = (branch: ScoutBranch, section?: ScoutSection | null): CatalogCategory[] => {
    const system = section?.progressionSystem || 'POR_2025';
    return _getUnifiedCatalog(branch, system, TroopRole.JUVENIL);
};

/**
 * Retorna um catálogo específico independentemente da seção.
 */
export const getCatalogBySystem = (branch: ScoutBranch, system: string, role?: TroopRole): CatalogCategory[] => {
    return _getUnifiedCatalog(branch, system, role);
};

/**
 * Exporta o catálogo unificado diretamente para uso avançado (Ciclo, etc).
 */
export const getUnifiedCatalog = _getUnifiedCatalog;
