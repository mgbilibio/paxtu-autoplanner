import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { RELEASE_MANIFEST } from './releaseManifest.ts';

describe('release manifest', () => {
  it('names compatible frontend, rules, worker and data schema', () => {
    assert.equal(RELEASE_MANIFEST.frontend, 'web-spa');
    assert.match(RELEASE_MANIFEST.firestoreRulesRevision, /authz/);
    assert.equal(RELEASE_MANIFEST.worker, 'paxtu-xai-proxy');
    assert.ok(RELEASE_MANIFEST.dataSchema);
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.equal(pkg.scripts.build, 'tsc && vite build --mode web');
    assert.equal(pkg.scripts['electron:build'], undefined);
  });
});
