// Ferramenta de Equivalência UEB — Ramo Escoteiro (fev/2026).
// Fonte oficial (não versionar o PDF):
// https://www.escoteiros.org.br/wp-content/uploads/2026/02/Equivalencia_ramo_escoteiro.pdf
//
// A etapa POR 2025+ vem da CONTAGEM de blocos concluídos, não de “etapa antiga → N blocos”:
// Pistas 0–3, Trilha 4–7, Rumo 8–12, Travessia 13–18.
// Códigos complementares: PT = Pistas/Trilha; RT = Rumo/Travessia.
// BLOCOS_2025 ids 1–18 (src/data/generated/progressao_2025.ts).

export const UEB_EQUIVALENCIA_FONTE =
  'https://www.escoteiros.org.br/wp-content/uploads/2026/02/Equivalencia_ramo_escoteiro.pdf';

export const UEB_EQUIVALENCIA_CITA = 'Ferramenta de Equivalência UEB — Ramo Escoteiro (fev/2026)';

export const TRANSICAO_LIMITE = '2027-06-30';

export type EtapaEscoteiro = 'Pistas' | 'Trilha' | 'Rumo' | 'Travessia';

export const ETAPA_POR_BLOCOS: ReadonlyArray<{ etapa: EtapaEscoteiro; min: number; max: number }> = [
  { etapa: 'Pistas', min: 0, max: 3 },
  { etapa: 'Trilha', min: 4, max: 7 },
  { etapa: 'Rumo', min: 8, max: 12 },
  { etapa: 'Travessia', min: 13, max: 18 },
];

export interface EquivalenciaBloco {
  blocoId: number;
  nome: string;
  variaveisMinimo: number;
  complementares: {
    pt: readonly string[];
    rt: readonly string[];
  };
  especialidades: readonly string[];
  insignias: readonly string[];
}

const CODE_RE = /(?:\b(pt|rt)\b[\s-]*)?([ficsae])\s*-?\s*(\d{1,3})\b/i;

/** Normaliza item oficial (I22, PT I22, i-22) para o token da tabela (I22). */
export const normalizeCode = (raw: string): string => {
  const text = String(raw || '').trim();
  const match = text.match(CODE_RE);
  if (!match) return text.toUpperCase().replace(/[\s-]/g, '');
  return `${match[2].toUpperCase()}${Number.parseInt(match[3], 10)}`;
};

export const EQUIVALENCIA_BLOCOS: readonly EquivalenciaBloco[] = [
  {
    blocoId: 1,
    nome: 'Aprendizagem Contínua e Desenvolvimento Vocacional',
    variaveisMinimo: 4,
    complementares: {
      pt: ['I22', 'I23', 'I24', 'I25', 'I26', 'I32', 'I33'],
      rt: ['I21', 'I22', 'I23', 'I24'],
    },
    especialidades: [],
    insignias: ['Insígnia do Aprender', 'Grumete', 'Aviador'],
  },
  {
    blocoId: 2,
    nome: 'Autonomia e Liderança',
    variaveisMinimo: 5,
    complementares: {
      pt: ['I28', 'I29', 'I30', 'I31', 'S73', 'S74', 'S75', 'S76'],
      rt: ['I25', 'I26', 'I27', 'I28', 'C51', 'C52', 'C53', 'C54'],
    },
    especialidades: [
      'Administração',
      'Educação Financeira',
      'Empreendedorismo',
      'Oratória',
      'Reparos Domésticos',
    ],
    insignias: [],
  },
  {
    blocoId: 3,
    nome: 'Criatividade e Inovação',
    variaveisMinimo: 4,
    complementares: {
      pt: ['I34', 'I35', 'I36', 'I37', 'I38', 'I39'],
      rt: ['I36', 'I38', 'I41', 'I42', 'I43', 'I44', 'I45', 'I46'],
    },
    especialidades: [
      'Arte Digital',
      'Artes Visuais',
      'Artesanato',
      'Comédia',
      'Costura e Estilismo',
      'Encadernação',
      'Fotografia',
      'Grafite',
      'HQ',
      'Maquete',
      'Pintura',
      'Plastimodelismo',
      'Propaganda e Marketing',
      'Robótica',
      'Videomaker',
    ],
    insignias: [],
  },
  {
    blocoId: 4,
    nome: 'Inteligência Emocional',
    variaveisMinimo: 4,
    complementares: {
      pt: ['C42', 'C43', 'C44', 'C45', 'C52', 'C53', 'C54'],
      rt: ['C47', 'C48', 'C49', 'C50', 'C63', 'C64', 'C65', 'C66', 'C67', 'C68', 'C69'],
    },
    especialidades: [],
    insignias: [],
  },
  {
    blocoId: 5,
    nome: 'Consumo Responsável',
    variaveisMinimo: 5,
    complementares: {
      pt: [],
      rt: ['I39', 'I40'],
    },
    especialidades: ['Horticultura', 'Reduzir Reciclar e Reutilizar'],
    insignias: [],
  },
  {
    blocoId: 6,
    nome: 'Mudanças Climáticas',
    variaveisMinimo: 5,
    complementares: {
      pt: ['I27'],
      rt: ['S100', 'S101', 'S102'],
    },
    especialidades: ['Meteorologia'],
    insignias: ['Escoteiros pela energia Solar'],
  },
  {
    blocoId: 7,
    nome: 'Preservação da Biodiversidade',
    variaveisMinimo: 5,
    complementares: {
      pt: ['S94', 'S95', 'S96'],
      rt: [],
    },
    especialidades: ['Botânica', 'Oceanologia', 'Zoologia'],
    insignias: ['Campeões da Natureza'],
  },
  {
    blocoId: 8,
    nome: 'Vida ao Ar Livre',
    variaveisMinimo: 5,
    complementares: {
      pt: ['F1', 'I21', 'I40', 'I41', 'I42'],
      rt: [],
    },
    especialidades: ['Acampamento', 'Excursões', 'Montanhismo', 'Pioneiria', 'Sobrevivência'],
    insignias: [],
  },
  {
    blocoId: 9,
    nome: 'Comunidade',
    variaveisMinimo: 3,
    complementares: {
      pt: ['S80', 'S81'],
      rt: ['I33', 'I34', 'I35', 'S88', 'S89', 'S90', 'S91'],
    },
    especialidades: ['Defesa Civil'],
    insignias: ['Mensageiros da Paz', 'Insígnia da Ação Comunitária'],
  },
  {
    blocoId: 10,
    nome: 'Democracia',
    variaveisMinimo: 2,
    complementares: {
      pt: ['A59', 'A60', 'A61', 'A62', 'S77', 'S78', 'S79'],
      rt: ['S81', 'S82', 'S83', 'S84', 'S85', 'S86', 'S87'],
    },
    especialidades: [],
    insignias: [],
  },
  {
    blocoId: 11,
    nome: 'Herança Cultural',
    variaveisMinimo: 5,
    complementares: {
      pt: ['S84', 'S85', 'S86', 'S87'],
      rt: [],
    },
    especialidades: [
      'Brasilidades',
      'Genealogia',
      'Informações Turísticas',
      'Tradições dos Povos Originários',
    ],
    insignias: [],
  },
  {
    blocoId: 12,
    nome: 'Promoção da Paz',
    variaveisMinimo: 4,
    complementares: {
      pt: ['A65', 'A66', 'A67', 'S71', 'S92', 'S93', 'E107', 'E108'],
      rt: ['A70', 'A71', 'A72', 'S78', 'S79', 'S80', 'S99', 'E112', 'E113'],
    },
    especialidades: [],
    insignias: ['Lusofonia', 'Cone Sul'],
  },
  {
    blocoId: 13,
    nome: 'Valores',
    variaveisMinimo: 3,
    complementares: {
      pt: ['C46', 'C47', 'C48', 'C49', 'A63', 'A64', 'S88', 'S89', 'S90', 'S91', 'E100', 'E101', 'E102'],
      rt: ['C55', 'C56', 'C57', 'C58', 'C59', 'S95', 'S96', 'S97', 'S98', 'E109', 'E110', 'E111'],
    },
    especialidades: [],
    insignias: ['Escotismo Mundial'],
  },
  {
    blocoId: 14,
    nome: 'Cuidado com o Corpo',
    variaveisMinimo: 4,
    complementares: {
      pt: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'S82', 'S83'],
      rt: [],
    },
    especialidades: ['Anatomia Humana', 'Prevenção em Saúde', 'Primeiros Socorros'],
    insignias: [],
  },
  {
    blocoId: 15,
    nome: 'Espiritualidade',
    variaveisMinimo: 4,
    complementares: {
      pt: ['E97', 'E98', 'E99', 'E103', 'E104', 'E105', 'E106'],
      rt: ['E103', 'E104', 'E105', 'E106', 'E107', 'E108'],
    },
    especialidades: ['Yoga'],
    insignias: [],
  },
  {
    blocoId: 16,
    nome: 'Hábitos Saudáveis',
    variaveisMinimo: 3,
    complementares: {
      pt: ['F2', 'F3', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F19', 'F20'],
      rt: ['F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F19', 'F20'],
    },
    especialidades: ['Nutrição'],
    insignias: [],
  },
  {
    blocoId: 17,
    nome: 'Saúde Mental',
    variaveisMinimo: 2,
    complementares: {
      pt: ['F16', 'F17', 'F18', 'C50', 'C51', 'A55', 'A56', 'A57', 'A58'],
      rt: ['F15', 'F16', 'F17', 'F18', 'C60', 'C61', 'C62'],
    },
    especialidades: [],
    insignias: [],
  },
  {
    blocoId: 18,
    nome: 'Vínculos Saudáveis',
    variaveisMinimo: 4,
    complementares: {
      pt: ['A68', 'A69', 'A70'],
      rt: ['I29', 'I30', 'I31', 'I32', 'A73', 'A74', 'A75', 'A76', 'A77'],
    },
    especialidades: ['Prevenção ao Bullying'],
    insignias: [],
  },
];

/** Aliases só para casar nomes oficiais/Marechal — não geram códigos. */
export const UEB_NOME_ALIASES: Record<string, readonly string[]> = {
  'insignia do aprender': ['aprender'],
  grumete: ['insignia da modalidade do mar - grumete', 'insignia do mar - grumete'],
  aviador: ['insignia da modalidade do ar - aviador', 'insignia do ar - aviador'],
  'reduzir reciclar e reutilizar': [
    'reduzir, reciclar, reutilizar',
    'reduzir reciclar reutilizar',
    'reduzir, reciclar e reutilizar',
  ],
  'escoteiros pela energia solar': ['escoteiros pela energia solar'],
  'campeoes da natureza': ['campeoes da natureza'],
  'mensageiros da paz': ['insignia mensageiros da paz'],
  'insignia da acao comunitaria': ['acao comunitaria', 'insignia de acao comunitaria'],
  lusofonia: ['insignia da lusofonia'],
  'cone sul': ['insignia do cone sul'],
  'escotismo mundial': ['insignia do escotismo mundial', 'insignia mundial'],
  'tradicoes dos povos originarios': ['povos originarios'],
  'informacoes turisticas': ['informacao turistica'],
  'prevencao em saude': ['prevencao de saude'],
  'prevencao ao bullying': ['bullying'],
};
