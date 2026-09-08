/** IDs do catálogo Google Gemini — não entram no seletor Ollama. */
export const belongsInOllamaSelector = (id: string): boolean => {
  const value = id.trim();
  if (!value) return false;
  if (/^gemini[-/]/i.test(value) && !/:cloud\b/i.test(value) && !/preview/i.test(value)) {
    return false;
  }
  return true;
};
