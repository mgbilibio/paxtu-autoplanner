export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const safeFileName = (value: string): string =>
  value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'roteiro';

export const renderList = (items?: unknown[]): string => {
  const cleanItems = (items || []).map(item => escapeHtml(item)).filter(Boolean);
  if (cleanItems.length === 0) return '<p class="muted">Sem itens informados.</p>';
  return `<ul>${cleanItems.map(item => `<li>${item}</li>`).join('')}</ul>`;
};

export const renderText = (value?: string): string =>
  escapeHtml(value || '').replace(/\n/g, '<br>');

export const forceDownloadHtml = (fileName: string, html: string): void => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadHtml = (fileName: string, html: string): void => {
  window.dispatchEvent(new CustomEvent('paxtu:html-preview', {
    detail: { fileName, html },
  }));
};

export const htmlShell = (title: string, body: string): string => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:light;--ink:#172033;--muted:#64748b;--line:#dbe3ef;--soft:#f8fafc;--brand:#243b6b;--ok:#0f766e;--amber:#b45309;--purple:#6d28d9}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(160deg,#e0f2fe 0%,#f8fafc 42%,#eef2ff 100%);color:var(--ink);font-family:Arial,Helvetica,sans-serif;line-height:1.55}
main{max-width:960px;margin:0 auto;background:#fff;min-height:100vh;padding:0 0 28px;box-shadow:0 24px 60px rgba(15,23,42,.14)}
.hero{background:linear-gradient(135deg,#111827,#243b6b 55%,#0f766e);color:#fff;padding:30px 28px 26px;border-bottom:6px solid #f59e0b}
h1{font-size:32px;line-height:1.1;margin:0 0 8px}h2{font-size:22px;margin:28px 28px 12px;border-bottom:2px solid var(--line);padding-bottom:8px}
h3{font-size:18px;margin:0 0 8px}.content{padding:0 28px}.meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}.pill{background:#e8eef8;border:1px solid #cad7ee;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}
.hero .pill{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.28);color:#fff}.box{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}
.activity{border:1px solid var(--line);border-left:7px solid #4f46e5;border-radius:16px;margin:18px 0;padding:16px;background:#fff;box-shadow:0 10px 25px rgba(15,23,42,.06)}
.activity.opening{border-left-color:#2563eb;background:#eff6ff}.activity.break{border-left-color:#0891b2;background:#ecfeff}.activity.closing{border-left-color:#4f46e5;background:#eef2ff}
.activity-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.clock{background:#111827;color:#fff;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:800;white-space:nowrap}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.small{font-size:13px}.muted{color:var(--muted)}ul{margin:8px 0 0 20px;padding:0}li{margin:4px 0}
.tag{display:inline-block;background:#ecfdf5;color:var(--ok);border:1px solid #b7e4d8;border-radius:8px;padding:3px 8px;font-size:12px;font-weight:700}.tag.warn{background:#fffbeb;color:var(--amber);border-color:#fde68a}.tag.info{background:#eef2ff;color:var(--purple);border-color:#ddd6fe}
.paper{border:2px solid #1e293b;border-radius:12px;margin:18px 28px;overflow:hidden}.paper h2{margin:0;border:0;padding:12px 16px;background:#111827;color:#fff;font-size:16px;letter-spacing:.06em;text-transform:uppercase}
.paper-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:14px 16px}.paper-grid .full{grid-column:1/-1}.paper table{width:100%;border-collapse:collapse;font-size:13px}.paper th{background:#1e293b;color:#fff;text-align:left;padding:8px 10px;font-size:11px;letter-spacing:.04em;text-transform:uppercase}.paper td{border-bottom:1px solid var(--line);padding:8px 10px;vertical-align:top}.paper tr.opening td{background:#eff6ff}.paper tr.break td{background:#ecfeff}.paper tr.closing td{background:#eef2ff}.paper tr.fixed td{background:#fffbeb}
@media(max-width:700px){main{padding-bottom:18px}h1{font-size:25px}h2{font-size:20px;margin-left:18px;margin-right:18px}.hero{padding:24px 18px 20px}.content{padding:0 18px}.grid{grid-template-columns:1fr}.activity{padding:14px;margin:14px 0}.meta{display:block}.pill{display:inline-block;margin:3px 2px}.activity-title{display:block}.clock{display:inline-block;margin:4px 0 8px}.paper{margin:14px 18px}.paper-grid{grid-template-columns:1fr}}
@media print{body{background:#fff}main{max-width:none;padding:0}.activity,.box,.paper{break-inside:avoid}}
</style>
</head>
<body><main>${body}</main></body>
</html>`;
