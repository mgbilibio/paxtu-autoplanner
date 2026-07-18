import React, { useState, useEffect } from 'react';
import { UserProfile, ScoutSection } from '../../types';
import { getUsersAsync, getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import { BRANCHES } from '../../constants';
import { getPermissions, getRoleLabel } from '../../services/roleService';

const getBranchColorClass = (branch: string): string =>
  BRANCHES.find(b => b.id === branch)?.color || 'bg-gray-500';

interface Props {
  onLogin: (user: UserProfile, section: ScoutSection) => void;
  onConfigure: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, onConfigure }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        const [u, s] = await Promise.all([getUsersAsync(), getSectionsAsync()]);
        setUsers(u);
        setSections(s);
        setLoading(false);
    };
    load();
    const onUpdate = () => load();
    window.addEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    return () => {
      window.removeEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Carregando perfis...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full animate-fade-in">
        <div className="text-center mb-12">
            <div className="text-6xl mb-4">⚜️</div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Quem está usando hoje?</h1>
            <p className="text-slate-400 mt-2">Selecione seu perfil para acessar sua seção.</p>
        </div>

        {users.length === 0 ? (
            <div className="text-center bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-md mx-auto">
                <p className="text-slate-300 mb-4">Nenhum perfil encontrado.</p>
                <button 
                    onClick={onConfigure}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all"
                >
                    Configurar Primeira Seção
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center">
                {users.map(user => {
                    const permissions = getPermissions(user);
                    const isAdmin = permissions.isGlobal && getRoleLabel(user.role) === 'ADMINISTRADOR';
                    const section = sections.find(s => s.id === user.sectionId);
                    
                    // Admin Login Handler
                    const handleUserClick = () => {
                        if (permissions.isGlobal) {
                            onLogin(user, { id: 'GLOBAL', name: 'Visão Global', branch: 'Escoteiro' as any });
                        } else if (section) {
                            onLogin(user, section);
                        }
                    };

                    return (
                        <button 
                            key={user.id}
                            onClick={handleUserClick}
                            className={`group p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left relative overflow-hidden
                                ${isAdmin 
                                    ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-2 border-yellow-500' 
                                    : 'bg-white hover:bg-blue-50'
                                }`}
                        >
                            {!isAdmin && <div className={`absolute top-0 left-0 w-2 h-full ${section ? getBranchColorClass(section.branch) : 'bg-gray-300'}`}></div>}
                            
                            <div className={isAdmin ? '' : 'pl-4'}>
                                <div className="flex justify-between items-start">
                                    <h3 className={`text-xl font-bold ${isAdmin ? 'text-yellow-400' : 'text-gray-800 group-hover:text-blue-700'}`}>
                                        {user.name}
                                    </h3>
                                    {isAdmin && <span className="text-2xl">👑</span>}
                                </div>
                                <p className={`text-sm font-medium ${isAdmin ? 'text-slate-400' : 'text-gray-500'}`}>{getRoleLabel(user.role)}</p>
                                
                                <div className={`mt-3 pt-3 border-t flex items-center gap-2 ${isAdmin ? 'border-slate-700' : 'border-gray-100'}`}>
                                    <span className={`text-xs px-2 py-1 rounded uppercase font-bold tracking-wider ${
                                        isAdmin ? 'bg-yellow-900 text-yellow-200' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {permissions.isGlobal ? 'Visão Global' : (section?.name || 'Sem Seção')}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
                
                <button 
                    onClick={onConfigure}
                    className="bg-slate-800 border-2 border-dashed border-slate-700 p-6 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-white hover:border-slate-500 transition-colors"
                >
                    <span className="text-2xl">⚙️</span>
                    <span className="font-bold text-sm">Gerenciar Perfis</span>
                </button>
            </div>
        )}
        
        <div className="text-center mt-12 text-slate-600 text-sm">
            Paxtu AutoPlanner v1.5
        </div>
      </div>
    </div>
  );
};
