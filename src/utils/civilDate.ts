/** Datas civis locais: nunca usar toISOString() para “hoje” sem horário. */

export const shiftVisibleMonth = (visible: Date, offset: number): Date =>
  new Date(visible.getFullYear(), visible.getMonth() + offset, 1);

export const formatCivilDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const civilDateInTimeZone = (date: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

export const isCivilToday = (dateStr: string, now: Date = new Date()): boolean =>
  dateStr === formatCivilDate(now);
