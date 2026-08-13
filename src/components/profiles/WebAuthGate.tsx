import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { PasswordField } from '../PasswordField';
import {
  BACKEND_NOT_CONFIGURED_MESSAGE,
  isFirebaseConfigured,
  isXSignInEnabled,
  NOT_INVITED_MESSAGE,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithX,
} from '../../services/firebase/groupAuth';

interface Props {
  onAuthenticated: (profile: UserProfile) => void;
}

export const WebAuthGate: React.FC<Props> = ({ onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isFirebaseConfigured();
  const xOn = isXSignInEnabled();

  const run = async (action: () => Promise<UserProfile>) => {
    setError(null);
    if (!configured) {
      setError(BACKEND_NOT_CONFIGURED_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const profile = await action();
      onAuthenticated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(() => signInWithEmailPassword(email, password));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-white animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚜️</div>
          <h1 className="text-2xl font-bold">ScoutsAuto</h1>
          <p className="text-slate-400 text-sm mt-2">
            Entre com o <strong className="text-slate-200">seu e-mail</strong> para usar o planejador do grupo.
          </p>
        </div>

        {!configured && (
          <p role="status" className="text-sm text-amber-200 bg-amber-950/60 border border-amber-800 rounded-lg p-3 mb-5 leading-relaxed">
            {BACKEND_NOT_CONFIGURED_MESSAGE}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => { void run(signInWithGoogle); }}
          className="w-full py-3 mb-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span aria-hidden="true">G</span>
          Continuar com Google
        </button>

        {xOn && (
          <button
            type="button"
            disabled={busy}
            onClick={() => { void run(signInWithX); }}
            className="w-full py-3 mb-3 bg-black text-white border border-slate-600 rounded-lg font-bold hover:bg-slate-950 disabled:opacity-50"
          >
            Continuar com X
          </button>
        )}

        <p className="text-center text-[11px] uppercase tracking-wide text-slate-500 my-4">ou e-mail e senha</p>

        <form onSubmit={submitEmail}>
          <label htmlFor="web-login-email" className="block text-xs font-bold uppercase text-slate-400 mb-1">E-mail</label>
          <input
            id="web-login-email"
            type="email"
            className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
          />
          <PasswordField
            id="web-login-password"
            label="Senha"
            className="w-full mb-4 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p role="alert" className="text-sm text-red-300 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-bold"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          Não há cadastro público. Se você ainda não entra, {NOT_INVITED_MESSAGE.toLowerCase()}
          {' '}Use o e-mail pessoal (Gmail, Google Workspace, @escoteiros ou outro).
          Quem tem conta Google pode continuar com Google; quem não tem usa e-mail e senha.
        </p>
      </div>
    </div>
  );
};
