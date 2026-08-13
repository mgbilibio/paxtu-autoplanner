import React, { useEffect, useState, useMemo } from 'react';
import { ScoutMember, ScoutBranch } from '../types';
import { getMembersAsync, countConcludedBlocos, getMemberReconhecimento } from '../services/storageService';
import { isYouthMember } from '../utils/memberQuickAdd';
import { RAMOS_2025, ETAPAS_2025, RECONHECIMENTOS_2025 } from '../data/generated/progressao_2025';
import { StatusBadge } from './StatusBadge';
import { BatchProgressMarker } from './BatchProgressMarker';

interface Props {
  sectionId?: string;
  branch?: ScoutBranch;
  onMemberClick?: (m: ScoutMember) => void;
}

interface Row {
  member: ScoutMember;
  concluidos: number;
  etapaNome: string;
  reconhecido: boolean;
  dataConquista?: string;
  idade: number | null;
  alertaIdade: 'ok' | 'aproximando' | 'limite' | null;  // U11
}

// U11: calcula meses até passar do limite de idade do reconhecimento
const calcMonthsToLimit = (birthDate: string | undefined, limit: number | null): number | null => {
  if (!birthDate || !limit) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const limitDate = new Date(birth);
  limitDate.setFullYear(limitDate.getFullYear() + limit);
  const diffMs = limitDate.getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
};

const calcIdade = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

const ramoIdForBranch = (branch: ScoutBranch): number | null => {
  if (branch === ScoutBranch.LOBINHO) return RAMOS_2025.find(r => r.slug === 'lobinho')?.id ?? null;
  if (branch === ScoutBranch.ESCOTEIRO) return RAMOS_2025.find(r => r.slug === 'escoteiro')?.id ?? null;
  return null;
};

export const SectionProgressOverview: React.FC<Props> = ({ sectionId, branch, onMemberClick }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBatch, setShowBatch] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const all = await getMembersAsync();
      const filtered = all.filter(m => {
        if (sectionId && m.sectionId !== sectionId) return false;
        if (branch && m.branch !== branch) return false;
        if (!isYouthMember(m)) return false;
        return !m.isArchived && (m.branch === ScoutBranch.LOBINHO || m.branch === ScoutBranch.ESCOTEIRO);
      });

      const built: Row[] = await Promise.all(filtered.map(async m => {
        const concluidos = await countConcludedBlocos(m.id);
        const ramoId = ramoIdForBranch(m.branch);
        const etapas = ramoId ? ETAPAS_2025.filter(e => e.ramoId === ramoId) : [];
        const etapaAtual = etapas.reduce((acc, et) => (concluidos >= et.blocosCumulativos ? et : acc), etapas[0]);
        const recDef = RECONHECIMENTOS_2025.find(r => r.ramoId === ramoId);
        const recState = recDef ? await getMemberReconhecimento(m.id, recDef.id) : null;
        const idade = calcIdade(m.birthDate);
        const monthsLeft = calcMonthsToLimit(m.birthDate, recDef?.idadeLimiteAnos ?? null);
        let alertaIdade: 'ok' | 'aproximando' | 'limite' | null = null;
        if (!recState?.dataConquista && monthsLeft !== null) {
          if (monthsLeft <= 0) alertaIdade = 'limite';
          else if (monthsLeft <= 6) alertaIdade = 'aproximando';
          else alertaIdade = 'ok';
        }
        return {
          member: m,
          concluidos,
          etapaNome: etapaAtual?.nome || '—',
          reconhecido: !!recState?.dataConquista,
          dataConquista: recState?.dataConquista,
          idade,
          alertaIdade,
        };
      }));

      if (!cancelled) {
        // Ordena por blocos concluídos desc, depois por nome
        built.sort((a, b) => b.concluidos - a.concluidos || a.member.name.localeCompare(b.member.name));
        setRows(built);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sectionId, branch, refreshKey]);

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const total = rows.length;
    const conquistaram = rows.filter(r => r.reconhecido).length;
    const blocosTotal = rows.reduce((sum, r) => sum + r.concluidos, 0);
    const blocosMedia = (blocosTotal / total).toFixed(1);
    const proximosReconhecimento = rows.filter(r => !r.reconhecido && r.concluidos >= 16).length;
    return { total, conquistaram, blocosMedia, proximosReconhecimento };
  }, [rows]);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando…</div>;

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-sm">Nenhum jovem Lobinho/Escoteiro encontrado nesta seção. Chefia não entra na progressão de blocos.</p>
      </div>
    );
  }

  // U9: Exportar tabela como CSV
  const handleExportCsv = () => {
    const header = ['Membro', 'Idade', 'Ramo', 'Etapa', 'Blocos', 'Reconhecimento', 'Alerta'];
    const csvRows = rows.map(r => [
      `"${r.member.name}"`,
      r.idade ?? '',
      r.member.branch,
      `"${r.etapaNome}"`,
      `${r.concluidos}/18`,
      r.reconhecido ? `Conquistado em ${r.dataConquista}` : (r.concluidos >= 18 ? 'Apto' : `${18 - r.concluidos} a faltar`),
      r.alertaIdade === 'limite' ? 'idade-limite' : r.alertaIdade === 'aproximando' ? 'atencao' : '',
    ].join(','));
    const csv = [header.join(','), ...csvRows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paxtu_progresso_secao_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {showBatch && branch && (
        <BatchProgressMarker sectionId={sectionId} branch={branch} onClose={() => { setShowBatch(false); setRefreshKey(k => k + 1); }} />
      )}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold">📊 Progresso da Seção (POR 2025+)</h3>
          <div className="flex gap-2">
            {branch && (
              <button onClick={() => setShowBatch(true)} className="text-xs bg-yellow-300 text-yellow-900 hover:bg-yellow-200 px-3 py-1 rounded font-bold" title="Marcar mesma ação para múltiplos membros">✏️ Marcar em lote</button>
            )}
            <button onClick={() => window.print()} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded font-bold" title="Imprimir tabela">🖨️ Imprimir</button>
            <button onClick={handleExportCsv} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded font-bold" title="Exportar como CSV">📥 CSV</button>
          </div>
        </div>
        {stats && (
          <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-70 uppercase tracking-wide">Membros</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-70 uppercase tracking-wide">Média de blocos</div>
              <div className="text-2xl font-bold">{stats.blocosMedia} <span className="text-sm opacity-70">/ 18</span></div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-70 uppercase tracking-wide">Conquistaram ramo</div>
              <div className="text-2xl font-bold">{stats.conquistaram}</div>
            </div>
            <div className="bg-white/10 rounded p-2">
              <div className="opacity-70 uppercase tracking-wide">Próximos (≥16/18)</div>
              <div className="text-2xl font-bold">{stats.proximosReconhecimento}</div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Progresso dos membros da seção</caption>
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th scope="col" className="p-3">Membro</th>
            <th scope="col" className="p-3">Ramo</th>
            <th scope="col" className="p-3">Etapa atual</th>
            <th scope="col" className="p-3 text-center">Blocos</th>
            <th scope="col" className="p-3">Reconhecimento</th>
            <th scope="col" className="p-3"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const pct = (r.concluidos / 18) * 100;
            return (
              <tr key={r.member.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-semibold">
                  {r.member.name}
                  {r.alertaIdade === 'limite' && (
                    <span className="ml-2 text-[10px] bg-red-100 text-red-800 border border-red-300 px-1.5 py-0.5 rounded font-bold" title="Passou da idade-limite do reconhecimento de ramo">
                      🚨 idade-limite
                    </span>
                  )}
                  {r.alertaIdade === 'aproximando' && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-bold" title="Faltam ≤ 6 meses para passar da idade-limite">
                      ⚠️ atenção
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {r.member.branch === ScoutBranch.LOBINHO ? '🐺 Lobinho' : '⚜️ Escoteiro'}
                  {r.idade !== null && <span className="text-[10px] text-gray-500 block">{r.idade} anos</span>}
                </td>
                <td className="p-3 text-xs">{r.etapaNome}</td>
                <td className="p-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold">{r.concluidos}/18</span>
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 ${r.reconhecido ? 'bg-yellow-400' : pct >= 50 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="p-3 text-xs">
                  {r.reconhecido ? (
                    <StatusBadge status="concluido" text={`Conquistado em ${r.dataConquista}`} size="md" />
                  ) : r.concluidos >= 18 ? (
                    <StatusBadge status="apto" text="Apto a conquistar" size="md" />
                  ) : (
                    <span className="text-gray-500 inline-flex items-center gap-1">
                      <span aria-hidden="true">○</span> {18 - r.concluidos} a faltar
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {onMemberClick && (
                    <button
                      onClick={() => onMemberClick(r.member)}
                      className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500"
                    >
                      Ver tracker
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
};
