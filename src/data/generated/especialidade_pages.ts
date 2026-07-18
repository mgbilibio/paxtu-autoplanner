// Mapa gerado: id da especialidade -> pagina no PDF do Guia de Especialidades 18a Ed.
// Fonte: conhecimento/tools/build_especialidade_pages.py (titulo + texto dos requisitos).
import paginasJson from './especialidade_pages.json';

const PAGINAS = paginasJson as Record<string, number>;

// Pagina do guia onde a especialidade comeca; undefined se nao mapeada.
export const pdfPageForEspecialidade = (especialidadeId: number): number | undefined =>
  PAGINAS[String(especialidadeId)];
