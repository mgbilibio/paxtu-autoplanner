import React, { useState, useEffect } from 'react';
import { UserProfile, ScoutSection } from '../../types';
import { getUsersAsync, saveUserAsync, deleteUserAsync, getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import { ConfirmDialog } from '../ConfirmDialog';
import { USER_ROLES } from '../../services/roleService';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    return () => {
      window.removeEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    const [userData, sectionData] = await Promise.all([getUsersAsync(), getSectionsAsync()]);
    setUsers(userData);
    setSections(sectionData);
    // Revalida sectionId: se ficou órfão (seção excluída) ou está vazio, aponta para a primeira disponível
    setSectionId(prev => {
      if (sectionData.length === 0) return '';
      if (!prev || !sectionData.find(s => s.id === prev)) return sectionData[0].id;
      return prev;
    });
  };

  const handleAdd = async () => {
    if (!name || !sectionId) return;
    const newUser: UserProfile = {
        id: Date.now().toString(),
        name,
        role,
        sectionId
    };
    await saveUserAsync(newUser);
    setName('');
    load();
  };

  const handleDelete = async (id: string) => {
    setUserToDelete(id);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    await deleteUserAsync(userToDelete);
    setUserToDelete(null);
    load();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
        {userToDelete && (
          <ConfirmDialog
            title="Remover usuário"
            message="Remover este usuário?"
            confirmText="Remover"
            danger
            onCancel={() => setUserToDelete(null)}
            onConfirm={confirmDelete}
          />
        )}
        <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Gerenciar Usuários</h3>
        
        {sections.length === 0 ? (
            <p className="text-orange-500 text-sm">Crie uma seção acima primeiro.</p>
        ) : (
            <div className="flex flex-col md:flex-row gap-2 mb-6">
                <input 
                    type="text" 
                    placeholder="Nome do Chefe" 
                    className="flex-1 p-2 border rounded"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <select 
                    value={role} 
                    onChange={e => setRole(e.target.value)}
                    className="p-2 border rounded bg-white"
                >
                    {USER_ROLES.filter(item => item !== 'ADMINISTRADOR').map(item => (
                        <option key={item}>{item}</option>
                    ))}
                </select>
                <select 
                    value={sectionId} 
                    onChange={e => setSectionId(e.target.value)}
                    className="p-2 border rounded bg-white"
                >
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={handleAdd} className="bg-blue-600 text-white px-4 rounded font-bold hover:bg-blue-700">
                    + Adicionar
                </button>
            </div>
        )}

        <div className="space-y-2">
            {users.map(u => {
                const sectionName = sections.find(s => s.id === u.sectionId)?.name || '???';
                return (
                    <div key={u.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                        <div>
                            <div className="font-bold text-gray-700">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.role} • {sectionName}</div>
                        </div>
                        <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
