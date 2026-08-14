// Painel de Ajuda - roteiro de uso, tela atual, FAQ e pergunta a IA.

import React, { useEffect, useState } from 'react';
import { askLlm } from '../services/llmProvider';
import { FAQ, HELP_PRODUTO, HelpTab, ROTEIRO, TELA_HELP } from './help/helpContent';
import { AskAi, Faq, Roteiro, TelaAtual } from './help/HelpSections';
import { openUserGuideInBrowser } from '../services/webLibraryService';

interface Props {
  onClose: () => void;
  currentView: string;
}

const TABS: Array<[HelpTab, string]> = [
  ['roteiro', 'Roteiro de uso'],
  ['tela', 'Tela atual'],
  ['faq', 'FAQ'],
  ['ia', 'Pergunte à IA'],
];

export const HelpPanel: React.FC<Props> = ({ onClose, currentView }) => {
  const [tab, setTab] = useState<HelpTab>('roteiro');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ask = () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setAskError(null);
    askLlm(question, buildContext(currentView))
      .then(response => setAnswer(response || 'Sem resposta.'))
      .catch(error => setAskError(error?.message || 'Falha ao consultar a IA.'))
      .finally(() => setLoading(false));
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={event => event.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white px-5 py-4 flex justify-between">
          <div>
            <h3 id="help-title" className="text-lg font-bold">Central de Ajuda</h3>
            <p className="text-xs text-white/80 mt-0.5">ScoutsAuto · Paxtu é só o sistema oficial da UEB</p>
          </div>
          <button onClick={onClose} aria-label="Fechar ajuda" className="text-white/70 hover:text-white text-2xl">
            x
          </button>
        </div>
        <div className="border-b flex" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={tabClass(tab, id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'roteiro' && <Roteiro />}
          {tab === 'tela' && <TelaAtual currentView={currentView} />}
          {tab === 'faq' && <Faq />}
          {tab === 'ia' && (
            <AskAi
              question={question}
              answer={answer}
              loading={loading}
              error={askError}
              onQuestion={setQuestion}
              onAsk={ask}
            />
          )}
        </div>
        <div className="border-t bg-slate-50 px-5 py-3 flex justify-end">
          <button
            onClick={() => { void openUserGuideInBrowser(); }}
            className="text-sm font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            title="Abrir o guia de uso do ScoutsAuto"
          >
            📖 Abrir guia de uso
          </button>
        </div>
      </div>
    </div>
  );
};

const buildContext = (currentView: string) => {
  const telaCtx = TELA_HELP[currentView];
  return [
    HELP_PRODUTO,
    'Roteiro de uso:',
    ROTEIRO.map(item => `- ${item.titulo}: ${item.texto}`).join('\n'),
    telaCtx ? `Tela atual (${currentView}): ${telaCtx.titulo} - ${telaCtx.corpo}` : '',
    'FAQ:',
    FAQ.map(item => `Q: ${item.q}\nA: ${item.a}`).join('\n\n'),
  ].filter(Boolean).join('\n\n');
};

const tabClass = (active: HelpTab, id: HelpTab) => [
  'flex-1 px-3 py-2 text-sm font-bold border-b-2 transition-colors',
  active === id ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-50',
].join(' ');
