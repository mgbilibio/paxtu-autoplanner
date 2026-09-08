import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

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

test('Ollama local no site: URL do daemon, aviso de origem, sem chave', () => {
  const app = read('../App.tsx');
  const wizard = read('../components/SetupWizard.tsx');
  const help = read('../components/help/helpContent.ts');
  assert.match(app, /Listar modelos|onRefresh/);
  assert.match(app, /http:\/\/localhost:11434/);
  assert.match(wizard, /Listar modelos/);
  assert.match(wizard, /aceite a origem do site/);
  assert.match(help, /localhost:11434/);
  assert.equal(/Ollama local só funciona/.test(app + wizard + help), false);
});
