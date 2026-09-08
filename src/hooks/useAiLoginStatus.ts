import { useCallback, useEffect, useState } from 'react';
import { AI_LOGIN_CHANGED_EVENT } from '../services/aiLoginEvents';
import {
  AiLoginState,
  deriveGeminiLoginStatus,
  deriveGrokLoginStatus,
} from '../services/aiLoginStatus';
import { hasGeminiCredentials, probeGeminiCredentials } from '../services/geminiService';
import { isWebApp } from '../services/platform';
import { getAppConfig } from '../services/storageService';
import { getXaiBrowserStatus } from '../services/xaiOAuthSession';
import { probeGrokCredentials } from '../services/xaiService';

const emptyGemini = (): AiLoginState =>
  deriveGeminiLoginStatus({ hasGeminiCredentials: hasGeminiCredentials(), geminiProbe: 'skipped' });

const emptyGrok = (): AiLoginState => {
  const browser = getXaiBrowserStatus();
  return deriveGrokLoginStatus({
    hasGeminiCredentials: hasGeminiCredentials(),
    hasXaiApiKey: Boolean(getAppConfig()?.xaiApiKey?.trim()),
    webSessionConnected: browser.connected,
    proxyConfigured: browser.proxyConfigured,
    isWeb: isWebApp(),
    grokProbe: 'skipped',
  });
};

export const useAiLoginStatus = (): {
  gemini: AiLoginState;
  grok: AiLoginState;
  refresh: () => Promise<void>;
} => {
  const [gemini, setGemini] = useState<AiLoginState>(emptyGemini);
  const [grok, setGrok] = useState<AiLoginState>(emptyGrok);

  const refresh = useCallback(async () => {
    const geminiCreds = hasGeminiCredentials();
    const xaiKey = Boolean(getAppConfig()?.xaiApiKey?.trim());
    const browser = getXaiBrowserStatus();
    const [geminiProbe, grokProbe] = await Promise.all([
      probeGeminiCredentials(),
      probeGrokCredentials(),
    ]);
    setGemini(deriveGeminiLoginStatus({ hasGeminiCredentials: geminiCreds, geminiProbe }));
    setGrok(deriveGrokLoginStatus({
      hasGeminiCredentials: geminiCreds,
      hasXaiApiKey: xaiKey,
      webSessionConnected: browser.connected,
      proxyConfigured: browser.proxyConfigured,
      isWeb: true,
      grokProbe,
    }));
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    const onFocus = (): void => { void refresh(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener(AI_LOGIN_CHANGED_EVENT, onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(AI_LOGIN_CHANGED_EVENT, onFocus);
    };
  }, [refresh]);

  return { gemini, grok, refresh };
};
