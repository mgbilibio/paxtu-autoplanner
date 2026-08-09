import React, { useState, useMemo, useEffect } from 'react';
import {
  RAMOS_ESPECIALIDADES,
  ESPECIALIDADES_GUIA,
  REQUISITOS_GUIA,
  EspecialidadeGuia,
} from '../data/generated/especialidades_guia';
import { openPdfAtPage } from '../services/pdfLinkService';
import { pdfPageForEspecialidade } from '../data/generated/especialidade_pages';
import {
  MemberSpecialtyState,
  ScoutMember,
  SpecialtyRequirementStatus,
} from '../types';
import {
  getMemberSpecialtyState,
  getMembersAsync,
  saveMemberSpecialtyState,
} from '../services/storageService';
import { buildFichasHtml } from '../services/specialtyFichaExport';
import { parseDevolucao, applyDevolucao, ParsedDevolucao } from '../services/specialtyFichaImport';
import { forceDownloadHtml, safeFileName as safeName } from '../services/htmlExportCommon';

interface Props {
  onClose: () => void;
  member?: ScoutMember;
}

const RAMO_COLOR: Record<string, string> = {
  'ciencia-e-tecnologia': 'bg-orange-500',
  'cultura': 'bg-purple-500',
  'desportos': 'bg-red-500',
  'servicos': 'bg-yellow-400',
  'habilidades-escoteiras': 'bg-green-600',
};

const RAMO_BADGE: Record<string, string> = {
  'ciencia-e-tecnologia': 'C&T',
  'cultura': 'Cultura',
  'desportos': 'Desportos',
  'servicos': 'Serviços',
  'habilidades-escoteiras': 'Hab. Escoteiras',
};

const calcularNivel = (
  concluidos: number,
  esp: EspecialidadeGuia,
): 1 | 2 | 3 | undefined => {
  if (esp.nivel3 && concluidos >= esp.nivel3) return 3;
  if (concluidos >= esp.nivel2) return 2;
  if (concluidos >= esp.nivel1) return 1;
  return undefined;
};

const STATUS_LABEL: Record<SpecialtyRequirementStatus, string> = {
  em_estudo: 'Em estudo',
  cumprido: 'Cumprido',
  validado: 'Validado',
  revisar: 'Revisar',
};

const STATUS_CLASS: Record<SpecialtyRequirementStatus, string> = {
  em_estudo: 'border-slate-200 bg-white text-slate-500',
  cumprido: 'border-blue-200 bg-blue-50 text-blue-700',
  validado: 'border-green-200 bg-green-50 text-green-700',
  revisar: 'border-amber-200 bg-amber-50 text-amber-700',
};

export const SpecialtyEncyclopedia: React.FC<Props> = ({ onClose, member }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRamoId, setSelectedRamoId] = useState<number | 'todos'>('todos');
  const [viewing, setViewing] = useState<EspecialidadeGuia | null>(null);
  const [fichaState, setFichaState] = useState<MemberSpecialtyState | null>(null);

  // Exportação/importação de fichas (lote)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [exportMemberId, setExportMemberId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [pendingImport, setPendingImport] = useState<ParsedDevolucao | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string>('');

  useEffect(() => {
    getMembersAsync().then(list => setMembers(list)).catch(() => setMembers([]));
  }, []);

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setFeedback('');
  };

  // Exporta as especialidades selecionadas. Arquivos grandes travam o navegador,
  // então quebramos em lotes de no máximo 50 especialidades por arquivo (.html).
  // Se um jovem for escolhido, embute o vínculo e pré-preenche com a ficha atual.
  const LOTE_MAX = 50;
  const exportarFichas = async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    const ids = Array.from(selectedIds).sort((a, b) => a - b);
    const memberRef = exportMemberId
      ? (() => {
          const m = members.find(x => x.id === exportMemberId);
          return m ? { id: m.id, name: m.name } : null;
        })()
      : null;

    const lotes: number[][] = [];
    for (let i = 0; i < ids.length; i += LOTE_MAX) lotes.push(ids.slice(i, i + LOTE_MAX));
    const generatedAt = new Date().toISOString();
    const dia = generatedAt.slice(0, 10);
    const base = memberRef ? safeName(memberRef.name) : 'em_branco';

    for (let p = 0; p < lotes.length; p++) {
      const lote = lotes[p];
      const estados: Record<number, MemberSpecialtyState | undefined> = {};
      if (memberRef) {
        const lidos = await Promise.all(
          lote.map(id => getMemberSpecialtyState(memberRef.id, id)),
        );
        lote.forEach((id, idx) => { if (lidos[idx]) estados[id] = lidos[idx]!; });
      }
      const { html } = buildFichasHtml(lote, memberRef, estados, generatedAt);
      const sufixo = lotes.length > 1 ? `_parte${p + 1}de${lotes.length}` : '';
      forceDownloadHtml(`fichas_${base}_${dia}${sufixo}.html`, html);
      // Pequena pausa entre downloads para o navegador não bloquear múltiplos arquivos.
      if (p < lotes.length - 1) await new Promise(r => setTimeout(r, 400));
    }

    setBusy(false);
    setFeedback(
      `Exportado: ${ids.length} especialidade(s)${memberRef ? ` para ${memberRef.name}` : ' em branco'}`
      + (lotes.length > 1 ? ` em ${lotes.length} arquivos (até ${LOTE_MAX} por arquivo).` : '.'),
    );
  };

  // Lê o arquivo de devolução (.paxtuficha.json) e aplica ao jovem.
  // Se o arquivo não trouxer vínculo, abre o seletor de jovem.
  const importarDevolucao = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setFeedback('Arquivo recusado: muito grande.');
      return;
    }
    const text = await file.text();
    let raw: unknown = null;
    try {
      raw = JSON.parse(text);
    } catch {
      setFeedback('Arquivo recusado: JSON inválido.');
      return;
    }
    const parsed = parseDevolucao(raw);
    if (!parsed) {
      setFeedback('Arquivo recusado: não é uma devolução de ficha válida.');
      return;
    }
    const vinculado = parsed.member && members.find(m => m.id === parsed.member!.id);
    if (vinculado) {
      setBusy(true);
      const { aplicadas } = await applyDevolucao(parsed, vinculado.id);
      setBusy(false);
      setFeedback(`Devolução aplicada a ${vinculado.name}: ${aplicadas} ficha(s).`);
      return;
    }
    // Sem vínculo (ou jovem não encontrado): pedir a qual jovem aplicar.
    setPendingImport(parsed);
    setPendingMemberId('');
  };

  const confirmarImport = async () => {
    if (!pendingImport || !pendingMemberId) return;
    setBusy(true);
    const { aplicadas } = await applyDevolucao(pendingImport, pendingMemberId);
    const alvo = members.find(m => m.id === pendingMemberId);
    setBusy(false);
    setPendingImport(null);
    setFeedback(`Devolução aplicada a ${alvo?.name || 'jovem'}: ${aplicadas} ficha(s).`);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return ESPECIALIDADES_GUIA.filter(esp => {
      const matchesRamo = selectedRamoId === 'todos' || esp.ramoId === selectedRamoId;
      const matchesSearch = !term || esp.nome.toLowerCase().includes(term);
      return matchesRamo && matchesSearch;
    });
  }, [searchTerm, selectedRamoId]);

  const requisitosDoVisualizado = useMemo(() => {
    if (!viewing) return [];
    return REQUISITOS_GUIA.filter(r => r.especialidadeId === viewing.id).sort((a, b) => a.posicao - b.posicao);
  }, [viewing]);

  const ramoSlug = (id: number) => RAMOS_ESPECIALIDADES.find(r => r.id === id)?.slug || '';
  const ramoNome = (id: number) => RAMOS_ESPECIALIDADES.find(r => r.id === id)?.nome || '';

  useEffect(() => {
    if (!member || !viewing) {
      setFichaState(null);
      return;
    }
    getMemberSpecialtyState(member.id, viewing.id).then(state => {
      setFichaState(state || {
        memberId: member.id,
        especialidadeId: viewing.id,
        requisitosConcluidos: [],
        lastUpdate: new Date().toISOString(),
      });
    });
  }, [member, viewing]);

  const salvarFicha = async (next: MemberSpecialtyState) => {
    await saveMemberSpecialtyState(next);
    setFichaState(next);
  };

  const toggleRequisito = async (posicao: number) => {
    if (!member || !viewing || !fichaState) return;
    const has = fichaState.requisitosConcluidos.includes(posicao);
    const requisitosConcluidos = has
      ? fichaState.requisitosConcluidos.filter(p => p !== posicao)
      : [...fichaState.requisitosConcluidos, posicao].sort((a, b) => a - b);
    const nivelAtual = calcularNivel(requisitosConcluidos.length, viewing);
    const avaliacoes = fichaState.avaliacoes || [];
    const semAtual = avaliacoes.filter(a => a.requisitoPosicao !== posicao);
    const next: MemberSpecialtyState = {
      ...fichaState,
      requisitosConcluidos,
      avaliacoes: [
        ...semAtual,
        {
          requisitoPosicao: posicao,
          status: (has ? 'em_estudo' : 'validado') as SpecialtyRequirementStatus,
          avaliador: fichaState.avaliador,
          data: new Date().toISOString().slice(0, 10),
        },
      ].sort((a, b) => a.requisitoPosicao - b.requisitoPosicao),
      nivelAtual,
      dataConclusao: requisitosConcluidos.length >= viewing.totalItens
        ? fichaState.dataConclusao || new Date().toISOString().slice(0, 10)
        : undefined,
      lastUpdate: new Date().toISOString(),
    };
    await salvarFicha(next);
  };

  const updateFichaField = async (patch: Partial<MemberSpecialtyState>) => {
    if (!member || !viewing || !fichaState) return;
    await salvarFicha({
      ...fichaState,
      ...patch,
      lastUpdate: new Date().toISOString(),
    });
  };

  const evidenciaTexto = (posicao: number) =>
    fichaState?.evidencias?.find(e => e.requisitoPosicao === posicao)?.texto || '';

  const avaliacaoRequisito = (posicao: number) =>
    fichaState?.avaliacoes?.find(a => a.requisitoPosicao === posicao);

  const statusRequisito = (posicao: number): SpecialtyRequirementStatus => {
    const avaliacao = avaliacaoRequisito(posicao);
    if (avaliacao) return avaliacao.status;
    return fichaState?.requisitosConcluidos.includes(posicao)
      ? 'validado'
      : 'em_estudo';
  };

  const setStatusRequisito = async (
    posicao: number,
    status: SpecialtyRequirementStatus,
  ) => {
    if (!member || !viewing || !fichaState) return;
    const avaliacoes = fichaState.avaliacoes || [];
    const semAtual = avaliacoes.filter(a => a.requisitoPosicao !== posicao);
    const nextAvaliacoes = [
      ...semAtual,
      {
        requisitoPosicao: posicao,
        status,
        avaliador: fichaState.avaliador,
        data: new Date().toISOString().slice(0, 10),
      },
    ].sort((a, b) => a.requisitoPosicao - b.requisitoPosicao);
    const deveContar = status === 'cumprido' || status === 'validado';
    const semPosicao = fichaState.requisitosConcluidos.filter(p => p !== posicao);
    const requisitosConcluidos = deveContar
      ? [...semPosicao, posicao].sort((a, b) => a - b)
      : semPosicao;
    const nivelAtual = calcularNivel(requisitosConcluidos.length, viewing);
    await updateFichaField({
      avaliacoes: nextAvaliacoes,
      requisitosConcluidos,
      nivelAtual,
      dataConclusao: requisitosConcluidos.length >= viewing.totalItens
        ? fichaState.dataConclusao || new Date().toISOString().slice(0, 10)
        : undefined,
    });
  };

  const updateEvidencia = async (posicao: number, texto: string) => {
    if (!member || !viewing || !fichaState) return;
    const evidencias = fichaState.evidencias || [];
    const semAtual = evidencias.filter(e => e.requisitoPosicao !== posicao);
    const nextEvidencias = texto.trim()
      ? [...semAtual, {
        requisitoPosicao: posicao,
        texto,
        data: new Date().toISOString().slice(0, 10),
      }].sort((a, b) => a.requisitoPosicao - b.requisitoPosicao)
      : semAtual;
    await updateFichaField({ evidencias: nextEvidencias });
  };

  const escapeHtml = (text: string) =>
    text.replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c] || c));

  const printFicha = () => {
    if (!viewing || !member || !fichaState) return;
    const rows = requisitosDoVisualizado.map(req => {
      const status = statusRequisito(req.posicao);
      const evidencia = evidenciaTexto(req.posicao);
      return `
        <tr>
          <td>${req.posicao}</td>
          <td>${STATUS_LABEL[status]}</td>
          <td>${escapeHtml(req.texto)}</td>
          <td>${escapeHtml(evidencia)}</td>
        </tr>
      `;
    }).join('');
    const html = `
      <html>
        <head>
          <title>${escapeHtml(viewing.nome)} - ${escapeHtml(member.name)}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:24px;color:#172033}
            h1{font-size:22px;margin:0 0 4px}
            p{font-size:12px;margin:4px 0}
            table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}
            th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top}
            th{background:#f1f5f9;text-align:left}
          </style>
        </head>
        <body>
          <h1>${escapeHtml(viewing.nome)}</h1>
          <p>Jovem: ${escapeHtml(member.name)}</p>
          <p>Nivel atual: ${fichaState.nivelAtual || 'sem nivel'} · ${fichaState.requisitosConcluidos.length}/${viewing.totalItens} requisitos</p>
          <p>Avaliador: ${escapeHtml(fichaState.avaliador || '')}</p>
          <p>Notas: ${escapeHtml(fichaState.notas || '')}</p>
          <table>
            <thead><tr><th>#</th><th>Status</th><th>Requisito</th><th>Evidencia/anotacao</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">← Voltar</button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">📘 Enciclopédia de Especialidades</h2>
            <p className="text-xs text-gray-400">
              {ESPECIALIDADES_GUIA.length} especialidades · {REQUISITOS_GUIA.length} requisitos · Guia 18ª Ed. 2024-1 · programa anterior / transição
              {member ? ` · ficha de ${member.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedRamoId}
            onChange={e => setSelectedRamoId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
          >
            <option value="todos">Todos os ramos ({ESPECIALIDADES_GUIA.length})</option>
            {RAMOS_ESPECIALIDADES.map(r => {
              const count = ESPECIALIDADES_GUIA.filter(e => e.ramoId === r.id).length;
              return <option key={r.id} value={r.id}>{r.nome} ({count})</option>;
            })}
          </select>
          <input
            type="text"
            placeholder="Buscar (Ex: Culinária)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-64"
          />
        </div>
      </header>

      {/* Barra de exportação / importação de fichas */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 sticky top-[68px] z-[5] shadow-sm">
        {!selectionMode ? (
          <button
            onClick={() => setSelectionMode(true)}
            className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            ☑ Selecionar para exportar fichas
          </button>
        ) : (
          <>
            <span className="text-xs font-bold text-slate-700">{selectedIds.size} selecionada(s)</span>
            <button
              onClick={() => setSelectedIds(new Set(filtered.map(e => e.id)))}
              className="text-[11px] text-blue-600 font-bold hover:underline"
            >
              Selecionar visíveis ({filtered.length})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-slate-500 font-bold hover:underline"
            >
              Limpar
            </button>
            <select
              value={exportMemberId}
              onChange={e => setExportMemberId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
              title="Vincular a um jovem (opcional)"
            >
              <option value="">— Em branco (sem jovem) —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              onClick={exportarFichas}
              disabled={selectedIds.size === 0 || busy}
              className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-40"
            >
              ⬇ Exportar ({selectedIds.size})
            </button>
            <button
              onClick={cancelSelection}
              className="text-xs font-bold text-slate-500 px-2 py-1.5 hover:text-slate-800"
            >
              Cancelar
            </button>
          </>
        )}
        <label className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 cursor-pointer ml-auto">
          ⬆ Importar devolução
          <input
            type="file"
            accept=".json,.paxtuficha,application/json"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (file) await importarDevolucao(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {feedback && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-4 py-2" role="status" aria-live="polite">
          {feedback}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-gray-500 mb-4">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(esp => {
              const slug = ramoSlug(esp.ramoId);
              const isSelected = selectedIds.has(esp.id);
              return (
                <button
                  key={esp.id}
                  onClick={() => (selectionMode ? toggleSelected(esp.id) : setViewing(esp))}
                  aria-pressed={selectionMode ? isSelected : undefined}
                  className={`bg-white p-5 rounded-xl border text-left hover:shadow-lg transition-all group flex flex-col h-full relative overflow-hidden ${isSelected ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-200 hover:border-blue-500'}`}
                >
                  {selectionMode && (
                    <span className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 border border-slate-300'}`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                  <div className={`absolute top-0 left-0 w-1 h-full ${RAMO_COLOR[slug] || 'bg-blue-500'}`}></div>
                  <div className="flex justify-between items-start mb-3 pl-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded">
                      {RAMO_BADGE[slug] || ramoNome(esp.ramoId)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300">{esp.totalItens} itens</span>
                  </div>
                  <h3 className="font-black text-slate-800 mb-2 leading-tight pl-3 text-lg">{esp.nome}</h3>
                  <div className="mt-auto pt-3 border-t border-gray-50 pl-3 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                      Ver Requisitos ➜
                    </span>
                    <span className="text-[10px] text-slate-400">
                      N1:{esp.nivel1} N2:{esp.nivel2}{esp.nivel3 ? ` N3:${esp.nivel3}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">Nenhuma especialidade encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 bg-gray-50 relative">
              <button
                onClick={() => setViewing(null)}
                className="absolute top-6 right-6 text-gray-400 hover:text-red-500 text-xl font-bold bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center"
              >
                ✕
              </button>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                {RAMO_BADGE[ramoSlug(viewing.ramoId)] || ramoNome(viewing.ramoId)}
              </span>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{viewing.nome}</h2>
              <p className="text-slate-500 text-xs mt-1">
                Nível 1: {viewing.nivel1} itens · Nível 2: {viewing.nivel2} itens
                {viewing.nivel3 ? ` · Nível 3: ${viewing.nivel3} itens` : ''} · Total: {viewing.totalItens}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-white">
              <div className="border-b pb-3 mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-tighter">
                  Lista de Requisitos
                </h4>
                {member && fichaState && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-black text-blue-700">Ficha operacional</div>
                        <p className="text-xs text-blue-900">
                          {fichaState.requisitosConcluidos.length}/{viewing.totalItens} requisitos cumpridos
                          {fichaState.nivelAtual ? ` · nivel ${fichaState.nivelAtual}` : ' · sem nivel ainda'}
                          {fichaState.dataConclusao ? ` · concluida em ${fichaState.dataConclusao}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 text-[10px] font-bold">
                        <span className={fichaState.requisitosConcluidos.length >= viewing.nivel1 ? 'text-green-700' : 'text-slate-400'}>
                          N1 {viewing.nivel1}
                        </span>
                        <span className={fichaState.requisitosConcluidos.length >= viewing.nivel2 ? 'text-green-700' : 'text-slate-400'}>
                          N2 {viewing.nivel2}
                        </span>
                        {viewing.nivel3 ? (
                          <span className={fichaState.requisitosConcluidos.length >= viewing.nivel3 ? 'text-green-700' : 'text-slate-400'}>
                            N3 {viewing.nivel3}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={printFicha}
                      className="mt-3 text-[11px] bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100"
                    >
                      Imprimir ficha
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="Avaliador"
                        value={fichaState.avaliador || ''}
                        onChange={e => updateFichaField({ avaliador: e.target.value })}
                        className="text-xs border rounded-lg px-3 py-2 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Notas gerais da ficha"
                        value={fichaState.notas || ''}
                        onChange={e => updateFichaField({ notas: e.target.value })}
                        className="text-xs border rounded-lg px-3 py-2 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
              {requisitosDoVisualizado.length > 0 ? (
                <div className="space-y-2">
                  {requisitosDoVisualizado.map(req => (
                    <div
                      key={req.posicao}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex gap-4">
                        {member && fichaState ? (
                          <input
                            type="checkbox"
                            checked={fichaState.requisitosConcluidos.includes(req.posicao)}
                            onChange={() => toggleRequisito(req.posicao)}
                            className="mt-1"
                            aria-label={`Marcar requisito ${req.posicao}`}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center font-black text-slate-500 shrink-0 text-xs shadow-sm">
                            {req.posicao}
                          </div>
                        )}
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {member && fichaState ? <strong className="mr-2 text-slate-500">{req.posicao}.</strong> : null}
                          {req.opcional ? <span className="text-amber-600 font-bold mr-1">[opcional]</span> : null}
                          {req.texto}
                        </p>
                      </div>
                      {member && fichaState && (
                        <div className="mt-3 pl-10 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {(['em_estudo', 'cumprido', 'validado', 'revisar'] as SpecialtyRequirementStatus[]).map(status => {
                              const active = statusRequisito(req.posicao) === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => setStatusRequisito(req.posicao, status)}
                                  className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${active ? STATUS_CLASS[status] : 'border-slate-200 bg-white text-slate-400'}`}
                                >
                                  {STATUS_LABEL[status]}
                                </button>
                              );
                            })}
                          </div>
                          {avaliacaoRequisito(req.posicao) && (
                            <p className="text-[10px] text-slate-400">
                              Última avaliação: {avaliacaoRequisito(req.posicao)?.data}
                              {avaliacaoRequisito(req.posicao)?.avaliador
                                ? ` · ${avaliacaoRequisito(req.posicao)?.avaliador}`
                                : ''}
                            </p>
                          )}
                          <textarea
                            value={evidenciaTexto(req.posicao)}
                            onChange={e => updateEvidencia(req.posicao, e.target.value)}
                            placeholder="Evidência, anotação do jovem ou observação da chefia..."
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                  <p className="text-4xl mb-4">📓</p>
                  <p className="font-bold">Requisitos não cadastrados.</p>
                </div>
              )}
              <button
                onClick={() => openPdfAtPage('guia_especialidades_2024', pdfPageForEspecialidade(viewing.id) || 1)}
                className="text-[11px] text-blue-600 hover:underline mt-4 italic block"
                title={`Abrir Guia de Especialidades 18ª Ed. 2024-1${pdfPageForEspecialidade(viewing.id) ? ` na página ${pdfPageForEspecialidade(viewing.id)}` : ''}`}
              >
                📄 Fonte: {viewing.fonte}{pdfPageForEspecialidade(viewing.id) ? ` (pág. ${pdfPageForEspecialidade(viewing.id)})` : ''}
              </button>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button onClick={() => setViewing(null)} className="text-slate-500 text-xs font-bold hover:text-slate-800">
                ESC para fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Devolução sem vínculo: escolher a qual jovem aplicar */}
      {pendingImport && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Aplicar devolução</h3>
            <p className="text-xs text-slate-500">
              Esta devolução não tem jovem vinculado{pendingImport.member ? ` (ou "${pendingImport.member.name}" não está cadastrado)` : ''}.
              Escolha a qual jovem aplicar as {pendingImport.fichas.length} ficha(s):
            </p>
            <ul className="text-[11px] text-slate-500 list-disc pl-5 max-h-24 overflow-y-auto">
              {pendingImport.fichas.map(f => (
                <li key={f.especialidadeId}>{f.nome} · {f.requisitosConcluidos.length}/{f.totalItens} requisitos</li>
              ))}
            </ul>
            <select
              value={pendingMemberId}
              onChange={e => setPendingMemberId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Selecione o jovem…</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingImport(null)}
                className="text-xs font-bold text-slate-500 px-3 py-2 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarImport}
                disabled={!pendingMemberId || busy}
                className="text-xs font-bold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
