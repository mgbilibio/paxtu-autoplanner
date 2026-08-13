import React, { useEffect, useState } from 'react';
import { ScoutSection } from '../../types';
import { getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import { getRoleLabel, USER_ROLES } from '../../services/roleService';
import {
  WebAccount,
  assignableWebRoles,
  countAdmins,
  createWebAccount,
  exportWebAccounts,
  importWebAccounts,
  listWebAccounts,
  resetWebAccountPassword,
  setWebAccountDisabled,
  updateWebAccountProfile,
} from '../../services/webAuthService';
import { saveUserAsync } from '../../services/storageService';

interface Props {
  currentAccountId?: string;
  isAdmin: boolean;
}

const downloadJson = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const WebAccountsPanel: React.FC<Props> = ({ currentAccountId, isAdmin }) => {
  const [accounts, setAccounts] = useState<WebAccount[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState('');

  const [ownCurrent, setOwnCurrent] = useState('');
  const [ownNext, setOwnNext] = useState('');
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const refresh = async () => {
    setAccounts(listWebAccounts());
    const sectionData = await getSectionsAsync();
    setSections(sectionData);
    setSectionId(prev => {
      if (sectionData.length === 0) return '';
      if (!prev || !sectionData.find(item => item.id === prev)) return sectionData[0].id;
      return prev;
    });
  };

  useEffect(() => {
    refresh();
    const onUpdate = () => { void refresh(); };
    window.addEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    return () => {
      window.removeEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    };
  }, []);

  const showOk = (message: string) => {
    setError(null);
    setFeedback(message);
  };
  const showErr = (err: unknown) => {
    setFeedback(null);
    setError(err instanceof Error ? err.message : 'Operação recusada.');
  };

  const handleCreate = async () => {
    try {
      const account = await createWebAccount({
        username,
        password,
        displayName,
        role,
        sectionId: role === 'ADMINISTRADOR' ? 'ADMIN_GLOBAL' : sectionId,
      });
      await saveUserAsync({
        id: account.id,
        name: account.displayName,
        role: account.role,
        sectionId: account.sectionId,
      });
      setDisplayName('');
      setUsername('');
      setPassword('');
      showOk(`Conta ${account.username} criada.`);
      await refresh();
    } catch (err) {
      showErr(err);
    }
  };

  const handleOwnPassword = async () => {
    if (!currentAccountId) return;
    try {
      await resetWebAccountPassword(currentAccountId, ownNext);
      setOwnCurrent('');
      setOwnNext('');
      showOk('Senha atualizada neste navegador.');
    } catch (err) {
      showErr(err);
    }
  };

  const handleReset = async () => {
    if (!resetId) return;
    try {
      await resetWebAccountPassword(resetId, resetPassword);
      setResetId(null);
      setResetPassword('');
      showOk('Senha redefinida.');
    } catch (err) {
      showErr(err);
    }
  };

  const handleExport = () => {
    downloadJson(`paxtu_contas_web_${new Date().toISOString().slice(0, 10)}.json`, exportWebAccounts());
    showOk('Lista exportada (hashes, sem senhas em texto).');
  };

  const handleImport = async (file: File, mode: 'replace' | 'merge') => {
    try {
      const parsed = JSON.parse(await file.text());
      const count = importWebAccounts(parsed, mode);
      showOk(mode === 'replace' ? `Diretório substituído: ${count} conta(s).` : `Importadas ${count} conta(s) novas.`);
      await refresh();
    } catch (err) {
      showErr(err);
    }
  };

  const isGoogleAccount = accounts.find(account => account.id === currentAccountId)?.authProvider === 'google';

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 leading-relaxed">
        Contas web ficam neste navegador (localStorage). Exporte o JSON (somente hashes) para levar a outro browser.
        Colaborar no repositório continua no GitHub — aqui só entram escotistas usuários do planejador.
      </div>

      {!isGoogleAccount && (
      <div className="border rounded-lg p-4 bg-slate-50">
        <h4 className="font-bold text-sm text-slate-800 mb-2">Minha senha</h4>
        <div className="flex flex-col md:flex-row gap-2">
          <input type="password" placeholder="Nova senha" className="flex-1 p-2 border rounded" value={ownNext} onChange={e => setOwnNext(e.target.value)} autoComplete="new-password" />
          <input type="password" placeholder="Atual (não verificada além do login)" className="hidden" value={ownCurrent} onChange={e => setOwnCurrent(e.target.value)} />
          <button type="button" onClick={handleOwnPassword} className="px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold">Atualizar senha</button>
        </div>
      </div>
      )}

      {isAdmin && (
        <>
          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-sm text-slate-800 mb-2">Novo escotista usuário</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input placeholder="Nome de exibição" className="p-2 border rounded" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              <input placeholder="Usuário" className="p-2 border rounded" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
              <input type="password" placeholder="Senha inicial" className="p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              <select className="p-2 border rounded bg-white" value={role} onChange={e => setRole(e.target.value)}>
                {assignableWebRoles().map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <select className="p-2 border rounded bg-white" value={sectionId} onChange={e => setSectionId(e.target.value)}>
                {sections.length === 0 && <option value="">Sem seção ainda</option>}
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.name}</option>
                ))}
              </select>
              <button type="button" onClick={handleCreate} className="p-2 bg-blue-600 text-white rounded font-bold">Criar conta</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className="px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold">Exportar contas (JSON)</button>
            <label className="px-3 py-2 bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer">
              Importar (substituir)
              <input type="file" accept="application/json" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleImport(file, 'replace'); e.target.value = ''; }} />
            </label>
            <label className="px-3 py-2 bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer">
              Importar (mesclar)
              <input type="file" accept="application/json" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleImport(file, 'merge'); e.target.value = ''; }} />
            </label>
          </div>

          <div className="space-y-2">
            {accounts.map(account => (
              <div key={account.id} className="border rounded-lg p-3 bg-white flex flex-col gap-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-800">{account.displayName}</p>
                    <p className="text-xs text-slate-500">
                      @{account.username} · {getRoleLabel(account.role)}
                      {account.authProvider === 'google' ? ' · Google' : ''}
                      {account.disabled ? ' · desativada' : ''}
                      {account.id === currentAccountId ? ' · você' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {account.authProvider !== 'google' && (
                    <button
                      type="button"
                      className="text-xs font-bold text-indigo-700"
                      onClick={() => setResetId(account.id)}
                    >
                      Redefinir senha
                    </button>
                    )}
                    <button
                      type="button"
                      className="text-xs font-bold text-amber-800"
                      onClick={() => {
                        try {
                          setWebAccountDisabled(account.id, !account.disabled);
                          void refresh();
                        } catch (err) {
                          showErr(err);
                        }
                      }}
                    >
                      {account.disabled ? 'Reativar' : 'Desativar'}
                    </button>
                  </div>
                </div>
                {account.role !== 'ADMINISTRADOR' && (
                  <select
                    className="text-xs p-1 border rounded bg-white max-w-xs"
                    value={account.role}
                    onChange={e => {
                      try {
                        updateWebAccountProfile(account.id, { role: e.target.value });
                        void saveUserAsync({
                          id: account.id,
                          name: account.displayName,
                          role: e.target.value,
                          sectionId: account.sectionId,
                        });
                        void refresh();
                      } catch (err) {
                        showErr(err);
                      }
                    }}
                  >
                    {USER_ROLES.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                )}
                {resetId === account.id && (
                  <div className="flex gap-2">
                    <input type="password" className="flex-1 p-2 border rounded text-sm" placeholder="Nova senha" value={resetPassword} onChange={e => setResetPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={handleReset} className="px-3 py-1 bg-indigo-700 text-white rounded text-xs font-bold">Salvar</button>
                    <button type="button" onClick={() => { setResetId(null); setResetPassword(''); }} className="text-xs">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-500">{countAdmins(accounts)} administrador(es) ativo(s).</p>
          </div>
        </>
      )}

      {feedback && <p className="text-xs text-green-700 font-bold">{feedback}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
};
