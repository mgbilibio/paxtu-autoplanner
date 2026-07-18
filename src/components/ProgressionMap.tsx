import React, { useState, useEffect } from 'react';
import {
  MemberSpecialtyState,
  ScoutMember,
  ScoutSection,
  CatalogItem,
  ProgressionRecord,
  ScoutBranch,
} from '../types';
import { getMemberCatalog, getCatalogBySystem } from '../services/catalogService';
import {
  getMemberProgressIndividual,
  getMemberSpecialtyStates,
  updateMemberAchievement,
  getAppConfig,
} from '../services/storageService';
import { analyzeIndividualProgress } from '../services/geminiService';
import { getProgressionDetail } from '../services/progressionDetailService';
import { IndividualSheet } from './reports/IndividualSheet';
import { BlocoTracker } from './BlocoTracker';
import { isSpecialtyCode } from '../utils/specialtyCodes';
import {
  ESPECIALIDADES_GUIA,
} from '../data/generated/especialidades_guia';
import {
  getOfficialSpecialtyId,
  getOfficialSpecialtyLevel,
} from '../data/officialSpecialtyCatalog';

interface Props {
  member: ScoutMember;
  section?: ScoutSection | null;
  onClose: () => void;
  onPrint: () => void;
}

export const ProgressionMap: React.FC<Props> = ({ member, section, onClose, onPrint }) => {
  const [achievements, setAchievements] = useState<ProgressionRecord[]>([]);
  const [specialtyStates, setSpecialtyStates] = useState<MemberSpecialtyState[]>([]);
  const [activeTab, setActiveTab] = useState<string>('MAP'); 
  const [viewBranch, setViewBranch] = useState<ScoutBranch>(member.branch); 
  const [viewSystem, setViewSystem] = useState<'POR_2025' | 'LEGACY_2020'>(section?.progressionSystem || 'POR_2025');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showBlocos, setShowBlocos] = useState(false);
  
  // Modals & Popups
  const [detailItem, setDetailItem] = useState<{code: string, desc: string} | null>(null);
  const [levelSelectorItem, setLevelSelectorItem] = useState<CatalogItem | null>(null); // For Specialties

  // IA State
  const [recommendation, setRecommendation] = useState<{ text: string, items: string[] } | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [member.id]);

  const loadHistory = async () => {
    const [memberData, states] = await Promise.all([
      getMemberProgressIndividual(member.id),
      getMemberSpecialtyStates(member.id, ESPECIALIDADES_GUIA.map(item => item.id)),
    ]);
    setAchievements(memberData ? memberData.achievements : []);
    setSpecialtyStates(states);
  };

  // Logic to handle Specialty Levels (N1, N2, N3)
  const isSpecialty = (code: string) => isSpecialtyCode(code);

  const getAchievedLevel = (baseCode: string): number => {
      const officialId = getOfficialSpecialtyId(baseCode);
      if (officialId !== null) {
          const state = specialtyStates.find(item => item.especialidadeId === officialId);
          if (!state) return 0;
          return state.nivelAtual || getOfficialSpecialtyLevel(
              officialId,
              state.requisitosConcluidos.length,
          );
      }
      if (achievements.some(a => a.code === `${baseCode}-N3`)) return 3;
      if (achievements.some(a => a.code === `${baseCode}-N2`)) return 2;
      if (achievements.some(a => a.code === `${baseCode}-N1`)) return 1;
      if (achievements.some(a => a.code === baseCode)) return 1;
      return 0;
  };

  const extractLevelRequirements = (text: string | undefined, level: number): string[] => {
      if (!text) return ["Requisitos padrão do Guia de Especialidades."];
      
      const regex = new RegExp(String.raw`N${level}:\s*([^N]+)(?=N\d:|$)`, 'i');
      const match = text.match(regex);
      
      if (match && match[1]) {
          const rawText = match[1].trim();
          // Split by numbered items (1., 2., etc)
          const items = rawText.split(/(?=\d+\.\s)/g).map(i => i.trim()).filter(i => i.length > 0);
          return items.length > 0 ? items : [rawText];
      }
      
      if (level === 3) return ["Nível 3: Excelência técnica e serviço (Consultar Guia)."];
      if (level === 1 && !text.includes("N1:")) return [text];

      return ["Consultar requisitos no manual."];
  };

  const handleLevelSelect = async (item: CatalogItem, level: number) => {
      if (getOfficialSpecialtyId(item.code) !== null) return;
      const date = new Date().toISOString().slice(0, 10);
      const codeToSave = `${item.code}-N${level}`;
      
      const currentLevel = getAchievedLevel(item.code);
      if (currentLevel === level) {
          await updateMemberAchievement(member.id, codeToSave, date, undefined, true);
      } else {
          if (currentLevel > 0) {
              await updateMemberAchievement(member.id, `${item.code}-N${currentLevel}`, date, undefined, true);
          }
          await updateMemberAchievement(member.id, codeToSave, date, undefined, false);
      }
      
      loadHistory();
      setLevelSelectorItem(null);
  };

  const handleToggle = (item: CatalogItem) => {
    if (isSpecialty(item.code)) {
        setLevelSelectorItem(item);
        return;
    }
    const isChecked = achievements.some(a => a.code === item.code);
    const date = new Date().toISOString().slice(0, 10);
    void updateMemberAchievement(member.id, item.code, date, undefined, isChecked)
      .then(loadHistory);
  };

  const handleGetRecommendation = async () => {
      setLoadingIA(true);
      setIaError(null);
      try {
          const catalog = getCatalogBySystem(viewBranch, viewSystem, member.role);
          const flatItems = catalog.flatMap(c => c.items);
          const completedCodes = achievements.map(a => a.code);
          const result = await analyzeIndividualProgress({ branch: member.role !== 'Juvenil' ? 'Adulto' : viewBranch, system: member.role !== 'Juvenil' ? 'Gestão de Adultos' : viewSystem, completedCodes, fullCatalog: flatItems });
          setRecommendation({ text: result.recommendation, items: result.items });
      } catch (e) {
          setIaError('Não foi possível gerar sugestão da IA agora.');
      } finally {
          setLoadingIA(false);
      }
  };

  const isAdult = member.role !== 'Juvenil';
  const catalog = getMemberCatalog(member, section);
  
  // STATS CALCULATION
  const totalItems = catalog.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedCount = catalog.reduce((acc, cat) => {
      return acc + cat.items.filter(item => {
          if (isSpecialty(item.code)) return getAchievedLevel(item.code) > 0;
          return achievements.some(a => a.code === item.code);
      }).length;
  }, 0);
  
  const overallPercentage = Math.round((completedCount / (totalItems || 1)) * 100);

  const categoryStats = catalog.map(cat => {
      const total = cat.items.length;
      const done = cat.items.filter(item => {
          if (isSpecialty(item.code)) return getAchievedLevel(item.code) > 0;
          return achievements.some(a => a.code === item.code);
      }).length;
      return {
          name: cat.name,
          total,
          done,
          percent: Math.round((done / (total || 1)) * 100)
      };
  });

  const getSpecialtyColor = (level: number) => {
      if (level === 3) return 'border-yellow-500 text-yellow-600 bg-yellow-50'; // Gold
      if (level === 2) return 'border-slate-400 text-slate-600 bg-slate-100';   // Silver
      if (level === 1) return 'border-orange-400 text-orange-700 bg-orange-50'; // Bronze
      return 'border-slate-100 text-slate-300 bg-white hover:border-blue-300 hover:text-blue-400';
  };

  if (isPrinting) {
      return (
          <div className="fixed inset-0 bg-white z-[200] overflow-auto">
              <div className="no-print p-4 bg-slate-800 text-white flex justify-between items-center sticky top-0">
                  <span>Modo de Impressão</span>
                  <div className="flex gap-2">
                      <button onClick={() => window.print()} className="bg-blue-600 px-4 py-1 rounded font-bold hover:bg-blue-500">🖨️ Imprimir (Ctrl+P)</button>
                      <button onClick={() => setIsPrinting(false)} className="bg-red-600 px-4 py-1 rounded font-bold hover:bg-red-500">Fechar</button>
                  </div>
              </div>
              <IndividualSheet
                member={{...member, branch: viewBranch}}
                section={section}
                achievements={achievements}
                specialtyStates={specialtyStates}
              />
          </div>
      );
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 bg-slate-900/80 z-50 overflow-hidden backdrop-blur-sm">
      {showBlocos && (
        <div
          className="fixed top-0 right-0 bottom-0 left-0 z-[60] bg-slate-900/90 overflow-hidden"
          onClick={() => setShowBlocos(false)}
        >
          <div
            className="fixed top-0 right-0 bottom-0 left-0 bg-white shadow-2xl overflow-hidden flex flex-col min-h-0 max-w-full max-h-full"
            onClick={e => e.stopPropagation()}
          >
            <BlocoTracker member={member} onClose={() => setShowBlocos(false)} />
          </div>
        </div>
      )}
      <div
        className="fixed top-0 right-0 bottom-0 left-0 bg-slate-100 shadow-2xl flex flex-col overflow-hidden border border-slate-700 min-h-0 max-w-full max-h-full"
      >
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 md:p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-md z-10">
            <div className="flex items-center gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-slate-800 border-2 border-slate-600`}>
                    {isAdult ? '👮' : (viewBranch === 'Lobinho' ? '🐺' : viewBranch === 'Escoteiro' ? '⚜️' : '🏔️')}
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-bold truncate">{member.name}</h2>
                    <div className="flex gap-2 text-sm text-slate-400">
                        <span>{member.role}</span> • <span>{member.registerNumber || 'S/ Registro'}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={handleGetRecommendation} disabled={loadingIA} className="mr-4 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-lg disabled:bg-slate-700">
                    {loadingIA ? '...' : '✨ IA: Sugerir'}
                </button>
                {!isAdult && getAppConfig()?.showLegacy && (
                    <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
                        <button onClick={() => setViewSystem('POR_2025')} className={`px-2 py-1 text-[10px] rounded transition-all ${viewSystem === 'POR_2025' ? 'bg-green-600 text-white font-bold' : 'text-slate-400'}`}>POR 2025+</button>
                        <button onClick={() => setViewSystem('LEGACY_2020')} className={`px-2 py-1 text-[10px] rounded transition-all ${viewSystem === 'LEGACY_2020' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}>2020</button>
                    </div>
                )}
                <button onClick={() => setIsPrinting(true)} className="text-slate-300 hover:text-white p-2" title="Gerar Ficha de Impressão">🖨️</button>
                <button onClick={onClose} className="bg-slate-800 hover:bg-red-900 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">×</button>
            </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Referência POR 2025+ evita as regras de reconhecimentos legadas. */}
            {!isAdult && (
                <div className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto custom-scrollbar hidden lg:block">
                    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                        <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">POR 2025+</div>
                        <h3 className="mt-1 font-black text-slate-800">Reconhecimento de ramo</h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          Os requisitos oficiais de Cruzeiro do Sul e Lis de Ouro são
                          acompanhados por blocos, autoavaliação e homologação.
                        </p>
                        <button
                          onClick={() => setShowBlocos(true)}
                          className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-amber-950 py-2 rounded-lg text-xs font-black"
                        >
                          Abrir blocos e reconhecimento
                        </button>
                        <p className="mt-3 text-[10px] text-slate-500">
                          Especialidades devem ser avaliadas requisito a requisito na
                          Enciclopédia de Especialidades.
                        </p>
                    </div>
                </div>
            )}

            {/* RIGHT MAIN: PROGRESSION */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                
                {/* TOP DASHBOARD */}
                <div className="bg-white border-b border-slate-200 p-4 overflow-x-auto shadow-sm z-10">
                    <div className="flex gap-4 min-w-max">
                        <div className="bg-slate-900 text-white p-3 rounded-xl w-40 flex-shrink-0 shadow-md">
                            <div className="text-[10px] font-black uppercase opacity-60 mb-1">Total Ramo</div>
                            <div className="text-2xl font-black">{overallPercentage}%</div>
                            <div className="w-full bg-white/20 rounded-full h-1 mt-2">
                                <div className="bg-green-400 h-1 rounded-full transition-all" style={{ width: `${overallPercentage}%` }}></div>
                            </div>
                        </div>
                        {categoryStats.filter(s => s.total > 0 && !s.name.includes('Espec')).map(stat => (
                            <div key={stat.name} className="bg-white border border-slate-200 p-3 rounded-xl w-40 flex-shrink-0 hover:border-indigo-300 transition-colors">
                                <div className="text-[9px] font-black uppercase text-slate-400 truncate mb-1" title={stat.name}>{stat.name}</div>
                                <div className="text-lg font-black text-slate-700">{stat.percent}%</div>
                                <div className="text-[10px] text-slate-400">{stat.done}/{stat.total} itens</div>
                                <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
                                    <div className="bg-indigo-500 h-1 rounded-full transition-all" style={{ width: `${stat.percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 custom-scrollbar">
                    {/* IA Suggestion */}
                    {iaError && (
                        <div className="bg-red-50 text-red-800 border border-red-200 p-3 rounded-xl mb-4 text-sm flex justify-between items-center">
                            <span>{iaError}</span>
                            <button onClick={() => setIaError(null)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                        </div>
                    )}
                    {recommendation && (
                        <div className="bg-indigo-600 text-white p-4 rounded-xl mb-6 shadow-lg flex justify-between items-center animate-slide-in">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">💡</span>
                                <div>
                                    <p className="text-sm font-medium leading-tight">{recommendation.text}</p>
                                    <div className="flex gap-2 mt-2">
                                        {recommendation.items.map(code => (
                                            <span key={code} className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black tracking-wider border border-white/30">{code}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setRecommendation(null)} className="text-white/60 hover:text-white text-xl px-2">×</button>
                        </div>
                    )}

                    {activeTab === 'MAP' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.map((cat, idx) => {
                                const stat = categoryStats.find(s => s.name === cat.name);
                                return (
                                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group/card">
                                        <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center group-hover/card:bg-slate-200 transition-colors">
                                            <h3 className="font-bold text-slate-700 text-[10px] uppercase truncate max-w-[70%]" title={cat.name}>{cat.name}</h3>
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${stat?.percent === 100 ? 'bg-green-500 text-white' : 'bg-white text-slate-500'}`}>{stat?.percent}%</span>
                                        </div>
                                        <div className="p-2 flex-1 grid grid-cols-4 gap-2 content-start">
                                            {cat.items.map(item => {
                                                const isSpec = isSpecialty(item.code);
                                                
                                                if (isSpec) {
                                                    const level = getAchievedLevel(item.code);
                                                    return (
                                                        <div key={item.code} className="relative group">
                                                            <button 
                                                                onClick={() => handleToggle(item)}
                                                                className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center border-2 transition-all ${getSpecialtyColor(level)}`}
                                                            >
                                                                <span className="text-[9px] font-black text-center leading-tight px-1">{item.code.split('-').pop()}</span>
                                                                {level > 0 && <span className="text-xs font-black mt-1">N{level}</span>}
                                                            </button>
                                                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                                <button onClick={(e) => { e.stopPropagation(); setDetailItem({ code: item.code, desc: item.description }); }} className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] flex items-center justify-center shadow-md">ⓘ</button>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    const isDone = achievements.some(a => a.code === item.code);
                                                    return (
                                                        <div key={item.code} className="relative group">
                                                            <button 
                                                                onClick={() => handleToggle(item)}
                                                                className={`w-full aspect-square rounded-lg flex items-center justify-center border-2 transition-all ${isDone ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white border-slate-100 text-slate-300 hover:border-indigo-300 hover:text-indigo-400'}`}
                                                            >
                                                                <span className="text-[10px] font-bold">{isDone ? '✓' : item.code.split('-').pop()}</span>
                                                            </button>
                                                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                                <button onClick={(e) => { e.stopPropagation(); setDetailItem({ code: item.code, desc: item.description }); }} className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] flex items-center justify-center shadow-md">ⓘ</button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* LIST VIEW */}
                    {activeTab === 'LIST' && (
                        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {catalog.map((cat, idx) => (
                                <div key={idx} className="border-b last:border-0 border-slate-100">
                                    <div className="bg-slate-50 px-4 py-2 font-bold text-xs text-slate-600 uppercase sticky top-0">{cat.name}</div>
                                    <div className="divide-y divide-slate-50">
                                        {cat.items.map(item => {
                                            const isSpec = isSpecialty(item.code);
                                            if (isSpec) {
                                                const level = getAchievedLevel(item.code);
                                                return (
                                                    <div key={item.code} className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${level > 0 ? 'bg-yellow-50/30' : ''}`}>
                                                        <div onClick={() => handleToggle(item)} className={`w-8 h-8 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer font-bold text-xs ${getSpecialtyColor(level)}`}>
                                                            {level > 0 ? `N${level}` : '-'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div className="cursor-pointer flex-1" onClick={() => handleToggle(item)}>
                                                                    <span className="text-sm font-medium text-slate-700">{item.description}</span>
                                                                    <span className="ml-2 text-[10px] font-mono text-slate-400">{item.code}</span>
                                                                </div>
                                                                <button onClick={() => setDetailItem({ code: item.code, desc: item.description })} className="text-gray-400 hover:text-indigo-600 ml-2">ⓘ</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                const isDone = achievements.some(a => a.code === item.code);
                                                return (
                                                    <div key={item.code} className={`px-4 py-3 flex items-start gap-3 flex-1 hover:bg-slate-50 transition-colors ${isDone ? 'bg-green-50/30' : ''}`}>
                                                        <div onClick={() => handleToggle(item)} className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer ${isDone ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300'}`}>
                                                            {isDone && '✓'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div className="cursor-pointer flex-1" onClick={() => handleToggle(item)}>
                                                                    <span className="text-sm font-medium text-slate-700">{item.description}</span>
                                                                    <span className="ml-2 text-[10px] font-mono text-slate-400">{item.code}</span>
                                                                </div>
                                                                <button onClick={() => setDetailItem({ code: item.code, desc: item.description })} className="text-gray-400 hover:text-indigo-600 ml-2">ⓘ</button>
                                                            </div>
                                                            {isDone && <p className="text-[10px] text-green-600 mt-1">Conquistado</p>}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Level Selector Modal (Smart Context) */}
        {levelSelectorItem && (
            <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center backdrop-blur-sm animate-fade-in" onClick={() => setLevelSelectorItem(null)}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-96 transform scale-100 transition-all border border-slate-200" onClick={e => e.stopPropagation()}>
                    <h3 className="text-center font-bold text-gray-800 mb-1">{levelSelectorItem.description}</h3>
                    <p className="text-center text-xs text-gray-400 mb-4 font-mono">{levelSelectorItem.code}</p>
                    
                    <div className="space-y-3">
                        {[3, 2, 1].map(lvl => {
                            const isOfficial = getOfficialSpecialtyId(levelSelectorItem.code) !== null;
                            const isAchieved = isOfficial
                                ? getAchievedLevel(levelSelectorItem.code) >= lvl
                                : achievements.some(a => a.code === `${levelSelectorItem.code}-N${lvl}`);
                            let btnColor = 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300';
                            let icon = '⚪';
                            
                            if (lvl === 3) { btnColor = isAchieved ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-white border-yellow-200 text-yellow-600'; icon = '🥇'; }
                            if (lvl === 2) { btnColor = isAchieved ? 'bg-slate-200 border-slate-500 text-slate-800' : 'bg-white border-slate-300 text-slate-600'; icon = '🥈'; }
                            if (lvl === 1) { btnColor = isAchieved ? 'bg-orange-100 border-orange-500 text-orange-800' : 'bg-white border-orange-200 text-orange-600'; icon = '🥉'; }

                            // Smart Guidance Extraction
                            const reqText = extractLevelRequirements(levelSelectorItem.guidance, lvl);

                            return (
                                <div key={lvl} className="group">
                                    <button 
                                        onClick={() => void handleLevelSelect(levelSelectorItem, lvl)}
                                        disabled={isOfficial}
                                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${btnColor} ${isAchieved ? 'shadow-inner' : 'shadow-sm hover:-translate-y-0.5'} ${isOfficial ? 'cursor-default' : ''}`}
                                    >
                                        <span className="font-bold flex items-center gap-2">{icon} Nível {lvl}</span>
                                        {isAchieved && <span className="text-xs font-black">CONQUISTADO ✓</span>}
                                    </button>
                                    <div className="mt-1 px-2 space-y-1">
                                        {reqText.map((req, i) => (
                                            <div key={i} className="text-[10px] text-slate-500 italic border-l-2 border-slate-100 pl-2 leading-tight">
                                                {req}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {getOfficialSpecialtyId(levelSelectorItem.code) !== null && (
                        <p className="mt-4 text-center text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                            Para registrar evidências, status e avaliação, use a Enciclopédia de Especialidades.
                        </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <button onClick={() => setDetailItem({ code: levelSelectorItem.code, desc: levelSelectorItem.description })} className="text-xs text-indigo-600 hover:underline">
                            Ver ficha técnica completa
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Detail Modal */}
        {detailItem && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-indigo-100 animate-fade-in">
                    <div className="flex justify-between items-start mb-6">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-mono text-sm font-bold">{detailItem.code}</span>
                        <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-red-500 text-2xl">×</button>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">{detailItem.desc}</h3>
                    <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mb-6 italic text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                        {getProgressionDetail(detailItem.code) || "Orientação técnica em processamento."}
                    </div>
                    <button onClick={() => setDetailItem(null)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors">Entendi</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
