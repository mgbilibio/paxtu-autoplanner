// Mapeia fonte normativa -> caminho do PDF para abrir em página específica via IPC.
// Usa shell.openExternal('file://...#page=N') no main process.
//
// Fallback (sem Electron, ex: dev no browser): mostra alert com a referência manual.

export type FonteNormativa =
  | 'manual_lobinho_2025'
  | 'manual_escoteiro_2025'
  | 'guia_especialidades_2024'
  | 'por_2026'
  | 'guia_chefe'
  | 'guia_monitores'
  | 'atividades_lobinho'
  | 'caderno_jornada'
  | 'examinador_especialidades'
  | 'especialidades_erga_sc';

const PDF_PATHS: Record<FonteNormativa, string> = {
  manual_lobinho_2025: 'docs/biblioteca/2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR.pdf',
  manual_escoteiro_2025: 'docs/biblioteca/2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR.pdf',
  guia_especialidades_2024: 'docs/biblioteca/Guia de Especialidades 18a Edição - 2024-1.pdf',
  por_2026: 'docs/biblioteca/POR 2026.02.pdf',
  guia_chefe: 'docs/biblioteca/Guia_do_chefe_escoteiro.pdf',
  guia_monitores: 'docs/biblioteca/Guia_pratico_para_monitores.pdf',
  atividades_lobinho: 'docs/biblioteca/Atividades_educativas_para_o_ramo_lobinho.pdf',
  caderno_jornada: 'docs/biblioteca/CadernoDeJornadaEscoteira (1).pdf',
  examinador_especialidades: 'docs/biblioteca/examinador_especialidades (1).pdf',
  especialidades_erga_sc: 'docs/biblioteca/250615 - Especialidades no sistema de Progressão Pessoal - ERGA SC.pdf',
};

const FRIENDLY_NAMES: Record<FonteNormativa, string> = {
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

export const openPdfAtPage = async (fonte: FonteNormativa, page: number): Promise<void> => {
  const relativePath = PDF_PATHS[fonte];
  if (!relativePath || !page) return;

  if (window.fileSystem?.openPdfAtPage) {
    const result = await window.fileSystem.openPdfAtPage(relativePath, page);
    if (result && result.ok === false) {
      window.dispatchEvent(new CustomEvent('paxtu:toast', {
        detail: {
          kind: 'error',
          message: `Nao foi possivel abrir ${FRIENDLY_NAMES[fonte]}: ${result.error || 'arquivo nao encontrado'}`,
        },
      }));
    }
    return;
  }

  window.dispatchEvent(new CustomEvent('paxtu:toast', {
    detail: {
      kind: 'info',
      message: `Consultar ${FRIENDLY_NAMES[fonte]}, pagina ${page}. Arquivo: ${relativePath}`,
    },
  }));
};

export const fonteParaRamo = (ramoSlug: string): FonteNormativa | null => {
  if (ramoSlug === 'lobinho') return 'manual_lobinho_2025';
  if (ramoSlug === 'escoteiro') return 'manual_escoteiro_2025';
  return null;
};
