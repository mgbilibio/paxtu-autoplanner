import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ScoutMember, TroopRole, ScoutBranch, ScoutSection } from '../types';
import { getMembersAsync, saveMemberAsync, deleteMemberAsync, getSectionsAsync } from '../services/storageService';
import { BRANCH_DOT_CLASS } from './profiles/StructureManager';

import { MemberDashboard } from './MemberDashboard';
import { ConfirmDialog } from './ConfirmDialog';
import { generatePrintableHistory } from '../services/reportingService';
import { getMemberProgress } from '../services/storageService';
import {
  buildMinimalMember,
  formatMemberWriteError,
  incompleteReasons,
  isMemberProfileIncomplete,
  parseMemberLines,
} from '../utils/memberQuickAdd';

interface Props {
  sectionId?: string;
  isAdmin?: boolean;
}

type FormMode = 'single' | 'bulk';

export const MembersManager: React.FC<Props> = ({ sectionId, isAdmin }) => {
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [loading, setLoading] = useState(true);

  const [historyMember, setHistoryMember] = useState<ScoutMember | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('single');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<TroopRole>(TroopRole.JUVENIL);
  const [branch, setBranch] = useState<ScoutBranch>(ScoutBranch.ESCOTEIRO);
  const [patrol, setPatrol] = useState('');
  const [register, setRegister] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');

  // Bulk
  const [bulkText, setBulkText] = useState('');
  const [bulkRole, setBulkRole] = useState<TroopRole>(TroopRole.JUVENIL);
  const [bulkPatrol, setBulkPatrol] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveTargetSection, setMoveTargetSection] = useState('');

  useEffect(() => {
    loadMembers();
  }, [sectionId]);

  const loadMembers = async () => {
    setLoading(true);
    const [memData, secData] = await Promise.all([
      getMembersAsync(sectionId),
      getSectionsAsync(),
    ]);
    setMembers(memData);
    setSections(secData);
    if (secData.length > 0) {
      const preferred = sectionId && secData.find(s => s.id === sectionId)
        ? sectionId
        : secData[0].id;
      setTargetSectionId(prev => prev || preferred);
      setMoveTargetSection(secData[0].id);
      const sec = secData.find(s => s.id === (sectionId || preferred));
      if (sec && !editId) setBranch(sec.branch);
    }
    setLoading(false);
  };

  const resolvedSectionId = isAdmin ? targetSectionId : sectionId;
  const resolvedSection = useMemo(
    () => sections.find(s => s.id === resolvedSectionId),
    [sections, resolvedSectionId]
  );

  const handleMove = async () => {
    if (!moveId || !moveTargetSection) return;
    const member = members.find(m => m.id === moveId);
    if (!member) return;

    const now = new Date().toISOString();
    const prior = member.enrollments || [];
    const closedPrior = prior.map(e =>
      e.isActive ? { ...e, isActive: false, endDate: now } : e
    );
    const hadActive = prior.some(e => e.isActive);
    const closingEntry = hadActive
      ? []
      : [{
          sectionId: member.sectionId || '',
          role: member.role,
          startDate: member.admissionDate || now,
          endDate: now,
          isActive: false,
        }];
    const newActive = {
      sectionId: moveTargetSection,
      role: member.role,
      startDate: now,
      isActive: true,
    };
    const updatedMember = {
      ...member,
      sectionId: moveTargetSection,
      enrollments: [...closedPrior, ...closingEntry, newActive],
    };

    await saveMemberAsync(updatedMember);
    setMoveId(null);
    loadMembers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSectionId = resolvedSectionId;
    if (!finalSectionId) {
      setFormError('Erro: seção não definida.');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Informe ao menos o primeiro nome.');
      return;
    }
    setFormError(null);
    setFormOk(null);

    const newMember: ScoutMember = {
      id: editId || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString()),
      sectionId: finalSectionId,
      name: trimmed,
      role,
      branch: resolvedSection?.branch || branch,
      patrol: patrol.trim() || undefined,
      registerNumber: register.trim() || undefined,
      birthDate: birthDate || undefined,
    };

    await saveMemberAsync(newMember);
    const incomplete = isMemberProfileIncomplete(newMember);
    setFormOk(
      incomplete
        ? `✓ ${trimmed} salvo. Você pode completar nascimento e outros dados depois.`
        : `✓ ${trimmed} salvo.`
    );
    if (editId) {
      resetForm();
      setIsEditing(false);
    } else {
      // Mantém o formulário aberto para cadastro sequencial rápido
      setName('');
      setRegister('');
      setBirthDate('');
    }
    loadMembers();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSectionId = resolvedSectionId;
    if (!finalSectionId) {
      setFormError('Erro: seção não definida.');
      return;
    }
    const parsed = parseMemberLines(bulkText);
    if (parsed.length === 0) {
      setFormError('Cole ao menos um nome (um por linha).');
      return;
    }
    setBulkBusy(true);
    setFormError(null);
    setFormOk(null);

    const secBranch = resolvedSection?.branch || branch;
    const existingNames = new Set(
      members
        .filter(m => m.sectionId === finalSectionId)
        .map(m => m.name.toLowerCase())
    );

    let added = 0;
    let skipped = 0;
    try {
      for (const row of parsed) {
        if (existingNames.has(row.name.toLowerCase())) {
          skipped++;
          continue;
        }
        const member = buildMinimalMember({
          name: row.name,
          sectionId: finalSectionId,
          branch: secBranch,
          role: row.role || bulkRole,
          patrol: row.patrol || bulkPatrol.trim() || undefined,
          registerNumber: row.registerNumber,
        });
        await saveMemberAsync(member);
        existingNames.add(row.name.toLowerCase());
        added++;
      }

      setBulkText('');
      setFormOk(
        `✓ ${added} cadastrado(s)${skipped ? ` · ${skipped} ignorado(s) (nome já existia)` : ''}. Complete dados depois na edição.`
      );
      loadMembers();
    } catch (err) {
      const msg = formatMemberWriteError(err);
      setFormError(msg);
      window.dispatchEvent(new CustomEvent('paxtu:toast', { detail: { kind: 'error', message: msg } }));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleEdit = (m: ScoutMember) => {
    setEditId(m.id);
    setName(m.name);
    setRole(m.role);
    setBranch(m.branch);
    setPatrol(m.patrol || '');
    setRegister(m.registerNumber || '');
    setBirthDate(m.birthDate || '');
    setTargetSectionId(m.sectionId || '');
    setFormMode('single');
    setFormError(null);
    setFormOk(null);
    setIsEditing(true);
  };

  const getSectionName = (id?: string) => sections.find(s => s.id === id)?.name || '---';

  const handleDelete = async (id: string) => {
    await deleteMemberAsync(id);
    setDeleteTarget(null);
    loadMembers();
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setPatrol('');
    setRegister('');
    setBirthDate('');
    setBulkText('');
    setFormError(null);
    setFormOk(null);
    setFormMode('single');
  };

  const openNew = (mode: FormMode = 'single') => {
    resetForm();
    setIsEditing(true);
    setFormMode(mode);
    if (resolvedSection) setBranch(resolvedSection.branch);
  };

  const existingPatrols = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.patrol) set.add(m.patrol);
    });
    resolvedSection?.teams?.forEach(t => set.add(t.name));
    return Array.from(set).sort();
  }, [members, resolvedSection]);

  return (
    <div className="w-full max-w-none mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">👥 Efetivo da Seção</h2>
          <p className="text-gray-500 text-sm">
            Cadastre só com o primeiro nome e complete depois. Use lista para patrulha ou chefia inteira.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg font-bold bg-red-100 text-red-600"
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={() => openNew('single')}
                className="px-4 py-2 rounded-lg font-bold bg-slate-800 text-white"
              >
                + Um nome
              </button>
              <button
                onClick={() => openNew('bulk')}
                className="px-4 py-2 rounded-lg font-bold bg-indigo-600 text-white"
              >
                + Lista rápida
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {isEditing && (
          <div className="xl:col-span-1">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-green-100 sticky top-24 space-y-3">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormMode('single')}
                  className={`flex-1 text-xs font-bold py-1.5 rounded-md ${formMode === 'single' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => { setFormMode('bulk'); setEditId(null); }}
                  className={`flex-1 text-xs font-bold py-1.5 rounded-md ${formMode === 'bulk' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                  disabled={!!editId}
                >
                  Lista
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 whitespace-pre-line">
                  {formError}
                </div>
              )}
              {formOk && (
                <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-3">
                  {formOk}
                </div>
              )}

              {formMode === 'single' ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <h3 className="font-bold text-gray-800 border-b pb-2">
                    {editId ? 'Editar membro' : 'Cadastro rápido'}
                  </h3>
                  {isAdmin && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seção</label>
                      <select
                        value={targetSectionId}
                        onChange={e => {
                          setTargetSectionId(e.target.value);
                          const s = sections.find(x => x.id === e.target.value);
                          if (s) setBranch(s.branch);
                        }}
                        className="w-full p-2 border border-yellow-300 rounded bg-yellow-50"
                      >
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Nome <span className="font-normal normal-case text-gray-400">(só o primeiro serve)</span>
                    </label>
                    <input
                      required
                      autoFocus
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: João"
                      className="w-full p-2 border rounded bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label>
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value as TroopRole)}
                        className="w-full p-2 border rounded bg-gray-50"
                      >
                        <option value={TroopRole.JUVENIL}>Juvenil</option>
                        <option value={TroopRole.CHEFE}>Chefe</option>
                        <option value={TroopRole.ASSISTENTE}>Assistente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Patrulha
                      </label>
                      <input
                        type="text"
                        list="patrol-suggestions"
                        value={patrol}
                        onChange={e => setPatrol(e.target.value)}
                        placeholder="Opcional"
                        className="w-full p-2 border rounded bg-gray-50"
                      />
                      <datalist id="patrol-suggestions">
                        {existingPatrols.map(p => <option key={p} value={p} />)}
                      </datalist>
                    </div>
                  </div>

                  <details className="text-sm border rounded-lg p-2 bg-slate-50">
                    <summary className="cursor-pointer font-bold text-xs text-slate-600 uppercase">
                      Completar depois (opcional)
                    </summary>
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Nascimento ajuda reconhecimentos (Cruzeiro / Lis). Não bloqueia o cadastro.
                      </p>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nascimento</label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={e => setBirthDate(e.target.value)}
                          className="w-full p-2 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Registro UEB</label>
                        <input
                          type="text"
                          value={register}
                          onChange={e => setRegister(e.target.value)}
                          className="w-full p-2 border rounded bg-white"
                        />
                      </div>
                    </div>
                  </details>

                  <button type="submit" className="w-full py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">
                    {editId ? 'Salvar alterações' : 'Salvar e continuar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBulkSubmit} className="space-y-3">
                  <h3 className="font-bold text-gray-800 border-b pb-2">Lista em um lance</h3>
                  <p className="text-[11px] text-slate-500">
                    Um nome por linha. Opcional: <code className="bg-slate-100 px-1">Nome | Chefe</code> ou{' '}
                    <code className="bg-slate-100 px-1">Nome, registro, patrulha</code>.
                  </p>
                  {isAdmin && (
                    <select
                      value={targetSectionId}
                      onChange={e => setTargetSectionId(e.target.value)}
                      className="w-full p-2 border border-yellow-300 rounded bg-yellow-50 text-sm"
                    >
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função padrão</label>
                      <select
                        value={bulkRole}
                        onChange={e => setBulkRole(e.target.value as TroopRole)}
                        className="w-full p-2 border rounded bg-gray-50 text-sm"
                      >
                        <option value={TroopRole.JUVENIL}>Juvenil (patrulha)</option>
                        <option value={TroopRole.CHEFE}>Chefe</option>
                        <option value={TroopRole.ASSISTENTE}>Assistente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patrulha padrão</label>
                      <input
                        type="text"
                        list="patrol-suggestions-bulk"
                        value={bulkPatrol}
                        onChange={e => setBulkPatrol(e.target.value)}
                        placeholder="Águia…"
                        className="w-full p-2 border rounded bg-gray-50 text-sm"
                      />
                      <datalist id="patrol-suggestions-bulk">
                        {existingPatrols.map(p => <option key={p} value={p} />)}
                      </datalist>
                    </div>
                  </div>
                  <textarea
                    autoFocus
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    rows={10}
                    placeholder={'João\nMaria\nPedro\nAna | Assistente\nCarlos | Chefe'}
                    className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                  />
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold"
                      onClick={() => {
                        setBulkRole(TroopRole.JUVENIL);
                        setBulkText('João\nMaria\nPedro\nAna');
                      }}
                    >
                      Ex.: patrulha
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-800 font-bold"
                      onClick={() => {
                        setBulkRole(TroopRole.CHEFE);
                        setBulkPatrol('');
                        setBulkText('Margus | Chefe\nFulano | Assistente\nCiclano | Assistente');
                      }}
                    >
                      Ex.: chefia
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={bulkBusy}
                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {bulkBusy ? 'Cadastrando…' : 'Cadastrar todos'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        <div className={isEditing ? 'xl:col-span-3' : 'xl:col-span-4'}>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Carregando efetivo...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
              <span className="text-4xl grayscale opacity-50">⛺</span>
              <p className="text-gray-500 mt-2">Nenhum membro cadastrado.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => openNew('single')} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg font-bold">+ Um nome</button>
                <button onClick={() => openNew('bulk')} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg font-bold">+ Lista rápida</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {members.map(m => {
                const incomplete = isMemberProfileIncomplete(m);
                const reasons = incompleteReasons(m);
                return (
                  <div
                    key={m.id}
                    className={`bg-white p-4 rounded-lg shadow-sm border flex items-start justify-between gap-3 min-w-0 group ${
                      incomplete ? 'border-amber-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`w-2 h-2 rounded-full ${BRANCH_DOT_CLASS[m.branch] || 'bg-gray-500'}`} />
                        <span className="text-xs font-bold text-gray-400 uppercase">{m.role}</span>
                        {m.patrol && (
                          <span className="text-xs bg-gray-100 px-1.5 rounded text-gray-600">{m.patrol}</span>
                        )}
                        {incomplete && (
                          <span
                            className="text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded border border-amber-200"
                            title={`Completar: ${reasons.join(', ')}`}
                          >
                            incompleto
                          </span>
                        )}
                        {isAdmin && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 rounded border border-yellow-200 truncate max-w-[100px]">
                            {getSectionName(m.sectionId)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800">{m.name}</h4>
                      {m.registerNumber && (
                        <p className="text-xs text-gray-400 font-mono">Reg: {m.registerNumber}</p>
                      )}
                      {incomplete && (
                        <p className="text-[10px] text-amber-700 mt-1">
                          Falta: {reasons.filter(r => r !== 'registro UEB' || !m.registerNumber).slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      <button onClick={() => setHistoryMember(m)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Ficha de Progressão">📜</button>
                      <button onClick={() => handleEdit(m)} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Editar / completar">✏️</button>
                      <button onClick={() => { setMoveId(m.id); setMoveTargetSection(sections[0]?.id || ''); }} className="text-orange-500 hover:bg-orange-50 p-1 rounded" title="Mover de Seção">➡️</button>
                      <button onClick={() => setDeleteTarget(m.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {moveId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-4">Mover Membro</h3>
            <p className="text-sm text-gray-600 mb-4">Selecione a nova seção de destino. O histórico será preservado.</p>
            <select
              value={moveTargetSection}
              onChange={e => setMoveTargetSection(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-6"
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMoveId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={handleMove} className="px-4 py-2 bg-orange-500 text-white font-bold rounded hover:bg-orange-600">Mover</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remover membro"
          message="Remover este membro da seção? O histórico salvo em arquivos individuais não será apagado automaticamente."
          confirmText="Remover"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

      {historyMember && createPortal(
        <MemberDashboard
          member={historyMember}
          section={sections.find(s => s.id === historyMember.sectionId)}
          onClose={() => setHistoryMember(null)}
          onPrint={() => {
            const allProgress = getMemberProgress();
            const memberData = allProgress.find(p => p.memberId === historyMember.id);
            generatePrintableHistory(
              historyMember,
              sections.find(s => s.id === historyMember.sectionId),
              memberData ? memberData.achievements : []
            );
          }}
        />,
        document.body,
      )}
    </div>
  );
};
