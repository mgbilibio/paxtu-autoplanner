import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isOperationalLocalKey } from './localDataKeys.ts'

describe('isOperationalLocalKey', () => {
  it('flags tropa, usuários e progressão', () => {
    assert.equal(isOperationalLocalKey('PAXTU_AUTOPLANNER_SECTIONS'), true)
    assert.equal(isOperationalLocalKey('PAXTU_AUTOPLANNER_USERS'), true)
    assert.equal(isOperationalLocalKey('PAXTU_AUTOPLANNER_MEMBERS'), true)
    assert.equal(isOperationalLocalKey('PAXTU_PROG_abc'), true)
    assert.equal(isOperationalLocalKey('PAXTU_BLOCO_x_1'), true)
  })

  it('keeps device config and the public search index', () => {
    assert.equal(isOperationalLocalKey('PAXTU_AUTOPLANNER_CONFIG'), false)
    assert.equal(isOperationalLocalKey('PAXTU_SEARCH_INDEX_V1'), false)
    assert.equal(isOperationalLocalKey('PAXTU_SHOW_LEGACY'), false)
  })
})
