import React, { useState } from 'react';
import { ScoutProgressProfile, getCatalogCodesForBranch, completedCatalogCount } from '../../services/reportingService';
import { ScoutSection } from '../../types';

interface Props {
  profile: ScoutProgressProfile;
  section?: ScoutSection | null;
  onBack: () => void;
}

export const IndividualReport: React.FC<Props> = ({ profile, section, onBack }) => {
  const [tab, setTab] = useState<'SUMMARY' | 'TIMELINE' | 'MAP'>('SUMMARY');
  const catalogItems = getCatalogCodesForBranch(profile.member.branch, section);
  const catalogCodeSet = new Set(catalogItems.map(i => i.code));

  // Itens realizados, deduplicados e filtrados pelo catalogo desta secao — codes
  // fora do catalogo (ruido de outra base) nao contam e nao estouram os 100%.
  const uniqueHits = new Set(
    profile.completedCodes.map(h => h.code).filter(c => catalogCodeSet.has(c)),
  );
  const completedCount = completedCatalogCount(profile, catalogCodeSet);
  const progressPercent = Math.min(
    100,
    Math.round((completedCount / (catalogItems.length || 1)) * 100) || 0,
  );
  const pendingItems = catalogItems.filter(item => !uniqueHits.has(item.code));
  const lastHits = [...profile.completedCodes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const attendanceStatus = profile.attendanceRate >= 75
    ? 'regular'
    : profile.attendanceRate >= 50
      ? 'atenção'
      : 'crítico';
  const progressStatus = progressPercent >= 70
    ? 'avançado'
    : progressPercent >= 35
      ? 'em desenvolvimento'
      : 'inicial';

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">← Voltar para Lista</button>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">{profile.member.name}</h2>
                <p className="text-sm text-gray-500">Ramo {profile.member.branch} • {profile.member.patrol || 'Sem Patrulha'}</p>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{progressPercent}%</div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Do Catálogo</p>
            </div>
        </div>
        
        <div className="mt-6 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
        
        <div className="flex gap-4 mt-4 text-sm text-gray-600">
            <div className="bg-slate-50 px-3 py-1 rounded border border-slate-100">
                📅 <strong>{profile.attendanceRate}%</strong> Frequência
            </div>
            <div className="bg-slate-50 px-3 py-1 rounded border border-slate-100">
                🏆 <strong>{uniqueHits.size}</strong> Itens Conquistados
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 pb-1">
        <button
            onClick={() => setTab('SUMMARY')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${tab === 'SUMMARY' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
            Ficha Consolidada
        </button>
        <button 
            onClick={() => setTab('MAP')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${tab === 'MAP' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
            Mapa de Progressão
        </button>
        <button 
            onClick={() => setTab('TIMELINE')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${tab === 'TIMELINE' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
            Histórico (Timeline)
        </button>
      </div>

      {/* Content */}
      {tab === 'SUMMARY' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-3">Dados do jovem</h3>
                <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {profile.member.name}</p>
                    <p><strong>Ramo:</strong> {profile.member.branch}</p>
                    <p><strong>Seção:</strong> {section?.name || 'Sem seção'}</p>
                    <p><strong>Equipe:</strong> {profile.member.patrol || 'Não informada'}</p>
                    <p><strong>Registro:</strong> {profile.member.registerNumber || 'Não informado'}</p>
                    <p><strong>Entrada:</strong> {profile.member.admissionDate || 'Não informada'}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-3">Acompanhamento</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-2xl font-black text-slate-800">{progressPercent}%</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Progressão</div>
                        <div className="text-[11px] text-slate-500 mt-1">{progressStatus}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-2xl font-black text-slate-800">{profile.attendanceRate}%</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Frequência</div>
                        <div className="text-[11px] text-slate-500 mt-1">{attendanceStatus}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-2xl font-black text-slate-800">{uniqueHits.size}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Itens feitos</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-2xl font-black text-slate-800">{pendingItems.length}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Pendências</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-3">Últimos registros</h3>
                {lastHits.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhum registro encontrado.</p>
                ) : (
                    <div className="space-y-2">
                        {lastHits.map((hit, idx) => (
                            <div key={`${hit.code}-${idx}`} className="border-b border-slate-100 pb-2 last:border-0">
                                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                    {hit.code}
                                </span>
                                <p className="text-xs font-bold text-slate-700 mt-1">{hit.activityTitle}</p>
                                <p className="text-[10px] text-slate-400">
                                    {new Date(hit.date).toLocaleDateString()} · {hit.planTheme}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase text-slate-400">Próximas pendências</h3>
                    <span className="text-[10px] text-slate-400">
                        Primeiros itens ainda não registrados
                    </span>
                </div>
                {pendingItems.length === 0 ? (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                        Todos os itens do catálogo atual aparecem como registrados.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {pendingItems.slice(0, 8).map(item => (
                            <div key={item.code} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                        {item.code}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                                        {item.category}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-700 leading-snug">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {tab === 'MAP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Group by Category logic could be here, simplified for list */}
            {catalogItems.map(item => {
                const isDone = uniqueHits.has(item.code);
                const hitInfo = profile.completedCodes.find(h => h.code === item.code);
                
                return (
                    <div key={item.code} className={`p-3 rounded-lg border flex items-start gap-3 ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 opacity-60'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {isDone ? '✓' : ''}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono bg-slate-100 px-1 rounded text-slate-600">{item.code}</span>
                                <span className="text-[10px] font-bold uppercase text-gray-400">{item.category}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 leading-tight mt-1">{item.desc}</p>
                            {isDone && (
                                <p className="text-[10px] text-green-700 mt-1">
                                    Em: {new Date(hitInfo!.date).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {tab === 'TIMELINE' && (
        <div className="space-y-4">
            {profile.completedCodes.length === 0 ? (
                <p className="text-gray-400 text-center py-10">Nenhuma atividade registrada.</p>
            ) : (
                profile.completedCodes
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((hit, idx) => (
                    <div key={idx} className="flex gap-4">
                        <div className="w-24 text-right text-sm text-gray-500 pt-1">
                            {new Date(hit.date).toLocaleDateString()}
                        </div>
                        <div className="relative flex-1 pb-6 border-l-2 border-slate-200 pl-6 last:border-0">
                            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded mb-1 inline-block">
                                    {hit.code}
                                </span>
                                <h4 className="font-bold text-gray-800">{hit.activityTitle}</h4>
                                <p className="text-xs text-gray-500">Tema: {hit.planTheme}</p>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
};
