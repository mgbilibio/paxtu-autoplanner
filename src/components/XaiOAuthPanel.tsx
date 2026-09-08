import React, { useEffect, useRef, useState } from 'react';
import {
  pollXaiDeviceAuthorization,
  startXaiDeviceAuthorization,
} from '../services/xaiOAuthDevice';
import {
  describeXaiProxyFailure,
  isUsableXaiProxyOrigin,
  missingXaiProxyMessage,
  probeXaiProxy,
  readXaiProxyOverride,
  resolveXaiProxyOrigin,
  writeXaiProxyOverride,
} from '../services/xaiOAuthConfig';
import { notifyAiLoginChanged } from '../services/aiLoginEvents';
import {
  clearXaiBrowserSession,
  getXaiBrowserStatus,
  XaiBrowserStatus,
} from '../services/xaiOAuthSession';

interface Props {
  onConnected?: () => void;
}

export const XaiOAuthPanel: React.FC<Props> = ({ onConnected }) => {
  const [status, setStatus] = useState<XaiBrowserStatus>(() => getXaiBrowserStatus());
  const [busy, setBusy] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [proxyAlert, setProxyAlert] = useState(status.proxyConfigured ? '' : missingXaiProxyMessage());
  const [proxyDraft, setProxyDraft] = useState(() => readXaiProxyOverride());
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

  const showMessage = (text: string, isError = false): void => {
    setMessage(text);
    setMessageError(isError);
  };

  const refreshStatus = (): XaiBrowserStatus => {
    const next = getXaiBrowserStatus();
    setStatus(next);
    return next;
  };

  const stopPolling = (): void => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = undefined;
  };

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (!status.proxyConfigured) {
      setProxyAlert(missingXaiProxyMessage());
      return;
    }
    let cancelled = false;
    void probeXaiProxy().then(result => {
      if (!cancelled && !result.ok) setProxyAlert(result.message);
      if (!cancelled && result.ok) setProxyAlert('');
    });
    return () => { cancelled = true; };
  }, [status.proxyConfigured, status.message]);

  const applyProxyOverride = (): void => {
    const value = proxyDraft.trim().replace(/\/+$/, '');
    if (value && !isUsableXaiProxyOrigin(value)) {
      showMessage('URL inválida. Cole a URL do Worker Cloudflare (workers.dev), nunca auth.x.ai ou api.x.ai.', true);
      return;
    }
    writeXaiProxyOverride(value);
    setProxyDraft(value);
    const next = refreshStatus();
    notifyAiLoginChanged();
    showMessage(
      next.proxyConfigured
        ? `Proxy xOAuth deste navegador: ${resolveXaiProxyOrigin()}`
        : missingXaiProxyMessage(),
      !next.proxyConfigured,
    );
  };

  const beginLogin = async (): Promise<void> => {
    if (!status.proxyConfigured) {
      showMessage(missingXaiProxyMessage(), true);
      return;
    }
    stopPolling();
    setBusy(true);
    showMessage('Iniciando autorização…', false);
    const authWindow = window.open('about:blank', '_blank');
    try {
      const authorization = await startXaiDeviceAuthorization();
      setUserCode(authorization.userCode);
      setAuthorizationUrl(authorization.verificationUrl);
      showMessage('Autorize o ScoutsAuto na página da xAI.', false);
      if (authWindow) authWindow.location.replace(authorization.verificationUrl);
      const deadline = Date.now() + authorization.expiresIn * 1000;
      const poll = async (): Promise<void> => {
        if (Date.now() >= deadline) {
          setBusy(false);
          showMessage('O código expirou. Clique em Entrar novamente.', true);
          return;
        }
        try {
          const result = await pollXaiDeviceAuthorization(authorization.deviceCode);
          const failed = !['pending', 'slow_down', 'authorized'].includes(result.status);
          showMessage(result.message, failed);
          if (result.status === 'authorized') {
            setBusy(false);
            setUserCode('');
            setAuthorizationUrl('');
            refreshStatus();
            notifyAiLoginChanged();
            onConnected?.();
            return;
          }
          if (failed) {
            setBusy(false);
            return;
          }
        } catch (error: unknown) {
          setBusy(false);
          showMessage(describeXaiProxyFailure(error), true);
          return;
        }
        pollTimer.current = setTimeout(poll, authorization.interval * 1000);
      };
      pollTimer.current = setTimeout(poll, authorization.interval * 1000);
    } catch (error: unknown) {
      authWindow?.close();
      setBusy(false);
      showMessage(describeXaiProxyFailure(error), true);
    }
  };

  const logout = (): void => {
    stopPolling();
    clearXaiBrowserSession();
    refreshStatus();
    notifyAiLoginChanged();
    setUserCode('');
    setAuthorizationUrl('');
    showMessage('Sessão xAI removida deste navegador.', false);
  };

  const blocked = !status.proxyConfigured;
  const resolvedProxy = resolveXaiProxyOrigin();

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-3">
      {(blocked || proxyAlert) && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs font-bold text-amber-950" role="alert">
          {proxyAlert || missingXaiProxyMessage()}
        </p>
      )}
      <p className={`text-xs font-bold ${status.connected ? 'text-green-700' : 'text-indigo-900'}`}>
        {status.message}
      </p>
      <div className="space-y-1">
        <label htmlFor="xai-proxy-url" className="text-[10px] font-bold uppercase text-indigo-800">
          URL do Worker xOAuth (opcional neste navegador)
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="xai-proxy-url"
            type="url"
            value={proxyDraft}
            onChange={(event) => setProxyDraft(event.target.value)}
            placeholder="https://paxtu-xai-proxy.sua-conta.workers.dev"
            className="min-w-[16rem] flex-1 rounded border border-indigo-200 bg-white px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={applyProxyOverride}
            className="rounded border border-indigo-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-indigo-800"
          >
            Usar esta URL
          </button>
        </div>
        <p className="text-[10px] text-indigo-700">
          {resolvedProxy
            ? `Em uso agora: ${resolvedProxy}`
            : 'Sem proxy neste build. Cole a URL do Worker ou rode npm run dev:web.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void beginLogin()} disabled={busy || blocked}
          className="rounded bg-indigo-700 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
          {busy ? 'Aguardando autorização…' : 'Entrar com X / Grok'}
        </button>
        {status.connected && (
          <button type="button" onClick={logout}
            className="rounded border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-700">
            Sair da conta xAI
          </button>
        )}
      </div>
      {userCode && (
        <div className="space-y-2 text-xs text-indigo-900">
          <p>Código: <code className="rounded bg-white px-3 py-1 text-lg font-black tracking-widest">{userCode}</code></p>
          <a href={authorizationUrl} target="_blank" rel="noreferrer" className="font-bold underline">
            Abrir novamente a página de autorização
          </a>
        </div>
      )}
      {message && (
        <p
          className={`text-[11px] font-bold ${messageError || blocked ? 'text-red-700' : 'text-indigo-900'}`}
          role={messageError || blocked ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
      <p className="text-[10px] text-indigo-700">
        Access e refresh tokens ficam somente nesta sessão do navegador (sessionStorage); nunca vão para o Firestore nem para o repositório. O Client ID do Device OAuth é público; não há client secret neste app.
      </p>
    </div>
  );
};
