import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GROUP_BACKUP_KIND, GROUP_BACKUP_VERSION, preflightGroupBackup } from './backupPreflight.ts';
import { nextRestoreSlice, restoreFingerprint } from './restoreJournal.ts';

const backup = (over: Record<string, unknown> = {}) => ({
  kind: GROUP_BACKUP_KIND,
  version: GROUP_BACKUP_VERSION,
  exportedAt: '2026-09-11T00:00:00.000Z',
  users: { adm: { email: 'a@x.test', isAdmin: true } },
  invites: {},
  groups: {},
  sections: { tropa: { name: 'Tropa' } },
  sectionDocs: {},
  memberDocs: {},
  ...over,
});

describe('backup preflight and restore journal', () => {
  it('starts no writes on unknown version or bad refs', () => {
    const future = preflightGroupBackup(backup({ version: 99 }), { uid: 'adm', projectId: 'scoutsauto-d3068' });
    assert.equal(future.ok, false);
    const orphan = preflightGroupBackup(
      backup({ memberDocs: { missing: { m1: { bloco: { '1': {} } } } } }),
      { uid: 'adm' },
    );
    assert.equal(orphan.ok, false);
  });

  it('resumes after the first batch of 400', () => {
    const ops = Array.from({ length: 401 }, (_, i) => i);
    const first = nextRestoreSlice(ops, 0, 400);
    assert.equal(first.length, 400);
    const rest = nextRestoreSlice(ops, 400, 400);
    assert.deepEqual(rest, [400]);
    assert.equal(restoreFingerprint(401, 1), '1:401');
  });
});
