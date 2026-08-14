import React, { useEffect, useState } from 'react';
import { ScoutSection, UserProfile } from '../../types';
import { getSectionsAsync, DATA_EVENTS } from '../../services/storageService';
import { getRoleLabel } from '../../services/roleService';
import { PasswordField } from '../PasswordField';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  GroupPerson,
  WEB_ROLE_OPTIONS,
  approvePendingPerson,
  countActiveAdmins,
  deletePersonAccess,
  inviteGroupPerson,
  listGroupPeople,
  rejectPendingPerson,
  sendPersonPasswordReset,
  setPersonActive,
  updatePersonProfile,
} from '../../services/firebase/groupAuth';
import { GroupBackupPanel } from './GroupBackupPanel';
import { SectionPackPanel } from './SectionPackPanel';

interface Props {
  currentAccountId?: string;
  isAdmin: boolean;
  isGroupAdmin?: boolean;
  currentUser?: UserProfile | null;
  currentSection?: ScoutSection | null;
}

const formatRequestedAt = (date?: Date | null): string => {
  if (!date) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const PendingRequestCard: React.FC<{
  person: GroupPerson;
  sections: ScoutSection[];
  onOk: (message: string) => void;
  onErr: (err: unknown) => void;
  onDone: () => Promise<void>;
}> = ({ person, sections, onOk, onErr, onDone }) => {
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');

  useEffect(() => {
    if (!sectionId && sections[0]) setSectionId(sections[0].id);
  }, [sections, sectionId]);

  const uid = person.uid || '';

  return (
    <div className="border border-amber-300 rounded-lg p-3 bg-amber-50 flex flex-col gap-2">
      <div>
        <p className="font-bold text-slate-800">{person.displayName}</p>
        <p className="text-xs text-slate-600">
          {person.email}
          {person.requestedAt ? ` · pedido em ${formatRequestedAt(person.requestedAt)}` : ''}
          {person.rejected ? ' · recusado' : ' · aguardando liberação'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="text-xs p-1 border rounded bg-white" value={role} onChange={e => setRole(e.target.value)}>
          {WEB_ROLE_OPTIONS.map(item => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          className="text-xs p-1 border rounded bg-white"
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
        <button
          type="button"
          className="text-xs font-bold px-3 py-1 bg-green-700 text-white rounded"
          onClick={() => {
            approvePendingPerson(uid, {
              role,
              sectionIds: role === 'ADMINISTRADOR' ? [] : [sectionId],
            })
              .then(() => onDone())
              .then(() => onOk(`${person.displayName} liberado(a).`))
              .catch(onErr);
          }}
        >
          Liberar
        </button>
        {!person.rejected && (
          <button
            type="button"
            className="text-xs font-bold px-3 py-1 bg-white text-red-700 border border-red-300 rounded"
            onClick={() => {
              rejectPendingPerson(uid)
                .then(() => onDone())
                .then(() => onOk(`${person.displayName} recusado(a).`))
                .catch(onErr);
            }}
          >
            Recusar
          </button>
        )}
      </div>
    </div>
  );
};

export const WebAccountsPanel: React.FC<Props> = ({
  currentAccountId,
  isAdmin,
  isGroupAdmin,
  currentUser,
  currentSection,
}) => {
  const [people, setPeople] = useState<GroupPerson[]>([]);
  const [sections, setSections] = useState<ScoutSection[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Chefe de Seção');
  const [sectionId, setSectionId] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [personToDelete, setPersonToDelete] = useState<GroupPerson | null>(null);

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

  const pendingRequests = people.filter(person => person.awaitingApproval);
  const rejectedRequests = people.filter(person => person.rejected && !person.awaitingApproval);
  const members = people.filter(person => !person.awaitingApproval && !person.rejected);

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-[11px] text-sky-950 leading-relaxed">
        Quem tem o link do site cria a própria conta (Google ou e-mail e senha). Os pedidos aparecem abaixo para você
        <strong> Liberar</strong> (seção + papel) ou <strong> Recusar</strong>.
        Convite prévio continua opcional — não é mais obrigatório cadastrar cada e-mail antes.
      </div>

      {isAdmin && (
        <>
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800">Pedidos de acesso</h4>
            {pendingRequests.length === 0 && (
              <p className="text-xs text-slate-500">Nenhum pedido aguardando liberação.</p>
            )}
            {pendingRequests.map(person => (
              <PendingRequestCard
                key={person.uid || person.email}
                person={person}
                sections={sections}
                onOk={showOk}
                onErr={showErr}
                onDone={refresh}
              />
            ))}
            {rejectedRequests.length > 0 && (
              <>
                <h5 className="font-bold text-xs text-slate-600 pt-2">Recusados</h5>
                {rejectedRequests.map(person => (
                  <PendingRequestCard
                    key={person.uid || person.email}
                    person={person}
                    sections={sections}
                    onOk={showOk}
                    onErr={showErr}
                    onDone={refresh}
                  />
                ))}
              </>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-sm text-slate-800 mb-2">Convite opcional</h4>
            <p className="text-[11px] text-slate-500 mb-2">
              Só se quiser liberar alguém de antemão. O caminho normal é a pessoa se cadastrar e você aprovar o pedido.
            </p>
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
                Convidar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800">Pessoas com acesso</h4>
            {members.map(person => (
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
                      className="text-xs font-bold text-slate-700"
                      onClick={() => {
                        if (editingEmail === person.email) {
                          setEditingEmail(null);
                          return;
                        }
                        setEditingEmail(person.email);
                        setEditName(person.displayName);
                        setEditEmail(person.email);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-indigo-700"
                      onClick={() => {
                        sendPersonPasswordReset(person.email)
                          .then(() => showOk(
                            `E-mail do ScoutsAuto enviado para ${person.email}. A pessoa clica no link, escolhe a nova senha e volta a este site para entrar.`,
                          ))
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
                    <button
                      type="button"
                      className="text-xs font-bold text-red-700"
                      onClick={() => setPersonToDelete(person)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                {editingEmail === person.email && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200 rounded">
                    <input
                      placeholder="Nome de exibição"
                      className="p-2 border rounded text-sm"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      className="p-2 border rounded text-sm"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      autoComplete="off"
                    />
                    <div className="flex gap-2 md:col-span-2">
                      <button
                        type="button"
                        className="text-xs font-bold px-3 py-1 bg-blue-600 text-white rounded"
                        onClick={() => {
                          updatePersonProfile(person.email, {
                            displayName: editName,
                            email: editEmail,
                          })
                            .then(result => {
                              setEditingEmail(null);
                              return refresh().then(() => result);
                            })
                            .then(result => {
                              showOk(
                                result.authEmailUnchanged
                                  ? 'Perfil atualizado. Se a pessoa já entrou, o login do Firebase continua no e-mail antigo. Para trocar o login, exclua e convide de novo neste e-mail.'
                                  : 'Perfil atualizado.',
                              );
                            })
                            .catch(showErr);
                        }}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold px-3 py-1 bg-white border rounded"
                        onClick={() => setEditingEmail(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
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

      <GroupBackupPanel enabled={!!isGroupAdmin} />
      <SectionPackPanel
        user={currentUser}
        currentSection={currentSection}
        sections={sections}
      />

      {!isAdmin && (
        <p className="text-xs text-slate-600">Só o administrador libera, recusa, edita e exclui acessos.</p>
      )}

      {feedback && <p className="text-xs text-green-700 font-bold">{feedback}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      {personToDelete && (
        <ConfirmDialog
          title="Excluir acesso"
          message={`Excluir o acesso de ${personToDelete.displayName} (${personToDelete.email})? Some do ScoutsAuto. Desativar só bloqueia; isto apaga o perfil. A conta Google/Firebase pode continuar existindo e não entra mais no app.`}
          confirmText="Excluir"
          danger
          onCancel={() => setPersonToDelete(null)}
          onConfirm={() => {
            const target = personToDelete;
            setPersonToDelete(null);
            deletePersonAccess(target.email)
              .then(() => refresh())
              .then(() => showOk(`Acesso de ${target.displayName} excluído.`))
              .catch(showErr);
          }}
        />
      )}
    </div>
  );
};
