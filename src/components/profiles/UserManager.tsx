import React, { useState, useEffect } from 'react';
import { UserProfile, ScoutSection } from '../../types';
import { getUsersAsync, saveUserAsync, deleteUserAsync, getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import { ConfirmDialog } from '../ConfirmDialog';
import { USER_ROLES } from '../../services/roleService';
import { parseMemberLines, newMemberId } from '../../utils/memberQuickAdd';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);

  const [name, setName] = useState('');
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkRole, setBulkRole] = useState('Assistente');
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

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
    setSectionId(prev => {
      if (sectionData.length === 0) return '';
      if (!prev || !sectionData.find(s => s.id === prev)) return sectionData[0].id;
      return prev;
    });
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || !sectionId) return;
    const newUser: UserProfile = {
      id: newMemberId(),
      name: trimmed,
      role,
      sectionId,
    };
    await saveUserAsync(newUser);
    setName('');
    load();
  };

  const handleBulkAdd = async () => {
    if (!sectionId) return;
    const parsed = parseMemberLines(bulkText);
    if (parsed.length === 0) {
      setBulkFeedback('Cole ao menos um nome.');
      return;
    }
    const existing = new Set(users.map(u => u.name.toLowerCase()));
    let added = 0;
    let skipped = 0;
    for (const row of parsed) {
      if (existing.has(row.name.toLowerCase())) {
        skipped++;
        continue;
      }
      // Mapeia aliases de função TroopRole → papel de login
      let loginRole = bulkRole;
      if (row.role === 'Chefe') loginRole = 'Chefe de Seção';
      if (row.role === 'Assistente') loginRole = 'Assistente';
      await saveUserAsync({
        id: newMemberId(),
        name: row.name,
        role: loginRole,
        sectionId,
      });
      existing.add(row.name.toLowerCase());
      added++;
    }
    setBulkFeedback(`✓ ${added} usuário(s)${skipped ? ` · ${skipped} duplicado(s)` : ''}`);
    setBulkText('');
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
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">👤 Gerenciar Usuários (login)</h3>
          <p className="text-xs text-gray-500">Só o nome basta para criar. Pode cadastrar a chefia em lista.</p>
        </div>
        {sections.length > 0 && (
          <button
            type="button"
            onClick={() => setBulkOpen(v => !v)}
            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
          >
            {bulkOpen ? 'Fechar lista' : '⚡ Lista rápida'}
          </button>
        )}
      </div>

      {sections.length === 0 ? (
        <p className="text-orange-500 text-sm">Crie uma seção acima primeiro.</p>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <input
              type="text"
              placeholder="Nome (só o primeiro serve)"
              className="flex-1 p-2 border rounded"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
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
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} className="bg-blue-600 text-white px-4 rounded font-bold hover:bg-blue-700">
              + Adicionar
            </button>
          </div>

          {bulkOpen && (
            <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
              <p className="text-xs text-indigo-800">
                Um nome por linha. Opcional: <code className="bg-white px-1">Nome | Chefe</code> ou{' '}
                <code className="bg-white px-1">Nome | Assistente</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={bulkRole}
                  onChange={e => setBulkRole(e.target.value)}
                  className="p-1.5 border rounded text-xs bg-white"
                >
                  {USER_ROLES.filter(item => item !== 'ADMINISTRADOR').map(item => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select
                  value={sectionId}
                  onChange={e => setSectionId(e.target.value)}
                  className="p-1.5 border rounded text-xs bg-white"
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="w-full p-2 border rounded text-sm font-mono h-28"
                placeholder={'Margus | Chefe\nFulano | Assistente\nCiclano'}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <div className="flex justify-between items-center">
                {bulkFeedback ? (
                  <span className="text-xs text-green-700 font-bold">{bulkFeedback}</span>
                ) : <span />}
                <button
                  type="button"
                  onClick={handleBulkAdd}
                  className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded font-bold"
                >
                  Cadastrar todos
                </button>
              </div>
            </div>
          )}
        </>
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
