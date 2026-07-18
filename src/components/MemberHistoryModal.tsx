import React, { useState, useEffect } from 'react';
import { ScoutMember, CatalogItem, ProgressionRecord, ScoutSection } from '../types';
import { getCatalogForSection } from '../services/catalogService';
import { getMemberProgress, updateMemberAchievement } from '../services/storageService';
import { generatePrintableHistory } from '../services/reportingService';

interface Props {
  member: ScoutMember;
  section?: ScoutSection | null;
  onClose: () => void;
}

export const MemberHistoryModal: React.FC<Props> = ({ member, section, onClose }) => {
  const [achievements, setAchievements] = useState<ProgressionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL'); // 'ALL' or category name

  useEffect(() => {
    loadHistory();
  }, [member.id]);

  const loadHistory = () => {
    const allData = getMemberProgress();
    const memberData = allData.find(p => p.memberId === member.id);
    setAchievements(memberData ? memberData.achievements : []);
  };

  const handlePrint = () => {
      generatePrintableHistory(member, section, achievements);
  };

  const handleToggle = (item: CatalogItem, isChecked: boolean) => {
    const date = new Date().toISOString().slice(0, 10); // Default to today
    updateMemberAchievement(member.id, item.code, date, undefined, !isChecked);
    loadHistory(); // Reload to refresh UI
  };

  const catalog = getCatalogForSection(member.branch, section);
  const categories = ['ALL', ...new Set(catalog.map(c => c.name))];

  // Stats
  const totalItems = catalog.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedCount = achievements.length;
  const percentage = Math.round((completedCount / (totalItems || 1)) * 100);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              📜 Ficha de Progressão
            </h2>
            <p className="text-slate-300 mt-1 text-sm">
              {member.name} • Ramo {member.branch} • {member.role}
            </p>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                  🖨️ Exportar para Impressão
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl transition-colors">×</button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-slate-100 p-4 flex items-center gap-6 border-b border-slate-200">
            <div className="flex-1">
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>Progresso Geral</span>
                    <span>{percentage}% ({completedCount}/{totalItems})</span>
                </div>
                <div className="w-full bg-slate-300 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Filtrar itens..." 
                    className="pl-8 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400">🔍</span>
            </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Categories */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 overflow-y-auto p-2 hidden md:block">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold mb-1 transition-colors ${activeTab === cat ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        {cat === 'ALL' ? '📋 Todos os Itens' : cat}
                    </button>
                ))}
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                {catalog
                    .filter(cat => activeTab === 'ALL' || cat.name === activeTab)
                    .map((cat, idx) => {
                        const visibleItems = cat.items.filter(item => 
                            item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={idx} className="mb-8">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 mb-3 sticky top-0 bg-white z-10">
                                    {cat.name}
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {visibleItems.map(item => {
                                        const record = achievements.find(a => a.code === item.code);
                                        const isChecked = !!record;

                                        return (
                                            <label key={item.code} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    onChange={(e) => handleToggle(item, e.target.checked)}
                                                    className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <span className={`text-sm font-medium ${isChecked ? 'text-green-800' : 'text-slate-700'}`}>{item.description}</span>
                                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded ml-2">{item.code}</span>
                                                    </div>
                                                    {isChecked && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="text-[10px] text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">
                                                                Conquistado em: {record.date}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>

      </div>
    </div>
  );
};