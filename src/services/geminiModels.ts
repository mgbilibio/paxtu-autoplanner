/**
 * Preferência Flash-Lite e fallbacks offline.
 * O catálogo ao vivo da conta tem prioridade; esta lista NÃO é o inventário
 * completo da Gemini — só evita UI vazia e geração sem modelo quando a
 * listagem falha ou ainda não há credencial.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

/** Alias estável + IDs recentes conhecidos. Preferir o retorno de models.list. */
export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash-lite',
] as const;

const FALLBACK_LABELS: Record<string, string> = {
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite — mais barato/rápido (padrão)',
  'gemini-flash-lite-latest': 'Gemini Flash-Lite latest (alias)',
  'gemini-3.6-flash': 'Gemini 3.6 Flash',
  'gemini-3.7-flash': 'Gemini 3.7 Flash — mais capaz',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash-Lite',
};

export const offlineGeminiModels = (): string[] => [...GEMINI_FALLBACK_MODELS];

export const geminiVersionScore = (id: string): number => {
  const match = id.match(/gemini-(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
};

export const isSelectableFlashModel = (id: string): boolean =>
  /gemini/i.test(id)
  && /flash/i.test(id)
  && !/pro|image|tts|embed|live|vision/i.test(id);

export const geminiModelLabel = (id: string): string =>
  FALLBACK_LABELS[id] || id.replace(/^gemini-/, 'Gemini ');

export const pickPreferredGeminiModel = (models: string[], current?: string): string => {
  const pool = models.length > 0 ? models : offlineGeminiModels();
  const trimmed = current?.trim();
  if (trimmed && pool.includes(trimmed)) return trimmed;
  const lite = pool.filter(id => /flash-lite/i.test(id) && isSelectableFlashModel(id));
  if (lite.length > 0) {
    return [...lite].sort((a, b) => geminiVersionScore(b) - geminiVersionScore(a) || b.localeCompare(a))[0];
  }
  const flash = pool.filter(id => isSelectableFlashModel(id));
  if (flash.length > 0) {
    return [...flash].sort((a, b) => geminiVersionScore(b) - geminiVersionScore(a) || b.localeCompare(a))[0];
  }
  return pool[0] || DEFAULT_GEMINI_MODEL;
};

export const withGeminiCatalogFallback = (live: string[]): string[] => {
  const unique = Array.from(new Set(live.filter(isSelectableFlashModel)))
    .sort((a, b) => geminiVersionScore(b) - geminiVersionScore(a) || b.localeCompare(a));
  return unique.length > 0 ? unique : offlineGeminiModels();
};
