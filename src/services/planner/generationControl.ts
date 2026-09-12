export type GenerationSnapshot = {
  id: number;
  cancelled: boolean;
  providerId: string;
  model: string;
  abort: AbortController;
};

export const createGenerationSnapshot = (
  id: number,
  providerId: string,
  model: string,
): GenerationSnapshot => ({
  id,
  cancelled: false,
  providerId,
  model,
  abort: new AbortController(),
});

export const isActiveGeneration = (current: GenerationSnapshot | null, runId: number): boolean =>
  !!current && current.id === runId && !current.cancelled;

export const cancelGenerationSnapshot = (current: GenerationSnapshot | null): GenerationSnapshot | null => {
  if (!current) return current;
  current.cancelled = true;
  current.abort.abort();
  return current;
};

export const listingMatchesProvider = (
  requestedProvider: string,
  selectedProvider: string,
): boolean => requestedProvider === selectedProvider;
