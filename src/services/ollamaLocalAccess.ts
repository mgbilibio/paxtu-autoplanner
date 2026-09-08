/** Origem do site publicado. O daemon precisa aceitar esta origem (CORS / OLLAMA_ORIGINS). */
export const OLLAMA_PAGES_ORIGIN = 'https://mgbilibio.github.io';

/** Mensagem única quando o daemon local não responde, CORS ou conteúdo misto bloqueia. */
export const OLLAMA_LOCAL_ORIGIN_HINT =
  `Ollama precisa estar rodando e aceitar a origem ${OLLAMA_PAGES_ORIGIN}`;

export const isOllamaLocalTransportFailure = (cause?: string): boolean => {
  if (!cause) return true;
  return /failed to fetch|networkerror|load failed|cors|blocked|timeout|aborterror|typeerror|mixed content|conteúdo misto|insecure/i.test(cause);
};

/** Erro em português para listagem/geração local — fala na origem do site, não em outro cliente. */
export const explainOllamaLocalFailure = (base: string, cause?: string): string => {
  if (isOllamaLocalTransportFailure(cause)) {
    return `${OLLAMA_LOCAL_ORIGIN_HINT}. Se o daemon estiver parado, o CORS bloquear ou o navegador bloquear conteúdo misto, confira o daemon em ${base}.`;
  }
  return `Ollama local não está acessível em ${base}${cause ? `: ${cause}` : '.'}`;
};

/** Falha Cloud no navegador (CORS, rede, chave). */
export const explainOllamaCloudFailure = (cause?: string): string => {
  if (!cause || /failed to fetch|networkerror|load failed|cors|blocked|timeout|aborterror|typeerror/i.test(cause)) {
    return 'Ollama Cloud não respondeu (CORS ou rede). Confira a chave em ollama.com/settings/keys e tente Listar modelos de novo.';
  }
  return `Ollama Cloud não está acessível: ${cause}`;
};
