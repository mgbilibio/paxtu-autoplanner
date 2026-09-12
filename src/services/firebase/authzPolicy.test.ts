import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bootstrapPayloadAllowed,
  buildInviteUserPayload,
  EMAIL_NOT_VERIFIED_MESSAGE,
  inviteConsumePatchAllowed,
  inviteSectionIds,
  selfAdminLockViolation,
  userCreateMatchesInvite,
} from './authzPolicy.ts';

const actor = (over: Partial<{ uid: string; email: string; emailVerified: boolean }> = {}) => ({
  uid: 'uid-assist',
  email: 'assistente@grupo.test',
  emailVerified: true,
  ...over,
});

const invite = {
  email: 'assistente@grupo.test',
  role: 'Assistente',
  isAdmin: false,
  active: true,
  sectionIds: ['tropa-1'],
};

describe('invite create cannot raise privileges', () => {
  it('accepts payload copied from the invite', () => {
    const payload = buildInviteUserPayload(actor(), invite, 'Ana');
    assert.equal(userCreateMatchesInvite(payload, invite, actor()), true);
  });

  it('rejects assistant creating an admin profile', () => {
    const payload = buildInviteUserPayload(actor(), invite, 'Ana');
    payload.isAdmin = true;
    payload.role = 'ADMINISTRADOR';
    payload.sectionIds = [];
    assert.equal(userCreateMatchesInvite(payload, invite, actor()), false);
  });

  it('rejects claiming another section', () => {
    const payload = buildInviteUserPayload(actor(), invite, 'Ana');
    payload.sectionIds = ['alcateia-9'];
    assert.equal(userCreateMatchesInvite(payload, invite, actor()), false);
  });

  it('rejects unverified email consuming the invite', () => {
    const payload = buildInviteUserPayload(actor({ emailVerified: false }), invite, 'Ana');
    assert.equal(userCreateMatchesInvite(payload, invite, actor({ emailVerified: false })), false);
    assert.match(EMAIL_NOT_VERIFIED_MESSAGE, /e-mail/i);
  });
});

describe('bootstrap allowlist', () => {
  it('refuses a uid that is not pre-authorized', () => {
    const payload = {
      email: 'a@x.test',
      role: 'ADMINISTRADOR',
      isAdmin: true,
      active: true,
      pendingApproval: false,
      rejected: false,
      sectionIds: [] as string[],
    };
    assert.equal(bootstrapPayloadAllowed(payload, actor({ uid: 'bob', email: 'a@x.test' }), 'alice'), false);
    assert.equal(bootstrapPayloadAllowed(payload, actor({ uid: 'alice', email: 'a@x.test' }), 'alice'), true);
  });
});

describe('invite consume and self-admin lock', () => {
  it('allows the invited uid to mark the invite consumed', () => {
    assert.equal(
      inviteConsumePatchAllowed(invite, { active: false, consumedByUid: 'uid-assist' }, actor()),
      true,
    );
  });

  it('blocks an admin from dropping their own admin flag', () => {
    assert.equal(
      selfAdminLockViolation('adm', 'adm', { isAdmin: true, active: true }, { isAdmin: false, active: true }),
      true,
    );
    assert.equal(
      selfAdminLockViolation('adm', 'other', { isAdmin: true, active: true }, { isAdmin: false, active: true }),
      false,
    );
  });
});

describe('inviteSectionIds', () => {
  it('reads list or single sectionId', () => {
    assert.deepEqual(inviteSectionIds({ sectionIds: ['a', 'b'] }), ['a', 'b']);
    assert.deepEqual(inviteSectionIds({ sectionId: 'a' }), ['a']);
  });
});
