import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  isSafePdfSubfolder,
  isSameOrInsideFolder,
  resolveDataFile,
  resolveFolder,
} from './securityGuards.ts'

describe('isSameOrInsideFolder', () => {
  it('accepts the folder itself and a child', () => {
    const root = path.resolve('/tmp/paxtu-data')
    assert.equal(isSameOrInsideFolder(root, root), true)
    assert.equal(isSameOrInsideFolder(path.join(root, 'tropa'), root), true)
  })

  it('rejects a sibling prefix and a parent escape', () => {
    const root = path.resolve('/tmp/paxtu-data')
    assert.equal(isSameOrInsideFolder(path.resolve('/tmp/paxtu-data-evil'), root), false)
    assert.equal(isSameOrInsideFolder(path.resolve('/tmp'), root), false)
    assert.equal(isSameOrInsideFolder(path.resolve('/etc'), root), false)
  })
})

describe('resolveDataFile with allowed folder', () => {
  const allowed = path.resolve('/tmp/paxtu-data')

  it('allows a file under the trusted folder', () => {
    const target = resolveDataFile(allowed, 'membros.json', allowed)
    assert.equal(target, path.join(allowed, 'membros.json'))
  })

  it('rejects a different folder even with a safe file name', () => {
    assert.equal(resolveDataFile('/etc', 'passwd', allowed), null)
    assert.equal(resolveDataFile('/tmp/paxtu-data-evil', 'membros.json', allowed), null)
  })

  it('still rejects path traversal inside the trusted folder', () => {
    assert.equal(resolveDataFile(allowed, '../secrets.txt', allowed), null)
    assert.equal(resolveDataFile(allowed, '..\\secrets.txt', allowed), null)
  })
})

describe('resolveFolder', () => {
  it('rejects empty and null-byte paths', () => {
    assert.equal(resolveFolder(''), null)
    assert.equal(resolveFolder('foo\0bar'), null)
    assert.equal(resolveFolder(12), null)
  })
})

describe('isSafePdfSubfolder', () => {
  it('accepts a simple relative folder', () => {
    assert.equal(isSafePdfSubfolder('manuais_essenciais'), true)
  })

  it('rejects parent and absolute paths', () => {
    assert.equal(isSafePdfSubfolder('../etc'), false)
    assert.equal(isSafePdfSubfolder('/etc'), false)
    assert.equal(isSafePdfSubfolder('foo/../../etc'), false)
  })
})
