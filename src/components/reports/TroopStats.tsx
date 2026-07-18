import React from 'react';
import { ScoutProgressProfile, getCatalogCodesForBranch, completedCatalogCount } from '../../services/reportingService';
import { ScoutBranch, ScoutSection } from '../../types';

interface Props {
  profiles: ScoutProgressProfile[];
  branch: ScoutBranch;
  section: ScoutSection | null;
}

export const TroopStats: React.FC<Props> = ({ profiles, branch, section }) => {
  const catalogItems = getCatalogCodesForBranch(branch, section);
  const catalogCodeSet = new Set(catalogItems.map(i => i.code));

  // 1. Calculate progress per category/axis
  const categoryStats: Record<string, { total: number, done: number }> = {};
  
  catalogItems.forEach(item => {
      if (!categoryStats[item.category]) categoryStats[item.category] = { total: 0, done: 0 };
      categoryStats[item.category].total += profiles.length;
      
      // Count how many members did this item
      profiles.forEach(p => {
          if (p.completedCodes.some(h => h.code === item.code)) {
              categoryStats[item.category].done++;
          }
      });
  });

  // 2. Filter Top categories (Eixos or main groups)
  const stats = Object.entries(categoryStats).map(([name, data]) => ({
      name,
      percent: Math.round((data.done / (data.total || 1)) * 100),
      done: data.done,
      total: data.total
  })).sort((a, b) => b.total - a.total).slice(0, 6);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Equilíbrio da Tropa */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">⚖️ Equilíbrio por Eixo / Bloco</h3>
            <div className="space-y-4">
                {stats.map(s => (
                    <div key={s.name}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700 truncate max-w-[200px]">{s.name}</span>
                            <span className="text-indigo-600">{s.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                                className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" 
                                style={{ width: `${s.percent}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Resumo da Tropa */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-4">📈 Snapshot da Seção</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="text-3xl font-black">{profiles.length}</div>
                    <div className="text-[10px] uppercase font-bold opacity-70">Membros Ativos</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="text-3xl font-black">
                        {Math.round(profiles.reduce((acc, p) => acc + p.attendanceRate, 0) / (profiles.length || 1))}%
                    </div>
                    <div className="text-[10px] uppercase font-bold opacity-70">Frequência Média</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="text-3xl font-black">
                        {profiles.reduce((acc, p) => acc + completedCatalogCount(p, catalogCodeSet), 0)}
                    </div>
                    <div className="text-[10px] uppercase font-bold opacity-70">Itens Conquistados</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="text-3xl font-black">
                        {Math.round(profiles.reduce((acc, p) => acc + (completedCatalogCount(p, catalogCodeSet) / (catalogItems.length || 1)), 0) / (profiles.length || 1) * 100)}%
                    </div>
                    <div className="text-[10px] uppercase font-bold opacity-70">Progresso Geral</div>
                </div>
            </div>
        </div>
    </div>
  );
};
