import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../../types';
import { saveUserAsync } from '../../services/storageService';
import {
  createWebAccount,
  hasWebAccounts,
  loginWebAccount,
  loginWithGoogleIdentity,
  webAccountToProfile,
} from '../../services/webAuthService';
import {
  ensureGoogleIdentity,
  isGoogleSignInConfigured,
  renderGoogleSignInButton,
  tryRequestGeminiAccessToken,
  verifyGoogleIdToken,
} from '../../services/googleAuth';

interface Props {
  onAuthenticated: (profile: UserProfile) => void;
}

export const WebAuthGate: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode] = useState<'setup' | 'login'>(() => (hasWebAccounts() ? 'login' : 'setup'));
  if (mode === 'setup') return <FirstUserSetup onAuthenticated={onAuthenticated} />;
  return <WebLoginForm onAuthenticated={onAuthenticated} />;
};

const persistAndEnter = async (
  profile: UserProfile,
  onAuthenticated: (profile: UserProfile) => void,
) => {
  await saveUserAsync(profile);
  onAuthenticated(profile);
};

const finishGoogleCredential = async (
  credential: string,
  onAuthenticated: (profile: UserProfile) => void,
) => {
  const identity = await verifyGoogleIdToken(credential);
  const account = await loginWithGoogleIdentity(identity);
  await persistAndEnter(webAccountToProfile(account), onAuthenticated);
  void tryRequestGeminiAccessToken();
};

const GoogleSignInBlock: React.FC<{
  onAuthenticated: (profile: UserProfile) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}> = ({ onAuthenticated, onError, disabled }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const onAuthenticatedRef = useRef(onAuthenticated);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  onAuthenticatedRef.current = onAuthenticated;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isGoogleSignInConfigured() || disabled) return;
    let cancelled = false;
    const mount = async () => {
      try {
        await ensureGoogleIdentity();
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = '';
        renderGoogleSignInButton(hostRef.current, credential => {
          finishGoogleCredential(credential, onAuthenticatedRef.current).catch(err => {
            onErrorRef.current(err instanceof Error ? err.message : 'Falha no login Google.');
          });
        });
        setReady(true);
      } catch (err) {
        onErrorRef.current(err instanceof Error ? err.message : 'Não foi possível carregar o login Google.');
      }
    };
    void mount();
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  if (!isGoogleSignInConfigured()) return null;

  return (
    <div className="mb-6">
      <p className="text-center text-sm text-slate-300 mb-3">
        Entre com a conta Google do escotista. É o login preferido neste site.
      </p>
      <div ref={hostRef} className="flex justify-center min-h-[44px]" />
      {!ready && <p className="text-center text-[11px] text-slate-500 mt-2">Carregando Google…</p>}
    </div>
  );
};

const FirstUserSetup: React.FC<Props> = ({ onAuthenticated }) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleOn = isGoogleSignInConfigured();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('A confirmação não confere com a senha.');
      return;
    }
    setBusy(true);
    try {
      const account = await createWebAccount({
        username,
        password,
        displayName,
      });
      await persistAndEnter(webAccountToProfile(account), onAuthenticated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-white animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚜️</div>
          <h1 className="text-2xl font-bold">Primeiro acesso</h1>
          <p className="text-slate-400 text-sm mt-2">
            A primeira conta de <strong className="text-slate-200">escotista usuário</strong> neste navegador entra como administrador do planejador.
          </p>
        </div>
        <GoogleSignInBlock onAuthenticated={onAuthenticated} onError={setError} disabled={busy} />
        {googleOn && (
          <p className="text-center text-[11px] uppercase tracking-wide text-slate-500 mb-4">ou crie com usuário e senha</p>
        )}
        <form onSubmit={submit}>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nome de exibição</label>
          <input
            className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            autoComplete="name"
            required
          />
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Usuário</label>
          <input
            className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Senha</label>
          <input
            type="password"
            className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Confirmar senha</label>
          <input
            type="password"
            className="w-full mb-4 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {error && <p role="alert" className="text-sm text-red-300 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-bold"
          >
            {busy ? 'Criando…' : 'Criar administrador e entrar'}
          </button>
        </form>
        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          Colaborar no código do app é pelo GitHub (pull requests para <code>main</code>), não por um segundo tipo de login aqui.
          Contas ficam neste navegador até haver um servidor. Sem Client ID Google configurado, o usuário e senha continuam válidos.
        </p>
      </div>
    </div>
  );
};

const WebLoginForm: React.FC<Props> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleOn = isGoogleSignInConfigured();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const account = await loginWebAccount(username, password);
      await persistAndEnter(webAccountToProfile(account), onAuthenticated);
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
            Entre como <strong className="text-slate-200">escotista usuário</strong> para usar o planejador no navegador.
          </p>
        </div>
        <GoogleSignInBlock onAuthenticated={onAuthenticated} onError={setError} disabled={busy} />
        {googleOn && (
          <p className="text-center text-[11px] uppercase tracking-wide text-slate-500 mb-4">ou usuário e senha</p>
        )}
        <form onSubmit={submit}>
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Usuário</label>
          <input
            className="w-full mb-3 p-3 rounded-lg bg-slate-900 border border-slate-600"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Senha</label>
          <input
            type="password"
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
          Contribuições no código: pull request no GitHub. A sessão permanece nesta aba (atualizar a página mantém o login; sair limpa).
          {!googleOn && ' Login Google fica disponível quando o Client ID público estiver configurado no site.'}
        </p>
      </div>
    </div>
  );
};
