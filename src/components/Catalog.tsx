import React, { useEffect, useState } from 'react';
import { MeetingPlan, getBranchIcon, ScoutSection, ScoutBranch } from '../types';
import { getCatalogAsync, deleteFromCatalog, exportCatalogBackup, rebuildCatalogFromFolder, getSectionsAsync, clonePlan, DATA_EVENTS } from '../services/storageService';
import { exportMeetingPlanHtml } from '../services/meetingPlanHtmlExport';
import { ConfirmDialog } from './ConfirmDialog';
import { BRANCH_BAR_CLASS } from './profiles/StructureManager';

interface Props {
  onLoadPlan: (plan: MeetingPlan) => void;
  onBack: () => void;
}

type ConfirmAction = {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
};

export const Catalog: React.FC<Props> = ({ onLoadPlan, onBack }) => {
  const [plans, setPlans] = useState<MeetingPlan[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  useEffect(() => {
    loadPlans();
    const onUpdate = () => loadPlans();
    window.addEventListener(DATA_EVENTS.CATALOG_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    return () => {
      window.removeEventListener(DATA_EVENTS.CATALOG_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    };
  }, []);

  const loadPlans = async () => {
      setLoading(true);
      try {
        const [data, secData] = await Promise.all([getCatalogAsync(), getSectionsAsync()]);
        setPlans(data);
        setSections(secData);
      } catch (err) {
        console.error('Falha ao carregar o catálogo de roteiros:', err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
  };

  const handleRebuild = async () => {
      setConfirmAction({
        title: 'Reindexar roteiros',
        message: 'Isso ira reler todos os arquivos da pasta e recriar o indice. Continuar?',
        confirmText: 'Reindexar',
        onConfirm: async () => {
          setConfirmAction(null);
          setIsRebuilding(true);
          const count = await rebuildCatalogFromFolder();
          setIsRebuilding(false);
          setFeedback(`${count} roteiros reimportados com sucesso.`);
          loadPlans();
        },
      });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction({
      title: 'Excluir roteiro',
      message: 'Excluir este roteiro do catalogo?',
      confirmText: 'Excluir',
      danger: true,
      onConfirm: async () => {
        await deleteFromCatalog(id);
        setConfirmAction(null);
        await loadPlans();
      },
    });
  };

  const getSectionName = (id?: string) => sections.find(s => s.id === id)?.name || 'Desconhecido';

  // Filter Logic
  const filteredPlans = plans.filter(p => {
      const matchesBranch = filterBranch === 'ALL' || p.branch === filterBranch;
      if (!searchTerm) return matchesBranch;

      const term = searchTerm.toLowerCase();
      const inTheme = p.theme.toLowerCase().includes(term);
      const inActivities = p.activities.some(a => 
          a.title.toLowerCase().includes(term) || 
          a.progressionObjective.toLowerCase().includes(term)
      );
      
      // If searching, ignore branch filter unless explicitly set? 
      // Better: Apply both. If I want to search "P-01" in "Lobinho", I select Lobinho.
      // If I want global, I select "Todos".
      return matchesBranch && (inTheme || inActivities);
  });

  if (loading) {
      return (
          <div className="flex items-center justify-center h-64 animate-fade-in">
              <div className="text-gray-400 flex flex-col items-center">
                  <span className="text-2xl animate-spin mb-2">⚙️</span>
                  <p>Carregando catálogo...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
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
      <div className="flex items-center justify-between mb-8">
        <div>
           <button onClick={onBack} className="text-sm font-medium text-gray-500 hover:text-slate-800 flex items-center gap-2 mb-2">
             ← Voltar
           </button>
           <h2 className="text-3xl font-bold text-gray-800">📂 Catálogo de Roteiros</h2>
           <p className="text-gray-500">Explore atividades criadas por todas as seções.</p>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={handleRebuild}
                disabled={isRebuilding}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-100 shadow-sm transition-colors"
            >
                {isRebuilding ? '⏳ Lendo...' : '🔄 Reindexar Arquivos'}
            </button>
            <button 
                onClick={exportCatalogBackup}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm"
            >
                📦 Backup JSON
            </button>
        </div>
      </div>

      {feedback && (
        <p role="status" className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          {feedback}
        </p>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            {['ALL', 'Lobinho', 'Escoteiro', 'Sênior', 'Pioneiro'].map(b => (
                <button
                    key={b}
                    onClick={() => setFilterBranch(b)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap border ${
                        filterBranch === b 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                >
                    {b === 'ALL' ? 'Todos' : b}
                </button>
            ))}
          </div>

          <div className="relative w-full md:w-96">
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              <input 
                  type="text"
                  placeholder="Buscar por código (P-01), tema ou atividade..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
          </div>
      </div>

      {/* Grid */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-gray-500 font-medium">Nenhum roteiro encontrado.</p>
            {searchTerm && <p className="text-sm text-gray-400">Tente mudar o termo de busca ou o filtro de ramo.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
                <div 
                    key={plan.id}
                    onClick={() => onLoadPlan(plan)}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                >
                    <div className={`h-2 w-full ${BRANCH_BAR_CLASS[plan.branch || ScoutBranch.ESCOTEIRO] || 'bg-gray-600'}`}></div>
                    <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-2xl">{getBranchIcon(plan.branch || ScoutBranch.ESCOTEIRO)}</span>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 font-mono block">
                                    {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '---'}
                                </span>
                                {plan.sectionId && (
                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                        {getSectionName(plan.sectionId)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors line-clamp-2">
                            {plan.theme}
                        </h3>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                            {plan.branch} • {plan.totalDuration} min
                        </p>
                        <div className="flex gap-1 flex-wrap mb-3">
                             {plan.activities.slice(0, 3).map((a, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded truncate max-w-[100px]">
                                    {a.title}
                                </span>
                             ))}
                             {plan.activities.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] rounded">
                                    +{plan.activities.length - 3}
                                </span>
                             )}
                        </div>
                        {/* Progression Codes Hints */}
                        <div className="flex gap-1 flex-wrap">
                            {plan.activities.map(a => {
                                const code = a.progressionObjective.match(/\[([A-Z0-9-]+)\]/)?.[1];
                                return code ? (
                                    <span key={code} className={`text-[9px] font-mono px-1 rounded border ${searchTerm && code.toLowerCase().includes(searchTerm.toLowerCase()) ? 'bg-yellow-200 border-yellow-400 text-yellow-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                        {code}
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                    <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-2">
                        <span className="text-[10px] text-blue-600 opacity-70 group-hover:opacity-100 transition-opacity">
                            Clique para abrir
                        </span>
                        <div className="flex gap-1 items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); exportMeetingPlanHtml(plan); }}
                                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-colors"
                                title="Exportar roteiro como HTML mobile"
                            >
                                HTML
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onLoadPlan(clonePlan(plan)); }}
                                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2 py-1 rounded border border-emerald-200 transition-colors"
                                title="Duplicar plano (cria cópia editável)"
                            >
                                📋 Duplicar
                            </button>
                            <button
                                onClick={(e) => handleDelete(plan.id || '', e)}
                                className="text-gray-300 hover:text-red-600 p-1 rounded transition-colors"
                                title="Excluir"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
