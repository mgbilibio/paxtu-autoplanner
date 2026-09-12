import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT = 'demo-scoutsauto';
const rules = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8');

const claims = (email: string, verified = true) => ({
  email,
  email_verified: verified,
});

describe('firestore.rules', () => {
  let env: RulesTestEnvironment;

  before(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT,
      firestore: { rules, host: '127.0.0.1', port: 8080 },
    });
  });

  after(async () => {
    await env?.cleanup();
  });

  beforeEach(async () => {
    await env.clearFirestore();
  });

  it('compiles and denies assistant creating an admin user from an assistant invite', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'invites/ana@grupo.test'), {
        email: 'ana@grupo.test',
        role: 'Assistente',
        isAdmin: false,
        active: true,
        sectionIds: ['tropa-1'],
      });
    });
    const ana = env.authenticatedContext('uid-ana', claims('ana@grupo.test'));
    await assertFails(setDoc(doc(ana.firestore(), 'users/uid-ana'), {
      email: 'ana@grupo.test',
      role: 'ADMINISTRADOR',
      isAdmin: true,
      active: true,
      pendingApproval: false,
      rejected: false,
      sectionIds: [],
    }));
  });

  it('denies unverified email consuming an invite', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'invites/ana@grupo.test'), {
        email: 'ana@grupo.test',
        role: 'Assistente',
        isAdmin: false,
        active: true,
        sectionIds: ['tropa-1'],
      });
    });
    const ana = env.authenticatedContext('uid-ana', claims('ana@grupo.test', false));
    await assertFails(setDoc(doc(ana.firestore(), 'users/uid-ana'), {
      email: 'ana@grupo.test',
      role: 'Assistente',
      isAdmin: false,
      active: true,
      pendingApproval: false,
      rejected: false,
      sectionIds: ['tropa-1'],
    }));
  });

  it('allows only the allowlisted uid to bootstrap', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'meta/settings'), {
        allowedBootstrapUid: 'uid-alice',
        openRegistration: true,
      });
    });
    const bob = env.authenticatedContext('uid-bob', claims('bob@grupo.test'));
    await assertFails(setDoc(doc(bob.firestore(), 'meta/bootstrap'), { uid: 'uid-bob' }));
    const alice = env.authenticatedContext('uid-alice', claims('alice@grupo.test'));
    await assertSucceeds(setDoc(doc(alice.firestore(), 'meta/bootstrap'), { uid: 'uid-alice' }));
  });

  it('denies assistant homologation writes', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/uid-assist'), {
        email: 'assist@grupo.test',
        role: 'Assistente',
        isAdmin: false,
        active: true,
        sectionIds: ['tropa-1'],
      });
    });
    const assist = env.authenticatedContext('uid-assist', claims('assist@grupo.test'));
    await assertFails(setDoc(
      doc(assist.firestore(), 'sections/tropa-1/members/m1/homologation/h1'),
      { homologated: true },
    ));
  });

  it('blocks an admin from dropping their own admin flag', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/uid-adm'), {
        email: 'adm@grupo.test',
        role: 'ADMINISTRADOR',
        isAdmin: true,
        active: true,
        sectionIds: [],
      });
    });
    const adm = env.authenticatedContext('uid-adm', claims('adm@grupo.test'));
    await assertFails(updateDoc(doc(adm.firestore(), 'users/uid-adm'), { isAdmin: false }));
    const snap = await assertSucceeds(getDoc(doc(adm.firestore(), 'users/uid-adm')));
    assert.equal(snap.data()?.isAdmin, true);
  });
});
