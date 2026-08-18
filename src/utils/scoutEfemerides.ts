import type { ScoutBranch } from '../types';

export interface ScoutEfemeride {
  monthDay: string;
  title: string;
  ramos: 'all' | ScoutBranch[];
}

/** Datas fixas já usadas na agenda. Não inventar feriados. */
export const SCOUT_EFEMERIDES: ScoutEfemeride[] = [
  { monthDay: '02-22', title: '🎂 Dia do Fundador (B-P)', ramos: 'all' },
  { monthDay: '04-23', title: '⚜️ Dia Mundial do Escoteiro', ramos: 'all' },
  { monthDay: '05-30', title: '🦁 Dia do Ramo Lobinho', ramos: ['Lobinho'] as ScoutBranch[] },
  { monthDay: '08-01', title: '🌍 Dia Mundial do Lenço', ramos: 'all' },
  { monthDay: '10-04', title: '🐺 Dia de Francisco de Assis (Lobinho)', ramos: ['Lobinho'] as ScoutBranch[] },
  { monthDay: '10-19', title: '📡 JOTA-JOTI (Início)', ramos: 'all' },
  { monthDay: '10-20', title: '📡 JOTA-JOTI (Fim)', ramos: 'all' },
  { monthDay: '12-05', title: '🤝 Dia Internacional do Voluntário', ramos: 'all' },
];

/** Sem ramo (visão global) mostra todas. Dias compartilhados ficam em todos os ramos. */
export const efemerideForDay = (
  monthDay: string,
  viewingBranch?: ScoutBranch | null,
): string | undefined => {
  const item = SCOUT_EFEMERIDES.find(entry => entry.monthDay === monthDay);
  if (!item) return undefined;
  if (!viewingBranch || item.ramos === 'all' || item.ramos.includes(viewingBranch)) {
    return item.title;
  }
  return undefined;
};
