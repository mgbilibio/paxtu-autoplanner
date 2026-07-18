// Extracao robusta de JSON de respostas de LLM (objeto OU array), tolerando
// cercas markdown e prosa ao redor. Compartilhado por Gemini e Ollama.
export const extractJson = <T,>(raw: string): T | null => {
  if (!raw) return null;
  // 1. Parse direto.
  try { return JSON.parse(raw) as T; } catch { /* tenta abaixo */ }
  // 2. Remove cercas markdown.
  const stripped = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped) as T; } catch { /* fallback heuristico */ }
  // 3. Captura o primeiro bloco {...} ou [...] balanceado — o que comecar antes.
  const candidates = [stripped.match(/\{[\s\S]*\}/), stripped.match(/\[[\s\S]*\]/)]
    .filter(Boolean) as RegExpMatchArray[];
  candidates.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const m of candidates) {
    try { return JSON.parse(m[0]) as T; } catch { /* proximo candidato */ }
  }
  return null;
};
