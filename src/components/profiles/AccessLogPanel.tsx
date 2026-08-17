import React, { useEffect, useState } from 'react';
import {
  ACCESS_LOG_EMPTY_MESSAGE,
  APP_TIMEZONE,
  formatDateTimeCuiaba,
  formatDateTimeCuiabaOrDash,
} from '../../services/firebase/accessLogFormat';
import { getRoleLabel } from '../../services/roleService';
import { GroupPerson, listGroupPeople } from '../../services/firebase/groupAuth';

interface Props {
  onClose: () => void;
}

const hasAnyStamp = (person: GroupPerson): boolean =>
  Boolean(person.lastAccessAt || person.lastDataChangeAt || (person.recentAccesses && person.recentAccesses.length > 0));

export const AccessLogPanel: React.FC<Props> = ({ onClose }) => {
  const [people, setPeople] = useState<GroupPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    listGroupPeople()
      .then(rows => {
        if (!cancelled) setPeople(rows);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível ler o log de acessos.');
          setPeople([]);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const accounts = (people || []).filter(person => !person.awaitingApproval);
  const empty = people !== null && !error && !accounts.some(hasAnyStamp);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-log-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={event => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b bg-slate-50 flex justify-between items-start gap-3">
          <div>
            <h3 id="access-log-title" className="text-lg font-bold text-slate-800">Log de acessos</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Horários em {APP_TIMEZONE.replace('_', '/')}. Sem senhas nem tokens.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar log de acessos" className="text-slate-400 hover:text-slate-800 text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {people === null && <p className="text-sm text-slate-500">Carregando contas…</p>}
          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {empty && (
            <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-4">
              {ACCESS_LOG_EMPTY_MESSAGE}
            </p>
          )}
          {!empty && accounts.length > 0 && (
            <ul className="space-y-3">
              {accounts.map(person => {
                const key = person.uid || person.email;
                const recent = person.recentAccesses || [];
                const extra = recent.filter(iso => iso !== person.lastAccessAt);
                const open = openEmail === key;
                return (
                  <li key={key} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800">{person.displayName || '—'}</p>
                        <p className="text-xs text-slate-500">
                          {person.email || 'sem e-mail'}
                          {' · '}
                          {person.active ? getRoleLabel(person.role) : 'desativado'}
                        </p>
                      </div>
                      {extra.length > 0 && (
                        <button
                          type="button"
                          className="text-xs font-bold text-indigo-700 hover:underline"
                          onClick={() => setOpenEmail(open ? null : key)}
                        >
                          {open ? 'Ocultar acessos' : `Últimos ${recent.length} acessos`}
                        </button>
                      )}
                    </div>
                    <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase text-slate-500">Último acesso</dt>
                        <dd className="font-medium text-slate-800">{formatDateTimeCuiabaOrDash(person.lastAccessAt)}</dd>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase text-slate-500">Última alteração nos dados</dt>
                        <dd className="font-medium text-slate-800">{formatDateTimeCuiabaOrDash(person.lastDataChangeAt)}</dd>
                      </div>
                    </dl>
                    {open && extra.length > 0 && (
                      <ol className="mt-3 text-xs text-slate-600 list-decimal pl-5 space-y-1">
                        {recent.map(iso => (
                          <li key={iso}>{formatDateTimeCuiaba(iso)}</li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
