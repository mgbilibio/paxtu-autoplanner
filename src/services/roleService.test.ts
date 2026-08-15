import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPermissions, getRoleLabel } from './roleService.ts';
import type { UserProfile } from '../types.ts';

const user = (role: string): UserProfile => ({
  id: 'u1',
  name: 'Teste',
  sectionId: 'tropa',
  role,
});

describe('getPermissions', () => {
  it('gives ADMINISTRADOR write + global', () => {
    const perms = getPermissions(user('ADMINISTRADOR'));
    assert.equal(perms.isGlobal, true);
    assert.equal(perms.isReadOnly, false);
    assert.equal(perms.canEditYouth, true);
    assert.equal(perms.canConfigure, true);
    assert.equal(perms.canPlan, true);
  });

  it('gives Diretoria global consulta without write flags', () => {
    assert.equal(getRoleLabel('diretor'), 'Diretoria');
    const perms = getPermissions(user('Diretoria'));
    assert.equal(perms.isGlobal, true);
    assert.equal(perms.isReadOnly, true);
    assert.equal(perms.canEditYouth, false);
    assert.equal(perms.canConfigure, false);
    assert.equal(perms.canPlan, false);
  });

  it('keeps Chefe de Seção scoped and writable', () => {
    const perms = getPermissions(user('Chefe de Seção'));
    assert.equal(perms.isGlobal, false);
    assert.equal(perms.isReadOnly, false);
    assert.equal(perms.canEditYouth, true);
  });

  it('does not expand Leitura/Auditoria to all sections', () => {
    const perms = getPermissions(user('Leitura/Auditoria'));
    assert.equal(perms.isGlobal, false);
    assert.equal(perms.isReadOnly, true);
    assert.equal(perms.canEditYouth, false);
  });
});
