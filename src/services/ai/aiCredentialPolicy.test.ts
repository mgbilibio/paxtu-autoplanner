import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { configAfterLogout, credentialsBelongToAccount } from './aiCredentialPolicy.ts';
import type { AppConfig } from '../../types.ts';

const config = (over: Partial<AppConfig> = {}): AppConfig => ({
  apiKey: 'AIza-secret-a',
  dataFolder: '',
  isConfigured: true,
  xaiApiKey: 'xai-a',
  ollamaCloudApiKey: 'ollama-a',
  ...over,
});

describe('AI credentials across accounts', () => {
  it('does not let account B inherit account A keys after logout', () => {
    const afterA = configAfterLogout(config({
      rememberAiCredentials: false,
      aiCredentialUid: 'uid-a',
    }), 'uid-a');
    assert.equal(afterA.apiKey, '');
    assert.equal(afterA.xaiApiKey, '');
    assert.equal(credentialsBelongToAccount(afterA, 'uid-b'), false);
  });

  it('remembered keys stay bound to the same uid only', () => {
    const kept = configAfterLogout(config({
      rememberAiCredentials: true,
      aiCredentialUid: 'uid-a',
    }), 'uid-a');
    assert.equal(kept.apiKey, 'AIza-secret-a');
    assert.equal(credentialsBelongToAccount(kept, 'uid-b'), false);
    assert.equal(credentialsBelongToAccount(kept, 'uid-a'), true);
  });
});
