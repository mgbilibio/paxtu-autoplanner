// Adapter: transforma os datasets gerados (BLOCOS_2025, ACOES_*) em CatalogCategory[]
// usado pelo Generator/Catalog/CyclePlanner.
//
// Cada bloco vira UMA CatalogCategory ("B{N}: {Nome}"), com itens:
//   - B{N}.F{n}: ações fixas (todas obrigatórias)
//   - B{N}.V{n}: ações variáveis (escolher mínimo segundo bloco_ramo_meta)
// Modalidades Ar/Mar aparecem com prefixo no description.

import { CatalogCategory, CatalogItem, ScoutBranch } from '../../types';
import {
  RAMOS_2025,
  EIXOS_2025,
  BLOCOS_2025,
  BLOCO_RAMO_META_2025,
  ACOES_FIXAS_2025,
  ACOES_VARIAVEIS_2025,
  BLOCO_ESPECIALIDADES_2025,
  BLOCO_INSIGNIAS_2025,
} from './progressao_2025';

const ramoIdForBranch = (branch: ScoutBranch): number | null => {
  if (branch === ScoutBranch.LOBINHO) return RAMOS_2025.find(r => r.slug === 'lobinho')?.id ?? null;
  if (branch === ScoutBranch.ESCOTEIRO) return RAMOS_2025.find(r => r.slug === 'escoteiro')?.id ?? null;
  return null;
};

const modalidadePrefix = (m: 'geral' | 'ar' | 'mar'): string =>
  m === 'ar' ? '[✈️ Ar] ' : m === 'mar' ? '[⚓ Mar] ' : '';

export const getProgressao2025Catalog = (branch: ScoutBranch): CatalogCategory[] => {
  const ramoId = ramoIdForBranch(branch);
  if (ramoId === null) return [];

  const categories: CatalogCategory[] = [];

  for (const bloco of BLOCOS_2025) {
    const eixo = EIXOS_2025.find(e => e.id === bloco.eixoId);
    const meta = BLOCO_RAMO_META_2025.find(m => m.blocoId === bloco.id && m.ramoId === ramoId);
    const fixas = ACOES_FIXAS_2025.filter(a => a.blocoId === bloco.id && a.ramoId === ramoId);
    const variaveis = ACOES_VARIAVEIS_2025.filter(a => a.blocoId === bloco.id && a.ramoId === ramoId);
    const especialidadesSubst = BLOCO_ESPECIALIDADES_2025.filter(e => e.blocoId === bloco.id && e.ramoId === ramoId && e.tipo === 'substitui');
    const insigniasSubst = BLOCO_INSIGNIAS_2025.filter(i => i.blocoId === bloco.id && i.ramoId === ramoId && i.tipo === 'substitui');

    const items: CatalogItem[] = [];

    // Item-cabeçalho do bloco (intencionalidade)
    items.push({
      code: `B${bloco.ordemGlobal}`,
      description: `${bloco.nome} — ${eixo?.nome || ''}`,
      guidance: meta?.intencionalidade || 'Consultar manual.',
    });

    // Ações Fixas
    fixas.forEach((a, i) => {
      items.push({
        code: `B${bloco.ordemGlobal}.F${i + 1}`,
        description: `${modalidadePrefix(a.modalidade)}[Fixa] ${a.descricao}`,
        guidance: `Ação fixa do bloco ${bloco.nome}. Obrigatória para concluir o bloco.`,
      });
    });

    // Ações Variáveis
    const minVar = meta?.variaveisMinimo || 0;
    variaveis.forEach((a, i) => {
      items.push({
        code: `B${bloco.ordemGlobal}.V${i + 1}`,
        description: `${modalidadePrefix(a.modalidade)}[Var ${i + 1}/${variaveis.length}] ${a.descricao}`,
        guidance: `Ação variável. Escolher pelo menos ${minVar} de ${variaveis.length} no bloco ${bloco.nome} (ou substituir por especialidade/insígnia listada).`,
      });
    });

    // Substitutos (especialidades/insígnias que dispensam variáveis)
    if (especialidadesSubst.length > 0 || insigniasSubst.length > 0) {
      const subs = [
        ...especialidadesSubst.map(e => `Especialidade: ${e.nome}`),
        ...insigniasSubst.map(i => `Insígnia: ${i.nome}`),
      ].join(' | ');
      items.push({
        code: `B${bloco.ordemGlobal}.SUB`,
        description: `[Substituto] Em vez das variáveis: ${subs}`,
        guidance: `Substitui todas as ações variáveis do bloco ${bloco.nome}.`,
      });
    }

    categories.push({
      name: `B${bloco.ordemGlobal}: ${bloco.nome}`,
      items,
    });
  }

  return categories;
};
