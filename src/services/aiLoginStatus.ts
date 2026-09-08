export type AiLoginKind = 'gemini' | 'grok';

export interface AiLoginFacts {
  hasGeminiCredentials: boolean;
  geminiProbe?: 'ok' | 'fail' | 'skipped';
  hasXaiApiKey: boolean;
  webSessionConnected: boolean;
  proxyConfigured: boolean;
  isWeb: boolean;
  desktopConnected?: boolean;
  desktopInstalled?: boolean;
  grokProbe?: 'ok' | 'fail' | 'skipped';
}

export interface AiLoginState {
  online: boolean;
  label: string;
  detail: string;
}

export const deriveGeminiLoginStatus = (facts: Pick<AiLoginFacts, 'hasGeminiCredentials' | 'geminiProbe'>): AiLoginState => {
  if (!facts.hasGeminiCredentials) {
    return { online: false, label: 'Gemini', detail: 'Offline — sem chave ou login Gemini.' };
  }
  if (facts.geminiProbe === 'fail') {
    return { online: false, label: 'Gemini', detail: 'Offline — a verificação da conta Gemini falhou.' };
  }
  if (facts.geminiProbe === 'ok') {
    return { online: true, label: 'Gemini', detail: 'Online — login Gemini utilizável.' };
  }
  return { online: false, label: 'Gemini', detail: 'Offline — aguardando verificação da conta.' };
};

export const deriveGrokLoginStatus = (facts: AiLoginFacts): AiLoginState => {
  const desktopOk = facts.desktopConnected === true && facts.desktopInstalled !== false;
  const webSessionOk = facts.isWeb && facts.webSessionConnected && facts.proxyConfigured;
  const keyLooksPresent = facts.hasXaiApiKey;

  if (facts.isWeb && !facts.proxyConfigured && !keyLooksPresent) {
    return { online: false, label: 'Grok', detail: 'Offline — falta o proxy xOAuth (VITE_XAI_PROXY_URL) e não há chave.' };
  }
  if (facts.isWeb && facts.proxyConfigured && !facts.webSessionConnected && !keyLooksPresent) {
    return { online: false, label: 'Grok', detail: 'Offline — entre com X / Grok ou cole uma chave.' };
  }
  if (!facts.isWeb && facts.desktopInstalled === false && !keyLooksPresent) {
    return { online: false, label: 'Grok', detail: 'Offline — cliente Grok Build não encontrado.' };
  }
  if (!webSessionOk && !desktopOk && !keyLooksPresent) {
    return { online: false, label: 'Grok', detail: 'Offline — sem sessão Grok e sem chave xAI.' };
  }
  if (facts.grokProbe === 'fail') {
    return { online: false, label: 'Grok', detail: 'Offline — a verificação da sessão/chave Grok falhou.' };
  }
  if (facts.grokProbe === 'ok' || desktopOk) {
    return { online: true, label: 'Grok', detail: 'Online — login Grok utilizável.' };
  }
  return { online: false, label: 'Grok', detail: 'Offline — aguardando verificação da conta.' };
};
