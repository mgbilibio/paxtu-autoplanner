import React, { useState, useEffect } from 'react';
import { ScoutBranch, ScoutSection } from '../../types';
import {
  getCatalogCodesForBranch,
  getTroopProgressData,
  completedCatalogCount,
  ScoutProgressProfile,
} from '../../services/reportingService';
import { getSectionsAsync } from '../../services/storageService';
import { IndividualReport } from './IndividualReport';
import { TroopMatrix } from './TroopMatrix';
import { TroopStats } from './TroopStats';
import { SectionProgressOverview } from '../SectionProgressOverview';

interface Props {
  sectionId?: string;
  branch: ScoutBranch;
  isAdmin?: boolean;
}

export const ReportsDashboard: React.FC<Props> = ({ sectionId, branch, isAdmin }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ScoutProgressProfile[]>([]);
  const [currentSectionData, setCurrentSectionData] = useState<ScoutSection | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<'LIST' | 'INDIVIDUAL' | 'MATRIX'>('LIST');
  const [selectedProfile, setSelectedProfile] = useState<ScoutProgressProfile | null>(null);

  useEffect(() => {
    loadData();
  }, [sectionId, branch]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Section Data to know progression system
      if (sectionId) {
          const sections = await getSectionsAsync();
          const found = sections.find(s => s.id === sectionId);
          setCurrentSectionData(found || null);
      } else {
          setCurrentSectionData(null); // Admin/Global View -> Uses Default Catalog
      }

      const data = await getTroopProgressData(branch, sectionId);
      setProfiles(data);
    } catch {
      setProfiles([]);
      setError('Não foi possível calcular as estatísticas. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (p: ScoutProgressProfile) => {
    setSelectedProfile(p);
    setViewMode('INDIVIDUAL');
  };

  // Render Logic
  if (loading) return <div className="p-10 text-center text-gray-400">Calculando estatísticas...</div>;

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => { void loadData(); }}
          className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-800"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (viewMode === 'INDIVIDUAL' && selectedProfile) {
      return <IndividualReport profile={selectedProfile} section={currentSectionData} onBack={() => setViewMode('LIST')} />;
  }

  if (viewMode === 'MATRIX') {
      return (
          <div>
              <button onClick={() => setViewMode('LIST')} className="mb-4 text-sm text-slate-500 hover:text-slate-800">← Voltar</button>
              <TroopMatrix profiles={profiles} branch={branch} section={currentSectionData} />
          </div>
      );
  }

  const catalogItems = getCatalogCodesForBranch(branch, currentSectionData);
  const catalogCodeSet = new Set(catalogItems.map(i => i.code));
  const averageAttendance = Math.round(
    profiles.reduce((sum, p) => sum + p.attendanceRate, 0) / (profiles.length || 1),
  );
  // Conta apenas itens dentro do catalogo da secao (mesma base usada no relatorio
  // individual e no TroopStats) — evita media acima de 100% por codes orfaos.
  const averageProgress = Math.round(
    profiles.reduce((sum, p) => {
      const done = completedCatalogCount(p, catalogCodeSet);
      return sum + Math.min(100, (done / (catalogItems.length || 1)) * 100);
    }, 0) / (profiles.length || 1),
  );
  const lowAttendance = profiles.filter(p => p.attendanceRate < 50).length;
  const noProgress = profiles.filter(p => completedCatalogCount(p, catalogCodeSet) === 0).length;
  const executiveStatus = lowAttendance > 0 || noProgress > 0
    ? 'atenção'
    : averageProgress >= 50
      ? 'adequado'
      : 'em evolução';

  // LIST MODE (Default)
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                📊 Relatórios de Progressão
                {isAdmin && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">Global</span>}
            </h2>
            <p className="text-gray-500">Análise baseada nas listas de presença do calendário.</p>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('MATRIX')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm text-sm"
            >
                Ver Matriz Geral
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-500">
              Resumo executivo da seção
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Leitura para diretoria: presença, avanço e pontos de atenção.
            </p>
          </div>
          <span className="text-xs font-black uppercase bg-slate-100 text-slate-700 px-3 py-1 rounded-full self-start lg:self-auto">
            Situação: {executiveStatus}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-2xl font-black text-slate-800">{profiles.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Jovens</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-2xl font-black text-slate-800">{averageAttendance}%</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Frequência média</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-2xl font-black text-slate-800">{averageProgress}%</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Avanço médio</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <div className="text-2xl font-black text-amber-700">{lowAttendance}</div>
            <div className="text-[10px] uppercase font-bold text-amber-600">Frequência crítica</div>
          </div>
          <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
            <div className="text-2xl font-black text-rose-700">{noProgress}</div>
            <div className="text-[10px] uppercase font-bold text-rose-600">Sem avanço registrado</div>
          </div>
        </div>
      </div>

      <TroopStats profiles={profiles} branch={branch} section={currentSectionData} />

      {/* Visão agregada POR 2025+ — só faz sentido para Lobinho/Escoteiro */}
      {(branch === ScoutBranch.LOBINHO || branch === ScoutBranch.ESCOTEIRO) && (
        <div className="my-6">
          <SectionProgressOverview sectionId={sectionId} branch={branch} />
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500">Nenhum membro encontrado para este ramo ou sem dados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map(p => (
                <div 
                    key={p.member.id} 
                    onClick={() => handleSelectProfile(p)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{p.member.name}</h3>
                            <p className="text-xs text-gray-500">{p.member.patrol || 'Sem Patrulha'}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-slate-700">{p.attendanceRate}%</span>
                            <p className="text-[10px] text-gray-400 uppercase">Frequência</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>Eventos: <strong>{p.attendedEvents}/{p.totalEvents}</strong></span>
                            <span>Itens: <strong>{completedCatalogCount(p, catalogCodeSet)}</strong></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div 
                                className="bg-indigo-500 h-1.5 rounded-full" 
                                style={{ width: `${Math.min(100, (p.attendedEvents / (p.totalEvents || 1)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
