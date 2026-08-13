import React, { useEffect, useState } from 'react';
import { ScoutSection } from '../../types';
import { getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import {
  disableCloudUser,
  disableInvite,
  getCachedCloudUser,
  listCloudUsers,
  listInvites,
  upsertInvite,
} from '../../services/firebase/firestore';
import { CloudInviteDoc, CloudUserDoc } from '../../services/firebase/types';
import { mapInviteRole, sendPasswordReset } from '../../services/firebase/auth';
import { DATA_EVENTS as EVENTS } from '../../services/storage/events';

interface Props {
  currentAccountId?: string;
  isAdmin: boolean;
}

const ROLE_OPTIONS = [
  { value: 'Chefe de Seção', label: 'Chefe' },
  { value: 'Assistente', label: 'Assistente' },
  { value: 'Diretoria', label: 'Diretoria' },
  { value: 'Leitura/Auditoria', label: 'Leitura' },
  { value: 'ADMINISTRADOR', label: 'ADMINISTRADOR' },
];

export const WebAccountsPanel: React.FC<Props> = ({ currentAccountId, isAdmin }) => {
  const [users, setUsers] = useState<Array<CloudUserDoc & { id: string }>>([]);
  const [invites, setInvites] = useState<Array<CloudInviteDoc & { id: string }>>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState('');

  const refresh = async () => {
    if (!isAdmin) return;
    const [sectionData, cloudUsers, cloudInvites] = await Promise.all([
      getSectionsAsync(),
      listCloudUsers(),
      listInvites(),
    ]);
    setSections(sectionData);
    setUsers(cloudUsers);
    setInvites(cloudInvites);
    setSectionId(prev => {
      if (sectionData.length === 0) return '';
      if (!prev || !sectionData.find(item => item.id === prev)) return sectionData[0].id;
      return prev;
    });
  };

  useEffect(() => {
    void refresh();
    const onUpdate = () => { void refresh(); };
    window.addEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
    window.addEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    return () => {
      window.removeEventListener(DATA_EVENTS.SECTIONS_UPDATED, onUpdate);
      window.removeEventListener(DATA_EVENTS.USERS_UPDATED, onUpdate);
    };
  }, [isAdmin]);

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
      const trimmedEmail = email.trim().toLowerCase();
      const name = displayName.trim();
      if (!trimmedEmail || !trimmedEmail.includes('@')) throw new Error('Informe um e-mail válido.');
      if (!name) throw new Error('Informe o nome de exibição.');
      const mapped = mapInviteRole(role);
      if (!mapped.isAdmin && !sectionId) throw new Error('Escolha a seção (tropa/alcateia).');
      const creator = getCachedCloudUser();
      const invite: CloudInviteDoc = {
        email: trimmedEmail,
        displayName: name,
        role: mapped.role,
        sectionIds: mapped.isAdmin ? [] : [sectionId],
        isAdmin: mapped.isAdmin,
        active: true,
        createdAt: new Date().toISOString(),
        createdByUid: creator?.id || currentAccountId || '',
      };
      await upsertInvite(invite);
      setEmail('');
      setDisplayName('');
      showOk(`Cadastro liberado para ${trimmedEmail}. A pessoa entra com Google, X ou e-mail e senha.`);
      window.dispatchEvent(new Event(EVENTS.USERS_UPDATED));
      await refresh();
    } catch (err) {
      showErr(err);
    }
  };

  if (!isAdmin) {
    return (
      <p className="text-sm text-slate-600">
        Só o administrador do grupo cadastra chefes e assistentes. Peça a quem administra o Paxtu.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-900 leading-relaxed">
        Contas ficam no Firebase (Auth + Firestore), compartilhadas entre aparelhos. Não há cadastro público:
        só e-mails que você cadastrar entram. A pessoa usa Google, X (se estiver ativo) ou e-mail e senha no primeiro acesso.
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-bold text-sm text-slate-800 mb-2">Cadastrar escotista</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input placeholder="Nome de exibição" className="p-2 border rounded" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <input type="email" placeholder="E-mail" className="p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />
          <select className="p-2 border rounded bg-white" value={role} onChange={e => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className="p-2 border rounded bg-white" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={role === 'ADMINISTRADOR'}>
            {sections.length === 0 && <option value="">Crie uma seção primeiro</option>}
            {sections.map(section => (
              <option key={section.id} value={section.id}>{section.name} ({section.branch})</option>
            ))}
          </select>
          <button type="button" onClick={() => void handleCreate()} className="p-2 bg-blue-600 text-white rounded font-bold md:col-span-2">
            Cadastrar e-mail
          </button>
        </div>
      </div>

      {feedback && <p className="text-sm text-green-700">{feedback}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div>
        <h4 className="font-bold text-sm text-slate-800 mb-2">Quem já entrou</h4>
        <ul className="space-y-2">
          {users.map(user => (
            <li key={user.id} className="border rounded p-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">{user.displayName}</p>
                <p className="text-[11px] text-slate-500">{user.email} · {user.isAdmin ? 'ADMINISTRADOR' : user.role}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded bg-slate-200"
                  onClick={() => void sendPasswordReset(user.email).then(() => showOk(`E-mail de redefinição enviado a ${user.email}.`)).catch(showErr)}
                >
                  Redefinir senha
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 text-xs rounded text-white ${user.active ? 'bg-amber-700' : 'bg-emerald-700'}`}
                  onClick={() => void disableCloudUser(user.id, !user.active).then(() => refresh()).catch(showErr)}
                >
                  {user.active ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </li>
          ))}
          {users.length === 0 && <li className="text-[11px] text-slate-500">Ninguém entrou ainda além do administrador atual.</li>}
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-sm text-slate-800 mb-2">Convites (ainda não entraram)</h4>
        <ul className="space-y-2">
          {invites.filter(invite => !users.some(user => user.email === invite.email)).map(invite => (
            <li key={invite.id} className="border rounded p-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">{invite.displayName}</p>
                <p className="text-[11px] text-slate-500">{invite.email} · {invite.isAdmin ? 'ADMINISTRADOR' : invite.role} · {invite.active ? 'ativo' : 'desativado'}</p>
              </div>
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded text-white ${invite.active ? 'bg-amber-700' : 'bg-emerald-700'}`}
                onClick={() => void disableInvite(invite.email, !invite.active).then(() => refresh()).catch(showErr)}
              >
                {invite.active ? 'Desativar' : 'Reativar'}
              </button>
            </li>
          ))}
          {invites.filter(invite => !users.some(user => user.email === invite.email)).length === 0 && (
            <li className="text-[11px] text-slate-500">Nenhum convite pendente.</li>
          )}
        </ul>
      </div>
    </div>
  );
};
