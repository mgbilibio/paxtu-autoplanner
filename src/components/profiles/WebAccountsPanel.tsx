import React, { useEffect, useState } from 'react';
import { ScoutSection } from '../../types';
import { getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import { getRoleLabel } from '../../services/roleService';
import { PasswordField } from '../PasswordField';
import {
  GroupPerson,
  WEB_ROLE_OPTIONS,
  countActiveAdmins,
  inviteGroupPerson,
  listGroupPeople,
  sendPersonPasswordReset,
  setPersonActive,
  updatePersonProfile,
} from '../../services/firebase/groupAuth';

interface Props {
  currentAccountId?: string;
  isAdmin: boolean;
}

export const WebAccountsPanel: React.FC<Props> = ({ currentAccountId, isAdmin }) => {
  const [people, setPeople] = useState<GroupPerson[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState('');

  const refresh = async () => {
    const [sectionData, groupPeople] = await Promise.all([
      getSectionsAsync(),
      isAdmin ? listGroupPeople() : Promise.resolve([]),
    ]);
    setSections(sectionData);
    setPeople(groupPeople);
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

  const handleInvite = async () => {
    try {
      const person = await inviteGroupPerson({
        email,
        displayName,
        role,
        sectionIds: role === 'ADMINISTRADOR' ? [] : [sectionId],
        password: password.trim() || undefined,
      });
      setDisplayName('');
      setEmail('');
      setPassword('');
      showOk(
        person.uid
          ? `${person.displayName} cadastrado(a) com e-mail e senha. Já pode entrar.`
          : `${person.displayName} cadastrado(a). Quem tem conta Google entra com esse e-mail; senão, e-mail e senha no primeiro acesso.`,
      );
      await refresh();
    } catch (err) {
      showErr(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-[11px] text-sky-950 leading-relaxed">
        Cadastre o <strong>e-mail pessoal</strong> de cada escotista — Gmail, Google Workspace, @escoteiros ou outro domínio.
        Não existe e-mail único do grupo. Quem tem conta Google entra com Google; quem não tem usa e-mail e senha
        (informe uma senha inicial abaixo, ou deixe em branco para a pessoa definir no primeiro acesso).
      </div>

      {isAdmin && (
        <>
          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-sm text-slate-800 mb-2">Cadastrar escotista</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                placeholder="Nome de exibição"
                className="p-2 border rounded"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
              <input
                type="email"
                placeholder="E-mail pessoal"
                className="p-2 border rounded"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="off"
              />
              <PasswordField
                placeholder="Senha inicial (opcional)"
                className="p-2 border rounded w-full"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <select className="p-2 border rounded bg-white" value={role} onChange={e => setRole(e.target.value)}>
                {WEB_ROLE_OPTIONS.map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select
                className="p-2 border rounded bg-white"
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                disabled={role === 'ADMINISTRADOR'}
              >
                {role === 'ADMINISTRADOR' && <option value="">Todas as seções</option>}
                {sections.length === 0 && role !== 'ADMINISTRADOR' && <option value="">Crie uma seção primeiro</option>}
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => { void handleInvite(); }} className="p-2 bg-blue-600 text-white rounded font-bold">
                Cadastrar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {people.map(person => (
              <div key={person.email} className="border rounded-lg p-3 bg-white flex flex-col gap-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-800">{person.displayName}</p>
                    <p className="text-xs text-slate-500">
                      {person.email} · {getRoleLabel(person.role)}
                      {person.pending ? ' · aguardando primeiro acesso' : ''}
                      {person.active ? '' : ' · desativado'}
                      {person.uid && person.uid === currentAccountId ? ' · você' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="text-xs font-bold text-indigo-700"
                      onClick={() => {
                        sendPersonPasswordReset(person.email)
                          .then(() => showOk(`E-mail de redefinição enviado para ${person.email}.`))
                          .catch(showErr);
                      }}
                    >
                      Enviar redefinição de senha
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-amber-800"
                      onClick={() => {
                        setPersonActive(person.email, !person.active)
                          .then(() => refresh())
                          .catch(showErr);
                      }}
                    >
                      {person.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="text-xs p-1 border rounded bg-white max-w-xs"
                    value={getRoleLabel(person.role)}
                    onChange={e => {
                      updatePersonProfile(person.email, { role: e.target.value })
                        .then(() => refresh())
                        .catch(showErr);
                    }}
                  >
                    {WEB_ROLE_OPTIONS.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  {getRoleLabel(person.role) !== 'ADMINISTRADOR' && (
                    <select
                      className="text-xs p-1 border rounded bg-white max-w-xs"
                      value={person.sectionIds[0] || ''}
                      onChange={e => {
                        updatePersonProfile(person.email, { sectionIds: e.target.value ? [e.target.value] : [] })
                          .then(() => refresh())
                          .catch(showErr);
                      }}
                    >
                      {sections.map(section => (
                        <option key={section.id} value={section.id}>{section.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-500">{countActiveAdmins(people)} administrador(es) ativo(s).</p>
          </div>
        </>
      )}

      {!isAdmin && (
        <p className="text-xs text-slate-600">Só o administrador cadastra e desativa acessos.</p>
      )}

      {feedback && <p className="text-xs text-green-700 font-bold">{feedback}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
};
