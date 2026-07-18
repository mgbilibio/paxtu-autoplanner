import React, { useState } from 'react';
import { AwardStatus } from '../services/awardService';

interface Props {
  awards: AwardStatus[];
}

export const AwardTracker: React.FC<Props> = ({ awards }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (awards.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">🏆 Conquistas Especiais</h3>
      <div className="grid grid-cols-1 gap-3">
        {awards.map(({ award, isUnlocked, progressPercent, requirements }) => (
          <div 
            key={award.id} 
            className={`border rounded-xl transition-all overflow-hidden ${isUnlocked ? 'bg-yellow-50 border-yellow-400 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'}`}
          >
            {/* Header / Summary */}
            <div 
                className="p-4 cursor-pointer flex items-center gap-4"
                onClick={() => setExpandedId(expandedId === award.id ? null : award.id)}
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${isUnlocked ? 'bg-yellow-100 border-yellow-500' : 'bg-slate-100 border-slate-300 grayscale opacity-50'}`}>
                    {award.icon}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className={`font-bold ${isUnlocked ? 'text-yellow-800' : 'text-slate-700'}`}>{award.name}</h4>
                        <span className="text-xs font-bold">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${isUnlocked ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
                <div className="text-slate-400 text-xs">
                    {expandedId === award.id ? '▲' : '▼'}
                </div>
            </div>

            {/* Expanded Details */}
            {expandedId === award.id && (
                <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs text-slate-500 italic mb-3">{award.description}</p>
                    {requirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center border flex-shrink-0 ${req.isMet ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300 text-transparent'}`}>✓</span>
                            <div className="flex-1">
                                <span className={`${req.isMet ? 'text-slate-700 line-through opacity-50' : 'text-slate-800 font-medium'}`}>
                                    {req.description}
                                </span>
                                <span className="block text-[10px] text-slate-400">{req.details}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
