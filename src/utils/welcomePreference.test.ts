import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearWelcomePreference,
  hideWelcomePermanently,
  shouldShowWelcome,
} from './welcomePreference.ts';

const memory = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageStub, configurable: true });

describe('welcomePreference', () => {
  it('shows the home screen until the user opts out', () => {
    clearWelcomePreference();
    assert.equal(shouldShowWelcome(), true);
    hideWelcomePermanently();
    assert.equal(shouldShowWelcome(), false);
    clearWelcomePreference();
    assert.equal(shouldShowWelcome(), true);
  });
});
