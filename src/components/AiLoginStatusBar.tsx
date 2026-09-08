import React from 'react';
import { useAiLoginStatus } from '../hooks/useAiLoginStatus';
import type { AiLoginState } from '../services/aiLoginStatus';
import type { LlmProviderId } from '../types';

interface Props {
  onOpenProvider: (id: Extract<LlmProviderId, 'gemini' | 'xai-oauth'>) => void;
  variant?: 'dark' | 'light';
}

const Pill: React.FC<{
  state: AiLoginState;
  provider: 'gemini' | 'xai-oauth';
  variant: 'dark' | 'light';
  onOpen: () => void;
}> = ({ state, provider, variant, onOpen }) => {
  const online = state.online;
  const dark = variant === 'dark';
  return (
    <button
      type="button"
      onClick={onOpen}
      title={state.detail}
      aria-label={`${state.label}: ${state.detail}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        online
          ? dark
            ? 'border-green-700 bg-green-900/40 text-green-300'
            : 'border-green-300 bg-green-50 text-green-800'
          : dark
            ? 'border-red-700 bg-red-900/40 text-red-300'
            : 'border-red-300 bg-red-50 text-red-800'
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-500'}`}
        aria-hidden="true"
      />
      <span>{state.label}</span>
      <span>{online ? 'online' : 'offline'}</span>
    </button>
  );
};

export const AiLoginStatusBar: React.FC<Props> = ({ onOpenProvider, variant = 'dark' }) => {
  const { gemini, grok } = useAiLoginStatus();
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="status"
      aria-live="polite"
    >
      <Pill state={gemini} provider="gemini" variant={variant} onOpen={() => onOpenProvider('gemini')} />
      <Pill state={grok} provider="xai-oauth" variant={variant} onOpen={() => onOpenProvider('xai-oauth')} />
    </div>
  );
};
