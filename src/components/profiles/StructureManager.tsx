import React, { useState, useEffect } from 'react';
import { ScoutSection, ScoutBranch, ScoutGroup, ScoutTeam, ScoutMember, TroopRole } from '../../types';

// Map estático de cor por ramo — Tailwind precisa ver as classes literais para preservá-las
// (classes geradas dinamicamente via `bg-${cor}` são purgadas no build).
// Exportado para reuso em MembersManager/SectionManager/Catalog.
export const BRANCH_DOT_CLASS: Record<ScoutBranch, string> = {
  [ScoutBranch.LOBINHO]: 'bg-blue-500',
  [ScoutBranch.ESCOTEIRO]: 'bg-green-500',
  [ScoutBranch.SENIOR]: 'bg-red-700',
  [ScoutBranch.PIONEIRO]: 'bg-red-500',
};

// Variante mais escura (-600) usada na faixa superior dos cards do Catálogo.
export const BRANCH_BAR_CLASS: Record<ScoutBranch, string> = {
  [ScoutBranch.LOBINHO]: 'bg-blue-600',
  [ScoutBranch.ESCOTEIRO]: 'bg-green-600',
  [ScoutBranch.SENIOR]: 'bg-red-800',
  [ScoutBranch.PIONEIRO]: 'bg-red-600',
};
import { 
    getSectionsAsync, saveSectionAsync, deleteSectionAsync, 
    getGroupsAsync, saveGroupAsync, DATA_EVENTS,
    getMembersAsync, saveMemberAsync, deleteMemberAsync,
    saveUserAsync, getUsersAsync,
    getAppConfig,
} from '../../services/storageService';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  buildMinimalMember,
  formatMemberWriteError,
  isMemberProfileIncomplete,
  parseMemberLines,
  resolveTroopRole,
} from '../../utils/memberQuickAdd';

type ConfirmAction = {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
};

export const StructureManager: React.FC = () => {
  const [group, setGroup] = useState<ScoutGroup | null>(null);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  
  // UI States
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCity, setGroupCity] = useState('');
  
  const [addingSection, setAddingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionBranch, setNewSectionBranch] = useState<ScoutBranch>(ScoutBranch.ESCOTEIRO);
  const [newSectionSystem, setNewSectionSystem] = useState<'LEGACY_2020' | 'POR_2025'>('POR_2025');
  const [newSectionMigrationDate, setNewSectionMigrationDate] = useState('');

  const [addingTeamToSectionId, setAddingTeamToSectionId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);

  // Member Modal State
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [createLoginAccount, setCreateLoginAccount] = useState(false);
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({}); 
  
  // Bulk Import State — patrulha/chefia em um lance (só nomes)
  const [importMode, setImportMode] = useState<{
    sectionId: string;
    patrol?: string;
    defaultRole?: TroopRole;
  } | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importDefaultRole, setImportDefaultRole] = useState<TroopRole>(TroopRole.JUVENIL);
  const [importPatrol, setImportPatrol] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importFailed, setImportFailed] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [staffSelection, setStaffSelection] = useState<Set<string>>(new Set());
  const [staffBusy, setStaffBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  useEffect(() => {
    load();
    window.addEventListener(DATA_EVENTS.GROUPS_UPDATED, load);
    window.addEventListener(DATA_EVENTS.SECTIONS_UPDATED, load);
    window.addEventListener(DATA_EVENTS.MEMBERS_UPDATED, load); 
    return () => {
        window.removeEventListener(DATA_EVENTS.GROUPS_UPDATED, load);
        window.removeEventListener(DATA_EVENTS.SECTIONS_UPDATED, load);
        window.removeEventListener(DATA_EVENTS.MEMBERS_UPDATED, load);
    };
  }, []);

  const load = async () => {
    const [groups, secData, memData] = await Promise.all([
        getGroupsAsync(),
        getSectionsAsync(),
        getMembersAsync(undefined, { hydrateOfficial: false })
    ]);

    if (groups.length > 0) {
        setGroup(groups[0]);
        setGroupName(groups[0].name);
        setGroupCity(groups[0].city);
    }
    setSections(secData);
    setMembers(memData);
  };

  const handleSaveGroup = async () => {
      const newGroup: ScoutGroup = {
          id: group?.id || Date.now().toString(),
          name: (groupName || '').trim() || 'Meu Grupo Escoteiro',
          city: (groupCity || '').trim(),
          sections: group?.sections || []
      };
      await saveGroupAsync(newGroup);
      setGroupName(newGroup.name);
      setEditingGroup(false);
  };

  const handleSaveSection = async () => {
    if (!newSectionName.trim()) return;
    const sectionToSave: ScoutSection = {
        id: editingSectionId || Date.now().toString(),
        groupId: group?.id,
        name: newSectionName,
        branch: newSectionBranch,
        progressionSystem: newSectionSystem,
        migrationDate: newSectionMigrationDate || undefined,
        teams: editingSectionId ? (sections.find(s => s.id === editingSectionId)?.teams || []) : []
    };
    await saveSectionAsync(sectionToSave);
    resetSectionForm();
  };

  const resetSectionForm = () => {
    setAddingSection(false);
    setEditingSectionId(null);
    setNewSectionName('');
    setNewSectionBranch(ScoutBranch.ESCOTEIRO);
    setNewSectionSystem('POR_2025');
    setNewSectionMigrationDate('');
  };

  const startEditSection = (section: ScoutSection) => {
      setEditingSectionId(section.id);
      setNewSectionName(section.name);
      setNewSectionBranch(section.branch);
      setNewSectionSystem(section.progressionSystem || 'POR_2025');
      setNewSectionMigrationDate(section.migrationDate || '');
      setAddingSection(true); 
  };

  const handleAddTeam = async () => {
      if (!addingTeamToSectionId || !newTeamName.trim()) return;
      const section = sections.find(s => s.id === addingTeamToSectionId);
      if (!section) return;
      const trimmed = newTeamName.trim();
      const exists = (section.teams || []).some(t => t.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
          setTeamError(`Já existe uma equipe chamada "${trimmed}" nesta seção.`);
          return;
      }
      const newTeam: ScoutTeam = { id: Date.now().toString(), name: trimmed };
      const updatedSection = { ...section, teams: [...(section.teams || []), newTeam] };
      await saveSectionAsync(updatedSection);
      setAddingTeamToSectionId(null);
      setNewTeamName('');
      setTeamError(null);
  };

  const handleDeleteTeam = async (sectionId: string, teamId: string) => {
      setConfirmAction({
          title: 'Excluir equipe',
          message: 'Excluir esta equipe?',
          confirmText: 'Excluir',
          danger: true,
          onConfirm: async () => {
              const section = sections.find(s => s.id === sectionId);
              if (section) {
                  const updatedSection = { ...section, teams: section.teams?.filter(t => t.id !== teamId) || [] };
                  await saveSectionAsync(updatedSection);
              }
              setConfirmAction(null);
          },
      });
  };

  const handleSaveMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingMember) return;
      const trimmed = (editingMember.name || '').trim();
      if (!trimmed) return; // só o nome é obrigatório — primeiro nome basta
      const toSave = { ...editingMember, name: trimmed, role: resolveTroopRole(editingMember.role) };
      await saveMemberAsync(toSave);

      // Auto-Sync login account if it already exists or if checkbox is checked
      const users = await getUsersAsync();
      const existingUser = users.find(u => u.id === toSave.id);

      if ((createLoginAccount || existingUser) && toSave.role !== TroopRole.JUVENIL) {
          await saveUserAsync({
              id: toSave.id,
              name: toSave.name,
              role: toSave.role,
              sectionId: toSave.sectionId || 'ADMIN_GLOBAL',
              avatar: '👤'
          });
      }
      setIsMemberModalOpen(false);
      setEditingMember(null);
      setCreateLoginAccount(false);
  };

  const openQuickList = (sectionId: string, opts?: { patrol?: string; role?: TroopRole }) => {
      setImportMode({
        sectionId,
        patrol: opts?.patrol,
        defaultRole: opts?.role || (opts?.patrol ? TroopRole.JUVENIL : TroopRole.CHEFE),
      });
      setImportPatrol(opts?.patrol || '');
      setImportDefaultRole(opts?.role || (opts?.patrol ? TroopRole.JUVENIL : TroopRole.CHEFE));
      setCsvText('');
      setImportFeedback(null);
      setImportFailed(false);
      setImportBusy(false);
  };

  const handleProcessImport = async () => {
      if (!importMode || !csvText.trim() || importBusy) return;
      const section = sections.find(s => s.id === importMode.sectionId);
      if (!section) {
          const msg = 'Seção não encontrada. Recarregue a página e tente de novo.';
          setImportFailed(true);
          setImportFeedback(msg);
          window.dispatchEvent(new CustomEvent('paxtu:toast', { detail: { kind: 'error', message: msg } }));
          return;
      }

      const parsed = parseMemberLines(csvText);
      if (parsed.length === 0) {
          setImportFailed(true);
          setImportFeedback('Nenhum nome válido encontrado.');
          return;
      }

      setImportBusy(true);
      setImportFailed(false);
      setImportFeedback(null);

      let count = 0, skipped = 0;
      const existing = new Set(
        members
          .filter(m => m.sectionId === importMode.sectionId)
          .map(m => m.name.toLowerCase())
      );

      try {
          for (const row of parsed) {
              if (existing.has(row.name.toLowerCase())) {
                  skipped++;
                  continue;
              }
              const defaultRole = resolveTroopRole(
                importDefaultRole,
                importMode.defaultRole || (importPatrol.trim() ? TroopRole.JUVENIL : TroopRole.CHEFE),
              );
              const member = buildMinimalMember({
                  name: row.name,
                  sectionId: importMode.sectionId,
                  branch: section.branch,
                  role: resolveTroopRole(row.role, defaultRole),
                  patrol: row.patrol || importPatrol.trim() || undefined,
                  registerNumber: row.registerNumber,
              });
              await saveMemberAsync(member);
              existing.add(row.name.toLowerCase());
              count++;
          }
          setImportFailed(false);
          setImportFeedback(
            `✓ ${count} cadastrado(s)${skipped > 0 ? ` · ${skipped} duplicado(s) ignorado(s)` : ''}. Complete dados depois na edição.`
          );
          setCsvText('');
          setTimeout(() => { setImportMode(null); setImportFeedback(null); setImportFailed(false); }, 4000);
      } catch (err) {
          const msg = formatMemberWriteError(err);
          setImportFailed(true);
          setImportFeedback(msg);
          window.dispatchEvent(new CustomEvent('paxtu:toast', { detail: { kind: 'error', message: msg } }));
      } finally {
          setImportBusy(false);
      }
  };

  const openNewMemberModal = (sectionId: string, teamName?: string) => {
      const section = sections.find(s => s.id === sectionId);
      setEditingMember({
          id: Date.now().toString(),
          name: '',
          sectionId: sectionId,
          branch: section?.branch || ScoutBranch.ESCOTEIRO,
          role: teamName ? TroopRole.JUVENIL : TroopRole.CHEFE,
          patrol: teamName || '',
          registerNumber: '',
          medicalInfo: '',
          emergencyContact: '',
          birthDate: ''
      });
      setCreateLoginAccount(false);
      setIsMemberModalOpen(true);
  };

  const handleArchiveMember = async (member: ScoutMember) => {
      const action = member.isArchived ? 'Restaurar' : 'Arquivar';
      setConfirmAction({
          title: `${action} membro`,
          message: `${action} este membro?`,
          confirmText: action,
          onConfirm: async () => {
              await saveMemberAsync({ ...member, isArchived: !member.isArchived });
              setConfirmAction(null);
          },
      });
  };

  const handleDeleteMember = async (id: string) => {
      setConfirmAction({
          title: 'Excluir membro',
          message: 'Excluir definitivamente? Esta acao nao pode ser desfeita.',
          confirmText: 'Excluir',
          danger: true,
          onConfirm: async () => {
              await deleteMemberAsync(id);
              setConfirmAction(null);
          },
      });
  };

  const handleDeleteSection = async (id: string) => {
      setConfirmAction({
          title: 'Excluir seção',
          message: 'Excluir seção? Membros vinculados ficarao orfaos.',
          confirmText: 'Excluir',
          danger: true,
          onConfirm: async () => {
              await deleteSectionAsync(id);
              setConfirmAction(null);
          },
      });
  };

  const toggleStaffSelection = (id: string) => {
      setStaffSelection(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
      });
  };

  const handleBulkSetStaffRole = async (sectionId: string, role: TroopRole) => {
      const targets = members.filter(m =>
          m.sectionId === sectionId && !m.patrol && !m.isArchived && staffSelection.has(m.id)
      );
      if (targets.length === 0 || staffBusy) return;
      setStaffBusy(true);
      try {
          for (const member of targets) {
              await saveMemberAsync({ ...member, role: resolveTroopRole(role, role) });
          }
          setStaffSelection(prev => {
              const next = new Set(prev);
              targets.forEach(m => next.delete(m.id));
              return next;
          });
      } finally {
          setStaffBusy(false);
      }
  };

  const renderMemberRow = (member: ScoutMember, opts?: { selectable?: boolean }) => {
      const incomplete = !member.isArchived && isMemberProfileIncomplete(member);
      return (
      <div key={member.id} className={`flex items-center justify-between p-2 pl-4 border-l-2 hover:bg-slate-50 hover:border-slate-400 transition-colors text-sm group ${member.isArchived ? 'bg-slate-100/50 border-slate-300 opacity-60' : incomplete ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 min-w-0">
              {opts?.selectable && (
                <input
                  type="checkbox"
                  checked={staffSelection.has(member.id)}
                  onChange={() => toggleStaffSelection(member.id)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded shrink-0"
                  title="Selecionar para definir função"
                />
              )}
              <span title={member.role}>{member.role === TroopRole.JUVENIL ? '👤' : '👮'}</span>
              <div className="flex flex-col min-w-0">
                  <span className={`font-medium truncate ${member.isArchived ? 'text-slate-500 italic' : 'text-slate-700'}`}>{member.name}</span>
                  <div className="flex gap-1 flex-wrap">
                    <span className={`text-[8px] px-1 rounded font-bold uppercase ${member.role === TroopRole.JUVENIL ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-800'}`}>{member.role || '—'}</span>
                    {incomplete && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold uppercase" title="Complete nascimento e outros dados quando puder">incompleto</span>}
                    {(member.medicalInfo || member.emergencyContact) && <span className="text-[9px] text-red-400 font-bold">⚠️ Info Médica/Contato</span>}
                  </div>
              </div>
              {member.isArchived && <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded font-bold uppercase tracking-tighter">Arquivado</span>}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => { setEditingMember(member); setIsMemberModalOpen(true); }} className="text-blue-400 hover:text-blue-600 px-1" title="Editar / completar">✏️</button>
              <button onClick={() => handleArchiveMember(member)} className="text-orange-400 hover:text-orange-600 px-1" title={member.isArchived ? 'Restaurar' : 'Arquivar'}>📦</button>
              {member.isArchived && <button onClick={() => handleDeleteMember(member.id)} className="text-red-300 hover:text-red-500 px-1">×</button>}
          </div>
      </div>
      );
  };

  if (!group && !editingGroup) {
      return (
          <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Bem-vindo ao AutoPlanner!</h3>
              <p className="text-gray-500 mb-4">Para começar, precisamos criar o seu Grupo Escoteiro.</p>
              <button onClick={() => setEditingGroup(true)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Criar Grupo</button>
          </div>
      );
  }

  return (
    <div className="space-y-6">
        {confirmAction && (
            <ConfirmDialog
                title={confirmAction.title}
                message={confirmAction.message}
                confirmText={confirmAction.confirmText}
                danger={confirmAction.danger}
                onCancel={() => setConfirmAction(null)}
                onConfirm={confirmAction.onConfirm}
            />
        )}
        {/* ROOT: GROUP */}
        <div className="bg-slate-900 text-white p-6 rounded-t-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">⚜️</div>
            {editingGroup ? (
                <div className="space-y-3 relative z-10">
                    <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full p-2 rounded text-slate-900 font-bold" placeholder="Nome do Grupo" />
                    <input type="text" value={groupCity} onChange={e => setGroupCity(e.target.value)} className="w-full p-2 rounded text-slate-900 text-sm" placeholder="Cidade - UF" />
                    <div className="flex gap-2">
                        <button onClick={handleSaveGroup} className="bg-green-500 hover:bg-green-600 px-4 py-1 rounded font-bold text-sm">Salvar</button>
                        <button onClick={() => setEditingGroup(false)} className="bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded text-sm">Cancelar</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold">{group?.name}</h2>
                        <p className="text-slate-400">{group?.city}</p>
                    </div>
                    <button onClick={() => setEditingGroup(true)} className="text-slate-400 hover:text-white transition-colors">✏️ Editar</button>
                </div>
            )}
        </div>

        {/* BRANCHES / SECTIONS */}
        <div className="bg-white p-6 rounded-b-xl shadow-sm border-x border-b border-gray-200 -mt-6 pt-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-700">Estrutura do Grupo</h3>
                <button onClick={() => { resetSectionForm(); setAddingSection(true); }} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-100 hover:bg-blue-100 transition-colors">+ Nova Seção</button>
            </div>

            {addingSection && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
                    <h4 className="text-sm font-bold text-blue-800 mb-2">{editingSectionId ? 'Editar Seção' : 'Adicionar Seção'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input type="text" placeholder="Nome (ex: Tropa Fênix)" className="p-2 border rounded" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} />
                        <select value={newSectionBranch} onChange={e => setNewSectionBranch(e.target.value as ScoutBranch)} className="p-2 border rounded">
                            {Object.values(ScoutBranch).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    {getAppConfig()?.showLegacy ? (
                      <div className="flex gap-4 mb-3">
                          <label className="flex items-center gap-2"><input type="radio" checked={newSectionSystem === 'POR_2025'} onChange={() => setNewSectionSystem('POR_2025')} /> <span className="text-sm">Novo POR 2025+</span></label>
                          <label className="flex items-center gap-2"><input type="radio" checked={newSectionSystem === 'LEGACY_2020'} onChange={() => setNewSectionSystem('LEGACY_2020')} /> <span className="text-sm">Sistema Antigo (2020)</span></label>
                      </div>
                    ) : (
                      <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 inline-block font-bold">POR 2025+</div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={handleSaveSection} className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-bold">{editingSectionId ? 'Atualizar' : 'Adicionar'}</button>
                        <button onClick={resetSectionForm} className="text-slate-500 px-4 py-1 text-sm">Cancelar</button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {sections.map(section => (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-3 flex justify-between items-center bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${BRANCH_DOT_CLASS[section.branch] || 'bg-gray-500'}`}></span>
                                <span className="font-bold text-gray-800">{section.name}</span>
                                <span className="text-[10px] px-1.5 rounded border bg-white text-gray-500 font-bold uppercase tracking-tighter">{section.progressionSystem === 'POR_2025' || !section.progressionSystem ? 'POR 2025' : 'LEGACY'}</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => openQuickList(section.id, { role: TroopRole.CHEFE })} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded" title="Lista de nomes">⚡ Lista rápida</button>
                                <button onClick={() => startEditSection(section)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">✏️ Editar</button>
                                <button onClick={() => setAddingTeamToSectionId(section.id)} className="text-xs font-bold text-green-600 hover:bg-green-50 px-2 py-1 rounded">+ Equipe</button>
                                <button onClick={() => handleDeleteSection(section.id)} className="text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded">Excluir</button>
                            </div>
                        </div>

                        {importMode?.sectionId === section.id && (
                            <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-slide-in">
                                <h4 className="text-xs font-bold text-indigo-800 mb-1 uppercase">Lista rápida — um lance só</h4>
                                <p className="text-xs text-indigo-700 mb-2">
                                  Só o primeiro nome basta. Complete nascimento/registro depois. Formatos:
                                  <span className="font-mono"> João</span> ·
                                  <span className="font-mono"> Ana | Chefe</span> ·
                                  <span className="font-mono"> Pedro, 123, Águia</span>
                                </p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-indigo-800 uppercase">Função padrão</label>
                                    <select
                                      value={importDefaultRole}
                                      onChange={e => {
                                        const role = resolveTroopRole(e.target.value, TroopRole.CHEFE);
                                        setImportDefaultRole(role);
                                        setImportMode(mode => mode ? { ...mode, defaultRole: role } : mode);
                                      }}
                                      className="w-full p-1.5 border rounded text-xs bg-white"
                                    >
                                      <option value={TroopRole.JUVENIL}>Juvenil</option>
                                      <option value={TroopRole.CHEFE}>Chefe</option>
                                      <option value={TroopRole.ASSISTENTE}>Assistente</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-indigo-800 uppercase">Patrulha/matilha padrão</label>
                                    <input
                                      type="text"
                                      value={importPatrol}
                                      onChange={e => setImportPatrol(e.target.value)}
                                      placeholder="Opcional"
                                      className="w-full p-1.5 border rounded text-xs bg-white"
                                    />
                                  </div>
                                </div>
                                <textarea 
                                    className="w-full p-2 border rounded text-xs mb-2 h-28 font-mono"
                                    placeholder={"João\nMaria\nPedro\nAna | Assistente"}
                                    value={csvText}
                                    onChange={e => setCsvText(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-between items-center flex-wrap">
                                    {importFeedback ? (
                                      <span role={importFailed ? 'alert' : 'status'} className={`text-xs font-bold ${importFailed ? 'text-red-700' : 'text-green-700'}`}>{importFeedback}</span>
                                    ) : <span className="text-[10px] text-indigo-500">Duplicados por nome são ignorados.</span>}
                                    <div className="flex gap-2">
                                      <button onClick={() => { setImportMode(null); setCsvText(''); setImportFeedback(null); setImportFailed(false); }} className="text-xs text-slate-500 px-3 py-1">Cancelar</button>
                                      <button
                                        onClick={handleProcessImport}
                                        disabled={importBusy || !csvText.trim()}
                                        className="text-xs bg-indigo-600 text-white px-4 py-1 rounded font-bold disabled:opacity-60"
                                      >
                                        {importBusy ? 'Cadastrando…' : 'Cadastrar todos'}
                                      </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 bg-white space-y-3">
                            {addingTeamToSectionId === section.id && (
                                <div className="mb-3">
                                  <div className="flex gap-2">
                                    <input type="text" autoFocus placeholder="Nome da Equipe" className="flex-1 p-1.5 text-sm border rounded" value={newTeamName} onChange={e => { setNewTeamName(e.target.value); setTeamError(null); }} onKeyDown={e => e.key === 'Enter' && handleAddTeam()} />
                                    <button onClick={handleAddTeam} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Salvar</button>
                                    <button onClick={() => { setAddingTeamToSectionId(null); setNewTeamName(''); setTeamError(null); }} className="text-slate-500 text-xs px-2">Cancelar</button>
                                  </div>
                                  {teamError && <p role="alert" className="text-xs text-red-600 mt-1">{teamError}</p>}
                                </div>
                            )}
                            
                            <div className="space-y-1">
                                <div className="flex items-center justify-between pl-2 pr-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chefia / sem equipe</span>
                                  <div className="flex gap-1">
                                    <button onClick={() => openQuickList(section.id, { role: TroopRole.CHEFE })} className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded">⚡ Lista chefia</button>
                                    <button onClick={() => openNewMemberModal(section.id)} className="text-[10px] text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded">+ um</button>
                                  </div>
                                </div>
                                {(() => {
                                  const staff = members.filter(m => m.sectionId === section.id && !m.patrol && !m.isArchived);
                                  const selectedHere = staff.filter(m => staffSelection.has(m.id));
                                  const allSelected = staff.length > 0 && selectedHere.length === staff.length;
                                  if (staff.length === 0) return null;
                                  return (
                                    <div className="flex flex-wrap items-center gap-1.5 pl-2 pr-1 pb-1">
                                      <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={allSelected}
                                          onChange={() => {
                                            setStaffSelection(prev => {
                                              const next = new Set(prev);
                                              if (allSelected) staff.forEach(m => next.delete(m.id));
                                              else staff.forEach(m => next.add(m.id));
                                              return next;
                                            });
                                          }}
                                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                                        />
                                        Selecionar
                                      </label>
                                      <button
                                        type="button"
                                        disabled={selectedHere.length === 0 || staffBusy}
                                        onClick={() => handleBulkSetStaffRole(section.id, TroopRole.CHEFE)}
                                        className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 px-1.5 py-0.5 rounded"
                                      >
                                        {staffBusy ? 'Salvando…' : `Definir como Chefe${selectedHere.length ? ` (${selectedHere.length})` : ''}`}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={selectedHere.length === 0 || staffBusy}
                                        onClick={() => handleBulkSetStaffRole(section.id, TroopRole.ASSISTENTE)}
                                        className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 px-1.5 py-0.5 rounded"
                                      >
                                        Definir como Assistente
                                      </button>
                                    </div>
                                  );
                                })()}
                                {members.filter(m => m.sectionId === section.id && !m.patrol && !m.isArchived).map(m => renderMemberRow(m, { selectable: true }))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
                                {section.teams?.map(team => (
                                    <div key={team.id} className="border border-slate-100 rounded bg-slate-50 overflow-hidden">
                                        <div className="flex justify-between items-center p-2 bg-slate-100 border-b border-slate-200">
                                            <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">{team.name}</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => openQuickList(section.id, { patrol: team.name, role: TroopRole.JUVENIL })} className="text-indigo-600 hover:bg-indigo-100 rounded px-1 text-[10px] font-bold" title="Lista de nomes na patrulha">⚡</button>
                                                <button onClick={() => openNewMemberModal(section.id, team.name)} className="text-green-600 hover:bg-green-100 rounded px-1 text-xs font-bold" title="Um membro">+</button>
                                                <button onClick={() => handleDeleteTeam(section.id, team.id)} className="text-red-300 hover:text-red-500 text-xs px-1">×</button>
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            {members.filter(m => m.sectionId === section.id && m.patrol === team.name && !m.isArchived).map(m => renderMemberRow(m))}
                                            {members.filter(m => m.sectionId === section.id && m.patrol === team.name && !m.isArchived).length === 0 && (
                                              <p className="text-[10px] text-slate-400 italic px-2 py-1">Vazia — use ⚡ para colar a lista de nomes</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <button onClick={() => setShowArchived({ ...showArchived, [section.id]: !showArchived[section.id] })} className="text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600">
                                    {showArchived[section.id] ? '↑ Ocultar Arquivados' : '↓ Mostrar Arquivados'}
                                </button>
                                {showArchived[section.id] && (
                                    <div className="mt-2 space-y-1">
                                        {members.filter(m => m.sectionId === section.id && m.isArchived).map(m => renderMemberRow(m))}
                                        {members.filter(m => m.sectionId === section.id && m.isArchived).length === 0 && <p className="text-[10px] text-slate-300 italic pl-4">Nenhum membro arquivado.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* MEMBER MODAL */}
        {isMemberModalOpen && editingMember && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">{editingMember.name ? '✏️ Editar / completar' : '👤 Novo Membro'}</h3>
                    <form onSubmit={handleSaveMember} className="space-y-4">
                        <p className="text-[11px] text-slate-500 -mt-2">Só o nome é obrigatório (pode ser o primeiro). O resto completa quando der.</p>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                            <input required type="text" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} className="w-full p-2 border rounded" autoFocus placeholder="Ex: João" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label>
                                <select value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value as TroopRole})} className="w-full p-2 border rounded bg-white">
                                    <option value={TroopRole.JUVENIL}>Juvenil</option>
                                    <option value={TroopRole.CHEFE}>Chefe</option>
                                    <option value={TroopRole.ASSISTENTE}>Assistente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Registro UEB</label>
                                <input type="text" value={editingMember.registerNumber || ''} onChange={e => setEditingMember({...editingMember, registerNumber: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nascimento</label>
                                <input type="date" value={editingMember.birthDate || ''} onChange={e => setEditingMember({...editingMember, birthDate: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Admissão</label>
                                <input type="date" value={editingMember.admissionDate || ''} onChange={e => setEditingMember({...editingMember, admissionDate: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contato de Emergência</label>
                            <input type="text" value={editingMember.emergencyContact || ''} onChange={e => setEditingMember({...editingMember, emergencyContact: e.target.value})} className="w-full p-2 border rounded" placeholder="Ex: Mãe (11) 9999-9999" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Saúde / Alergias</label>
                            <textarea value={editingMember.medicalInfo || ''} onChange={e => setEditingMember({...editingMember, medicalInfo: e.target.value})} className="w-full p-2 border rounded h-16" placeholder="Alergias, restrições alimentares, etc." />
                        </div>

                        {editingMember.role !== TroopRole.JUVENIL && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={createLoginAccount} onChange={e => setCreateLoginAccount(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-bold text-blue-800">Habilitar login para este escotista</span>
                                </label>
                            </div>
                        )}
                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Vínculo (Mover)</h4>
                            <div className="space-y-2">
                                <select value={editingMember.sectionId} onChange={e => {
                                    const newSec = sections.find(s => s.id === e.target.value);
                                    setEditingMember({ ...editingMember, sectionId: e.target.value, branch: newSec?.branch || ScoutBranch.ESCOTEIRO, patrol: '' });
                                }} className="w-full p-2 border rounded bg-white text-sm">
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.branch})</option>)}
                                </select>
                                <select value={editingMember.patrol} onChange={e => setEditingMember({...editingMember, patrol: e.target.value})} className="w-full p-2 border rounded bg-white text-sm">
                                    <option value="">(Sem Equipe / Staff)</option>
                                    {sections.find(s => s.id === editingMember.sectionId)?.teams?.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setIsMemberModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
