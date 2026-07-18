import React from 'react';
import { Activity, EducationalArea } from '../types';

interface Props {
  activity: Activity;
  index: number;
}

const getAreaColor = (area: EducationalArea) => {
  switch (area) {
    case EducationalArea.FISICO: return 'bg-blue-100 text-blue-800 border-blue-200';
    case EducationalArea.INTELECTUAL: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case EducationalArea.CARATER: return 'bg-purple-100 text-purple-800 border-purple-200';
    case EducationalArea.AFETIVO: return 'bg-pink-100 text-pink-800 border-pink-200';
    case EducationalArea.SOCIAL: return 'bg-green-100 text-green-800 border-green-200';
    case EducationalArea.ESPIRITUAL: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const ActivityCard: React.FC<Props> = ({ activity, index }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-sm">
            {index + 1}
          </span>
          <h3 className="text-lg font-bold text-gray-800">{activity.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                ⏱️ {activity.durationMinutes} min
            </span>
            <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getAreaColor(activity.educationalArea)}`}>
                {activity.educationalArea}
            </span>
        </div>
      </div>

      <div className="prose prose-sm text-gray-600 mb-4">
        <p className="whitespace-pre-line">{activity.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-md">
        <div>
          <strong className="block text-gray-700 mb-1">🛠️ Materiais:</strong>
          {activity.materials.length > 0 ? (
            <ul className="list-disc list-inside text-gray-600 pl-1">
              {activity.materials.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          ) : (
            <span className="text-gray-400 italic">Nenhum material específico.</span>
          )}
        </div>
        <div>
          <strong className="block text-gray-700 mb-1">🎯 Progressão/Paxtu:</strong>
          <p className="text-gray-600 font-medium">
             {activity.progressionObjective}
          </p>
        </div>
      </div>
    </div>
  );
};