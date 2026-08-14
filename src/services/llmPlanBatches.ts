/** Lotes pequenos: letra/cartões/script em 8–12 faixas estouram MAX_TOKENS num JSON só. */
export const DETAIL_BATCH_SIZE = 4;
export const STUDY_GUIDE_BATCH_SIZE = 6;

export const chunkArray = <T>(items: T[], size: number): T[][] => {
  const n = Math.max(1, size);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
};

type DetailRow = {
  title?: string;
  progressionObjective?: string;
};

/** Casa detalhe da etapa 2 na estrutura: título, depois código, depois índice. */
export const mergeActivityDetails = <T extends DetailRow>(
  structureActs: T[],
  detailsArr: Array<Partial<T> | null | undefined>,
): T[] => {
  const details = detailsArr.filter(Boolean) as Array<Partial<T>>;
  const used = new Set<number>();
  return (structureActs || []).map((act, idx) => {
    let detailIdx = details.findIndex((d, i) => !used.has(i) && d?.title === act.title);
    if (detailIdx < 0) {
      detailIdx = details.findIndex((d, i) =>
        !used.has(i) && d?.progressionObjective && d.progressionObjective === act.progressionObjective);
    }
    if (detailIdx < 0 && !used.has(idx) && details[idx]) {
      console.warn(`Merge etapa 2: fallback por índice para atividade "${act.title}" (título/objetivo não casaram).`);
      detailIdx = idx;
    }
    if (detailIdx < 0) return act;
    used.add(detailIdx);
    return { ...act, ...details[detailIdx] };
  });
};
