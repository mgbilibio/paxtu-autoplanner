import React, { useState, useEffect, useMemo } from 'react';
import { ScoutMember, MemberBlocoState, MemberReconhecimentoState, ScoutBranch } from '../types';
import {
  RAMOS_2025,
  EIXOS_2025,
  ETAPAS_2025,
  BLOCOS_2025,
  BLOCO_RAMO_META_2025,
  ACOES_FIXAS_2025,
  ACOES_VARIAVEIS_2025,
  BLOCO_ESPECIALIDADES_2025,
  BLOCO_INSIGNIAS_2025,
  RECONHECIMENTOS_2025,
  RECONHECIMENTO_REQUISITOS_2025,
} from '../data/generated/progressao_2025';
import {
  saveMemberBlocoState,
  saveMemberBlocoStateOptimistic,
  getAllMemberBlocoStates,
  getMemberReconhecimento,
  saveMemberReconhecimento,
} from '../services/storageService';
import {
  formatOfficialDate,
  hasOfficialLayer,
  listOfficialConquistas,
  listOfficialEtapaTrail,
  listOfficialSpecialties,
  listOfficialVidaEscoteira,
  listOtherOfficialEtapas,
  officialEtapaEscoteiro,
  officialStatusLabel,
  PAXTU_HISTORICO_AVISO,
  suggestEquivalencia,
} from '../services/equivalenciaService';
import { ConfirmDialog } from './ConfirmDialog';
import { OfficialEquivalenciaPanel } from './OfficialEquivalenciaPanel';
import { FichaViewToggle, ProgressViewLayout } from './ProgressViewLayout';
import { readFichaViewMode, type FichaViewMode } from '../utils/fichaViewMode';

const calcAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

interface Props {
  member: ScoutMember;
  onClose?: () => void;
}

const ramoIdForBranch = (branch: ScoutBranch): number | null => {
  if (branch === ScoutBranch.LOBINHO) return RAMOS_2025.find(r => r.slug === 'lobinho')?.id ?? null;
  if (branch === ScoutBranch.ESCOTEIRO) return RAMOS_2025.find(r => r.slug === 'escoteiro')?.id ?? null;
  return null;
};

// V21: emoji + texto legível para SR e usuários sem fontes coloridas
const modalidadeBadge = (m: 'geral' | 'ar' | 'mar') =>
  m === 'ar' ? '✈️ (Ar)' : m === 'mar' ? '⚓ (Mar)' : '';

export const BlocoTracker: React.FC<Props> = ({ member, onClose }) => {
  const ramoId = ramoIdForBranch(member.branch);
  const [estados, setEstados] = useState<Record<number, MemberBlocoState | null>>({});
  const [blocoAberto, setBlocoAberto] = useState<number | null>(null);
  const [recState, setRecState] = useState<MemberReconhecimentoState | null>(null);
  // V17: rascunho local de notas + debounce para evitar gravação a cada keystroke
  const [notasDraft, setNotasDraft] = useState<Record<number, string>>({});
  const notasTimerRef = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [confirmacao, setConfirmacao] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [viewMode, setViewMode] = useState<FichaViewMode>(() => readFichaViewMode());

  const reconhecimento = useMemo(
    () => RECONHECIMENTOS_2025.find(r => r.ramoId === ramoId),
    [ramoId],
  );

  useEffect(() => {
    if (!ramoId) return;
    getAllMemberBlocoStates(member.id).then(states => {
      const byBlocoId: Record<number, MemberBlocoState | null> = {};
      BLOCOS_2025.forEach(b => { byBlocoId[b.id] = states.find(s => s.blocoId === b.id) || null; });
      setEstados(byBlocoId);
    });
    if (reconhecimento) {
      getMemberReconhecimento(member.id, reconhecimento.id).then(setRecState);
    }
  }, [member.id, ramoId, reconhecimento]);

  const concluidos = useMemo(
    () => Object.values(estados).filter(s => s?.dataConclusao).length,
    [estados],
  );

  const etapasRamo = ETAPAS_2025.filter(e => e.ramoId === ramoId);
  const etapaAtual = etapasRamo.reduce(
    (acc, et) => (concluidos >= et.blocosCumulativos ? et : acc),
    etapasRamo[0],
  );
  const proximaEtapa = etapasRamo.find(e => e.ordem === (etapaAtual?.ordem ?? 0) + 1);
  const equivalencia = useMemo(
    () => suggestEquivalencia(member, concluidos),
    [member, concluidos],
  );
  const oficialEtapa = equivalencia.officialEtapa || officialEtapaEscoteiro(member);
  const manterEtapaOficial = equivalencia.keepOfficialEtapa;
  const showOfficial = hasOfficialLayer(member);

  const recRequisitos = useMemo(
    () => reconhecimento ? RECONHECIMENTO_REQUISITOS_2025.filter(r => r.reconhecimentoId === reconhecimento.id) : [],
    [reconhecimento],
  );
  const idade = calcAge(member.birthDate);
  const idadeLimite = reconhecimento?.idadeLimiteAnos ?? null;
  const acimaDoLimite = !!(idade !== null && idadeLimite !== null && idade >= idadeLimite);
  const aptoReconhecimento = concluidos >= 18 && !!reconhecimento;

  if (!ramoId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Acompanhamento por blocos disponível apenas para Lobinho e Escoteiro (POR 2025+).
      </div>
    );
  }

  const updateBloco = async (blocoId: number, mutator: (s: MemberBlocoState) => MemberBlocoState) => {
    const existing = estados[blocoId] || {
      memberId: member.id,
      blocoId,
      ramoId,
      fixasConcluidas: [],
      variaveisConcluidas: [],
      lastUpdate: new Date().toISOString(),
    };
    const expectedLastUpdate = existing.lastUpdate || null;
    const next = mutator({ ...existing, lastUpdate: new Date().toISOString() });

    // Auto-cálculo de conclusão de bloco
    const fixas = ACOES_FIXAS_2025.filter(a => a.blocoId === blocoId && a.ramoId === ramoId);
    const variaveis = ACOES_VARIAVEIS_2025.filter(a => a.blocoId === blocoId && a.ramoId === ramoId);
    const meta = BLOCO_RAMO_META_2025.find(m => m.blocoId === blocoId && m.ramoId === ramoId);
    const minVar = meta?.variaveisMinimo || 0;
    const todasFixas = next.fixasConcluidas.length === fixas.length;
    const creditos = next.creditosEquivalencia || 0;
    const variaveisOk = next.variaveisConcluidas.length + creditos >= minVar || !!next.substituidoPor;
    const blocoCompleto = todasFixas && variaveisOk && fixas.length + variaveis.length > 0;
    if (blocoCompleto && !next.dataConclusao) next.dataConclusao = new Date().toISOString().slice(0, 10);
    if (!blocoCompleto) next.dataConclusao = undefined;

    // U12: gravação otimista — detecta se outra aba/chefe editou o mesmo bloco
    const result = await saveMemberBlocoStateOptimistic(next, expectedLastUpdate);
    if (!result.ok) {
      const conflict = result.conflict;
      setConfirmacao({
        title: 'Conflito detectado',
        message:
          `Outro usuário ou outra aba atualizou este bloco em ${conflict.lastUpdate}.\n\n` +
          'Confirmar sobrescreve com sua versão. Cancelar descarta sua mudança local e mostra a versão atualizada.',
        confirmText: 'Sobrescrever',
        danger: true,
        onConfirm: async () => {
          await saveMemberBlocoStateOptimistic({ ...next, lastUpdate: new Date().toISOString() }, null);
          setEstados(prev => ({ ...prev, [blocoId]: next }));
          setConfirmacao(null);
        },
      });
        setEstados(prev => ({ ...prev, [blocoId]: conflict }));
        return;
    }
    setEstados(prev => ({ ...prev, [blocoId]: next }));
  };

  // V25: ao desmarcar uma fixa/variável de bloco já concluído, confirma a reabertura
  // (a dataConclusao será limpa pelo updateBloco quando o critério deixa de ser satisfeito)
  const confirmReopen = (blocoId: number, onConfirm: () => void): void => {
    const s = estados[blocoId];
    if (!s?.dataConclusao) {
      onConfirm();
      return;
    }
    setConfirmacao({
      title: 'Reabrir bloco concluído',
      message: `Bloco já estava concluído em ${s.dataConclusao}.\n\nReabrir remove a data de conclusão atual.`,
      confirmText: 'Reabrir',
      danger: true,
      onConfirm: () => {
        onConfirm();
        setConfirmacao(null);
      },
    });
  };

  const confirmEquivalenciaCredito = async (blocoId: number) => {
    if (!ramoId) return;
    const existing = estados[blocoId];
    const next: MemberBlocoState = {
      memberId: member.id,
      blocoId,
      ramoId,
      fixasConcluidas: existing?.fixasConcluidas || [],
      variaveisConcluidas: existing?.variaveisConcluidas || [],
      ...existing,
      creditosEquivalencia: (existing?.creditosEquivalencia || 0) + 1,
      equivalenciaIgnorada: undefined,
      lastUpdate: new Date().toISOString(),
      dataConclusao: existing?.dataConclusao,
    };
    await saveMemberBlocoState(next);
    setEstados(prev => ({ ...prev, [blocoId]: next }));
  };

  const ignoreEquivalencia = async (blocoId: number) => {
    if (!ramoId) return;
    const existing = estados[blocoId];
    const next: MemberBlocoState = {
      memberId: member.id,
      blocoId,
      ramoId,
      fixasConcluidas: existing?.fixasConcluidas || [],
      variaveisConcluidas: existing?.variaveisConcluidas || [],
      ...existing,
      equivalenciaIgnorada: true,
      lastUpdate: new Date().toISOString(),
      dataConclusao: existing?.dataConclusao,
    };
    await saveMemberBlocoState(next);
    setEstados(prev => ({ ...prev, [blocoId]: next }));
  };

  const toggleFixa = (blocoId: number, idx: number) => {
    const s = estados[blocoId];
    const isUnchecking = !!s?.fixasConcluidas.includes(idx);
    const run = () => updateBloco(blocoId, s => {
      const has = s.fixasConcluidas.includes(idx);
      return { ...s, fixasConcluidas: has ? s.fixasConcluidas.filter(i => i !== idx) : [...s.fixasConcluidas, idx] };
    });
    if (isUnchecking) {
      confirmReopen(blocoId, run);
      return;
    }
    run();
  };

  const toggleVariavel = (blocoId: number, idx: number) => {
    const s = estados[blocoId];
    const isUnchecking = !!s?.variaveisConcluidas.includes(idx);
    const run = () => updateBloco(blocoId, s => {
      const has = s.variaveisConcluidas.includes(idx);
      return { ...s, variaveisConcluidas: has ? s.variaveisConcluidas.filter(i => i !== idx) : [...s.variaveisConcluidas, idx] };
    });
    if (isUnchecking) {
      confirmReopen(blocoId, run);
      return;
    }
    run();
  };

  const toggleRecRequisito = async (ordem: number) => {
    if (!reconhecimento || !ramoId) return;
    const base: MemberReconhecimentoState = recState || {
      memberId: member.id,
      reconhecimentoId: reconhecimento.id,
      ramoId,
      requisitosConcluidos: [],
      lastUpdate: new Date().toISOString(),
    };
    const has = base.requisitosConcluidos.includes(ordem);
    const next: MemberReconhecimentoState = {
      ...base,
      requisitosConcluidos: has
        ? base.requisitosConcluidos.filter(o => o !== ordem)
        : [...base.requisitosConcluidos, ordem],
      lastUpdate: new Date().toISOString(),
    };
    const todosOk = recRequisitos.every(r => next.requisitosConcluidos.includes(r.ordem));
    // R1: dataConquista é WRITE-ONCE. Só seta na primeira vez que todos OK + 18 blocos.
    // NUNCA apaga ao desmarcar — homologação é registro administrativo. Para reverter,
    // o usuário precisa do botão "Desfazer homologação" que move a entrada para histórico.
    if (todosOk && concluidos >= 18 && !next.dataConquista) {
      next.dataConquista = new Date().toISOString().slice(0, 10);
      next.idadeNaConquista = idade ?? undefined;
    }
    await saveMemberReconhecimento(next);
    setRecState(next);
  };

  const desfazerHomologacao = async () => {
    if (!recState?.dataConquista) return;
    setConfirmacao({
      title: 'Desfazer homologação',
      message:
        `Reconhecimento: ${reconhecimento?.nome}\n` +
        `Data atual: ${recState.dataConquista}\n\n` +
        'A reversão será registrada no histórico.',
      confirmText: 'Desfazer',
      danger: true,
      onConfirm: async () => {
        const historico = recState.historicoConquistas || [];
        const next: MemberReconhecimentoState = {
          ...recState,
          historicoConquistas: [
            ...historico,
            { data: recState.dataConquista!, revertidoEm: new Date().toISOString().slice(0, 10), idade: recState.idadeNaConquista },
          ],
          dataConquista: undefined,
          idadeNaConquista: undefined,
          lastUpdate: new Date().toISOString(),
        };
        await saveMemberReconhecimento(next);
        setRecState(next);
        setConfirmacao(null);
      },
    });
  };

  const updateRecField = async (patch: Partial<MemberReconhecimentoState>) => {
    if (!reconhecimento || !ramoId) return;
    const base: MemberReconhecimentoState = recState || {
      memberId: member.id,
      reconhecimentoId: reconhecimento.id,
      ramoId,
      requisitosConcluidos: [],
      lastUpdate: new Date().toISOString(),
    };
    const next = { ...base, ...patch, lastUpdate: new Date().toISOString() };
    await saveMemberReconhecimento(next);
    setRecState(next);
  };

  const reportRows = () => BLOCOS_2025.flatMap(bloco => {
    const eixo = EIXOS_2025.find(e => e.id === bloco.eixoId)?.nome || '';
    const estado = estados[bloco.id];
    const dataConclusao = estado?.dataConclusao || '';
    const notas = estado?.notas || '';
    const fixas = ACOES_FIXAS_2025
      .filter(a => a.blocoId === bloco.id && a.ramoId === ramoId)
      .map(a => ({
        bloco,
        eixo,
        tipo: 'Fixa',
        ordem: a.ordem,
        modalidade: a.modalidade,
        descricao: a.descricao,
        concluida: !!estado?.fixasConcluidas.includes(a.ordem),
        dataConclusao,
        notas,
      }));
    const variaveis = ACOES_VARIAVEIS_2025
      .filter(a => a.blocoId === bloco.id && a.ramoId === ramoId)
      .map(a => ({
        bloco,
        eixo,
        tipo: 'Variavel',
        ordem: a.ordem,
        modalidade: a.modalidade,
        descricao: a.descricao,
        concluida: !!estado?.variaveisConcluidas.includes(a.ordem),
        dataConclusao,
        notas,
      }));
    return [...fixas, ...variaveis];
  });

  const escapeCsv = (value: string | number | boolean) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

  const escapeHtml = (value: string | number | boolean) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const exportCsv = () => {
    const header = ['Jovem', 'Ramo', 'Bloco', 'Eixo', 'Tipo', 'Ordem', 'Modalidade', 'Descricao', 'Concluida', 'DataConclusao', 'Notas'];
    const linhas = reportRows().map(row => [
      member.name,
      member.branch,
      row.bloco.nome,
      row.eixo,
      row.tipo,
      row.ordem,
      row.modalidade,
      row.descricao,
      row.concluida ? 'sim' : 'nao',
      row.dataConclusao,
      row.notas,
    ].map(escapeCsv).join(','));
    const csv = [header.join(','), ...linhas].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paxtu_progressao_${member.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printFicha = () => {
    const rows = reportRows();
    const htmlRows = rows.map(row => `
      <tr>
        <td>B${row.bloco.ordemGlobal}</td>
        <td>${escapeHtml(row.bloco.nome)}</td>
        <td>${escapeHtml(row.eixo)}</td>
        <td>${row.tipo} ${row.ordem}</td>
        <td>${escapeHtml(row.modalidade)}</td>
        <td>${escapeHtml(row.descricao)}</td>
        <td>${row.concluida ? 'Concluida' : 'Pendente'}</td>
        <td>${escapeHtml(row.dataConclusao)}</td>
      </tr>
    `).join('');
    const trail = listOfficialEtapaTrail(member);
    const outras = listOtherOfficialEtapas(member);
    const conquistas = listOfficialConquistas(member);
    const especialidades = listOfficialSpecialties(member);
    const vida = listOfficialVidaEscoteira(member);
    const trailHtml = trail.map(item => `
      <tr>
        <td>${escapeHtml(item.etapa)}</td>
        <td>${escapeHtml(officialStatusLabel(item.status, item.conquistado))}</td>
        <td>${escapeHtml(formatOfficialDate(item.date) || '')}</td>
      </tr>
    `).join('');
    const outrasHtml = outras.length
      ? `<h2>Outros ramos e passagens</h2>
         <p>Pendente aqui nao significa que o jovem falhou — muitas etapas sao de outro ramo.</p>
         <table><thead><tr><th>Etapa</th><th>Situacao</th><th>Data</th></tr></thead><tbody>${
           outras.map(item => `
             <tr>
               <td>${escapeHtml(item.nome)}</td>
               <td>${escapeHtml(officialStatusLabel(undefined, item.conquistado))}</td>
               <td>${escapeHtml(formatOfficialDate(item.date) || '')}</td>
             </tr>
           `).join('')
         }</tbody></table>`
      : '';
    const conquistasHtml = conquistas.length
      ? conquistas.map(item => `
          <tr>
            <td>${escapeHtml(item.nome)}</td>
            <td>${escapeHtml(formatOfficialDate(item.date) || '')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2">Nenhuma conquista no historico Paxtu.</td></tr>';
    const specHtml = especialidades.length
      ? especialidades.map(item => `
          <tr>
            <td>${escapeHtml(item.nome)}</td>
            <td>${item.nivelOficial != null ? `N${item.nivelOficial}` : ''}</td>
            <td>${escapeHtml(formatOfficialDate(item.date) || '')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="3">Nenhuma especialidade no historico Paxtu.</td></tr>';
    const vidaHtml = vida.length
      ? `<h2>Vida escoteira</h2>
         <table><thead><tr><th>Data</th><th>Atividade</th><th>Local</th></tr></thead><tbody>${
           vida.map(row => `
             <tr>
               <td>${escapeHtml(row.data || '')}</td>
               <td>${escapeHtml(row.atividade)}</td>
               <td>${escapeHtml(row.local || '')}</td>
             </tr>
           `).join('')
         }</tbody></table>`
      : '';
    const officialBlock = showOfficial
      ? `
      <h2>Oficial (Paxtu / POR antigo)</h2>
      <p>Etapa oficial: <strong>${escapeHtml(oficialEtapa || 'nao informada')}</strong></p>
      <h2>Progressao — Ramo escoteiro</h2>
      <table><thead><tr><th>Etapa</th><th>Situacao</th><th>Data</th></tr></thead><tbody>${trailHtml}</tbody></table>
      ${outrasHtml}
      <h2>Conquistas e certificacoes</h2>
      <table><thead><tr><th>Conquista</th><th>Data</th></tr></thead><tbody>${conquistasHtml}</tbody></table>
      <h2>Especialidades oficiais</h2>
      <table><thead><tr><th>Nome</th><th>Nivel</th><th>Data</th></tr></thead><tbody>${specHtml}</tbody></table>
      ${vidaHtml}
      <p>${escapeHtml(PAXTU_HISTORICO_AVISO)}</p>
      `
      : `<h2>Oficial (Paxtu / POR antigo)</h2><p>Sem historico Paxtu neste jovem</p>`;
    const html = `
      <!doctype html><html><head><meta charset="utf-8">
      <title>Ficha de Progressao - ${escapeHtml(member.name)}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:24px;color:#111827}
        h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:20px 0 8px}
        p{margin:4px 0 16px;color:#4b5563}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
        th,td{border:1px solid #d1d5db;padding:6px;text-align:left;vertical-align:top}
        th{background:#f3f4f6}
        .ok{font-weight:700}
      </style></head><body>
      <h1>Ficha de Progressao</h1>
      <p><strong>Jovem:</strong> ${escapeHtml(member.name)} · <strong>Ramo:</strong> ${escapeHtml(member.branch)} · <strong>Oficial:</strong> ${escapeHtml(oficialEtapa || '—')} · <strong>Blocos:</strong> ${concluidos}/18 · <strong>Etapa pelos blocos:</strong> ${escapeHtml(etapaAtual?.nome || '')}</p>
      ${officialBlock}
      <h2>Blocos POR 2025+</h2>
      <table><thead><tr><th>Bloco</th><th>Nome</th><th>Eixo</th><th>Tipo</th><th>Modalidade</th><th>Descricao</th><th>Status</th><th>Data</th></tr></thead><tbody>${htmlRows}</tbody></table>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (!win) {
      window.dispatchEvent(new CustomEvent('paxtu:toast', {
        detail: { kind: 'error', message: 'Nao foi possivel abrir a janela de impressao.' },
      }));
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-white">
      {confirmacao && (
        <ConfirmDialog
          title={confirmacao.title}
          message={confirmacao.message}
          confirmText={confirmacao.confirmText}
          danger={confirmacao.danger}
          onCancel={() => setConfirmacao(null)}
          onConfirm={confirmacao.onConfirm}
        />
      )}
      {/* Header compacto — fixo no topo */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Ficha do jovem</div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-xl font-bold truncate">{member.name}</h3>
              <span className="text-xs opacity-80">
                {member.branch}
                {' · Oficial: '}
                <strong>{oficialEtapa || (showOfficial ? 'etapa não informada' : 'sem Paxtu')}</strong>
                {manterEtapaOficial ? ' (manter)' : ''}
                {' · blocos '}
                <strong>{concluidos}/18</strong>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => {
                const blocoFoco = blocoAberto || BLOCOS_2025.find(b => {
                  const s = estados[b.id];
                  return !s?.dataConclusao;
                })?.id;
                window.dispatchEvent(new CustomEvent('paxtu:generate-from-tracker', {
                  detail: { memberId: member.id, branch: member.branch, blocoFoco }
                }));
                if (onClose) onClose();
              }}
              className="bg-yellow-300 hover:bg-yellow-400 text-yellow-900 font-bold text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap"
              title="Gera plano de reunião com base nos blocos pendentes"
            >
              💡 Sugerir plano IA
            </button>
            <button
              onClick={printFicha}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap"
              title="Imprimir ficha de progressão do jovem"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={exportCsv}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap"
              title="Exportar ficha de progressão em CSV"
            >
              CSV
            </button>
            {onClose && (
              <button onClick={onClose} className="text-white/70 hover:text-white text-2xl px-1" title="Fechar">✕</button>
            )}
          </div>
        </div>
        {/* Barra de progresso e próxima etapa */}
        <div className="mt-2 bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div className="bg-yellow-300 h-1.5 transition-all" style={{ width: `${(concluidos / 18) * 100}%` }} />
        </div>
        <div className="text-[10px] mt-1 flex justify-between opacity-90">
          <span>{18 - concluidos} blocos restantes</span>
          {proximaEtapa && (
            <span>Próxima: <strong>{proximaEtapa.nome}</strong> em {proximaEtapa.blocosCumulativos - concluidos}</span>
          )}
          {!proximaEtapa && reconhecimento && concluidos >= 18 && (
            <span className="font-bold text-yellow-300">🏆 Apto a {reconhecimento.nome}!</span>
          )}
        </div>
        <div className="mt-2">
          <FichaViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <ProgressViewLayout
        mode={viewMode}
        official={<OfficialEquivalenciaPanel member={member} concludedBlocos={concluidos} variant="column" />}
        strip={<OfficialEquivalenciaPanel member={member} concludedBlocos={concluidos} variant="strip" />}
        blocos={(
          <>
        {BLOCOS_2025.map(bloco => {
          const eixo = EIXOS_2025.find(e => e.id === bloco.eixoId)!;
          const meta = BLOCO_RAMO_META_2025.find(m => m.blocoId === bloco.id && m.ramoId === ramoId);
          const fixas = ACOES_FIXAS_2025.filter(a => a.blocoId === bloco.id && a.ramoId === ramoId);
          const variaveis = ACOES_VARIAVEIS_2025.filter(a => a.blocoId === bloco.id && a.ramoId === ramoId);
          const estado = estados[bloco.id];
          const fixasOk = estado?.fixasConcluidas.length === fixas.length && fixas.length > 0;
          const minVar = meta?.variaveisMinimo || 0;
          const creditos = estado?.creditosEquivalencia || 0;
          const variaveisOk = (estado?.variaveisConcluidas.length || 0) + creditos >= minVar || !!estado?.substituidoPor;
          const concluido = !!estado?.dataConclusao;
          const aberto = blocoAberto === bloco.id;
          const sugestao = showOfficial && member.branch === ScoutBranch.ESCOTEIRO
            ? equivalencia.blocos.find(item => item.blocoId === bloco.id)
            : null;

          const especialidadesSubst = BLOCO_ESPECIALIDADES_2025.filter(
            e => e.blocoId === bloco.id && e.ramoId === ramoId && e.tipo === 'substitui',
          );
          const insigniasSubst = BLOCO_INSIGNIAS_2025.filter(
            i => i.blocoId === bloco.id && i.ramoId === ramoId && i.tipo === 'substitui',
          );

          return (
            <div
              key={bloco.id}
              className={`rounded-lg border ${concluido ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'} overflow-hidden`}
              style={{ borderLeftWidth: 4, borderLeftColor: eixo.corHex }}
            >
              <button
                onClick={() => setBlocoAberto(aberto ? null : bloco.id)}
                aria-expanded={aberto}
                aria-controls={`bloco-body-${bloco.id}`}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      concluido ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {concluido ? '✓' : bloco.ordemGlobal}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-semibold" style={{ color: eixo.corHex }}>
                      {eixo.nome}
                    </div>
                    <div className="text-sm font-bold truncate">{bloco.nome}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex gap-2 ml-2 shrink-0 items-center">
                  {sugestao?.suggested && !estado?.equivalenciaIgnorada && !concluido && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                      Sugestão UEB
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 ${fixasOk ? 'text-green-700 font-bold' : ''}`} title="Ações Fixas">
                    <span aria-hidden="true">{fixasOk ? '✓' : '○'}</span>
                    F {estado?.fixasConcluidas.length || 0}/{fixas.length}
                  </span>
                  <span className={`inline-flex items-center gap-1 ${variaveisOk ? 'text-green-700 font-bold' : ''}`} title="Ações Variáveis">
                    <span aria-hidden="true">{variaveisOk ? '✓' : '○'}</span>
                    V {(estado?.variaveisConcluidas.length || 0) + creditos}/{minVar}
                  </span>
                </div>
              </button>

              {aberto && (
                <div id={`bloco-body-${bloco.id}`} className="px-4 pb-4 border-t bg-white space-y-3 text-sm">
                  {sugestao?.suggested && (
                    <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded p-2 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-indigo-800">Sugestão UEB</div>
                      <p className="text-xs text-indigo-950 leading-relaxed">
                        {sugestao.reasons.join(' · ')}. A chefia confirma um crédito variável; as ações educativas não são marcadas sozinhas.
                      </p>
                      {estado?.equivalenciaIgnorada ? (
                        <p className="text-[11px] text-slate-600">Sugestão ignorada neste bloco.</p>
                      ) : creditos > 0 ? (
                        <p className="text-[11px] text-green-800 font-bold">
                          Crédito variável UEB confirmado ({creditos}).
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => { void confirmEquivalenciaCredito(bloco.id); }}
                            className="px-2 py-1 bg-indigo-700 text-white rounded text-[11px] font-bold hover:bg-indigo-600"
                          >
                            Confirmar crédito variável
                          </button>
                          <button
                            type="button"
                            onClick={() => { void ignoreEquivalencia(bloco.id); }}
                            className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-50"
                          >
                            Ignorar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Em telas grandes, fixas e variáveis lado a lado */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3 mt-3">
                  {fixas.length > 0 && (
                    <div>
                      <h5 className="text-xs uppercase font-bold text-rose-700 mb-2">Ações Fixas (todas obrigatórias)</h5>
                      <div className="space-y-1">
                      {fixas.map((a, idx) => {
                        const i = idx + 1;
                        const checked = estado?.fixasConcluidas.includes(i) || false;
                        const inputId = `fixa-${bloco.id}-${i}`;
                        return (
                          <div key={i} className="flex items-start gap-2 py-1 hover:bg-rose-50 rounded px-2 transition-colors">
                            <input id={inputId} type="checkbox" checked={checked} onChange={() => toggleFixa(bloco.id, i)} className="mt-1 shrink-0 cursor-pointer" />
                            <label htmlFor={inputId} className={`text-xs leading-relaxed cursor-pointer ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {modalidadeBadge(a.modalidade) && <span className="mr-1">{modalidadeBadge(a.modalidade)}</span>}
                              {a.descricao}
                            </label>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  {variaveis.length > 0 && (
                    <div>
                      <h5 className="text-xs uppercase font-bold text-blue-700 mb-2">
                        Ações Variáveis (mínimo {minVar} de {variaveis.length})
                      </h5>
                      <div className="space-y-1">
                      {variaveis.map((a, idx) => {
                        const i = idx + 1;
                        const checked = estado?.variaveisConcluidas.includes(i) || false;
                        const inputId = `variavel-${bloco.id}-${i}`;
                        return (
                          <div key={i} className="flex items-start gap-2 py-1 hover:bg-blue-50 rounded px-2 transition-colors">
                            <input id={inputId} type="checkbox" checked={checked} onChange={() => toggleVariavel(bloco.id, i)} className="mt-1 shrink-0 cursor-pointer" />
                            <label htmlFor={inputId} className={`text-xs leading-relaxed cursor-pointer ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                              {modalidadeBadge(a.modalidade) && <span className="mr-1">{modalidadeBadge(a.modalidade)}</span>}
                              {a.descricao}
                            </label>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  </div>{/* fim do grid */}

                  {(especialidadesSubst.length > 0 || insigniasSubst.length > 0) && (
                    <div>
                      <h5 className="text-xs uppercase font-bold text-amber-700 mb-2">Substituir variáveis por:</h5>
                      <select
                        value={estado?.substituidoPor ? `${estado.substituidoPor.tipo}:${estado.substituidoPor.nome}` : ''}
                        onChange={e => {
                          const v = e.target.value;
                          updateBloco(bloco.id, s => {
                            if (!v) return { ...s, substituidoPor: undefined };
                            const [tipo, nome] = v.split(':');
                            return { ...s, substituidoPor: { tipo: tipo as 'especialidade' | 'insignia', nome } };
                          });
                        }}
                        className="w-full text-xs border rounded px-2 py-1 bg-white"
                      >
                        <option value="">— nenhum —</option>
                        {especialidadesSubst.map(e => (
                          <option key={`e-${e.nome}`} value={`especialidade:${e.nome}`}>
                            🏅 {e.nome}
                          </option>
                        ))}
                        {insigniasSubst.map(i => (
                          <option key={`i-${i.nome}`} value={`insignia:${i.nome}`}>
                            🎖️ {i.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {concluido && (
                    <div className="bg-green-100 border border-green-300 text-green-900 text-xs rounded p-2">
                      ✓ Bloco concluído em {estado?.dataConclusao}
                      {estado?.avaliador && ` · Avaliador: ${estado.avaliador}`}
                    </div>
                  )}

                  <textarea
                    placeholder="Notas, evidências, avaliador..."
                    aria-label={`Notas do bloco ${bloco.nome}`}
                    value={notasDraft[bloco.id] !== undefined ? notasDraft[bloco.id] : (estado?.notas || '')}
                    onChange={e => {
                      const v = e.target.value;
                      setNotasDraft(prev => ({ ...prev, [bloco.id]: v }));
                      if (notasTimerRef.current[bloco.id]) clearTimeout(notasTimerRef.current[bloco.id]);
                      notasTimerRef.current[bloco.id] = setTimeout(() => {
                        updateBloco(bloco.id, s => ({ ...s, notas: v }));
                      }, 500);
                    }}
                    className="w-full text-xs border rounded p-2 resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Card do Reconhecimento de Ramo */}
        {reconhecimento && (
          <div
            className={`mt-4 rounded-lg border-2 p-4 ${
              recState?.dataConquista
                ? 'bg-yellow-50 border-yellow-400'
                : aptoReconhecimento
                ? 'bg-yellow-50/50 border-yellow-300'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-yellow-800">
                    Reconhecimento de Ramo
                  </div>
                  <h3 className="text-xl font-bold text-yellow-900">{reconhecimento.nome}</h3>
                  {idadeLimite && (
                    <p className="text-[11px] text-gray-600">
                      Antes dos {idadeLimite} anos
                      {idade !== null && (
                        <>
                          {' · '}
                          <span className={acimaDoLimite ? 'text-red-700 font-bold' : 'text-green-700'}>
                            jovem com {idade} anos
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {recState?.dataConquista && (
                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-black">
                    ✓ Conquistado em {recState.dataConquista}
                    {recState.idadeNaConquista && ` (${recState.idadeNaConquista} anos)`}
                  </span>
                  <button
                    onClick={desfazerHomologacao}
                    className="text-[10px] text-red-700 hover:underline"
                    title="Move para histórico, mantém o registro original"
                  >
                    Desfazer homologação
                  </button>
                </div>
              )}
            </div>

            {!aptoReconhecimento && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-900 mb-3">
                Faltam <strong>{18 - concluidos}</strong> blocos para liberar a checklist do reconhecimento.
              </div>
            )}

            {acimaDoLimite && (
              <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-900 mb-3 font-bold">
                ⚠️ Atenção: jovem já passou da idade-limite ({idadeLimite} anos).
              </div>
            )}

            <p className="text-xs text-gray-700 mb-3 italic">{reconhecimento.descricao}</p>

            <div className="space-y-1.5">
              {recRequisitos.map(req => {
                const checked = recState?.requisitosConcluidos.includes(req.ordem) || false;
                const inputId = `req-${reconhecimento?.id}-${req.ordem}`;
                return (
                  <div
                    key={req.ordem}
                    className={`flex items-start gap-2 py-1.5 px-2 rounded ${
                      aptoReconhecimento ? 'hover:bg-white' : 'opacity-50'
                    }`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      disabled={!aptoReconhecimento}
                      onChange={() => toggleRecRequisito(req.ordem)}
                      className="mt-1 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <label htmlFor={inputId} className={`text-xs ${aptoReconhecimento ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <strong className="text-yellow-800 uppercase mr-1">[{req.tipo}]</strong>
                      {req.descricao}
                    </label>
                  </div>
                );
              })}
            </div>

            {aptoReconhecimento && (
              <input
                type="text"
                placeholder="Homologado por (diretoria UEL)..."
                value={recState?.homologadoPor || ''}
                onChange={e => updateRecField({ homologadoPor: e.target.value })}
                className="w-full mt-3 text-xs border rounded p-2"
              />
            )}

            {reconhecimento.fontePagina && (
              <p className="text-[10px] text-gray-500 mt-2">
                Fonte: Manual do Escotista 2025, p.{reconhecimento.fontePagina}
              </p>
            )}
          </div>
        )}
          </>
        )}
      />
    </div>
  );
};
