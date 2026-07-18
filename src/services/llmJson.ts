// Extracao robusta de JSON de respostas de LLM (objeto OU array), tolerando
// cercas markdown, prosa, trailing commas e cercas incompletas.
// Compartilhado por Gemini e Ollama.

const stripBomAndNoise = (raw: string): string =>
  raw
    .replace(/^\uFEFF/, '')
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

/** Remove trailing commas antes de } ou ] (comum em LLMs). */
const stripTrailingCommas = (s: string): string =>
  s.replace(/,\s*([}\]])/g, '$1');

const tryParse = <T,>(s: string): T | null => {
  try {
    return JSON.parse(s) as T;
  } catch {
    try {
      return JSON.parse(stripTrailingCommas(s)) as T;
    } catch {
      return null;
    }
  }
};

/** Extrai bloco {...} ou [...] com contagem de chaves (ignora strings). */
const extractBalanced = (text: string, open: '{' | '['): string | null => {
  const close = open === '{' ? '}' : ']';
  const start = text.indexOf(open);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // truncado
};

export const extractJson = <T,>(raw: string): T | null => {
  if (!raw) return null;
  const direct = tryParse<T>(raw);
  if (direct !== null) return direct;

  const stripped = stripBomAndNoise(raw);
  const afterStrip = tryParse<T>(stripped);
  if (afterStrip !== null) return afterStrip;

  // Preferir objeto; se array começar antes, usar array.
  const objIdx = stripped.indexOf('{');
  const arrIdx = stripped.indexOf('[');
  const preferObj = objIdx >= 0 && (arrIdx < 0 || objIdx <= arrIdx);

  const candidates = preferObj
    ? [extractBalanced(stripped, '{'), extractBalanced(stripped, '[')]
    : [extractBalanced(stripped, '['), extractBalanced(stripped, '{')];

  for (const block of candidates) {
    if (!block) continue;
    const parsed = tryParse<T>(block);
    if (parsed !== null) return parsed;
  }
  return null;
};
