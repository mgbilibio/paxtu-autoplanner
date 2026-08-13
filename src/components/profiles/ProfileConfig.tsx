import React, { useEffect, useState } from 'react';
import { StructureManager } from './StructureManager';
import { UserManager } from './UserManager';
import { WebAccountsPanel } from './WebAccountsPanel';
import { getGroupsAsync, getSectionsAsync, getUsersAsync } from '../../services/storageService';
import { isWebApp } from '../../services/platform';

// U3: indicador de progresso do onboarding pós-setup wizard.
// Mostra 3 passos com checkmarks dinâmicos.
interface Props {
  currentAccountId?: string;
  isAdmin?: boolean;
}

export const ProfileConfig: React.FC<Props> = ({ currentAccountId, isAdmin }) => {
  const [steps, setSteps] = useState({ grupo: false, secao: false, usuario: false });

  useEffect(() => {
    const refresh = async () => {
      const [groups, sections, users] = await Promise.all([
        getGroupsAsync(),
        getSectionsAsync(),
        getUsersAsync(),
      ]);
      setSteps({
        grupo: groups.length > 0,
        secao: sections.length > 0,
        usuario: users.length > 0,
      });
    };
    refresh();
    // Re-checa quando dados mudam
    const onChange = () => refresh();
    window.addEventListener('paxtu:groups_updated', onChange);
    window.addEventListener('paxtu:sections_updated', onChange);
    window.addEventListener('paxtu:members_updated', onChange);
    window.addEventListener('paxtu:users_updated', onChange);
    return () => {
      window.removeEventListener('paxtu:groups_updated', onChange);
      window.removeEventListener('paxtu:sections_updated', onChange);
      window.removeEventListener('paxtu:members_updated', onChange);
      window.removeEventListener('paxtu:users_updated', onChange);
    };
  }, []);

  const allDone = steps.grupo && steps.secao && steps.usuario;
  const stepsCompleted = [steps.grupo, steps.secao, steps.usuario].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* U3: Banner de onboarding com progresso visual */}
      {!allDone && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-indigo-900">🚀 Vamos colocar o app pra rodar</h3>
              <p className="text-xs text-indigo-700">{stepsCompleted}/3 passos concluídos</p>
            </div>
            <div className="bg-white px-3 py-1 rounded-full text-xs font-bold text-indigo-700 border border-indigo-200">
              {stepsCompleted === 0 && 'Começar →'}
              {stepsCompleted === 1 && 'Continuando…'}
              {stepsCompleted === 2 && 'Quase lá!'}
            </div>
          </div>
          <ol className="space-y-2 text-sm">
            <li className={`flex items-center gap-3 ${steps.grupo ? 'text-green-800' : 'text-indigo-900 font-bold'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${steps.grupo ? 'bg-green-500 text-white' : 'bg-indigo-200 text-indigo-700'}`}>
                {steps.grupo ? '✓' : '1'}
              </span>
              <span>Crie seu <strong>Grupo Escoteiro</strong> (nome e cidade)</span>
            </li>
            <li className={`flex items-center gap-3 ${steps.secao ? 'text-green-800' : steps.grupo ? 'text-indigo-900 font-bold' : 'text-indigo-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${steps.secao ? 'bg-green-500 text-white' : steps.grupo ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-400'}`}>
                {steps.secao ? '✓' : '2'}
              </span>
              <span>Adicione pelo menos uma <strong>Seção</strong> (ex: Tropa Fênix, Alcateia Akelá)</span>
            </li>
            <li className={`flex items-center gap-3 ${steps.usuario ? 'text-green-800' : steps.secao ? 'text-indigo-900 font-bold' : 'text-indigo-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${steps.usuario ? 'bg-green-500 text-white' : steps.secao ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-400'}`}>
                {steps.usuario ? '✓' : '3'}
              </span>
              <span>Cadastre pelo menos um <strong>Usuário</strong> da chefia {isWebApp() ? 'pelo e-mail pessoal' : '(depois você cadastra os jovens)'}</span>
            </li>
          </ol>
          <p className="text-[11px] text-indigo-600 mt-3 italic">
            Após concluir os 3 passos, faça login com o usuário criado e comece a usar.
          </p>
        </div>
      )}

      {allDone && (
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <p className="text-sm text-green-900 font-bold">✅ Estrutura pronta!</p>
          <p className="text-xs text-green-700 mt-1">
            {isWebApp()
              ? 'Estrutura pronta. Use “Entrar no aplicativo” para ir ao planejador. A tropa fica no Firestore do ScoutsAuto.'
              : 'Volte ao Login e entre com o usuário criado para começar a planejar.'}
          </p>
        </div>
      )}

      <StructureManager />
      {!isWebApp() && <UserManager />}
      {isWebApp() && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-slate-800 mb-2">Acessos do grupo</h3>
          <WebAccountsPanel currentAccountId={currentAccountId} isAdmin={!!isAdmin} />
        </div>
      )}
    </div>
  );
};
