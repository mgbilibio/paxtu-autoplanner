// Blocos visuais da central de ajuda.

import React from 'react';
import { FAQ, ROTEIRO, TELA_HELP } from './helpContent';

export const Roteiro = () => (
  <ol className="space-y-4">
    {ROTEIRO.map((item, idx) => (
      <li key={idx} className="border-l-4 border-indigo-300 pl-4 py-2">
        <h4 className="font-bold text-slate-800">{item.titulo}</h4>
        <p className="text-sm text-slate-600 mt-1">{item.texto}</p>
      </li>
    ))}
  </ol>
);

export const TelaAtual: React.FC<{ currentView: string }> = ({ currentView }) => {
  const telaInfo = TELA_HELP[currentView];
  if (!telaInfo) {
    return <p className="text-sm text-slate-500 italic">Sem ajuda específica para esta tela ({currentView}).</p>;
  }
  return (
    <div>
      <h4 className="text-xl font-bold text-slate-800 mb-2">{telaInfo.titulo}</h4>
      <p className="text-sm text-slate-700 mb-4 leading-relaxed">{telaInfo.corpo}</p>
      <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Dicas</h5>
      <ul className="space-y-2">
        {telaInfo.dicas.map((dica, idx) => <li key={idx} className="text-sm text-slate-700">- {dica}</li>)}
      </ul>
    </div>
  );
};

export const Faq = () => (
  <div className="space-y-3">
    {FAQ.map((item, idx) => (
      <details key={idx} className="border rounded-lg bg-slate-50">
        <summary className="cursor-pointer p-3 font-semibold text-sm text-slate-800 hover:bg-slate-100">{item.q}</summary>
        <div className="px-3 pb-3 pt-1 text-sm text-slate-600 leading-relaxed">{item.a}</div>
      </details>
    ))}
  </div>
);

interface AskAiProps {
  question: string;
  answer: string | null;
  loading: boolean;
  error: string | null;
  onQuestion: (value: string) => void;
  onAsk: () => void;
}

export const AskAi: React.FC<AskAiProps> = ({ question, answer, loading, error, onQuestion, onAsk }) => (
  <div className="space-y-3">
    <p className="text-xs text-slate-500">Pergunte sobre uso do app, progressão, especialidades ou rotina da seção.</p>
    <textarea value={question} onChange={event => onQuestion(event.target.value)} rows={3} className="w-full p-3 border rounded-lg text-sm" />
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-400">{question.length}/500</span>
      <button onClick={onAsk} disabled={loading || !question.trim()} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-500 disabled:bg-slate-400">
        {loading ? 'Consultando...' : 'Perguntar'}
      </button>
    </div>
    {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
    {answer && <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line">{answer}</div>}
  </div>
);
