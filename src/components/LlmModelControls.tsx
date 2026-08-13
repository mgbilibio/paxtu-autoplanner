import React from 'react';
import { LlmProviderId } from '../types';
import { normalizeProviderId, GEMINI_USAGE_URL, XAI_USAGE_URL } from '../services/llmProvider';
import { geminiModelLabel } from '../services/geminiService';

interface Props {
  provider: LlmProviderId;
  models: string[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  selectId?: string;
}

const quotaHref = (provider: LlmProviderId): string | null => {
  const id = normalizeProviderId(provider);
  if (id === 'gemini') return GEMINI_USAGE_URL;
  if (id === 'xai-oauth') return XAI_USAGE_URL;
  return null;
};

/** Seletor de modelo + atalho de cota (Gemini AI Studio / xAI Console). Mesmo UI na web e no desktop. */
export const LlmModelControls: React.FC<Props> = ({
  provider,
  models,
  value,
  onChange,
  compact = false,
  refreshing = false,
  onRefresh,
  selectId = 'model-select',
}) => {
  const providerId = normalizeProviderId(provider);
  const usageUrl = quotaHref(providerId);
  const selectClass = compact
    ? 'bg-transparent text-white text-xs outline-none border-none max-w-[220px]'
    : 'flex-1 min-w-[12rem] p-2 border rounded text-sm';
  const optionClass = compact ? 'text-black' : undefined;
  const emptyLabel = compact ? 'Nenhum modelo — configure a IA' : 'Nenhum modelo disponível';

  return (
    <div className={compact ? 'flex gap-2 items-center flex-wrap' : 'space-y-2'}>
      <label htmlFor={selectId} className={compact ? 'text-white text-xs font-bold' : 'text-xs font-bold text-slate-700 block'}>
        Modelo
      </label>
      <div className="flex gap-2 items-center flex-wrap">
      <select
        id={selectId}
        value={models.includes(value) ? value : (models[0] || '')}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {models.length === 0 && <option value="" className={optionClass}>{emptyLabel}</option>}
        {models.map(id => (
          <option key={id} value={id} className={optionClass}>
            {providerId === 'gemini' ? geminiModelLabel(id) : id}
          </option>
        ))}
      </select>
      {usageUrl && (
        <a
          href={usageUrl}
          target="_blank"
          rel="noopener"
          className={compact
            ? 'text-amber-200 hover:text-white text-[10px] font-bold underline whitespace-nowrap'
            : 'inline-block bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded font-bold text-[11px] whitespace-nowrap'}
        >
          Ver cota / uso
        </a>
      )}
      {compact && refreshing && <span className="text-white text-xs animate-spin" aria-hidden="true">⟳</span>}
      {compact && onRefresh && (
        <button type="button" onClick={onRefresh} aria-label="Recarregar modelos" className="text-white text-xs">🔄</button>
      )}
      </div>
    </div>
  );
};
