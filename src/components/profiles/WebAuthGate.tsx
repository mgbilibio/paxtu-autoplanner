import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { PasswordField } from '../PasswordField';
import {
  BACKEND_NOT_CONFIGURED_MESSAGE,
  isFirebaseConfigured,
  isXSignInEnabled,
  MIN_PASSWORD_LENGTH,
  registerWithEmailPassword,
  sendPersonPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithX,
} from '../../services/firebase/groupAuth';

interface Props {
  onAuthenticated: (profile: UserProfile) => void;
}

export const WebAuthGate: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isFirebaseConfigured();
  const xOn = isXSignInEnabled();
  const registering = mode === 'criar';

  const run = async (action: () => Promise<UserProfile>) => {
    setError(null);
    setInfo(null);
    if (!configured) {
      setError(BACKEND_NOT_CONFIGURED_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const profile = await action();
      onAuthenticated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : (registering ? 'Falha no cadastro.' : 'Falha no login.'));
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (registering) {
      await run(() => registerWithEmailPassword(email, password, displayName));
      return;
    }
    await run(() => signInWithEmailPassword(email, password));
  };

  const sendReset = async () => {
    setError(null);
    setInfo(null);
    if (!configured) {
      setError(BACKEND_NOT_CONFIGURED_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      await sendPersonPasswordReset(email);
      setInfo('Você vai receber um e-mail do ScoutsAuto. Clique no link, escolha a nova senha e volte a este site para entrar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a redefinição.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-white animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚜️</div>
          <h1 className="text-2xl font-bold">ScoutsAuto</h1>
          <p className="text-slate-400 text-sm mt-2">
            {registering
              ? 'Crie sua conta. O administrador libera o acesso à tropa ou alcateia.'
              : 'Entre com o seu e-mail para usar o planejador do grupo.'}
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

        <p className="text-center text-[11px] uppercase tracking-wide text-slate-500 my-4">
          ou e-mail e senha
        </p>

        <form onSubmit={submitEmail}>
          {registering && (
            <>
              <label htmlFor="web-login-name" className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Nome de exibição
              </label>
              <input
                id="web-login-name"
                type="text"
                className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="name"
                required
              />
            </>
          )}
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
            autoComplete={registering ? 'new-password' : 'current-password'}
            minLength={registering ? MIN_PASSWORD_LENGTH : undefined}
            required
          />
          {error && <p role="alert" className="text-sm text-red-300 mb-3">{error}</p>}
          {info && <p role="status" className="text-sm text-emerald-300 mb-3">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-bold"
          >
            {busy
              ? (registering ? 'Criando conta…' : 'Entrando…')
              : (registering ? 'Criar conta' : 'Entrar')}
          </button>
        </form>

        {!registering && (
          <button
            type="button"
            disabled={busy}
            className="w-full mt-3 text-sm text-sky-300 hover:text-sky-200 disabled:opacity-50"
            onClick={() => { void sendReset(); }}
          >
            Esqueci a senha
          </button>
        )}

        <button
          type="button"
          className="w-full mt-3 text-sm text-sky-300 hover:text-sky-200"
          onClick={() => {
            setError(null);
            setInfo(null);
            setMode(registering ? 'entrar' : 'criar');
          }}
        >
          {registering ? 'Já tenho conta? Entrar' : 'Primeiro acesso? Criar conta'}
        </button>

        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          Qualquer pessoa com o link pode entrar ou criar conta (Google ou e-mail e senha).
          Até o administrador liberar, você não vê a tropa nem a alcateia.
          Use o e-mail pessoal (Gmail, Google Workspace, @escoteiros ou outro).
        </p>
      </div>
    </div>
  );
};
