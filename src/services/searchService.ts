// Indexa progressão 2025+ e especialidades em um único MiniSearch.
// Cada documento tem `kind` que identifica de onde veio (bloco/acao/especialidade/requisito)
// para que a UI possa exibir o resultado de forma contextualizada.

import MiniSearch from 'minisearch';

// R10: Chave para cache do índice em localStorage
const SEARCH_INDEX_KEY = 'PAXTU_SEARCH_INDEX_V1';
import {
  RAMOS_2025,
  EIXOS_2025,
  BLOCOS_2025,
  BLOCO_RAMO_META_2025,
  ACOES_FIXAS_2025,
  ACOES_VARIAVEIS_2025,
} from '../data/generated/progressao_2025';
import {
  RAMOS_ESPECIALIDADES,
  ESPECIALIDADES_GUIA,
  REQUISITOS_GUIA,
} from '../data/generated/especialidades_guia';

export type SearchKind = 'bloco' | 'acao_fixa' | 'acao_variavel' | 'especialidade' | 'requisito' | 'biblioteca';

export interface SearchDoc {
  id: string;             // único: "bloco-1-r2", "acaoF-3-r1-2", "esp-45", "req-45-3"
  kind: SearchKind;
  title: string;
  body: string;
  // Campos de contexto (usado para renderizar o resultado, não para busca)
  ramoNome?: string;
  eixoNome?: string;
  blocoNome?: string;
  blocoOrdem?: number;
  especialidadeNome?: string;
  ramoEspecialidade?: string;
  modalidade?: string;
  sourcePath?: string;
  sourcePdf?: string | null;
  blockIndex?: number;
  pdfPage?: number | null;
}

let _index: MiniSearch<SearchDoc> | null = null;
let _docs: Map<string, SearchDoc> = new Map();

// R10: Computar hash simples baseado no tamanho dos datasets
const computeDatasetHash = (): string => {
  return `${BLOCOS_2025.length}-${ACOES_FIXAS_2025.length}-${ACOES_VARIAVEIS_2025.length}-${ESPECIALIDADES_GUIA.length}-${REQUISITOS_GUIA.length}`;
};

const buildIndex = () => {
  // R10: Tentar carregar índice do cache
  const currentHash = computeDatasetHash();
  const cached = localStorage.getItem(SEARCH_INDEX_KEY);
  if (cached) {
    try {
      const { hash, idxJson, docs: docsArray } = JSON.parse(cached);
      if (hash === currentHash) {
        const minisearchOptions = {
          fields: ['title', 'body'],
          storeFields: ['id', 'kind', 'title', 'body', 'ramoNome', 'eixoNome', 'blocoNome', 'blocoOrdem', 'especialidadeNome', 'ramoEspecialidade', 'modalidade'],
          searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 } },
        };
        const index = MiniSearch.loadJSON(idxJson, minisearchOptions);
        _docs = new Map(docsArray);
        return index;
      }
    } catch (e) {
      // Cache inválido, ignorar e reconstruir
    }
  }

  // Reconstruir índice
  const docs: SearchDoc[] = [];

  // Blocos por ramo
  for (const bloco of BLOCOS_2025) {
    const eixo = EIXOS_2025.find(e => e.id === bloco.eixoId);
    for (const ramo of RAMOS_2025) {
      const meta = BLOCO_RAMO_META_2025.find(m => m.blocoId === bloco.id && m.ramoId === ramo.id);
      docs.push({
        id: `bloco-${bloco.id}-r${ramo.id}`,
        kind: 'bloco',
        title: `B${bloco.ordemGlobal} · ${bloco.nome} (${ramo.nome})`,
        body: meta?.intencionalidade || '',
        ramoNome: ramo.nome,
        eixoNome: eixo?.nome,
        blocoNome: bloco.nome,
        blocoOrdem: bloco.ordemGlobal,
      });
    }
  }

  // Ações fixas
  for (const a of ACOES_FIXAS_2025) {
    const bloco = BLOCOS_2025.find(b => b.id === a.blocoId);
    const ramo = RAMOS_2025.find(r => r.id === a.ramoId);
    if (!bloco || !ramo) continue;
    docs.push({
      id: `acaoF-${a.blocoId}-r${a.ramoId}-${a.ordem}`,
      kind: 'acao_fixa',
      title: `[Fixa] ${a.descricao.slice(0, 80)}${a.descricao.length > 80 ? '…' : ''}`,
      body: a.descricao,
      ramoNome: ramo.nome,
      blocoNome: bloco.nome,
      blocoOrdem: bloco.ordemGlobal,
      modalidade: a.modalidade,
    });
  }

  // Ações variáveis
  for (const a of ACOES_VARIAVEIS_2025) {
    const bloco = BLOCOS_2025.find(b => b.id === a.blocoId);
    const ramo = RAMOS_2025.find(r => r.id === a.ramoId);
    if (!bloco || !ramo) continue;
    docs.push({
      id: `acaoV-${a.blocoId}-r${a.ramoId}-${a.ordem}`,
      kind: 'acao_variavel',
      title: `[Variável] ${a.descricao.slice(0, 80)}${a.descricao.length > 80 ? '…' : ''}`,
      body: a.descricao,
      ramoNome: ramo.nome,
      blocoNome: bloco.nome,
      blocoOrdem: bloco.ordemGlobal,
      modalidade: a.modalidade,
    });
  }

  // Especialidades
  for (const esp of ESPECIALIDADES_GUIA) {
    const ramo = RAMOS_ESPECIALIDADES.find(r => r.id === esp.ramoId);
    docs.push({
      id: `esp-${esp.id}`,
      kind: 'especialidade',
      title: esp.nome,
      body: `${ramo?.nome || ''} — ${esp.totalItens} itens`,
      ramoEspecialidade: ramo?.nome,
    });
  }

  // Requisitos de especialidades
  for (const req of REQUISITOS_GUIA) {
    const esp = ESPECIALIDADES_GUIA.find(e => e.id === req.especialidadeId);
    if (!esp) continue;
    docs.push({
      id: `req-${req.especialidadeId}-${req.posicao}`,
      kind: 'requisito',
      title: `${esp.nome} · req. ${req.posicao}`,
      body: req.texto,
      especialidadeNome: esp.nome,
    });
  }

  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'body'],
    storeFields: ['id', 'kind', 'title', 'body', 'ramoNome', 'eixoNome', 'blocoNome', 'blocoOrdem', 'especialidadeNome', 'ramoEspecialidade', 'modalidade'],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 } },
  });
  index.addAll(docs);
  _docs = new Map(docs.map(d => [d.id, d]));

  // R10: Persistir índice em localStorage
  try {
    const cacheData = {
      hash: currentHash,
      idxJson: index.toJSON(),
      docs: Array.from(_docs.entries()),
    };
    localStorage.setItem(SEARCH_INDEX_KEY, JSON.stringify(cacheData));
  } catch (e) {
    // QuotaExceededError ou outro erro: continuar sem cachear
  }

  return index;
};

export const getSearchIndex = (): MiniSearch<SearchDoc> => {
  if (!_index) _index = buildIndex();
  return _index;
};

export const search = (query: string, limit = 30): SearchDoc[] => {
  if (!query.trim()) return [];
  const idx = getSearchIndex();
  const results = idx.search(query, { fuzzy: 0.2, prefix: true });
  return results.slice(0, limit).map(r => _docs.get(r.id as string)).filter(Boolean) as SearchDoc[];
};

export const getDocCount = (): number => {
  if (!_index) buildIndex();
  return _docs.size;
};

export interface LibrarySearchOutcome {
  results: SearchDoc[];
  ok: boolean;
  // 'unavailable' quando o backend de busca (FTS5) nao esta acessivel —
  // tipicamente porque o componente de consulta nao esta presente nesta maquina.
  unavailable?: boolean;
  error?: string;
}

export const searchLibrary = async (query: string, limit = 20): Promise<LibrarySearchOutcome> => {
  if (!query.trim()) return { results: [], ok: true };
  if (window.fileSystem?.searchLibrary) {
    const response = await window.fileSystem.searchLibrary(query, limit);
    if (!response.ok) {
      // Qualquer falha do backend de busca (componente de consulta ausente,
      // indice FTS5 nao encontrado, erro de execucao) significa, para o usuario,
      // "busca dentro dos livros indisponivel" — sem acoplar a UI ao texto do erro.
      return { results: [], ok: false, unavailable: true, error: response.error };
    }
    return {
      ok: true,
      results: response.results.map(item => ({
        id: `biblioteca-${item.id}`,
        kind: 'biblioteca',
        title: item.title,
        body: item.snippet,
        sourcePath: item.sourcePath,
        sourcePdf: item.sourcePdf,
        blockIndex: item.blockIndex,
        pdfPage: item.pdfPage,
      })),
    };
  }
  const { searchWebLibrary } = await import('./webLibraryService');
  return searchWebLibrary(query, limit);
};
