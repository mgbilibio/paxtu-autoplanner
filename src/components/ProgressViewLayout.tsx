import React from 'react';
import { FichaViewMode, writeFichaViewMode } from '../utils/fichaViewMode';

interface ToggleProps {
  mode: FichaViewMode;
  onChange: (mode: FichaViewMode) => void;
}

const OPTIONS: Array<{ id: FichaViewMode; label: string }> = [
  { id: 'oficial', label: 'Oficial (Paxtu)' },
  { id: 'lado-a-lado', label: 'Lado a lado' },
  { id: 'blocos', label: 'Blocos 2025+' },
];

export const FichaViewToggle: React.FC<ToggleProps> = ({ mode, onChange }) => {
  const select = (next: FichaViewMode) => {
    writeFichaViewMode(next);
    onChange(next);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1 p-0.5 bg-white/15 rounded-lg"
      role="tablist"
      aria-label="Modo de visualização da ficha"
    >
      {OPTIONS.map(option => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(option.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
              active
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-white/85 hover:bg-white/10'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

interface LayoutProps {
  mode: FichaViewMode;
  official: React.ReactNode;
  blocos: React.ReactNode;
  strip?: React.ReactNode;
}

export const ProgressViewLayout: React.FC<LayoutProps> = ({
  mode,
  official,
  blocos,
  strip,
}) => (
  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
    {mode === 'blocos' && strip}
    <div
      className={
        mode === 'lado-a-lado'
          ? 'flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 p-2 md:p-3 overflow-y-auto lg:overflow-hidden bg-gray-50'
          : 'flex-1 min-h-0 flex flex-col overflow-hidden bg-gray-50'
      }
    >
      {(mode === 'oficial' || mode === 'lado-a-lado') && (
        <div className="min-h-0 lg:overflow-y-auto p-2 md:p-3">
          {official}
        </div>
      )}
      {(mode === 'blocos' || mode === 'lado-a-lado') && (
        <div className="min-h-0 overflow-y-auto flex-1 p-2 md:p-4 space-y-2">
          {blocos}
        </div>
      )}
    </div>
  </div>
);
