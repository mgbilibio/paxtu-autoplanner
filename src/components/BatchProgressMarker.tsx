// U7: Marca mesma ação fixa/variável como concluída para múltiplos membros de uma seção.
// Cenário: "Toda a matilha fez a Promessa hoje" — em vez de abrir o tracker de cada um.

import React, { useState, useEffect, useMemo } from 'react';
import { ScoutMember, ScoutBranch, MemberBlocoState } from '../types';
import {
  RAMOS_2025,
  BLOCOS_2025,
  ACOES_FIXAS_2025,
  ACOES_VARIAVEIS_2025,
} from '../data/generated/progressao_2025';
import { getMembersAsync, getMemberBlocoState, saveMemberBlocoState, canWriteSection } from '../services/storageService';

interface Props {
  sectionId?: string;
  branch: ScoutBranch;
  onClose: () => void;
}

const ramoIdForBranch = (b: ScoutBranch): number | null => {
  if (b === ScoutBranch.LOBINHO) return RAMOS_2025.find(r => r.slug === 'lobinho')?.id ?? null;
  if (b === ScoutBranch.ESCOTEIRO) return RAMOS_2025.find(r => r.slug === 'escoteiro')?.id ?? null;
  return null;
};

export const BatchProgressMarker: React.FC<Props> = ({ sectionId, branch, onClose }) => {
  const ramoId = ramoIdForBranch(branch);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [blocoId, setBlocoId] = useState<number>(1);
  const [tipo, setTipo] = useState<'fixa' | 'variavel'>('fixa');
  const [acaoIdx, setAcaoIdx] = useState<number>(1);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // V24: Escape fecha o modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    getMembersAsync().then(all => {
      const filtered = all.filter(m => {
        if (sectionId && m.sectionId !== sectionId) return false;
        return !m.isArchived && m.branch === branch;
      });
      setMembers(filtered);
      setSelectedMembers(new Set(filtered.map(m => m.id))); // default todos
    });
  }, [sectionId, branch]);

  const acoesAtuais = useMemo(() => {
    if (!ramoId) return [];
    return tipo === 'fixa'
      ? ACOES_FIXAS_2025.filter(a => a.blocoId === blocoId && a.ramoId === ramoId)
      : ACOES_VARIAVEIS_2025.filter(a => a.blocoId === blocoId && a.ramoId === ramoId);
  }, [tipo, blocoId, ramoId]);

  const acaoSelecionada = acoesAtuais.find(a => a.ordem === acaoIdx);

  const toggleMember = (id: string) => {
    const next = new Set(selectedMembers);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedMembers(next);
  };

  const aplicar = async () => {
    if (!ramoId || !acaoSelecionada || selectedMembers.size === 0) return;
    // Aviso proativo: secao em modo consulta (lock de outro adulto) nao grava.
    if (!canWriteSection(sectionId)) {
      setFeedback('Seção em modo consulta: assuma a edição para marcar progresso.');
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    setWorking(true);
    let aplicadas = 0;
    try {
      for (const memberId of selectedMembers) {
        const existing = await getMemberBlocoState(memberId, blocoId) || {
          memberId,
          blocoId,
          ramoId,
          fixasConcluidas: [] as number[],
          variaveisConcluidas: [] as number[],
          lastUpdate: new Date().toISOString(),
        };
        const next: MemberBlocoState = { ...existing, lastUpdate: new Date().toISOString() };
        if (tipo === 'fixa') {
          if (!next.fixasConcluidas.includes(acaoIdx)) {
            next.fixasConcluidas = [...next.fixasConcluidas, acaoIdx];
            aplicadas++;
          }
        } else {
          if (!next.variaveisConcluidas.includes(acaoIdx)) {
            next.variaveisConcluidas = [...next.variaveisConcluidas, acaoIdx];
            aplicadas++;
          }
        }
        await saveMemberBlocoState(next);
      }
      setFeedback(`✓ Marcado para ${aplicadas} membro(s) (já estava em ${selectedMembers.size - aplicadas}).`);
    } catch {
      setFeedback('Não foi possível gravar. Verifique se a seção está em modo consulta e tente novamente.');
    } finally {
      setWorking(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (!ramoId) {
    return (
      <div className="p-4 text-gray-500 text-sm">Marcação em lote disponível apenas para Lobinho/Escoteiro.</div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">✏️ Marcar progresso em lote</h3>
            <p className="text-xs opacity-80">Aplica a mesma ação para múltiplos membros</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-4 space-y-3 border-b">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Bloco</label>
              <select value={blocoId} onChange={e => { setBlocoId(parseInt(e.target.value)); setAcaoIdx(1); }} className="w-full p-2 border rounded text-sm">
                {BLOCOS_2025.map(b => <option key={b.id} value={b.id}>B{b.ordemGlobal}: {b.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Tipo</label>
              <select value={tipo} onChange={e => { setTipo(e.target.value as any); setAcaoIdx(1); }} className="w-full p-2 border rounded text-sm">
                <option value="fixa">Fixa</option>
                <option value="variavel">Variável</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Ação ({acoesAtuais.length})</label>
              <select value={acaoIdx} onChange={e => setAcaoIdx(parseInt(e.target.value))} className="w-full p-2 border rounded text-sm">
                {acoesAtuais.map(a => {
                  const desc = a.descricao.length > 60 ? a.descricao.slice(0, 57) + '…' : a.descricao;
                  return <option key={a.ordem} value={a.ordem}>#{a.ordem} — {desc}</option>;
                })}
              </select>
            </div>
          </div>
          {acaoSelecionada && (
            <div className="bg-slate-50 border rounded p-2 text-xs text-slate-700">
              <strong>Ação selecionada:</strong> {acaoSelecionada.descricao}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase font-bold text-gray-500">Membros ({selectedMembers.size}/{members.length} selecionados)</span>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setSelectedMembers(new Set(members.map(m => m.id)))} className="text-blue-600 hover:underline">Todos</button>
              <button onClick={() => setSelectedMembers(new Set())} className="text-blue-600 hover:underline">Nenhum</button>
            </div>
          </div>
          <div className="space-y-1">
            {members.map(m => (
              <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={selectedMembers.has(m.id)} onChange={() => toggleMember(m.id)} />
                <span className="text-sm">{m.name}</span>
                {m.patrol && <span className="text-[10px] text-gray-400">· {m.patrol}</span>}
              </label>
            ))}
            {members.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Nenhum membro encontrado.</p>}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          {feedback ? (
            <span className="text-sm text-green-700 font-bold">{feedback}</span>
          ) : (
            <span className="text-xs text-gray-500">Aplicar a {selectedMembers.size} membro(s)</span>
          )}
          <button
            onClick={aplicar}
            disabled={working || selectedMembers.size === 0 || !acaoSelecionada}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-bold px-6 py-2 rounded text-sm"
          >
            {working ? 'Aplicando…' : 'Marcar como concluído'}
          </button>
        </div>
      </div>
    </div>
  );
};
