import React, { useEffect, useState } from 'react';

export interface GrokDesktopStatus {
  connected: boolean;
  expiresAt?: string;
  installed?: boolean;
  executable?: string;
  message?: string;
}

interface Props {
  onStatus?: (status: GrokDesktopStatus | null) => void;
}

export const GrokDesktopOAuthPanel: React.FC<Props> = ({ onStatus }) => {
  const [status, setStatus] = useState<GrokDesktopStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async (): Promise<GrokDesktopStatus | null> => {
    const next = await window.fileSystem?.xaiOAuthStatus?.() || null;
    setStatus(next);
    onStatus?.(next);
    return next;
  };

  useEffect(() => {
    void refresh();
  }, []);

  const login = async (): Promise<void> => {
    setBusy(true);
    const result = await window.fileSystem?.xaiOAuthLogin?.();
    if (result?.ok) {
      setMessage(result.message || 'Login Grok iniciado. Conclua a janela do navegador e atualize o status.');
    } else {
      setMessage(result?.error || 'Login Grok não está disponível neste computador.');
    }
    await refresh();
    setBusy(false);
  };

  const missingClient = status?.installed === false;
  const alertText = missingClient
    ? (status?.message || 'Cliente Grok Build não encontrado. O OAuth desktop não funciona sem o binário.')
    : '';

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-2">
      {alertText && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs font-bold text-amber-950" role="alert">
          {alertText}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { void login(); }}
          disabled={busy || !window.fileSystem?.xaiOAuthLogin || missingClient}
          className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {busy ? 'Abrindo Grok…' : 'Entrar com xAI / X (SuperGrok)'}
        </button>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          disabled={!window.fileSystem?.xaiOAuthStatus}
          className="rounded border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 disabled:text-slate-400"
        >
          Atualizar status
        </button>
        <span className={`text-[11px] font-bold ${status?.connected ? 'text-green-700' : 'text-slate-600'}`}>
          {status?.connected ? '✓ Sessão Grok encontrada' : status?.message || 'Sessão não conectada'}
        </span>
      </div>
      {message && <p className="text-[11px] text-indigo-900">{message}</p>}
      <p className="text-[10px] text-indigo-800">
        O login abre o cliente Grok Build e o navegador do sistema. Tokens ficam no processo principal, não neste renderer.
      </p>
    </div>
  );
};
