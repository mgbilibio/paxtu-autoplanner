// Catálogo de manuais oficiais e materiais de apoio que a IA pode citar como
// referência ao gerar atividades. Usado tanto por Gemini quanto por Ollama.
//
// Quando o LLM amarra uma atividade a um manual, o usuário pode buscar a página
// no PDF original via botão 📄 (R5).

export interface ManualReferencia {
  titulo: string;
  ramo: 'lobinho' | 'escoteiro' | 'todos';
  tipo: 'manual' | 'guia' | 'caderno' | 'apoio';
  descricao: string;
  // Tópicos/seções que aparecem no manual — útil para o LLM amarrar atividades
  topicos?: string[];
}

export const MANUAIS_REFERENCIA: ManualReferencia[] = [
  {
    titulo: 'Manual do Escotista 2025 — Lobinho',
    ramo: 'lobinho',
    tipo: 'manual',
    descricao: 'Referência normativa do Ramo Lobinho. Cap.9 traz o Sistema de Progressão Pessoal com 4 eixos, 18 blocos, ações fixas e variáveis.',
    topicos: [
      'Acolhida e Promessa do Lobinho',
      'Caçadas (atividades de matilha)',
      'Mística da Selva (Mowgli, Akelá, Bagheera)',
      '18 Blocos de Aprendizagem',
      'Caminho do Caçador (desafio do Cruzeiro do Sul)',
      'Roca de Conselho',
    ],
  },
  {
    titulo: 'Manual do Escotista 2025 — Escoteiro',
    ramo: 'escoteiro',
    tipo: 'manual',
    descricao: 'Referência normativa do Ramo Escoteiro. Cap.9 detalha o Sistema de Progressão Pessoal e a Jornada de Travessia para Lis de Ouro.',
    topicos: [
      'Sistema de Patrulhas',
      'Conselho de Patrulha e Corte de Honra',
      'Assembleia de Tropa',
      '18 Blocos de Aprendizagem',
      'Jornada de Travessia (Percurso de Gilwell)',
      'Vida ao Ar Livre (acampamento, pioneiras, nós)',
    ],
  },
  {
    titulo: 'Guia de Especialidades 18ª Ed. 2024-1',
    ramo: 'todos',
    tipo: 'guia',
    descricao: 'Catálogo implementado no app para consulta e transição: 274 especialidades do programa anterior, em 5 ramos do conhecimento, com 3 níveis cumulativos. Não substituir pelos Guias de Especialidades e Insígnias 2025 sem importação integral.',
    topicos: [
      'Ciência e Tecnologia',
      'Cultura',
      'Desportos',
      'Serviços',
      'Habilidades Escoteiras',
    ],
  },
  {
    titulo: 'Caderno de Jornada Escoteira',
    ramo: 'escoteiro',
    tipo: 'caderno',
    descricao: 'Apoio metodológico para a chefia conduzir a Jornada Escoteira (sequência educativa).',
  },
  {
    titulo: 'Guia Prático para Monitores',
    ramo: 'escoteiro',
    tipo: 'apoio',
    descricao: 'Material para monitores e secretários de patrulha conduzirem reuniões e atividades.',
  },
  {
    titulo: 'Guia do Chefe Escoteiro',
    ramo: 'todos',
    tipo: 'apoio',
    descricao: 'Manual didático para chefes em formação. Foca em métodos pedagógicos, condução de fogo de conselho e cerimônias.',
  },
  {
    titulo: 'Fogo de Conselho (Ed. 2019)',
    ramo: 'todos',
    tipo: 'apoio',
    descricao: 'Repertório de canções, esquetes e dinâmicas para Fogos de Conselho.',
  },
  {
    titulo: 'POR — Princípios, Organização e Regras',
    ramo: 'todos',
    tipo: 'manual',
    descricao: 'Documento normativo oficial da UEB. Use a versão vigente mais recente para decisões formais.',
  },
];

export const buildManuaisContextForBranch = (branch: 'Lobinho' | 'Escoteiro' | string): string => {
  const ramoSlug = branch === 'Lobinho' ? 'lobinho' : branch === 'Escoteiro' ? 'escoteiro' : 'todos';
  const relevantes = MANUAIS_REFERENCIA.filter(m => m.ramo === ramoSlug || m.ramo === 'todos');
  return relevantes
    .map((m, i) => {
      const top = m.topicos ? ` Tópicos: ${m.topicos.slice(0, 4).join(', ')}.` : '';
      return `${i + 1}. ${m.titulo} (${m.tipo}). ${m.descricao}${top}`;
    })
    .join('\n');
};
