import React, { useState, useEffect } from 'react';
import { ScoutSection, ScoutBranch, ScoutGroup } from '../../types';
import { getSectionsAsync, saveSectionAsync, deleteSectionAsync, getGroupsAsync, saveGroupAsync, getAppConfig } from '../../services/storageService';
import { ConfirmDialog } from '../ConfirmDialog';
import { BRANCH_DOT_CLASS } from './StructureManager';

export const SectionManager: React.FC = () => {
  const [group, setGroup] = useState<ScoutGroup | null>(null);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  
  // Form States
  const [groupName, setGroupName] = useState('');
  const [groupCity, setGroupCity] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [branch, setBranch] = useState<ScoutBranch>(ScoutBranch.ESCOTEIRO);
  const [progression, setProgression] = useState<'LEGACY_2020' | 'POR_2025'>('POR_2025');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const groups = await getGroupsAsync();
    if (groups.length > 0) {
        setGroup(groups[0]); // Simple single-group support for now
        setGroupName(groups[0].name);
        setGroupCity(groups[0].city);
    }
    const secData = await getSectionsAsync();
    setSections(secData);
  };

  const handleSaveGroup = async () => {
      const name = (groupName || '').trim() || 'Meu Grupo Escoteiro';
      const newGroup: ScoutGroup = {
          id: group?.id || Date.now().toString(),
          name,
          city: (groupCity || '').trim(),
          sections: group?.sections || []
      };
      await saveGroupAsync(newGroup);
      setGroup(newGroup);
      setGroupName(name);
      setFeedback('Grupo salvo. Você pode completar cidade e seções quando quiser.');
  };

  const handleAddSection = async () => {
    const name = sectionName.trim();
    if (!name) {
      setFeedback('Informe um nome curto para a seção (ex: Tropa Titan).');
      return;
    }

    // Se ainda não há grupo, cria um mínimo automaticamente.
    let activeGroup = group;
    if (!activeGroup) {
      activeGroup = {
        id: Date.now().toString(),
        name: (groupName || '').trim() || 'Meu Grupo Escoteiro',
        city: (groupCity || '').trim(),
        sections: [],
      };
      await saveGroupAsync(activeGroup);
      setGroup(activeGroup);
      setGroupName(activeGroup.name);
    }

    const newSection: ScoutSection = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        groupId: activeGroup.id,
        name,
        branch,
        progressionSystem: progression
    };

    await saveSectionAsync(newSection);

    const updatedGroup = {
      ...activeGroup,
      sections: [...(activeGroup.sections || []), newSection.id],
    };
    await saveGroupAsync(updatedGroup);
    setGroup(updatedGroup);

    setSectionName('');
    setFeedback(`✓ Seção "${name}" criada. Cadastre o efetivo com lista rápida na Estrutura.`);
    load();
  };

  const handleDeleteSection = async (id: string) => {
    setSectionToDelete(id);
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    await deleteSectionAsync(sectionToDelete);
    setSectionToDelete(null);
    load();
  };

  return (
    <div className="space-y-8">
        {sectionToDelete && (
          <ConfirmDialog
            title="Excluir seção"
            message="Excluir esta seção?"
            confirmText="Excluir"
            danger
            onCancel={() => setSectionToDelete(null)}
            onConfirm={confirmDeleteSection}
          />
        )}
        {feedback && (
          <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {feedback}
          </div>
        )}
        
        {/* GROUP CARD */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">⚜️ Dados do Grupo Escoteiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Grupo</label>
                    <input 
                        type="text" 
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="Ex: G.E. Dom Pedro II"
                        className="w-full p-3 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade / UF</label>
                    <input 
                        type="text" 
                        value={groupCity}
                        onChange={e => setGroupCity(e.target.value)}
                        placeholder="Ex: Curitiba - PR"
                        className="w-full p-3 border rounded-lg"
                    />
                </div>
            </div>
            <button onClick={handleSaveGroup} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors">
                Salvar Grupo
            </button>
        </div>

        {/* SECTIONS CARD */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📂 Seções do Grupo</h3>
            
            <div className="flex flex-col gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Nome da Seção (ex: Tropa Titan)" 
                        className="flex-1 p-2 border rounded"
                        value={sectionName}
                        onChange={e => setSectionName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                    />
                    <select 
                        value={branch} 
                        onChange={e => setBranch(e.target.value as ScoutBranch)}
                        className="p-2 border rounded bg-white"
                    >
                        {Object.values(ScoutBranch).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <p className="text-[11px] text-gray-500">Só o nome + ramo bastam. Depois use lista rápida de jovens/chefia.</p>
                
                {getAppConfig()?.showLegacy ? (
                  <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="prog" checked={progression === 'POR_2025'} onChange={() => setProgression('POR_2025')} className="text-green-600" />
                          <span className="text-sm font-medium">Novo POR 2025+ (Blocos)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="prog" checked={progression === 'LEGACY_2020'} onChange={() => setProgression('LEGACY_2020')} className="text-blue-600" />
                          <span className="text-sm font-medium">Antigo 2020 (Áreas Desenv.)</span>
                      </label>
                  </div>
                ) : (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 inline-block font-bold">POR 2025+</div>
                )}

                <button onClick={handleAddSection} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 w-full transition-colors shadow-sm">
                    + Adicionar Seção
                </button>
            </div>

            <div className="space-y-2">
                {sections.length === 0 && <p className="text-gray-400 text-sm text-center">Nenhuma seção criada.</p>}
                {sections.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-3 border rounded bg-white hover:shadow-md transition-shadow group">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${BRANCH_DOT_CLASS[s.branch] || 'bg-gray-500'}`}></span>
                                <span className="font-bold text-gray-700">{s.name}</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 rounded uppercase">{s.branch}</span>
                                <span className={`text-[10px] px-1.5 rounded border ${s.progressionSystem === 'POR_2025' || !s.progressionSystem ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                    {s.progressionSystem === 'POR_2025' || !s.progressionSystem ? 'POR 2025' : 'LEGACY'}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => handleDeleteSection(s.id)} className="text-red-300 hover:text-red-600 font-bold px-2 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
