import MiniSearch from 'minisearch';
import type { FonteNormativa } from './pdfLinkService';
import type { LibrarySearchOutcome, SearchDoc } from './searchService';

type BookLoader = () => Promise<string>;

const BOOK_LOADERS: Record<FonteNormativa, BookLoader> = {
  manual_lobinho_2025: () =>
    import('../../conhecimento/biblioteca_md/2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR/markdown.md?raw').then(m => m.default),
  manual_escoteiro_2025: () =>
    import('../../conhecimento/biblioteca_md/2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR/markdown.md?raw').then(m => m.default),
  por_2026: () =>
    import('../../conhecimento/biblioteca_md/POR 2026.02/markdown.md?raw').then(m => m.default),
  guia_especialidades_2024: () =>
    import('../../conhecimento/biblioteca_md/Guia de Especialidades 18a Edição - 2024-1/markdown.md?raw').then(m => m.default),
  especialidades_erga_sc: () =>
    import('../../conhecimento/biblioteca_md/250615 - Especialidades no sistema de Progressão Pessoal - ERGA SC/markdown.md?raw').then(m => m.default),
  examinador_especialidades: () =>
    import('../../conhecimento/biblioteca_md/examinador_especialidades/markdown.md?raw').then(m => m.default),
  guia_chefe: () =>
    import('../../conhecimento/biblioteca_md/Guia_do_chefe_escoteiro/markdown.md?raw').then(m => m.default),
  guia_monitores: () =>
    import('../../conhecimento/biblioteca_md/Guia_pratico_para_monitores/markdown.md?raw').then(m => m.default),
  atividades_lobinho: () =>
    import('../../conhecimento/biblioteca_md/Atividades_educativas_para_o_ramo_lobinho/markdown.md?raw').then(m => m.default),
  caderno_jornada: () =>
    import('../../conhecimento/biblioteca_md/CadernoDeJornadaEscoteira/markdown.md?raw').then(m => m.default),
};

const BOOK_TITLES: Record<FonteNormativa, string> = {
  manual_lobinho_2025: 'Manual do Escotista — Lobinho 2025',
  manual_escoteiro_2025: 'Manual do Escotista — Escoteiro 2025',
  guia_especialidades_2024: 'Guia de Especialidades 18ª Ed. 2024-1',
  por_2026: 'POR 2026.02 — Princípios, Organização e Regras',
  guia_chefe: 'Guia do Chefe Escoteiro',
  guia_monitores: 'Guia Prático para Monitores',
  atividades_lobinho: 'Atividades Educativas — Ramo Lobinho',
  caderno_jornada: 'Caderno de Jornada Escoteira',
  examinador_especialidades: 'Examinador de Especialidades',
  especialidades_erga_sc: 'Especialidades no Sistema de Progressão Pessoal — ERGA SC',
};

const markdownCache = new Map<FonteNormativa, string>();
let libraryIndex: MiniSearch<SearchDoc> | null = null;
let libraryDocs = new Map<string, SearchDoc>();
let libraryIndexPromise: Promise<void> | null = null;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const loadBookMarkdown = async (fonte: FonteNormativa): Promise<string> => {
  const cached = markdownCache.get(fonte);
  if (cached) return cached;
  const text = await BOOK_LOADERS[fonte]();
  markdownCache.set(fonte, text);
  return text;
};

const chunkMarkdown = (text: string, size = 800): string[] => {
  const cleaned = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\r\n/g, '\n');
  const paragraphs = cleaned.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length > size && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

export const markdownToReadableHtml = (md: string, title: string, highlight?: string): string => {
  const withoutImages = md.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  const lines = withoutImages.split('\n');
  const parts: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    parts.push(`<p>${escapeHtml(para.join(' '))}</p>`);
    para = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flush();
      parts.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flush();
      parts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flush();
      parts.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
      continue;
    }
    para.push(trimmed.replace(/^[-*]\s+/, '• '));
  }
  flush();
  let body = parts.join('\n');
  if (highlight) {
    const safe = escapeHtml(highlight.slice(0, 80));
    if (safe) {
      body = body.replace(safe, `<mark id="trecho">${safe}</mark>`);
    }
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font-family:Georgia,serif;max-width:820px;margin:0 auto;padding:24px;line-height:1.65;color:#1e293b;background:#fff}
h1,h2,h3{font-family:system-ui,sans-serif;color:#0f172a}
.note{background:#eff6ff;border-left:4px solid #2563eb;padding:12px 14px;margin-bottom:20px;font-family:system-ui,sans-serif;font-size:14px;line-height:1.45}
mark{background:#fde68a;padding:0 2px}
</style></head><body>
<div class="note">Consulta em texto no navegador — o mesmo acervo da Biblioteca. No aplicativo desktop o PDF original abre no leitor do sistema. Use <strong>Baixar HTML</strong> para guardar uma cópia.</div>
${body}
${highlight ? '<script>document.getElementById("trecho")?.scrollIntoView({block:"center"});</script>' : ''}
</body></html>`;
};

const dispatchHtmlPreview = (fileName: string, html: string): void => {
  window.dispatchEvent(new CustomEvent('paxtu:html-preview', { detail: { fileName, html } }));
};

export const previewBookInBrowser = async (
  fonte: FonteNormativa,
  page = 1,
  highlight?: string,
): Promise<void> => {
  const title = BOOK_TITLES[fonte];
  const markdown = await loadBookMarkdown(fonte);
  const html = markdownToReadableHtml(markdown, `${title}${page > 1 ? ` · p. ${page}` : ''}`, highlight);
  dispatchHtmlPreview(`${fonte}.html`, html);
};

export const openUserGuideInBrowser = async (): Promise<void> => {
  if (window.fileSystem?.openGuide) {
    const result = await window.fileSystem.openGuide();
    if (result && result.ok === false) {
      window.dispatchEvent(new CustomEvent('paxtu:toast', {
        detail: { kind: 'error', message: result.error || 'Não foi possível abrir o guia.' },
      }));
    }
    return;
  }
  const html = (await import('../../docs/usersmanual.html?raw')).default;
  dispatchHtmlPreview('Guia_de_Uso_Paxtu.html', html);
};

const ensureLibraryIndex = async (): Promise<void> => {
  if (libraryIndex) return;
  if (libraryIndexPromise) return libraryIndexPromise;
  libraryIndexPromise = (async () => {
    const docs: SearchDoc[] = [];
    const fontes = Object.keys(BOOK_LOADERS) as FonteNormativa[];
    const texts = await Promise.all(fontes.map(fonte => loadBookMarkdown(fonte)));
    fontes.forEach((fonte, bookIndex) => {
      const chunks = chunkMarkdown(texts[bookIndex]);
      chunks.forEach((chunk, blockIndex) => {
        docs.push({
          id: `biblioteca-web-${fonte}-${blockIndex}`,
          kind: 'biblioteca',
          title: `${BOOK_TITLES[fonte]} · trecho ${blockIndex + 1}`,
          body: chunk.slice(0, 400),
          sourcePath: BOOK_TITLES[fonte],
          sourcePdf: fonte,
          blockIndex,
          pdfPage: blockIndex + 1,
        });
      });
    });
    const index = new MiniSearch<SearchDoc>({
      fields: ['title', 'body'],
      storeFields: ['id', 'kind', 'title', 'body', 'sourcePath', 'sourcePdf', 'blockIndex', 'pdfPage'],
      searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 } },
    });
    index.addAll(docs);
    libraryIndex = index;
    libraryDocs = new Map(docs.map(doc => [doc.id, doc]));
  })();
  try {
    await libraryIndexPromise;
  } catch (error) {
    libraryIndexPromise = null;
    throw error;
  }
};

export const searchWebLibrary = async (query: string, limit = 20): Promise<LibrarySearchOutcome> => {
  if (!query.trim()) return { results: [], ok: true };
  try {
    await ensureLibraryIndex();
    if (!libraryIndex) return { results: [], ok: false, unavailable: true, error: 'Índice da biblioteca indisponível.' };
    const hits = libraryIndex.search(query, { fuzzy: 0.2, prefix: true }).slice(0, limit);
    return {
      ok: true,
      results: hits.map(hit => libraryDocs.get(String(hit.id))).filter(Boolean) as SearchDoc[],
    };
  } catch (error) {
    return {
      results: [],
      ok: false,
      unavailable: true,
      error: error instanceof Error ? error.message : 'Falha ao indexar a biblioteca no navegador.',
    };
  }
};

export const previewLibrarySearchHit = async (doc: SearchDoc): Promise<void> => {
  const fonte = (doc.sourcePdf || '') as FonteNormativa;
  if (!fonte || !(fonte in BOOK_LOADERS)) return;
  await previewBookInBrowser(fonte, doc.pdfPage || 1, doc.body.slice(0, 80));
};
