import React, { useState, useEffect, useMemo } from 'react';
import { search, searchLibrary, getDocCount, SearchDoc, SearchKind } from '../services/searchService';

interface Props {
  onClose: () => void;
}

const KIND_LABEL: Record<SearchKind, string> = {
  bloco: 'Bloco',
  acao_fixa: 'Ação Fixa',
  acao_variavel: 'Ação Variável',
  especialidade: 'Especialidade',
  requisito: 'Requisito',
  biblioteca: 'Biblioteca',
};

const KIND_COLOR: Record<SearchKind, string> = {
  bloco: 'bg-indigo-100 text-indigo-800',
  acao_fixa: 'bg-rose-100 text-rose-800',
  acao_variavel: 'bg-blue-100 text-blue-800',
  especialidade: 'bg-amber-100 text-amber-800',
  requisito: 'bg-gray-100 text-gray-700',
  biblioteca: 'bg-emerald-100 text-emerald-800',
};

export const GlobalSearch: React.FC<Props> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchKind | 'all'>('all');
  const [libraryResults, setLibraryResults] = useState<SearchDoc[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryUnavailable, setLibraryUnavailable] = useState(false);

  const results = useMemo(() => search(query, 50), [query]);
  const combinedResults = useMemo(
    () => [...results, ...libraryResults],
    [results, libraryResults],
  );
  const filtered = useMemo(
    () => filter === 'all' ? combinedResults : combinedResults.filter(r => r.kind === filter),
    [combinedResults, filter],
  );

  const totalDocs = useMemo(() => getDocCount(), []);

  const openLibraryPdf = async (doc: SearchDoc) => {
    if (!doc.sourcePdf || !doc.pdfPage || !window.fileSystem?.openPdfAtPage) return;
    const result = await window.fileSystem.openPdfAtPage(doc.sourcePdf, doc.pdfPage);
    if (!result.ok) {
      window.dispatchEvent(new CustomEvent('paxtu:toast', {
        detail: { kind: 'error', message: 'PDF nao encontrado para esta fonte.' },
      }));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let canceled = false;
    const term = query.trim();
    if (term.length < 3) {
      setLibraryResults([]);
      setLibraryLoading(false);
      return;
    }
    setLibraryLoading(true);
    searchLibrary(term, 20).then(outcome => {
      if (canceled) return;
      setLibraryResults(outcome.results);
      setLibraryUnavailable(!outcome.ok && !!outcome.unavailable);
    }).finally(() => {
      if (!canceled) setLibraryLoading(false);
    });
    return () => {
      canceled = true;
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-gray-50">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔎 Buscar em blocos, ações, especialidades, requisitos e biblioteca..."
            className="w-full text-lg p-3 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
          />
          <div className="flex gap-1 mt-3 flex-wrap">
            {(['all', 'bloco', 'acao_fixa', 'acao_variavel', 'especialidade', 'requisito', 'biblioteca'] as const).map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 min-h-[36px] text-xs rounded-full font-medium ${
                  filter === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {k === 'all' ? `Todos (${combinedResults.length})` : `${KIND_LABEL[k]} (${combinedResults.filter(r => r.kind === k).length})`}
              </button>
            ))}
            {libraryLoading && <span className="text-xs text-gray-400 px-2 py-1.5">Biblioteca...</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!query && (
            <div className="p-8 text-center text-gray-400 text-sm">
              <p className="text-3xl mb-3">🔍</p>
              <p>Indexados <strong>{totalDocs}</strong> documentos operacionais.</p>
              <p className="text-xs mt-1">No app desktop, a busca também consulta a biblioteca FTS5 local.</p>
              <p className="text-xs mt-2">Digite um termo (ex: "fogueira", "compostagem", "primeiros socorros").</p>
              <p className="text-xs mt-1 opacity-60">ESC para fechar.</p>
            </div>
          )}

          {query.trim().length >= 3 && libraryUnavailable && (
            <div className="m-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              📚 A busca <strong>dentro dos livros</strong> está indisponível nesta máquina.
              Os resultados acima cobrem blocos, ações e especialidades. Para consultar os
              livros, abra-os pela <strong>Biblioteca</strong> (menu POR 2025+).
            </div>
          )}

          {query && filtered.length === 0 && !libraryUnavailable && (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhum resultado.</div>
          )}

          {filtered.map(doc => (
            <div key={doc.id} className="p-3 border-b hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${KIND_COLOR[doc.kind]} shrink-0`}>
                  {KIND_LABEL[doc.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{doc.body}</p>
                  <div className="flex gap-2 mt-1 text-[10px] text-gray-500 flex-wrap">
                    {doc.ramoNome && <span>🏕️ {doc.ramoNome}</span>}
                    {doc.eixoNome && <span>· {doc.eixoNome}</span>}
                    {doc.blocoNome && doc.kind !== 'bloco' && (
                      <span>· B{doc.blocoOrdem} {doc.blocoNome}</span>
                    )}
                    {doc.modalidade && doc.modalidade !== 'geral' && (
                      <span className="font-bold">{doc.modalidade === 'ar' ? '✈️ Ar' : '⚓ Mar'}</span>
                    )}
                    {doc.ramoEspecialidade && <span>📘 {doc.ramoEspecialidade}</span>}
                    {doc.especialidadeNome && <span>· {doc.especialidadeNome}</span>}
                    {doc.sourcePath && <span>📚 {doc.sourcePath} · bloco {doc.blockIndex}</span>}
                    {doc.sourcePdf && doc.pdfPage && <span>· PDF p. {doc.pdfPage}</span>}
                  </div>
                  {doc.kind === 'biblioteca' && doc.sourcePdf && doc.pdfPage && (
                    <button
                      type="button"
                      onClick={() => openLibraryPdf(doc)}
                      className="mt-2 text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    >
                      Abrir PDF p. {doc.pdfPage}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
