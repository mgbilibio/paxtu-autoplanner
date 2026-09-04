import React, { useEffect, useRef, useState } from 'react';
import {
  pollXaiDeviceAuthorization,
  startXaiDeviceAuthorization,
} from '../services/xaiOAuthDevice';
import {
  missingXaiProxyMessage,
  probeXaiProxy,
} from '../services/xaiOAuthConfig';
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
  const [proxyAlert, setProxyAlert] = useState(status.proxyConfigured ? '' : missingXaiProxyMessage());
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

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
  }, [status.proxyConfigured]);

  const beginLogin = async (): Promise<void> => {
    if (!status.proxyConfigured) {
      setMessage(missingXaiProxyMessage());
      return;
    }
    stopPolling();
    setBusy(true);
    setMessage('Iniciando autorização…');
    const authWindow = window.open('about:blank', '_blank');
    try {
      const authorization = await startXaiDeviceAuthorization();
      setUserCode(authorization.userCode);
      setAuthorizationUrl(authorization.verificationUrl);
      setMessage('Autorize o ScoutsAuto na página da xAI.');
      if (authWindow) authWindow.location.replace(authorization.verificationUrl);
      const deadline = Date.now() + authorization.expiresIn * 1000;
      const poll = async (): Promise<void> => {
        if (Date.now() >= deadline) {
          setBusy(false);
          setMessage('O código expirou. Clique em Entrar novamente.');
          return;
        }
        try {
          const result = await pollXaiDeviceAuthorization(authorization.deviceCode);
          setMessage(result.message);
          if (result.status === 'authorized') {
            setBusy(false);
            setUserCode('');
            setAuthorizationUrl('');
            setStatus(getXaiBrowserStatus());
            onConnected?.();
            return;
          }
          if (!['pending', 'slow_down'].includes(result.status)) {
            setBusy(false);
            return;
          }
        } catch (error: unknown) {
          setBusy(false);
          setMessage(error instanceof Error ? error.message : String(error));
          return;
        }
        pollTimer.current = setTimeout(poll, authorization.interval * 1000);
      };
      pollTimer.current = setTimeout(poll, authorization.interval * 1000);
    } catch (error: unknown) {
      authWindow?.close();
      setBusy(false);
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const logout = (): void => {
    stopPolling();
    clearXaiBrowserSession();
    setStatus(getXaiBrowserStatus());
    setUserCode('');
    setAuthorizationUrl('');
    setMessage('Sessão xAI removida deste navegador.');
  };

  const blocked = !status.proxyConfigured;

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
      {message && <p className={blocked ? 'text-[11px] font-bold text-amber-950' : 'text-[11px] text-indigo-900'} role={blocked ? 'alert' : undefined}>{message}</p>}
      <p className="text-[10px] text-indigo-700">
        Access e refresh tokens ficam somente nesta sessão do navegador (sessionStorage); nunca vão para o Firestore nem para o repositório. O Client ID do Device OAuth é público; não há client secret neste app.
      </p>
    </div>
  );
};
