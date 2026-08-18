import React, { useMemo, useState } from 'react';
import type { NationalActivityWindow } from '../data/nationalActivities2026';
import type { GenerationSeed, ScoutBranch } from '../types';
import {
  buildNationalActivitySeed,
  cadernoPageUrl,
  fichasForCampaignAndBranch,
} from '../utils/nationalActivities';

interface Props {
  activity: NationalActivityWindow;
  branch: ScoutBranch;
  meetingDate: string;
  onCancel: () => void;
  onConfirm: (seed: GenerationSeed) => void;
}

export const NationalFichaSeedDialog: React.FC<Props> = ({
  activity,
  branch,
  meetingDate,
  onCancel,
  onConfirm,
}) => {
  const fichas = useMemo(
    () => fichasForCampaignAndBranch(activity.title, branch),
    [activity.title, branch],
  );
  const [picked, setPicked] = useState<string[]>(() => fichas.map(ficha => ficha.title));
  const [error, setError] = useState<string | null>(null);

  const toggle = (title: string, checked: boolean) => {
    setPicked(prev => checked ? [...prev, title] : prev.filter(item => item !== title));
  };

  const handleConfirm = () => {
    const chosen = fichas.filter(ficha => picked.includes(ficha.title));
    if (fichas.length > 0 && chosen.length === 0) {
      setError('Escolha ao menos uma ficha desta campanha.');
      return;
    }
    onConfirm(buildNationalActivitySeed({
      activity,
      meetingDate,
      fichas: chosen,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800">Usar no planejamento</h3>
          <p className="text-xs text-slate-600 mt-1">
            {activity.title} · {meetingDate.split('-').reverse().join('/')} · só esta seção
          </p>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {fichas.length === 0 ? (
            <p className="text-sm text-slate-600">
              Esta campanha não tem fichas no caderno (ex.: JOTA). O Gerar abre com o tema e o link oficial.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Marque a(s) ficha(s) deste ramo. O Gerar já recebe o passo a passo oficial.
              </p>
              {fichas.map(ficha => (
                <label
                  key={ficha.title}
                  className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${
                    picked.includes(ficha.title) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={picked.includes(ficha.title)}
                    onChange={e => toggle(ficha.title, e.target.checked)}
                    className="w-4 h-4 mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{ficha.title}</span>
                    <span className="block text-[11px] text-slate-500">
                      {ficha.durationMin} min
                      {ficha.objective ? ` · ${ficha.objective}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </p>
          )}
          <a
            href={cadernoPageUrl(activity.cadernoPage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-bold text-indigo-700 hover:underline"
          >
            Caderno UEB
          </a>
        </div>
        <div className="p-3 border-t flex justify-end gap-2 bg-gray-50">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-600 font-bold">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900"
          >
            Abrir no Gerar
          </button>
        </div>
      </div>
    </div>
  );
};
