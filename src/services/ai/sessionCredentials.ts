import type { AppConfig } from '../../types.ts';
import { clearGeminiOAuthAccessToken } from '../googleAuth';
import { saveAppConfig } from '../storage/configStorage';
import { clearXaiBrowserSession } from '../xaiOAuthSession';
import { configAfterLogout } from './aiCredentialPolicy';

export { credentialsBelongToAccount } from './aiCredentialPolicy';

export const clearAiSessionOnLogout = (config: AppConfig | null, uid?: string | null): AppConfig | null => {
  clearGeminiOAuthAccessToken();
  clearXaiBrowserSession();
  if (!config) return null;
  const next = configAfterLogout(config, uid);
  saveAppConfig(next);
  return next;
};
