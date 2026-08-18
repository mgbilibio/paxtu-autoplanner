import React, { useMemo, useState } from 'react';
import { CalendarEvent, ScoutBranch, ScoutSection } from '../types';
import {
  buildNationalActivityEvent,
  formatOfficialWindow,
  nationalActivitiesForBranch,
  nationalActivityAlreadyOnSection,
  selectNationalActivitiesToInclude,
} from '../utils/nationalActivities';
import { resolveSectionBranch } from '../services/firebase/sectionKind';
import { deleteCalendarEventAsync, saveCalendarEventAsync } from '../services/storageService';
import { emitProcessDone, emitProcessProgress } from '../services/processFeedbackService';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  events: CalendarEvent[];
  sections: ScoutSection[];
  writeSectionId: string;
  fallbackBranch: ScoutBranch;
  isAdmin?: boolean;
  onWriteSectionChange?: (sectionId: string) => void;
  onChanged: () => void;
}

export const NationalActivitiesPanel: React.FC<Props> = ({
  events,
  sections,
  writeSectionId,
  fallbackBranch,
  isAdmin,
  onWriteSectionChange,
  onChanged,
}) => {
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [excludeTarget, setExcludeTarget] = useState<CalendarEvent | null>(null);

  const writeSection = sections.find(section => section.id === writeSectionId);
  const writeBranch = resolveSectionBranch(writeSection, fallbackBranch);
  const catalog = useMemo(() => nationalActivitiesForBranch(writeBranch), [writeBranch]);

  const rows = catalog.map(activity => ({
    activity,
    existing: writeSectionId
      ? nationalActivityAlreadyOnSection(events, writeSectionId, activity)
      : undefined,
  }));

  const toggleTitle = (title: string, checked: boolean) => {
    setSelectedTitles(prev => checked ? [...prev, title] : prev.filter(item => item !== title));
  };

  const handleInclude = async () => {
    if (!writeSectionId) {
      setError('Selecione uma seção.');
      return;
    }
    const chosen = catalog.filter(item => selectedTitles.includes(item.title));
    const toAdd = selectNationalActivitiesToInclude(chosen, events, writeSectionId);
    if (toAdd.length === 0) {
      setFeedback('Nada novo para incluir nesta seção.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      emitProcessProgress(`Incluindo ${toAdd.length} atividade(s) nacional(is)...`);
      for (const activity of toAdd) {
        await saveCalendarEventAsync(
          buildNationalActivityEvent(activity, writeSectionId, writeBranch),
        );
      }
      setSelectedTitles([]);
      setFeedback(`${toAdd.length} atividade(s) incluída(s) nesta seção.`);
      emitProcessDone('Atividades nacionais incluídas na agenda da seção.');
      onChanged();
    } catch {
      setError('Não foi possível incluir. A seção pode estar em modo consulta.');
      emitProcessDone('Falha ao incluir atividades nacionais.');
    } finally {
      setBusy(false);
    }
  };

  const handleExclude = async () => {
    if (!excludeTarget) return;
    setBusy(true);
    try {
      emitProcessProgress('Excluindo atividade nacional desta seção...');
      await deleteCalendarEventAsync(excludeTarget.id, excludeTarget.sectionId);
      setFeedback('Atividade excluída só desta seção.');
      emitProcessDone('Atividade nacional removida desta seção.');
      setExcludeTarget(null);
      onChanged();
    } catch {
      setExcludeTarget(null);
      setError('Não foi possível excluir. A seção pode estar em modo consulta.');
      emitProcessDone('Falha ao excluir atividade nacional.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {excludeTarget && (
        <ConfirmDialog
          title="Excluir desta seção"
          message={`Remover «${excludeTarget.title}» só da agenda desta seção? A outra seção mantém a cópia dela.`}
          confirmText="Excluir"
          danger
          onCancel={() => setExcludeTarget(null)}
          onConfirm={handleExclude}
        />
      )}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="text-lg font-bold text-gray-800">Atividades nacionais 2026</h3>
        <p className="text-sm text-slate-500 mt-1">
          Janelas oficiais da UEB. Marque o que esta seção vai cumprir — nada entra sozinho.
        </p>
        {isAdmin && (
          <label className="block mt-3">
            <span className="block text-xs font-bold text-yellow-800 uppercase mb-1">Seção (Admin)</span>
            <select
              value={writeSectionId}
              onChange={e => onWriteSectionChange?.(e.target.value)}
              className="w-full max-w-md p-2 border border-yellow-300 rounded bg-white outline-none"
            >
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name} ({section.branch})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="p-5">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}
        {feedback && (
          <p role="status" className="mb-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {feedback}
          </p>
        )}

        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {rows.map(({ activity, existing }) => {
            const included = !!existing;
            const checked = included || selectedTitles.includes(activity.title);
            return (
              <li key={activity.title} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={included || busy}
                  onChange={e => toggleTitle(activity.title, e.target.checked)}
                  className="w-4 h-4 text-slate-800 rounded shrink-0"
                  aria-label={activity.title}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatOfficialWindow(activity.start, activity.end).replace(' a ', ' – ')}
                  </p>
                </div>
                {included ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Incluída
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setExcludeTarget(existing)}
                      className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      Excluir
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            disabled={busy || selectedTitles.length === 0 || !writeSectionId}
            onClick={handleInclude}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shadow"
          >
            Incluir selecionadas
          </button>
        </div>
      </div>
    </section>
  );
};
