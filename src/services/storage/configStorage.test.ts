import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { migrateOllamaContext } from './configStorage.ts';
import type { AppConfig } from '../../types.ts';

const base = (over: Partial<AppConfig> = {}): AppConfig => ({
  apiKey: '',
  dataFolder: '',
  isConfigured: true,
  ...over,
});

describe('Ollama context migration', () => {
  it('keeps a saved 32768 on reopen', () => {
    const first = migrateOllamaContext(base({ ollamaGenerationContext: 32768 }));
    assert.equal(first.ollamaGenerationContext, 32768);
    const again = migrateOllamaContext(first);
    assert.equal(again.ollamaGenerationContext, 32768);
  });
});
