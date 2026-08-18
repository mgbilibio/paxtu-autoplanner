import React, { useMemo, useState } from 'react';
import { CalendarEvent, GenerationSeed, ScoutBranch, ScoutSection } from '../types';
import type { NationalActivityWindow } from '../data/nationalActivities2026';
import {
  buildNationalActivityEvent,
  buildNationalActivitySeed,
  cadernoPageUrl,
  FICHA_HINT_TO_GENERATE,
  fichasForCampaignAndBranch,
  formatOfficialWindow,
  isDateInOfficialWindow,
  MISSING_SECTION_DATE_ERROR,
  nationalActivitiesForBranch,
  nationalActivityAlreadyOnSection,
  OUTSIDE_WINDOW_WARNING,
  pickSeedAfterInclude,
  selectNationalActivitiesToInclude,
} from '../utils/nationalActivities';
import { resolveSectionBranch } from '../services/firebase/sectionKind';
import { deleteCalendarEventAsync, saveCalendarEventAsync } from '../services/storageService';
import { emitProcessDone, emitProcessProgress } from '../services/processFeedbackService';
import { ConfirmDialog } from './ConfirmDialog';
import { NationalFichaSeedDialog } from './NationalFichaSeedDialog';

interface Props {
  events: CalendarEvent[];
  sections: ScoutSection[];
  writeSectionId: string;
  fallbackBranch: ScoutBranch;
  isAdmin?: boolean;
  onWriteSectionChange?: (sectionId: string) => void;
  onChanged: () => void;
  onUseInPlanner?: (seed: GenerationSeed, branch: ScoutBranch) => void;
}

export const NationalActivitiesPanel: React.FC<Props> = ({
  events,
  sections,
  writeSectionId,
  fallbackBranch,
  isAdmin,
  onWriteSectionChange,
  onChanged,
  onUseInPlanner,
}) => {
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [chosenDates, setChosenDates] = useState<Record<string, string>>({});
  const [selectedFichas, setSelectedFichas] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [excludeTarget, setExcludeTarget] = useState<CalendarEvent | null>(null);
  const [seedTarget, setSeedTarget] = useState<{
    activity: NationalActivityWindow;
    meetingDate: string;
  } | null>(null);

  const writeSection = sections.find(section => section.id === writeSectionId);
  const writeBranch = resolveSectionBranch(writeSection, fallbackBranch);
  const catalog = useMemo(() => nationalActivitiesForBranch(writeBranch), [writeBranch]);

  const rows = catalog.map(activity => ({
    activity,
    existing: writeSectionId
      ? nationalActivityAlreadyOnSection(events, writeSectionId, activity)
      : undefined,
  }));

  const dateOf = (title: string, existingDate?: string) =>
    chosenDates[title] ?? existingDate ?? '';

  const toggleTitle = (title: string, checked: boolean) => {
    setSelectedTitles(prev => checked ? [...prev, title] : prev.filter(item => item !== title));
    if (!checked) {
      setSelectedFichas(prev => {
        const next = { ...prev };
        delete next[title];
        return next;
      });
    }
  };

  const toggleFicha = (campaignTitle: string, fichaTitle: string, checked: boolean) => {
    setSelectedFichas(prev => {
      const current = prev[campaignTitle] ?? [];
      return {
        ...prev,
        [campaignTitle]: checked
          ? [...current, fichaTitle]
          : current.filter(item => item !== fichaTitle),
      };
    });
  };

  const handleDateChange = async (
    activity: NationalActivityWindow,
    existing: CalendarEvent | undefined,
    value: string,
  ) => {
    setChosenDates(prev => ({ ...prev, [activity.title]: value }));
    if (!existing || !value || !writeSectionId) return;
    setBusy(true);
    setError(null);
    try {
      await saveCalendarEventAsync({ ...existing, date: value });
      setFeedback('Data desta seção atualizada.');
      onChanged();
    } catch {
      setError('Não foi possível atualizar a data. A seção pode estar em modo consulta.');
    } finally {
      setBusy(false);
    }
  };

  const handleInclude = async () => {
    if (!writeSectionId) {
      setError('Selecione uma seção.');
      return;
    }
    const chosen = catalog.filter(item => selectedTitles.includes(item.title));
    const missingDate = chosen.some(item => !dateOf(item.title));
    if (missingDate) {
      setError(MISSING_SECTION_DATE_ERROR);
      return;
    }
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
        const day = dateOf(activity.title);
        await saveCalendarEventAsync(
          buildNationalActivityEvent(activity, writeSectionId, writeBranch, day),
        );
      }
      const pick = pickSeedAfterInclude(toAdd, writeBranch, selectedFichas);
      setSelectedTitles([]);
      setSelectedFichas({});
      if (pick.kind === 'seed' && onUseInPlanner) {
        setFeedback(`${toAdd.length} atividade(s) incluída(s) nesta seção.`);
        emitProcessDone('Atividades nacionais incluídas na agenda da seção.');
        onChanged();
        onUseInPlanner(buildNationalActivitySeed({
          activity: pick.activity,
          meetingDate: dateOf(pick.activity.title),
          fichas: pick.fichas,
        }), writeBranch);
      } else if (pick.kind === 'hint') {
        setFeedback(`${toAdd.length} atividade(s) incluída(s) nesta seção. ${FICHA_HINT_TO_GENERATE}`);
        emitProcessDone('Atividades nacionais incluídas na agenda da seção.');
        onChanged();
      } else {
        setFeedback(`${toAdd.length} atividade(s) incluída(s) nesta seção.`);
        emitProcessDone('Atividades nacionais incluídas na agenda da seção.');
        onChanged();
      }
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

  const openPlanner = (activity: NationalActivityWindow, existing?: CalendarEvent) => {
    const meetingDate = dateOf(activity.title, existing?.date);
    if (!meetingDate) {
      setError(MISSING_SECTION_DATE_ERROR);
      return;
    }
    setError(null);
    setSeedTarget({ activity, meetingDate });
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
      {seedTarget && onUseInPlanner && (
        <NationalFichaSeedDialog
          activity={seedTarget.activity}
          branch={writeBranch}
          meetingDate={seedTarget.meetingDate}
          onCancel={() => setSeedTarget(null)}
          onConfirm={seed => {
            setSeedTarget(null);
            onUseInPlanner(seed, writeBranch);
          }}
        />
      )}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="text-lg font-bold text-gray-800">Atividades nacionais 2026</h3>
        <p className="text-sm text-slate-500 mt-1">
          Marque a campanha, o dia e a ficha. Incluir grava nesta seção e carrega o Gerar.
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
            const day = dateOf(activity.title, existing?.date);
            const outside = Boolean(day) && !isDateInOfficialWindow(day, activity.start, activity.end);
            const fixed = activity.datePolicy === 'fixed';
            const rowFichas = fichasForCampaignAndBranch(activity.title, writeBranch);
            const marked = selectedFichas[activity.title] ?? [];
            return (
              <li key={activity.title} className="flex flex-col gap-2 px-3 py-3 bg-white sm:flex-row sm:items-start">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={included || busy}
                  onChange={e => toggleTitle(activity.title, e.target.checked)}
                  className="w-4 h-4 text-slate-800 rounded shrink-0 mt-1"
                  aria-label={activity.title}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                  <p className="text-xs text-slate-500">
                    Janela oficial: {formatOfficialWindow(activity.start, activity.end)}
                  </p>
                  <label className="block">
                    <span className="sr-only">Dia desta seção para {activity.title}</span>
                    <input
                      type="date"
                      value={day}
                      min={fixed ? activity.start : undefined}
                      max={fixed ? activity.end : undefined}
                      disabled={busy}
                      onChange={e => { void handleDateChange(activity, existing, e.target.value); }}
                      className="p-1.5 border border-slate-300 rounded text-xs bg-white outline-none"
                      aria-label={`Dia desta seção: ${activity.title}`}
                    />
                  </label>
                  {outside && !fixed && (
                    <p className="text-[11px] text-amber-800">{OUTSIDE_WINDOW_WARNING}</p>
                  )}
                  <a
                    href={cadernoPageUrl(activity.cadernoPage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-bold text-indigo-700 hover:underline"
                  >
                    Caderno UEB
                  </a>
                  {checked && !included && (
                    rowFichas.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Sem ficha neste ramo. Incluir abre o Gerar com o tema e o caderno.
                      </p>
                    ) : (
                      <div className="space-y-1 pt-1">
                        <p className="text-[11px] text-slate-500">
                          Marque a ficha para carregar no Gerar ao incluir.
                        </p>
                        {rowFichas.map(ficha => (
                          <label
                            key={ficha.title}
                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${
                              marked.includes(ficha.title)
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={marked.includes(ficha.title)}
                              disabled={busy}
                              onChange={e => toggleFicha(activity.title, ficha.title, e.target.checked)}
                              className="w-4 h-4 mt-0.5 shrink-0"
                              aria-label={ficha.title}
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-800">{ficha.title}</span>
                              <span className="block text-[11px] text-slate-500">
                                {ficha.durationMin} min
                                {ficha.objective ? ` · ${ficha.objective}` : ''}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )
                  )}
                </div>
                {included ? (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Incluída
                    </span>
                    {onUseInPlanner && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openPlanner(activity, existing)}
                        className="text-xs font-bold text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded"
                      >
                        Usar no planejamento
                      </button>
                    )}
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
