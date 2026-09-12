import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cancelGenerationSnapshot,
  createGenerationSnapshot,
  isActiveGeneration,
  listingMatchesProvider,
} from './generationControl.ts';

describe('generation cancel and provider capture', () => {
  it('does not apply a later step after cancel', () => {
    const run = createGenerationSnapshot(1, 'gemini', 'flash');
    cancelGenerationSnapshot(run);
    assert.equal(isActiveGeneration(run, 1), false);
    assert.equal(run.abort.signal.aborted, true);
  });

  it('drops a listing from another provider', () => {
    assert.equal(listingMatchesProvider('gemini', 'ollama-local'), false);
    assert.equal(listingMatchesProvider('gemini', 'gemini'), true);
  });
});
