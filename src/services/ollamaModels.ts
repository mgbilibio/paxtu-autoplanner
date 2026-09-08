/** IDs do catálogo Google Gemini — nunca entram no seletor Ollama (local ou Cloud). */
export const belongsInOllamaSelector = (id: string): boolean => {
  const value = id.trim();
  if (!value) return false;
  if (/^gemini(?:[-/]|$)/i.test(value)) return false;
  return true;
};
