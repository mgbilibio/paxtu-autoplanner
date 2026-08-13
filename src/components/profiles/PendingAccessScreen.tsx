import React from 'react';
import { PENDING_ACCESS_MESSAGE, REJECTED_ACCESS_MESSAGE } from '../../services/firebase/groupAuth';

interface Props {
  rejected?: boolean;
  onLogout: () => void;
}

export const PendingAccessScreen: React.FC<Props> = ({ rejected, onLogout }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-white text-center animate-fade-in">
      <div className="text-5xl mb-3">⚜️</div>
      <h1 className="text-2xl font-bold">ScoutsAuto</h1>
      <p role="status" className="text-slate-200 mt-6 leading-relaxed">
        {rejected ? REJECTED_ACCESS_MESSAGE : PENDING_ACCESS_MESSAGE}
      </p>
      <p className="text-slate-500 text-sm mt-3 leading-relaxed">
        {rejected
          ? 'Você pode sair e, se o administrador mudar de ideia, tentar de novo depois.'
          : 'Você já está na fila. Quando o acesso for liberado, esta tela abre o planejador sozinha.'}
      </p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold"
      >
        Sair
      </button>
    </div>
  </div>
);
