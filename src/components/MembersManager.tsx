import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScoutMember, TroopRole, ScoutBranch, ScoutSection } from '../types';
import { getMembersAsync, saveMemberAsync, deleteMemberAsync, getSectionsAsync } from '../services/storageService';
import { BRANCH_DOT_CLASS } from './profiles/StructureManager';

import { MemberDashboard } from './MemberDashboard';
import { ConfirmDialog } from './ConfirmDialog';
import { generatePrintableHistory } from '../services/reportingService';
import { getMemberProgress } from '../services/storageService';

interface Props {
  sectionId?: string;
  isAdmin?: boolean;
}

export const MembersManager: React.FC<Props> = ({ sectionId, isAdmin }) => {
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]); // For Admin to display names
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [historyMember, setHistoryMember] = useState<ScoutMember | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<TroopRole>(TroopRole.JUVENIL);
  const [branch, setBranch] = useState<ScoutBranch>(ScoutBranch.ESCOTEIRO);
  const [patrol, setPatrol] = useState('');
  const [register, setRegister] = useState('');
  const [birthDate, setBirthDate] = useState(''); // R9: obrigatório para Lobinho/Escoteiro
  const [targetSectionId, setTargetSectionId] = useState('');

  // R9: idade-limite normativa por ramo
  const requiresBirthDate = (b: ScoutBranch) =>
    b === ScoutBranch.LOBINHO || b === ScoutBranch.ESCOTEIRO;

  // Move State
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveTargetSection, setMoveTargetSection] = useState('');

  useEffect(() => {
    loadMembers();
  }, [sectionId]);

  const loadMembers = async () => {
    setLoading(true);
    const [memData, secData] = await Promise.all([
        getMembersAsync(sectionId),
        getSectionsAsync()
    ]);
    setMembers(memData);
    setSections(secData);
    if (secData.length > 0) {
        setTargetSectionId(secData[0].id);
        setMoveTargetSection(secData[0].id);
    }
    setLoading(false);
  };

  const handleMove = async () => {
      if (!moveId || !moveTargetSection) return;
      const member = members.find(m => m.id === moveId);
      if (!member) return;

      const now = new Date().toISOString();
      const prior = member.enrollments || [];
      // Bug fix: fechar o enrollment ativo prévio (em vez de criar período de 0 dias)
      const closedPrior = prior.map(e =>
        e.isActive ? { ...e, isActive: false, endDate: now } : e
      );
      const hadActive = prior.some(e => e.isActive);
      const closingEntry = hadActive ? [] : [{
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
    // If admin, use selected dropdown value. If not admin, use prop.
    const finalSectionId = isAdmin ? targetSectionId : sectionId;
    
    if (!finalSectionId) {
        setFormError('Erro: seção não definida.');
        return;
    }
    // R9: validar birthDate quando obrigatório
    if (requiresBirthDate(branch) && !birthDate) {
      setFormError(
        `Data de nascimento é obrigatória para ${branch}.\n\n` +
        'Motivo: a idade-limite normativa do reconhecimento de ramo não pode ser validada sem a data.'
      );
      return;
    }
    setFormError(null);

    const newMember: ScoutMember = {
      id: editId || Date.now().toString(),
      sectionId: finalSectionId,
      name,
      role,
      branch,
      patrol,
      registerNumber: register,
      birthDate: birthDate || undefined,
    };

    await saveMemberAsync(newMember);
    resetForm();
    loadMembers();
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
    setIsEditing(true);
  };

  // ... (handleDelete same) ...

  const getSectionName = (id?: string) => sections.find(s => s.id === id)?.name || '---';

  // ... (resetForm same) ...

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
  };

  return (
    <div className="w-full max-w-none mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">👥 Efetivo da Seção</h2>
            <p className="text-gray-500">Gerencie chefes e jovens para controle de presença.</p>
        </div>
        <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${isEditing ? 'bg-red-100 text-red-600' : 'bg-slate-800 text-white'}`}
        >
            {isEditing ? 'Cancelar Cadastro' : '+ Novo Membro'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Form Column */}
        {isEditing && (
            <div className="xl:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-green-100 sticky top-24">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">
                        {editId ? 'Editar Membro' : 'Novo Cadastro'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formError && (
                            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3 whitespace-pre-line">
                                {formError}
                            </div>
                        )}
                        {isAdmin && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seção (Admin)</label>
                                <select 
                                    value={targetSectionId} 
                                    onChange={e => setTargetSectionId(e.target.value)} 
                                    className="w-full p-2 border border-yellow-300 rounded bg-yellow-50"
                                >
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label>
                                <select value={role} onChange={e => setRole(e.target.value as TroopRole)} className="w-full p-2 border rounded bg-gray-50">
                                    <option value={TroopRole.JUVENIL}>Juvenil</option>
                                    <option value={TroopRole.CHEFE}>Chefe</option>
                                    <option value={TroopRole.ASSISTENTE}>Assistente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ramo</label>
                                <select value={branch} onChange={e => setBranch(e.target.value as ScoutBranch)} className="w-full p-2 border rounded bg-gray-50">
                                    {Object.values(ScoutBranch).map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    Data de Nascimento{requiresBirthDate(branch) && <span className="text-red-600 ml-1">*</span>}
                                </label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={e => setBirthDate(e.target.value)}
                                    required={requiresBirthDate(branch)}
                                    className="w-full p-2 border rounded bg-gray-50"
                                    title={requiresBirthDate(branch) ? 'Obrigatório para validação de idade-limite (Cruzeiro do Sul / Lis de Ouro)' : 'Opcional'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patrulha/Matilha</label>
                                <input type="text" value={patrol} onChange={e => setPatrol(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Registro UEB</label>
                                <input type="text" value={register} onChange={e => setRegister(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                            </div>
                        </div>

                        <button type="submit" className="w-full py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700">
                            Salvar
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* List Column */}
        <div className={isEditing ? 'xl:col-span-3' : 'xl:col-span-4'}>
            {loading ? (
                <div className="text-center py-12 text-gray-400">Carregando efetivo...</div>
            ) : members.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
                    <span className="text-4xl grayscale opacity-50">⛺</span>
                    <p className="text-gray-500 mt-2">Nenhum membro cadastrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                    {members.map(m => (
                        <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between gap-3 min-w-0 group">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${BRANCH_DOT_CLASS[m.branch] || 'bg-gray-500'}`}></span>
                                    <span className="text-xs font-bold text-gray-400 uppercase">{m.role}</span>
                                    {m.patrol && <span className="text-xs bg-gray-100 px-1.5 rounded text-gray-600">{m.patrol}</span>}
                                    {isAdmin && (
                                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 rounded border border-yellow-200 truncate max-w-[100px]">
                                            {getSectionName(m.sectionId)}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-gray-800">{m.name}</h4>
                                {m.registerNumber && <p className="text-xs text-gray-400 font-mono">Reg: {m.registerNumber}</p>}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                <button onClick={() => setHistoryMember(m)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Ficha de Progressão">📜</button>
                                <button onClick={() => handleEdit(m)} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Editar">✏️</button>
                                <button onClick={() => { setMoveId(m.id); setMoveTargetSection(sections[0]?.id || ''); }} className="text-orange-500 hover:bg-orange-50 p-1 rounded" title="Mover de Seção">➡️</button>
                                <button onClick={() => setDeleteTarget(m.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Move Modal */}
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
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>)}
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
                generatePrintableHistory(historyMember, sections.find(s => s.id === historyMember.sectionId), memberData ? memberData.achievements : []);
            }}
        />,
        document.body,
      )}
    </div>
  );
};
