import path from 'node:path'
import os from 'node:os'

export const grokHomeDir = (env: NodeJS.ProcessEnv = process.env): string =>
  String(env.USERPROFILE || env.HOME || os.homedir() || '').trim()

export const resolveGrokExecutable = (
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string => {
  const configured = String(env.GROK_EXECUTABLE || '').trim()
  if (configured) return configured
  const binary = platform === 'win32' ? 'grok.exe' : 'grok'
  return path.join(grokHomeDir(env), '.grok', 'bin', binary)
}

export const resolveGrokAuthFile = (env: NodeJS.ProcessEnv = process.env): string =>
  path.join(grokHomeDir(env), '.grok', 'auth.json')

export const grokMissingBinaryMessage = (executable: string): string =>
  `Cliente Grok Build não encontrado em "${executable}". Instale o Grok CLI/Build ou defina GROK_EXECUTABLE com o caminho do binário. Sem o cliente, o login OAuth desktop não funciona — use uma chave da API xAI ou o “Entrar com X / Grok” no site.`
