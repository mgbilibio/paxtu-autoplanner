import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { belongsInOllamaSelector } from './ollamaModels.ts';
import { explainOllamaLocalFailure } from './ollamaLocalAccess.ts';

const DESKTOP_UI = /aplicativo desktop|só no desktop|só no app desktop|Grok Build|grok\.exe|Baixar Ollama|OAuth desktop|cliente Grok/i;
const DESKTOP_DOCS = /aplicativo desktop|npm run electron|Baixar Ollama|Instale o Grok Build/i;

const rel = (fromHere: string): string => fileURLToPath(new URL(fromHere, import.meta.url));

const read = (fromHere: string): string => readFileSync(rel(fromHere), 'utf8');

test('UI visível não manda o usuário ao aplicativo desktop nem ao Grok Build', () => {
  const files = [
    '../App.tsx',
    '../components/SetupWizard.tsx',
    '../components/XaiOAuthPanel.tsx',
    '../components/LlmModelControls.tsx',
    '../components/GlobalSearch.tsx',
    '../components/profiles/ProfileConfig.tsx',
    '../components/help/helpContent.ts',
    './webLibraryService.ts',
    './xaiService.ts',
    './aiLoginStatus.ts',
    './ollamaLocalAccess.ts',
    './llmProvider.ts',
  ];
  for (const file of files) {
    const src = read(file);
    assert.equal(DESKTOP_UI.test(src), false, `${file} ainda menciona desktop/Grok Build`);
    assert.equal(/GrokDesktopOAuthPanel/.test(src), false, `${file} ainda importa o painel desktop`);
  }
});

test('README e docs atuais descrevem o site, não o Electron como produto', () => {
  const files = [
    '../../README.md',
    '../../.env.example',
    '../../docs/usersmanual.html',
    '../../docs/codeinstructions.html',
  ];
  for (const file of files) {
    const src = read(file);
    assert.equal(DESKTOP_DOCS.test(src), false, `${file} ainda instrui desktop/Electron/Grok Build`);
    assert.equal(/^\s*npm run electron/m.test(src), false, `${file} ainda tem script Electron`);
  }
  const readme = read('../../README.md');
  assert.match(readme, /O produto é o \*\*site\*\*/);
  assert.equal(/Há dois jeitos de usar/.test(readme), false);
  assert.equal(/^## Desktop$/m.test(readme), false);
  const pkg = read('../../package.json');
  assert.equal(/"electron:build"/.test(pkg), false);
  assert.match(pkg, /"dev": "vite --mode web"/);
});

test('Listar modelos no site: fetch na URL, sem chave, sem IDs Gemini', async () => {
  const server = createServer((req, res) => {
    assert.equal(req.url, '/api/tags');
    assert.equal(req.headers.authorization, undefined);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      models: [
        { name: 'llama3.2:latest', modified_at: '2026-01-01', size: 1 },
        { name: 'gemini-3.5-flash-lite', modified_at: '2026-01-01', size: 1 },
        { name: 'qwen2.5:7b', modified_at: '2026-01-01', size: 1 },
      ],
    }));
  });
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/api/tags`);
    assert.equal(response.ok, true);
    const data = await response.json() as { models: Array<{ name: string }> };
    const listed = data.models.map(m => m.name).filter(belongsInOllamaSelector);
    assert.deepEqual(listed, ['llama3.2:latest', 'qwen2.5:7b']);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(err => { if (err) reject(err); else resolve(); });
    });
  }
});

test('Ollama Cloud lista com Bearer da chave colada e também filtra Gemini', async () => {
  const server = createServer((req, res) => {
    assert.equal(req.url, '/api/tags');
    assert.equal(req.headers.authorization, 'Bearer ollama-cloud-key');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      models: [
        { name: 'kimi-k2.5:cloud', modified_at: '2026-01-01', size: 1 },
        { name: 'gemini-3.8-flash', modified_at: '2026-01-01', size: 1 },
      ],
    }));
  });
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/tags`, {
      headers: { Authorization: 'Bearer ollama-cloud-key' },
    });
    const data = await response.json() as { models: Array<{ name: string }> };
    const listed = data.models.map(m => m.name).filter(belongsInOllamaSelector);
    assert.deepEqual(listed, ['kimi-k2.5:cloud']);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(err => { if (err) reject(err); else resolve(); });
    });
  }
});

test('daemon parado ou CORS no browser usa o aviso de origem, sem desktop', () => {
  const text = explainOllamaLocalFailure('http://127.0.0.1:11434', 'Failed to fetch');
  assert.match(text, /Ollama precisa estar rodando e aceitar a origem https:\/\/mgbilibio\.github\.io/);
  assert.match(text, /127\.0\.0\.1:11434/);
  assert.match(text, /conteúdo misto/);
  assert.equal(/aplicativo desktop|só no desktop|Grok Build|Baixar Ollama/i.test(text), false);
});

test('Ollama local no site: URL do daemon, aviso de origem, sem chave', () => {
  const app = read('../App.tsx');
  const wizard = read('../components/SetupWizard.tsx');
  const help = read('../components/help/helpContent.ts');
  assert.match(app, /Listar modelos|onRefresh/);
  assert.match(app, /DEFAULT_OLLAMA_LOCAL_URL/);
  assert.match(read('./ollamaUrlSecurity.ts'), /http:\/\/127\.0\.0\.1:11434/);
  assert.match(wizard, /Listar modelos/);
  assert.match(wizard, /https:\/\/mgbilibio\.github\.io/);
  assert.match(help, /127\.0\.0\.1:11434/);
  assert.equal(/Ollama local só funciona/.test(app + wizard + help), false);
});

test('assistente e configurações expõem Listar modelos no Cloud e persistem a escolha', () => {
  const app = read('../App.tsx');
  const wizard = read('../components/SetupWizard.tsx');
  assert.match(wizard, /ollama-cloud/);
  assert.match(wizard, /ollamaCloudApiKey/);
  assert.match(wizard, /ollamaCloudModel/);
  assert.equal((wizard.match(/Listar modelos/g) || []).length >= 2, true);
  assert.match(app, /selectProvider\('ollama-cloud'\)/);
  assert.match(app, /persistSelectedModel\(id, 'ollama-cloud'\)/);
});

test('CSP do site libera loopback, ollama.com e o proxy Paxtu', () => {
  const csp = read('../../index.html');
  assert.match(csp, /http:\/\/127\.0\.0\.1:\*/);
  assert.match(csp, /http:\/\/localhost:\*/);
  assert.match(csp, /https:\/\/ollama\.com/);
  assert.match(csp, /https:\/\/api\.ollama\.com/);
  assert.match(csp, /https:\/\/api\.x\.ai/);
  assert.match(csp, /https:\/\/paxtu-xai-proxy\.margusbilibio\.workers\.dev/);
  assert.equal(csp.includes('socialkids-xai-proxy'), false);
});
