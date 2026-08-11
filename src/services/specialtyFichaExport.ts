import {
  EspecialidadeAtualizadaGuia as EspecialidadeGuia,
  UPDATED_ESPECIALIDADES_GUIA as ESPECIALIDADES_GUIA,
  UPDATED_RAMOS_ESPECIALIDADES as RAMOS_ESPECIALIDADES,
  UPDATED_REQUISITOS_GUIA as REQUISITOS_GUIA,
} from '../data/updatedSpecialtyCatalog';
import { MemberSpecialtyState } from '../types';
import { escapeHtml, safeFileName } from './htmlExportCommon';
import { LOGO_GRUPO_DATA_URI } from '../data/generated/logo_grupo';

// Vinculo opcional do jovem embutido na ficha. Quando ausente, a ficha sai
// "em branco" e o jovem e escolhido na reimportacao.
export interface FichaMemberRef {
  id: string;
  name: string;
}

const STATUS_OPCOES = ['em_estudo', 'cumprido', 'validado', 'revisar'] as const;
const STATUS_TEXTO: Record<string, string> = {
  em_estudo: 'Em estudo',
  cumprido: 'Cumprido',
  validado: 'Validado',
  revisar: 'Revisar',
};

// Bloco JSON embutido na ficha. O botao "Gerar devolucao" (JS dentro do HTML)
// le este bloco para saber especialidade/jovem e monta o arquivo de retorno.
const buildPayload = (
  especialidades: EspecialidadeGuia[],
  member: FichaMemberRef | null,
  estados: Record<number, MemberSpecialtyState | undefined>,
  generatedAt: string,
) => ({
  kind: 'paxtu-ficha-blueprint',
  version: 1,
  generatedAt,
  member,
  especialidades: especialidades.map(esp => {
    const estado = estados[esp.id];
    return {
      id: esp.id,
      nome: esp.nome,
      ramo: RAMOS_ESPECIALIDADES.find(r => r.id === esp.ramoId)?.nome || '',
      nivel1: esp.nivel1,
      nivel2: esp.nivel2,
      nivel3: esp.nivel3,
      totalItens: esp.totalItens,
      requisitos: REQUISITOS_GUIA
        .filter(r => r.especialidadeId === esp.id)
        .sort((a, b) => a.posicao - b.posicao)
        .map(r => ({ posicao: r.posicao, texto: r.texto, opcional: r.opcional })),
      estado: estado
        ? {
            requisitosConcluidos: estado.requisitosConcluidos || [],
            avaliador: estado.avaliador || '',
            notas: estado.notas || '',
            avaliacoes: estado.avaliacoes || [],
            evidencias: estado.evidencias || [],
          }
        : null,
    };
  }),
});

// JS embutido na ficha: roda no navegador de quem preenche, sem dependencias.
// Le o payload, varre os campos por data-attributes e baixa o .paxtuficha.json.
const RETURN_SCRIPT = `
<script>
(function(){
  var payload = JSON.parse(document.getElementById('paxtu-ficha-payload').textContent);
  function val(sel){ var el = document.querySelector(sel); return el ? el.value : ''; }
  function gerar(){
    var fichas = payload.especialidades.map(function(esp){
      var concluidos = [];
      var avaliacoes = [];
      var evidencias = [];
      var hoje = new Date().toISOString().slice(0,10);
      esp.requisitos.forEach(function(req){
        var chk = document.querySelector('[data-esp="'+esp.id+'"][data-pos="'+req.posicao+'"][data-role="chk"]');
        var sel = document.querySelector('[data-esp="'+esp.id+'"][data-pos="'+req.posicao+'"][data-role="status"]');
        var evi = document.querySelector('[data-esp="'+esp.id+'"][data-pos="'+req.posicao+'"][data-role="evi"]');
        var status = sel ? sel.value : 'em_estudo';
        var marcado = chk ? chk.checked : false;
        if (marcado) concluidos.push(req.posicao);
        avaliacoes.push({ requisitoPosicao: req.posicao, status: status, data: hoje });
        if (evi && evi.value.trim()) {
          evidencias.push({ requisitoPosicao: req.posicao, texto: evi.value.trim(), data: hoje });
        }
      });
      return {
        especialidadeId: esp.id,
        totalItens: esp.totalItens,
        requisitosConcluidos: concluidos,
        avaliador: val('[data-esp="'+esp.id+'"][data-role="avaliador"]'),
        notas: val('[data-esp="'+esp.id+'"][data-role="notas"]'),
        avaliacoes: avaliacoes,
        evidencias: evidencias
      };
    });
    var devolucao = {
      kind: 'paxtu-ficha-devolucao',
      version: 1,
      generatedAt: new Date().toISOString(),
      member: payload.member || null,
      fichas: fichas
    };
    var blob = new Blob([JSON.stringify(devolucao, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var quem = payload.member ? payload.member.name : 'em_branco';
    quem = quem.normalize('NFD').replace(/[^a-zA-Z0-9_-]+/g,'_');
    a.href = url;
    a.download = 'devolucao_' + quem + '_' + new Date().toISOString().slice(0,10) + '.paxtuficha.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    var aviso = document.getElementById('paxtu-aviso');
    if (aviso) { aviso.style.display = 'block'; }
  }
  var btnGerar = document.getElementById('btn-gerar');
  if (btnGerar) btnGerar.addEventListener('click', gerar);
  var btnPrint = document.getElementById('btn-print');
  if (btnPrint) btnPrint.addEventListener('click', function(){ window.print(); });
})();
<\/script>`;

const renderRequisito = (
  espId: number,
  posicao: number,
  texto: string,
  opcional: number,
  concluido: boolean,
  status: string,
  evidencia: string,
): string => {
  const opts = STATUS_OPCOES.map(s =>
    `<option value="${s}"${s === status ? ' selected' : ''}>${STATUS_TEXTO[s]}</option>`,
  ).join('');
  return `<div class="req${concluido ? ' on' : ''}">
    <label class="chk" title="Marcar requisito ${posicao}">
      <input type="checkbox" data-esp="${espId}" data-pos="${posicao}" data-role="chk"${concluido ? ' checked' : ''}>
      <span class="num">#${posicao}</span>
    </label>
    <div class="body">
      <p class="txt">${opcional ? '<span class="opc">[opcional]</span> ' : ''}${escapeHtml(texto)}</p>
      <div class="fields">
        <label class="f status"><span>Status</span><select data-esp="${espId}" data-pos="${posicao}" data-role="status">${opts}</select></label>
        <label class="f evi"><span>Evidência / anotação</span><input type="text" data-esp="${espId}" data-pos="${posicao}" data-role="evi" value="${escapeHtml(evidencia)}" placeholder="ex.: apresentou trabalho em 12/05"></label>
      </div>
    </div>
  </div>`;
};

const renderEspecialidade = (
  esp: EspecialidadeGuia,
  estado: MemberSpecialtyState | undefined,
): string => {
  const ramo = RAMOS_ESPECIALIDADES.find(r => r.id === esp.ramoId)?.nome || '';
  const requisitos = REQUISITOS_GUIA
    .filter(r => r.especialidadeId === esp.id)
    .sort((a, b) => a.posicao - b.posicao);
  const concluidos = new Set(estado?.requisitosConcluidos || []);
  const statusDe = (pos: number): string =>
    estado?.avaliacoes?.find(a => a.requisitoPosicao === pos)?.status
    || (concluidos.has(pos) ? 'validado' : 'em_estudo');
  const evidenciaDe = (pos: number): string =>
    estado?.evidencias?.find(e => e.requisitoPosicao === pos)?.texto || '';
  const linhas = requisitos.map(r =>
    renderRequisito(esp.id, r.posicao, r.texto, r.opcional, concluidos.has(r.posicao), statusDe(r.posicao), evidenciaDe(r.posicao)),
  ).join('');
  const niveis = `N1: ${esp.nivel1} · N2: ${esp.nivel2}${esp.nivel3 ? ` · N3: ${esp.nivel3}` : ''} · Total: ${esp.totalItens}`;
  return `<section class="esp">
    <div class="esp-head">
      <span class="ramo">${escapeHtml(ramo)}</span>
      <h2>${escapeHtml(esp.nome)}</h2>
      <p class="niveis">${niveis}</p>
    </div>
    <div class="campos">
      <label>Avaliador <input type="text" data-esp="${esp.id}" data-role="avaliador" value="${escapeHtml(estado?.avaliador || '')}"></label>
      <label>Notas gerais <input type="text" data-esp="${esp.id}" data-role="notas" value="${escapeHtml(estado?.notas || '')}"></label>
    </div>
    <div class="reqs">${linhas || '<p class="vazio">Requisitos não cadastrados.</p>'}</div>
  </section>`;
};

// CSS mobile-first: empilhado e com alvos de toque grandes (44px) em telas
// estreitas (S22, iPhone 13, Redmi Note, S24 Ultra em retrato); layout espacoso
// a partir de 640px. Inputs com font-size 16px evitam zoom automatico no iOS.
const FICHA_CSS = `
:root{color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#eef2f7;color:#172033;font-family:Arial,Helvetica,sans-serif;line-height:1.5;font-size:16px}
main{max-width:880px;margin:0 auto;background:#fff;min-height:100vh;padding:0 0 32px;box-shadow:0 18px 50px rgba(15,23,42,.12)}
.hero{background:linear-gradient(135deg,#111827,#243b6b 60%,#0f766e);color:#fff;padding:20px 18px;border-bottom:6px solid #f59e0b;display:flex;align-items:center;gap:14px}
.hero .logo{flex:0 0 auto;width:54px;height:54px;border-radius:8px;background:#fff;padding:4px;object-fit:contain;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.hero .txt{min-width:0}
.hero h1{margin:0 0 6px;font-size:20px;line-height:1.2}
.hero p{margin:0;font-size:13px;opacity:.92}
.bar{position:sticky;top:0;z-index:5;background:#0f172a;color:#fff;display:flex;gap:8px;align-items:center;padding:10px 14px;flex-wrap:wrap}
.bar button{flex:1 1 auto;min-height:44px;background:#f59e0b;color:#111827;border:0;border-radius:10px;padding:10px 14px;font-weight:800;font-size:15px;cursor:pointer}
.bar button.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}
.bar .info{flex:1 1 100%;font-size:12px;opacity:.85;text-align:center}
.content{padding:14px}
.esp{border:1px solid #dbe3ef;border-radius:14px;margin:14px 0;padding:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.05)}
.esp-head{border-bottom:2px solid #eef2f7;padding-bottom:10px;margin-bottom:12px}
.esp-head h2{margin:5px 0 3px;font-size:20px;color:#243b6b;line-height:1.15}
.ramo{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9;background:#f3e8ff;padding:3px 8px;border-radius:999px}
.niveis{margin:0;font-size:12px;color:#64748b}
.campos{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:14px}
.campos label{font-size:12px;font-weight:700;color:#475569;display:flex;flex-direction:column;gap:5px}
.campos input{font-size:16px;min-height:44px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px}
.reqs{display:flex;flex-direction:column;gap:10px}
.req{display:flex;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
.req.on{background:#ecfdf5;border-color:#a7f3d0}
.chk{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;-webkit-user-select:none;user-select:none;padding-top:2px}
.chk input{width:26px;height:26px;cursor:pointer;accent-color:#16a34a}
.chk .num{font-size:11px;font-weight:800;color:#64748b}
.body{flex:1;min-width:0}
.txt{margin:0 0 10px;font-size:15px;color:#334155}
.opc{color:#b45309;font-weight:700}
.fields{display:flex;flex-direction:column;gap:8px}
.fields .f{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:#64748b}
.fields select,.fields input{font-size:16px;min-height:44px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;width:100%}
.vazio{font-size:13px;color:#94a3b8;font-style:italic;margin:4px 0}
#paxtu-aviso{display:none;margin:14px;padding:12px 14px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;color:#065f46;font-size:14px}
.nota{margin:12px 14px 0;font-size:12px;color:#64748b}
@media(min-width:640px){
  main{padding-bottom:40px}
  .hero{padding:26px 28px}
  .hero h1{font-size:26px}
  .bar{padding:12px 28px}
  .bar button{flex:0 0 auto}
  .bar .info{flex:1 1 auto;text-align:right;margin-left:auto}
  .content{padding:18px 28px}
  .esp{padding:18px;margin:18px 0}
  .esp-head h2{font-size:22px}
  .campos{grid-template-columns:1fr 1fr}
  #paxtu-aviso,.nota{margin-left:28px;margin-right:28px}
  .fields{flex-direction:row;align-items:flex-end}
  .fields .f.status{flex:0 0 180px}
  .fields .f.evi{flex:1 1 auto}
}
@media print{
  .bar,.nota,#paxtu-aviso{display:none!important}
  body{background:#fff;font-size:12px}
  main{box-shadow:none;max-width:none;padding:0}
  .hero{background:#fff!important;color:#111;border-bottom:2px solid #111;padding:0 0 8px;gap:10px}
  .hero h1{color:#111;font-size:18px}
  .hero p{color:#333;opacity:1}
  .hero .logo{width:3cm;height:3cm;padding:0;border-radius:0;box-shadow:none}
  .esp,.req{break-inside:avoid;box-shadow:none}
  .req{background:#fff!important}
  .fields{flex-direction:row}
}`;

// Monta a ficha HTML autocontida (preenchivel + botao de devolucao .paxtuficha.json).
export const buildFichasHtml = (
  especialidadeIds: number[],
  member: FichaMemberRef | null,
  estados: Record<number, MemberSpecialtyState | undefined>,
  generatedAt: string,
): { fileName: string; html: string } => {
  const especialidades = especialidadeIds
    .map(id => ESPECIALIDADES_GUIA.find(e => e.id === id))
    .filter((e): e is EspecialidadeGuia => Boolean(e));
  const payload = buildPayload(especialidades, member, estados, generatedAt);
  const payloadJson = JSON.stringify(payload).replace(/<\//g, '<\\/');
  const corpo = especialidades.map(esp => renderEspecialidade(esp, estados[esp.id])).join('');
  const titulo = member
    ? `Fichas de Especialidade — ${member.name}`
    : 'Fichas de Especialidade (em branco)';
  const subtitulo = `${especialidades.length} especialidade${especialidades.length !== 1 ? 's' : ''} · gerado em ${generatedAt.slice(0, 10)}`
    + (member ? ` · jovem: ${member.name}` : ' · sem vínculo — escolha o jovem na reimportação');
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titulo)}</title>
<style>${FICHA_CSS}</style>
</head>
<body>
<main>
  <div class="hero">${LOGO_GRUPO_DATA_URI ? `<img class="logo" src="${LOGO_GRUPO_DATA_URI}" alt="Logo do grupo">` : ''}<div class="txt"><h1>📘 ${escapeHtml(titulo)}</h1><p>${escapeHtml(subtitulo)}</p></div></div>
  <div class="bar">
    <button id="btn-gerar" type="button">⬇ Gerar arquivo de devolução</button>
    <button id="btn-print" type="button" class="ghost">🖨 Imprimir / PDF</button>
    <span class="info">Marque os requisitos, preencha avaliador/notas e clique em "Gerar devolução".</span>
  </div>
  <div id="paxtu-aviso">✔ Arquivo de devolução baixado. Importe-o no Paxtu AutoPlanner (Enciclopédia → Importar devolução).</div>
  <p class="nota">Ficha autocontida: funciona offline em qualquer navegador. O botão "Gerar devolução" baixa um arquivo <strong>.paxtuficha.json</strong> que o app reimporta. O PDF/impressão serve só para arquivo (não reimportável).</p>
  <div class="content">${corpo}</div>
</main>
<script type="application/json" id="paxtu-ficha-payload">${payloadJson}</script>
${RETURN_SCRIPT}
</body>
</html>`;
  const baseNome = member ? member.name : 'em_branco';
  const fileName = `fichas_${safeFileName(baseNome)}_${generatedAt.slice(0, 10)}.html`;
  return { fileName, html };
};
