import React from 'react';
import { openPdfAtPage, FonteNormativa } from '../services/pdfLinkService';

interface BookEntry {
  fonte: FonteNormativa;
  title: string;
  subtitle: string;
  icon: string;
  category: 'fundamental' | 'progressao' | 'especialidades' | 'atividades' | 'apoio';
}

const BOOKS: BookEntry[] = [
  {
    fonte: 'manual_lobinho_2025',
    title: 'Manual do Escotista — Lobinho',
    subtitle: 'POR 2025 — Ramo Lobinho (6.5 a 10 anos)',
    icon: '🐺',
    category: 'fundamental',
  },
  {
    fonte: 'manual_escoteiro_2025',
    title: 'Manual do Escotista — Escoteiro',
    subtitle: 'POR 2025 — Ramo Escoteiro (11 a 14 anos)',
    icon: '⚜️',
    category: 'fundamental',
  },
  {
    fonte: 'por_2026',
    title: 'POR 2026.02',
    subtitle: 'Princípios, Organização e Regras vigentes',
    icon: '📕',
    category: 'fundamental',
  },
  {
    fonte: 'guia_especialidades_2024',
    title: 'Guia de Especialidades — 18ª Edição',
    subtitle: '274 especialidades catalogadas (2024-1)',
    icon: '📘',
    category: 'especialidades',
  },
  {
    fonte: 'especialidades_erga_sc',
    title: 'Especialidades no Sistema de Progressão',
    subtitle: 'ERGA SC — abordagem prática integrada',
    icon: '📗',
    category: 'especialidades',
  },
  {
    fonte: 'examinador_especialidades',
    title: 'Examinador de Especialidades',
    subtitle: 'Guia operacional para examinadores',
    icon: '✅',
    category: 'especialidades',
  },
  {
    fonte: 'guia_chefe',
    title: 'Guia do Chefe Escoteiro',
    subtitle: 'Referência geral para chefes',
    icon: '🎓',
    category: 'apoio',
  },
  {
    fonte: 'guia_monitores',
    title: 'Guia Prático para Monitores',
    subtitle: 'Conduzindo monitores e patrulhas',
    icon: '🧭',
    category: 'apoio',
  },
  {
    fonte: 'atividades_lobinho',
    title: 'Atividades Educativas — Lobinho',
    subtitle: 'Banco de atividades por bloco para Lobinho',
    icon: '🎯',
    category: 'atividades',
  },
  {
    fonte: 'caderno_jornada',
    title: 'Caderno de Jornada Escoteira',
    subtitle: 'Conceitos, ritos e momentos da jornada',
    icon: '📓',
    category: 'atividades',
  },
];

const CATEGORY_LABEL: Record<BookEntry['category'], string> = {
  fundamental: 'Documentos Fundamentais',
  progressao: 'Progressão',
  especialidades: 'Especialidades',
  atividades: 'Atividades',
  apoio: 'Apoio à Chefia',
};

const CATEGORY_ORDER: BookEntry['category'][] = [
  'fundamental',
  'especialidades',
  'atividades',
  'apoio',
];

interface Props {
  onClose: () => void;
}

export const BibliotecaView: React.FC<Props> = ({ onClose }) => {
  const openBook = async (book: BookEntry) => {
    await openPdfAtPage(book.fonte, 1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">Biblioteca</p>
          <h2 className="text-2xl font-black text-slate-800">📚 Acervo Oficial</h2>
          <p className="text-sm text-slate-500 mt-1">
            {BOOKS.length} livros prontos para consulta. Clicar abre o PDF na 1ª página no leitor padrão do sistema.
            Para buscar conteúdo específico, use <kbd className="bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[10px]">Ctrl+K</kbd> e a busca filtra também por Biblioteca.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm font-bold text-slate-500 hover:text-slate-800 px-3 py-1"
        >
          ← Voltar
        </button>
      </div>

      {CATEGORY_ORDER.map(category => {
        const items = BOOKS.filter(b => b.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3 px-1">
              {CATEGORY_LABEL[category]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(book => (
                <button
                  key={book.fonte}
                  onClick={() => openBook(book)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-4xl shrink-0">{book.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 line-clamp-2">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{book.subtitle}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">{book.fonte}</span>
                    <span className="text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800">
                      Abrir →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
