/** Mensagem única quando o daemon local não responde ou o navegador é bloqueado por CORS. */
export const OLLAMA_LOCAL_ORIGIN_HINT =
  'Ollama precisa estar rodando e aceitar a origem do site';

export const isOllamaLocalTransportFailure = (cause?: string): boolean => {
  if (!cause) return true;
  return /failed to fetch|networkerror|load failed|cors|blocked|timeout|aborterror|typeerror/i.test(cause);
};

/** Erro em português para listagem/geração local — nunca menciona aplicativo desktop. */
export const explainOllamaLocalFailure = (base: string, cause?: string): string => {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? ` (${window.location.origin})`
      : '';
  if (isOllamaLocalTransportFailure(cause)) {
    return `${OLLAMA_LOCAL_ORIGIN_HINT}${origin}. Confira o daemon em ${base}.`;
  }
  return `Ollama local não está acessível em ${base}${cause ? `: ${cause}` : '.'}`;
};
