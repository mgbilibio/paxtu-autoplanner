import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Database from 'better-sqlite3'
import {
  clampLimit,
  isAllowedOllamaRequest,
  isExternalWebUrl,
  normalizeSearchQuery,
  resolveDataFile,
  resolveFolder,
} from './securityGuards'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─ dist
// │ └── index.html
// │
// ├─┬─ dist-electron
// │ ├── main.js
// │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
const activeOllamaControllers = new Set<AbortController>()

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    width: 1200,
    height: 800,
  })

  // Log crashes
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Render process gone:', details);
  });

  win.webContents.on('unresponsive', () => {
    console.warn('Window is unresponsive');
  });

  win.webContents.session.setPermissionRequestHandler((_wc, _permission, cb) => {
    cb(false);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win?.webContents.getURL()) {
      event.preventDefault();
      if (isExternalWebUrl(url)) shell.openExternal(url);
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST as string, 'index.html'))
  }
}

// --- IPC HANDLERS FOR FILE SYSTEM ACCESS ---

// R12: Whitelist de PDFs autorizados para evitar path traversal
const ALLOWED_PDFS = new Set([
  '2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR.pdf',
  '2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR.pdf',
  '2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR.pdf',
  '2026 Distintivos e Marcas.pdf',
  '250615 - Especialidades no sistema de Progressão Pessoal - ERGA SC.pdf',
  'Atividades_educativas_para_o_ramo_escoteiro_COMPACTO_OCR.pdf',
  'Atividades_educativas_para_o_ramo_lobinho.pdf',
  'CadernoDeJornadaEscoteira (1).pdf',
  'examinador_especialidades (1).pdf',
  'Fogo_de_conselhoEd2019.pdf',
  'Guia de Especialidades 18a Edição - 2024-1.pdf',
  'Guia_do_chefe_escoteiro.pdf',
  'Guia_pratico_para_monitores.pdf',
  'manual_do_escotista_ramo_filhotes_0_COMPACTO_OCR.pdf',
  'manual_do_escotista_ramo_pioneiro_0_COMPACTO_OCR.pdf',
  'POR 2026.02.pdf',
]);

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('fs:readData', async (_, folderPath, fileName) => {
  try {
    const filePath = resolveDataFile(folderPath, fileName)
    if (!filePath) return null
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    return null // Return null if file doesn't exist or error
  }
})

ipcMain.handle('fs:writeData', async (_, folderPath, fileName, content) => {
  try {
    const filePath = resolveDataFile(folderPath, fileName)
    if (!filePath || typeof content !== 'string') return false
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error('Error writing file:', error)
    return false
  }
})

ipcMain.handle('fs:checkExists', async (_, folderPath, fileName) => {
  try {
    const filePath = resolveDataFile(folderPath, fileName)
    if (!filePath) return false
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:listFiles', async (_, folderPath) => {
  try {
    const folder = resolveFolder(folderPath);
    if (!folder) return [];
    const files = await fs.readdir(folder);
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
})

// Remove um arquivo OU pasta (recursivo) sob a pasta de dados. Usa o mesmo
// guard de path-traversal do resolveDataFile (rejeita absoluto, '..', null byte).
ipcMain.handle('fs:deletePath', async (_, folderPath, relativePath) => {
  try {
    const target = resolveDataFile(folderPath, relativePath);
    if (!target) return false;
    await fs.rm(target, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] fs:deletePath erro:`, error);
    return false;
  }
})

const findBibliotecaFtsDb = async (): Promise<string | null> => {
  const candidatos = [
    path.join(process.resourcesPath || '', 'biblioteca_fts.sqlite'),
    path.join(__dirname, '..', 'conhecimento', 'bd', 'biblioteca_fts.sqlite'),
  ];
  for (const c of candidatos) {
    try {
      await fs.access(c);
      return c;
    } catch {}
  }
  return null;
};

// Conexao FTS5 aberta sob demanda (read-only) e reutilizada. better-sqlite3 e
// nativo: a busca roda dentro do processo Electron, sem depender de Python no
// PATH da maquina do usuario (o .exe distribuido nao traz Python).
let bibliotecaDb: Database.Database | null = null;
let bibliotecaHasPdfPath = false;

const getBibliotecaDb = async (): Promise<Database.Database | null> => {
  if (bibliotecaDb) return bibliotecaDb;
  const dbPath = await findBibliotecaFtsDb();
  if (!dbPath) return null;
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const cols = db.prepare('PRAGMA table_info(markdown_blocks)').all() as Array<{ name: string }>;
    bibliotecaHasPdfPath = cols.some(c => c.name === 'pdf_path');
    bibliotecaDb = db;
    return db;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] biblioteca: falha ao abrir FTS5:`, e);
    return null;
  }
};

ipcMain.handle('library:search', async (_, query: string, limit: number = 20) => {
  const safeQuery = normalizeSearchQuery(query);
  const safeLimit = clampLimit(limit);
  if (safeQuery.length < 3) return { ok: true, results: [] };

  const db = await getBibliotecaDb();
  if (!db) return { ok: false, results: [], error: 'Indice FTS5 nao encontrado.' };

  // Termos alfanumericos (Unicode) — mesma sanitizacao do indexador; cada termo
  // e uma palavra simples, segura para o MATCH parametrizado do FTS5.
  const terms = (safeQuery.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).slice(0, 8);
  const fts = terms.join(' ');
  if (!fts) return { ok: true, results: [] };

  try {
    const pdfPathExpr = bibliotecaHasPdfPath ? 'b.pdf_path' : 'NULL';
    const sql = `
      SELECT b.id, b.source_path, b.block_index, b.title,
             snippet(markdown_blocks_fts, 1, '[', ']', '...', 24) AS snippet,
             b.pdf_page, ${pdfPathExpr} AS pdf_path
      FROM markdown_blocks_fts
      JOIN markdown_blocks b ON b.id = markdown_blocks_fts.rowid
      WHERE markdown_blocks_fts MATCH ?
      LIMIT ?`;
    const rows = db.prepare(sql).all(fts, safeLimit) as Array<{
      id: number; source_path: string; block_index: number; title: string;
      snippet: string; pdf_page: number | null; pdf_path: string | null;
    }>;
    const results = rows.map(r => ({
      id: r.id,
      sourcePath: r.source_path,
      blockIndex: r.block_index,
      title: r.title,
      snippet: r.snippet,
      pdfPage: r.pdf_page,
      sourcePdf: r.pdf_path,
    }));
    return { ok: true, results };
  } catch (e: any) {
    console.error(`[${new Date().toISOString()}] biblioteca: erro na busca FTS5:`, e);
    return { ok: false, results: [], error: `Erro na busca FTS5: ${e?.message || e}` };
  }
})

// Abre PDF da biblioteca normativa em página específica.
// Tenta 3 caminhos: extraResources (prod), docs/biblioteca (dev), fallback.
// R12: Validar path traversal e página inválida
// Janela unica reutilizada para leitura de PDFs (evita acumular janelas).
let pdfWindow: BrowserWindow | null = null;

const openPdfWindow = async (url: string, title: string): Promise<void> => {
  if (!pdfWindow || pdfWindow.isDestroyed()) {
    pdfWindow = new BrowserWindow({
      width: 1000,
      height: 820,
      title,
      autoHideMenuBar: true,
      webPreferences: { plugins: true, contextIsolation: true, nodeIntegration: false },
    });
    // Guards: a janela de PDF nunca abre janelas-filhas e so navega para file://.
    // http(s) sai pelo navegador externo (mesma politica da janela principal).
    pdfWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    pdfWindow.webContents.on('will-navigate', (event, navUrl) => {
      if (navUrl.startsWith('file://')) return;
      event.preventDefault();
      if (isExternalWebUrl(navUrl)) shell.openExternal(navUrl);
    });
    pdfWindow.on('closed', () => { pdfWindow = null; });
  }
  pdfWindow.setTitle(title);
  pdfWindow.show();
  pdfWindow.focus();
  await pdfWindow.loadURL(url);
};

ipcMain.handle('guide:open', async () => {
  // Guia de uso empacotado (extraResources) em producao; docs/ em dev.
  const candidatos = [
    path.join(process.resourcesPath || '', 'Guia_de_Uso_Paxtu.html'),
    path.join(__dirname, '..', 'docs', 'GUIA_DE_USO_v2.12.html'),
  ];
  let resolved: string | null = null;
  for (const c of candidatos) {
    try { await fs.access(c); resolved = c; break; } catch {}
  }
  if (!resolved) {
    return { ok: false, error: `Guia nao encontrado. Procurado em: ${candidatos.join(' | ')}` };
  }
  const url = pathToFileURL(resolved).href;
  const erro = await openPdfWindow(url, 'Guia de Uso — Paxtu AutoPlanner').then(() => '').catch((e: unknown) => String(e));
  return erro ? { ok: false, error: `Falha ao abrir o guia: ${erro}` } : { ok: true, url };
})

ipcMain.handle('pdf:openAtPage', async (_, relativePath: string, page: number) => {
  const filename = path.basename(relativePath || '');
  if (!ALLOWED_PDFS.has(filename)) {
    return { ok: false, error: `PDF nao autorizado: ${filename}` };
  }
  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    return { ok: false, error: `Pagina invalida: ${page}` };
  }

  // Subpasta do pdf_path (ex.: 'manuais_essenciais') preservada para resolver o
  // arquivo; a whitelist ALLOWED_PDFS continua validando apenas pelo basename.
  const subpasta = path.dirname(relativePath || '');
  const temSubpasta = subpasta && subpasta !== '.' && subpasta !== '/';

  // Candidatos em ordem de prioridade
  const candidatos = [
    // Producao: pasta `manuais` ao lado do executavel (extraResources)
    path.join(process.resourcesPath || '', 'manuais', filename),
    // Dev: caminho relativo a partir de electron/main.ts -> raiz -> docs/biblioteca/...
    path.join(__dirname, '..', 'docs', 'biblioteca', filename),
    // Producao com subpasta: resourcesPath/manuais/<subpasta>/<arquivo>
    ...(temSubpasta ? [path.join(process.resourcesPath || '', 'manuais', subpasta, filename)] : []),
    // Dev com subpasta: docs/biblioteca/<subpasta>/<arquivo>
    ...(temSubpasta ? [path.join(__dirname, '..', 'docs', 'biblioteca', subpasta, filename)] : []),
    // Fallback: tentativa com relativePath completo
    path.join(__dirname, '..', relativePath),
  ];

  let resolved: string | null = null;
  for (const c of candidatos) {
    try {
      await fs.access(c);
      resolved = c;
      break;
    } catch {}
  }

  if (!resolved) {
    return { ok: false, error: `PDF nao encontrado. Procurado em: ${candidatos.join(' | ')}` };
  }

  // Abre o PDF numa janela Electron com o visualizador nativo do Chromium, que
  // honra '#page=N' de forma confiavel. shell.openExternal('file://...#page=N')
  // NAO funciona no Windows (o shell tenta abrir um arquivo com '#page=1' no nome).
  // pathToFileURL faz o percent-encoding de espacos e acentos (ç, ã...).
  const url = `${pathToFileURL(resolved).href}#page=${page}`;
  const erro = await openPdfWindow(url, filename).then(() => '').catch((e: unknown) => String(e));
  if (erro) {
    return { ok: false, error: `Falha ao abrir o PDF: ${erro}`, url };
  }
  return { ok: true, url };
})

// IPC para Ollama: main process faz a chamada (sem CORS).
// O renderer (browser context) é bloqueado pelo Ollama por padrão.
ipcMain.handle('ollama:request', async (_, method: string, url: string, body?: string, timeoutMs?: number) => {
  if (!isAllowedOllamaRequest(method, url)) {
    return { ok: false, status: 0, body: '', error: 'Requisicao Ollama bloqueada.' };
  }
  if (body && Buffer.byteLength(body, 'utf8') > 2 * 1024 * 1024) {
    return { ok: false, status: 0, body: '', error: 'Corpo da requisicao muito grande.' };
  }
  // Timeout: usa timeoutMs (ms) quando fornecido e finito, com clamp 500..300000;
  // fallback de 5min quando ausente. O AbortController honra esse teto.
  const teto = (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs))
    ? Math.min(300000, Math.max(500, timeoutMs))
    : 5 * 60 * 1000;
  const ctrl = new AbortController();
  activeOllamaControllers.add(ctrl);
  const timer = setTimeout(() => ctrl.abort(), teto);
  try {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    // redirect:'error' impede SSRF residual: um servico no loopback nao pode
    // redirecionar a chamada para um host externo (a validacao so cobre a URL inicial).
    const r = await fetch(url, { method, headers, body, signal: ctrl.signal, redirect: 'error' });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text };
  } catch (e: any) {
    return { ok: false, status: 0, body: '', error: e?.name === 'AbortError' ? 'timeout' : (e?.message || String(e)) };
  } finally {
    clearTimeout(timer);
    activeOllamaControllers.delete(ctrl);
  }
})

ipcMain.handle('ollama:cancelAll', async () => {
  activeOllamaControllers.forEach(ctrl => ctrl.abort());
  activeOllamaControllers.clear();
  return { ok: true };
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

// Encerramento limpo: fecha o DB FTS5, aborta requisicoes Ollama em voo e
// destroi a janela de PDF para nao segurar o processo.
app.on('before-quit', () => {
  try { bibliotecaDb?.close(); } catch (e) { console.error('before-quit close db:', e); }
  bibliotecaDb = null;
  activeOllamaControllers.forEach(c => c.abort());
  activeOllamaControllers.clear();
  if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.destroy();
  pdfWindow = null;
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow();
  console.log('====================================');
  console.log('PAXTU AUTOPLANNER INICIADO');
  console.log('Versão do SO:', process.getSystemVersion ? process.getSystemVersion() : process.platform);
  console.log('Arquitetura:', process.arch);
  console.log('Node:', process.versions.node);
  console.log('Electron:', process.versions.electron);
  console.log('Chrome:', process.versions.chrome);
  console.log('V8:', process.versions.v8);
  console.log('====================================');
});
