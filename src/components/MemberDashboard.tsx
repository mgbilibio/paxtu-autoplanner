// U1: Roteador entre BlocoTracker (POR 2025+ / Paxtu lado a lado) e ProgressionMap (legado).
// Caminho principal: BlocoTracker com vista padrão "lado a lado".
// ProgressionMap (itens I22…) só se showLegacy estiver ligado — sem códigos, fica vazio.

import React, { useEffect, useState } from 'react';
import { ScoutMember, ScoutSection, ScoutBranch } from '../types';
import { BlocoTracker } from './BlocoTracker';
import { ProgressionMap } from './ProgressionMap';
import { SpecialtyEncyclopedia } from './SpecialtyEncyclopedia';
import { getAppConfig, hydrateMemberOfficialAsync } from '../services/storageService';
import { isYouthMember } from '../utils/memberQuickAdd';

interface Props {
  member: ScoutMember;
  section?: ScoutSection | null;
  onClose: () => void;
  onPrint: () => void;
}

export const MemberDashboard: React.FC<Props> = ({ member, section, onClose, onPrint }) => {
  const [resolved, setResolved] = useState(member);
  useEffect(() => {
    let cancelled = false;
    setResolved(member);
    hydrateMemberOfficialAsync(member)
      .then(next => { if (!cancelled) setResolved(next); })
      .catch(() => { if (!cancelled) setResolved(member); });
    return () => { cancelled = true; };
  }, [member]);

  const showLegacy = !!getAppConfig()?.showLegacy;
  const sectionSystem = section?.progressionSystem;
  const effectiveSystem = !showLegacy ? 'POR_2025' : (sectionSystem || 'POR_2025');
  const isPor2025 = effectiveSystem === 'POR_2025';
  const isLobOrEsc = resolved.branch === ScoutBranch.LOBINHO || resolved.branch === ScoutBranch.ESCOTEIRO;

  const defaultMode: 'tracker' | 'legacy' = (isPor2025 && isLobOrEsc) ? 'tracker' : 'legacy';
  const [mode, setMode] = useState<'tracker' | 'legacy'>(defaultMode);
  const [showSpecialties, setShowSpecialties] = useState(false);

  if (!isYouthMember(resolved)) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/95 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Sem progressão de jovens</h3>
          <p className="text-sm text-slate-600 mb-4">
            {resolved.name} está cadastrado(a) como <strong>{resolved.role || 'chefia'}</strong>.
            Chefe e Assistente não acompanham blocos/POR de jovens.
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'tracker') {
    return (
      <div
        className="fixed inset-0 z-[60] bg-slate-900/95 overflow-hidden"
        onClick={onClose}
      >
        {showSpecialties && (
          <SpecialtyEncyclopedia
            member={resolved}
            onClose={() => setShowSpecialties(false)}
          />
        )}
        <div
          className="fixed top-0 right-0 bottom-0 left-0 bg-white shadow-2xl overflow-hidden flex flex-col min-h-0 max-w-full max-h-full"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-1 min-h-0">
            <BlocoTracker member={resolved} onClose={onClose} />
          </div>
          <div className="bg-slate-100 border-t px-4 py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs flex-shrink-0">
            <span className="text-slate-500">
              Vista padrão: lado a lado (Paxtu + blocos 2025+). Os blocos não fecham sozinhos.
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowSpecialties(true)}
                className="text-slate-700 hover:text-slate-950 underline font-bold"
              >
                Fichas de especialidades
              </button>
              {showLegacy && (
                <button
                  onClick={() => setMode('legacy')}
                  className="text-slate-600 hover:text-slate-900 underline"
                >
                  Ver mapa legado (POR 2020) →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ProgressionMap member={resolved} section={section} onClose={onClose} onPrint={onPrint} />;
};
