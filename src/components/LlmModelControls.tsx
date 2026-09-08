import React from 'react';
import { LlmProviderId } from '../types';
import { normalizeProviderId, GEMINI_USAGE_URL, XAI_USAGE_URL, OLLAMA_CLOUD_USAGE_URL } from '../services/llmProvider';
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

function providerFromModel(modelId: string | undefined, provider: LlmProviderId): LlmProviderId {
  const m = (modelId || '').toLowerCase();
  if (m.startsWith('grok') || m.includes('grok-')) return 'xai-oauth';
  if (m.startsWith('gemini') || m.includes('gemini-') || m.startsWith('models/gemini')) return 'gemini';
  return normalizeProviderId(provider);
}

const quotaHref = (provider: LlmProviderId, modelId?: string): string | null => {
  const id = providerFromModel(modelId, provider);
  if (id === 'gemini') return GEMINI_USAGE_URL;
  if (id === 'xai-oauth') return XAI_USAGE_URL;
  if (id === 'ollama-cloud') return OLLAMA_CLOUD_USAGE_URL;
  return null;
};

/** Seletor de modelo + atalho de cota (Gemini AI Studio / xAI Console). */
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
  const usageUrl = quotaHref(providerId, value);
  const selectClass = compact
    ? 'bg-transparent text-white text-xs outline-none border-none max-w-[220px]'
    : 'flex-1 min-w-[12rem] p-2 border rounded text-sm';
  const optionClass = compact ? 'text-black' : undefined;
  const emptyLabel = providerId === 'gemini'
    ? (compact ? 'Flash-Lite (padrão offline)' : 'Gemini Flash-Lite (padrão até carregar o catálogo)')
    : providerId === 'ollama-local'
      ? (compact ? 'Liste os modelos locais' : 'Nenhum modelo local — clique em Listar modelos')
    : providerId === 'ollama-cloud'
      ? (compact ? 'Liste os modelos Cloud' : 'Nenhum modelo Cloud — clique em Listar modelos')
      : (compact ? 'Entre com X/Grok' : 'Entre com X / Grok para listar os modelos');
  const refreshLabel = providerId === 'ollama-local' || providerId === 'ollama-cloud'
    ? (compact ? '🔄' : 'Listar modelos')
    : (compact ? '🔄' : 'Atualizar modelos');

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
          title={
            usageUrl === XAI_USAGE_URL
              ? 'Abre a cota e o uso na conta Grok já logada.'
              : usageUrl === GEMINI_USAGE_URL
                ? 'Abre a cota do Gemini no AI Studio.'
                : 'Abre o uso da conta Ollama Cloud.'
          }
          className={compact
            ? 'text-amber-200 hover:text-white text-[10px] font-bold underline whitespace-nowrap'
            : 'inline-block bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded font-bold text-[11px] whitespace-nowrap'}
        >
          Ver cota / uso
        </a>
      )}
      {refreshing && <span className={compact ? 'text-white text-xs animate-spin' : 'text-slate-600 text-sm animate-spin'} aria-hidden="true">⟳</span>}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={providerId === 'ollama-local' || providerId === 'ollama-cloud' ? 'Listar modelos' : 'Recarregar modelos do provedor'}
          className={compact
            ? 'text-white text-xs disabled:opacity-50'
            : 'rounded border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50'}
        >
          {refreshLabel}
        </button>
      )}
      </div>
    </div>
  );
};
