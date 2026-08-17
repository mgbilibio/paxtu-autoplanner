import React from 'react';
import { openUserGuideInBrowser } from '../services/webLibraryService';

export interface WelcomeStep {
  titulo: string;
  texto: string;
}

export const WELCOME_STEPS: WelcomeStep[] = [
  { titulo: '1. Entrar', texto: 'Use Google ou e-mail e senha. Pedido novo espera o administrador em Configurações → Acessos.' },
  { titulo: '2. Ver o Efetivo', texto: 'Cadastre jovens e adultos. Filtre por seção, unidade e nome. A ficha 📜 mostra oficial (Paxtu) e Blocos 2025+.' },
  { titulo: '3. Gerar o roteiro', texto: 'Em Gerar, informe o tema, ajuste o cronograma e peça à IA. Dá para refazer só um quadro.' },
  { titulo: '4. Salvar no catálogo', texto: 'O roteiro gravado aparece em Roteiros e pode ser escolhido depois na Agenda.' },
  { titulo: '5. Agenda', texto: 'Marque a data, amarre o roteiro do catálogo, registre presença e lance progressão.' },
  { titulo: '6. Ajuda', texto: 'O ? abre o roteiro curto. O manual completo tem as telas atuais (login, efetivo, gerar, agenda…).' },
];

interface Props {
  plannerLabel: string;
  onGoToPlanner: () => void;
  onHideForever: () => void;
}

export const WelcomeHome: React.FC<Props> = ({ plannerLabel, onGoToPlanner, onHideForever }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Início</p>
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mt-1">Bem-vindo ao ScoutsAuto</h2>
      <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed max-w-3xl">
        Planejador da chefia no navegador: reuniões, efetivo e progressão <strong>POR 2025+</strong>.
        Os dados da tropa e da alcateia ficam no Firebase, ligados à sua conta.
        Paxtu é só o sistema oficial da UEB — de lá copiamos o histórico; este app não se chama Paxtu.
      </p>
      <ol className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {WELCOME_STEPS.map(step => (
          <li key={step.titulo} className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm">{step.titulo}</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.texto}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGoToPlanner}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-bold"
        >
          {plannerLabel}
        </button>
        <button
          type="button"
          onClick={() => { void openUserGuideInBrowser(); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold"
        >
          Abrir o manual completo
        </button>
        <button
          type="button"
          onClick={onHideForever}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold"
        >
          Não mostrar de novo
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mt-3">
        Quem já conhece o app pode ir direto ao planejador. O Início continua no menu, se quiser voltar.
      </p>
    </div>
  </div>
);
