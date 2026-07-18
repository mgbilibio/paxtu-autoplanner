import React, { useState } from 'react';
import { ScoutProgressProfile, getCatalogCodesForBranch } from '../../services/reportingService';
import { ScoutBranch, ScoutSection } from '../../types';

interface Props {
  profiles: ScoutProgressProfile[];
  branch: ScoutBranch;
  section?: ScoutSection | null;
}

export const TroopMatrix: React.FC<Props> = ({ profiles, branch, section }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const catalogItems = getCatalogCodesForBranch(branch, section);

  // Filtrar colunas (itens) e linhas (pessoas)
  const filteredItems = catalogItems.filter(i => 
    i.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
        <div>
            <h3 className="font-bold text-gray-700">Matriz de Competências</h3>
            <p className="text-xs text-gray-500">Visão geral de quem já completou o quê.</p>
        </div>
        <input 
            type="text" 
            placeholder="Filtrar item..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs">
                <tr>
                    <th className="p-3 border-b border-r sticky left-0 bg-slate-50 z-10 min-w-[150px]">Nome / Item</th>
                    {filteredItems.map(item => (
                        <th key={item.code} className="p-2 border-b min-w-[100px] max-w-[150px] text-center group relative cursor-help" title={item.desc}>
                            <div className="text-[10px] text-slate-400">{item.code}</div>
                            <div className="truncate">{item.desc}</div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {profiles.map(profile => (
                    <tr key={profile.member.id} className="hover:bg-slate-50 transition-colors border-b">
                        <td className="p-3 border-r font-bold sticky left-0 bg-white z-10 truncate max-w-[150px]">
                            {profile.member.name}
                        </td>
                        {filteredItems.map(item => {
                            const hit = profile.completedCodes.find(h => h.code === item.code);
                            return (
                                <td key={item.code} className="p-2 text-center border-r border-slate-50">
                                    {hit ? (
                                        <span className="inline-block w-5 h-5 bg-green-500 text-white rounded-full text-xs leading-5" title={`Realizado em ${new Date(hit.date).toLocaleDateString()}`}>
                                            ✓
                                        </span>
                                    ) : (
                                        <span className="text-slate-200 text-xs">•</span>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};