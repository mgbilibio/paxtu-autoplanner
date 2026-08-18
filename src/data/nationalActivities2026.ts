import type { ScoutBranch } from '../types';

export type NationalDatePolicy = 'fixed' | 'flexible';

export interface NationalActivityWindow {
  title: string;
  start: string;
  end: string;
  /** `all` = todos os ramos. Caso contrário, só os ScoutBranch listados. */
  ramos: 'all' | ScoutBranch[];
  /** `fixed` = fim de semana/janela nacional rígida; `flexible` = a UEL pode deslocar. */
  datePolicy: NationalDatePolicy;
  /** Página do índice no Caderno de Atividades 2026. */
  cadernoPage: number;
}

const ESCOTEIRO_PLUS: ScoutBranch[] = ['Escoteiro', 'Sênior', 'Pioneiro'] as ScoutBranch[];
const LOBINHO_PLUS: ScoutBranch[] = ['Lobinho', 'Escoteiro', 'Sênior', 'Pioneiro'] as ScoutBranch[];

/** Janelas oficiais UEB 2026 (títulos + datas + ramos). Sem corpo de ficha. */
export const NATIONAL_ACTIVITIES_2026: NationalActivityWindow[] = [
  {
    title: 'Semana Escoteira 2026',
    start: '2026-04-11',
    end: '2026-04-26',
    ramos: 'all',
    datePolicy: 'flexible',
    cadernoPage: 9,
  },
  {
    title: '10º EducAção Escoteira',
    start: '2026-05-01',
    end: '2026-05-31',
    ramos: 'all',
    datePolicy: 'flexible',
    cadernoPage: 74,
  },
  {
    title: 'Mutirão Nacional de Doação de Sangue e Cadastro REDOME (junho)',
    start: '2026-06-01',
    end: '2026-06-14',
    ramos: ESCOTEIRO_PLUS,
    datePolicy: 'fixed',
    cadernoPage: 36,
  },
  {
    title: 'Mutirão Nacional de Doação de Sangue e Cadastro REDOME (novembro)',
    start: '2026-11-14',
    end: '2026-11-28',
    ramos: ESCOTEIRO_PLUS,
    datePolicy: 'fixed',
    cadernoPage: 36,
  },
  {
    title: '12º Grande Jogo Aéreo',
    start: '2026-04-28',
    end: '2026-06-28',
    ramos: LOBINHO_PLUS,
    datePolicy: 'flexible',
    cadernoPage: 48,
  },
  {
    title: '35º Mutirão Nacional Escoteiro de Ação Ecológica',
    start: '2026-06-01',
    end: '2026-06-30',
    ramos: 'all',
    datePolicy: 'flexible',
    cadernoPage: 108,
  },
  {
    title: "14º Scout's Field Day",
    start: '2026-06-20',
    end: '2026-06-21',
    ramos: ESCOTEIRO_PLUS,
    datePolicy: 'fixed',
    cadernoPage: 147,
  },
  {
    title: '9º Dia do Amigo',
    start: '2026-08-01',
    end: '2026-08-31',
    ramos: 'all',
    datePolicy: 'flexible',
    cadernoPage: 167,
  },
  {
    title: 'Grande Jogo Naval 2026',
    start: '2026-08-15',
    end: '2026-08-16',
    ramos: LOBINHO_PLUS,
    datePolicy: 'fixed',
    cadernoPage: 185,
  },
  {
    title: '6º Atividade Nacional de Radioescotismo em Echolink e DMR',
    start: '2026-08-29',
    end: '2026-08-30',
    ramos: ESCOTEIRO_PLUS,
    datePolicy: 'fixed',
    cadernoPage: 219,
  },
  {
    title: '28º Mutirão Nacional de Ação Comunitária',
    start: '2026-09-01',
    end: '2026-09-30',
    ramos: 'all',
    datePolicy: 'flexible',
    cadernoPage: 232,
  },
  {
    title: '69º JOTA e 30º JOTI',
    start: '2026-10-16',
    end: '2026-10-18',
    ramos: 'all',
    datePolicy: 'fixed',
    cadernoPage: 266,
  },
];
