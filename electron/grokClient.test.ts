import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import {
  grokMissingBinaryMessage,
  resolveGrokAuthFile,
  resolveGrokExecutable,
} from './grokClient.ts'

test('resolve o binário Windows em USERPROFILE quando GROK_EXECUTABLE não existe', () => {
  const env = { USERPROFILE: 'C:\\Users\\chefe' }
  assert.equal(
    resolveGrokExecutable(env, 'win32'),
    path.join('C:\\Users\\chefe', '.grok', 'bin', 'grok.exe'),
  )
})

test('resolve o binário Unix em HOME sem sufixo .exe', () => {
  const env = { HOME: '/home/chefe' }
  assert.equal(
    resolveGrokExecutable(env, 'linux'),
    path.join('/home/chefe', '.grok', 'bin', 'grok'),
  )
})

test('GROK_EXECUTABLE tem prioridade sobre o caminho padrão', () => {
  const env = { HOME: '/home/chefe', GROK_EXECUTABLE: '/opt/grok/bin/grok' }
  assert.equal(resolveGrokExecutable(env, 'linux'), '/opt/grok/bin/grok')
})

test('auth.json fica em .grok na pasta do usuário', () => {
  assert.equal(
    resolveGrokAuthFile({ HOME: '/home/chefe' }),
    path.join('/home/chefe', '.grok', 'auth.json'),
  )
})

test('mensagem de binário ausente não afirma que o OAuth está pronto', () => {
  const message = grokMissingBinaryMessage('/missing/grok')
  assert.match(message, /não encontrado/i)
  assert.doesNotMatch(message, /conectado|sessão encontrada/i)
})
