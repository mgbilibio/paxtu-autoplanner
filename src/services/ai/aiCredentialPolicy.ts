import type { AppConfig } from '../../types.ts';

const SECRET_FIELDS: Array<keyof AppConfig> = [
  'apiKey',
  'xaiApiKey',
  'ollamaCloudApiKey',
];

export const credentialsBelongToAccount = (
  config: AppConfig | null | undefined,
  uid: string | null | undefined,
): boolean => {
  if (!config || !uid) return false;
  if (!config.aiCredentialUid) return false;
  return config.aiCredentialUid === uid;
};

export const configAfterLogout = (
  config: AppConfig,
  uid?: string | null,
): AppConfig => {
  const remember = config.rememberAiCredentials === true && !!uid && config.aiCredentialUid === uid;
  if (remember) return { ...config, aiCredentialUid: uid };
  const cleared: AppConfig = { ...config };
  for (const field of SECRET_FIELDS) {
    (cleared as unknown as Record<string, unknown>)[field] = '';
  }
  cleared.aiCredentialUid = undefined;
  return cleared;
};
