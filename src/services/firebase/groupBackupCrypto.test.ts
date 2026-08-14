import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decryptJsonWithPassword,
  encryptJsonWithPassword,
  isEncryptedGroupBackup,
} from './groupBackupCrypto.ts'

describe('groupBackupCrypto', () => {
  it('round-trips a payload with the same password', async () => {
    const payload = { kind: 'scoutsauto-firestore-backup', secret: 'tropa', n: 2 }
    const envelope = await encryptJsonWithPassword(payload, 'senha-bem-longa')
    assert.equal(isEncryptedGroupBackup(envelope), true)
    assert.equal(JSON.stringify(envelope).includes('tropa'), false)
    const opened = await decryptJsonWithPassword<typeof payload>(envelope, 'senha-bem-longa')
    assert.deepEqual(opened, payload)
  })

  it('rejects a short password and a wrong password', async () => {
    await assert.rejects(
      () => encryptJsonWithPassword({ a: 1 }, 'curta'),
      /pelo menos 10/,
    )
    const envelope = await encryptJsonWithPassword({ a: 1 }, 'senha-bem-longa')
    await assert.rejects(
      () => decryptJsonWithPassword(envelope, 'senha-errada-x'),
      /Senha errada/,
    )
  })
})
