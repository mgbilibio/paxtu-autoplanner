import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { PasswordField } from '../PasswordField';
import {
  FIREBASE_SETUP_MESSAGE,
  getFirebasePublicConfig,
  isFirebaseConfigured,
  isXLoginEnabled,
} from '../../services/firebase/config';
import {
  consumeFirebaseAuthError,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithX,
} from '../../services/firebase/auth';

interface Props {
  onAuthenticated: (profile: UserProfile) => void;
}

export const WebAuthGate: React.FC<Props> = ({ onAuthenticated }) => {
  const configured = isFirebaseConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(() => consumeFirebaseAuthError());
  const [busy, setBusy] = useState(false);
  const xOn = isXLoginEnabled();

  useEffect(() => {
    const leftover = consumeFirebaseAuthError();
    if (leftover) setError(leftover);
  }, []);

  if (!configured) {
    const { missing } = getFirebasePublicConfig();
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-800 border border-amber-700 rounded-2xl p-8 text-white">
          <div className="text-center mb-4">
            <div className="text-5xl mb-3">⚜️</div>
            <h1 className="text-2xl font-bold">Firebase ainda não configurado</h1>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{FIREBASE_SETUP_MESSAGE}</p>
          {missing.length > 0 && (
            <p className="text-[11px] text-amber-200 mt-4 font-mono">
              Faltando: {missing.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  const finish = async (action: () => Promise<UserProfile>) => {
    setError(null);
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

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-white animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚜️</div>
          <h1 className="text-2xl font-bold">Paxtu AutoPlanner</h1>
          <p className="text-slate-400 text-sm mt-2">
            Entre com a conta do grupo. Quem ainda não foi cadastrado pelo administrador não entra.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void finish(signInWithGoogle)}
          className="w-full py-3 mb-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 disabled:opacity-50"
        >
          Continuar com Google
        </button>

        {xOn && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish(signInWithX)}
            className="w-full py-3 mb-3 bg-black text-white border border-slate-500 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50"
          >
            Continuar com X
          </button>
        )}

        <p className="text-center text-[11px] uppercase tracking-wide text-slate-500 my-4">ou e-mail e senha</p>

        <form
          onSubmit={event => {
            event.preventDefault();
            void finish(() => signInWithEmailPassword(email, password));
          }}
        >
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1" htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            required
            disabled={busy}
          />
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1" htmlFor="login-password">Senha</label>
          <div className="mb-4">
            <PasswordField
              id="login-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </div>
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
          Não há cadastro público. O administrador do grupo cadastra o e-mail, a seção (tropa/alcateia) e o papel.
          A primeira pessoa a entrar, se ainda não houver administrador, vira admin do grupo (uma vez).
        </p>
      </div>
    </div>
  );
};
