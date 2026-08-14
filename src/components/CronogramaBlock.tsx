import React from 'react';
import { Activity, EducationalArea, MeetingPlan } from '../types';
import {
  BREAK_TITLE,
  CLOSING_TITLE,
  OPENING_TITLE,
  buildDefaultCronograma,
  buildPaperShapedCronograma,
  defaultScheduleOptions,
  ensureScheduleRow,
  formatDateBR,
  formatPaperDuration,
  newActivityUid,
  stampActivities,
} from '../services/meetingScheduleService';

export type RowKind = 'core' | 'fixed' | 'opening' | 'break' | 'closing';

export interface CronogramaHeader {
  unitName?: string;
  meetingDate?: string;
  cycleLabel?: string;
  meetingType?: string;
  theme?: string;
  objectives?: string;
  technicalContent?: string;
}

interface Props {
  header: CronogramaHeader;
  activities: Activity[];
  startTime: string;
  editable?: boolean;
  compact?: boolean;
  onHeaderChange?: (patch: Partial<CronogramaHeader>) => void;
  onStartTimeChange?: (startTime: string) => void;
  onActivitiesChange?: (activities: Activity[]) => void;
  activityCount?: number;
  coreDuration?: number;
}

const rowKind = (activity: Activity): RowKind => {
  if (activity.operationalType === 'opening') return 'opening';
  if (activity.operationalType === 'break') return 'break';
  if (activity.operationalType === 'closing') return 'closing';
  if (activity.isOperational) return 'fixed';
  return 'core';
};

const kindLabel: Record<RowKind, string> = {
  core: 'Miolo (IA)',
  fixed: 'Item fixo',
  opening: 'Abertura',
  break: 'Intervalo',
  closing: 'Encerramento',
};

const kindTone: Record<RowKind, string> = {
  core: 'bg-white',
  fixed: 'bg-amber-50/70',
  opening: 'bg-blue-50/80',
  break: 'bg-cyan-50/80',
  closing: 'bg-indigo-50/80',
};

const applyKind = (activity: Activity, kind: RowKind): Activity => {
  if (kind === 'opening') {
    return {
      ...activity,
      isOperational: true,
      operationalType: 'opening',
      title: activity.title?.trim() && !/^atividade\s+\d+$/i.test(activity.title) ? activity.title : OPENING_TITLE,
    };
  }
  if (kind === 'break') {
    return {
      ...activity,
      isOperational: true,
      operationalType: 'break',
      title: activity.title?.trim() && !/^atividade\s+\d+$/i.test(activity.title) ? activity.title : BREAK_TITLE,
    };
  }
  if (kind === 'closing') {
    return {
      ...activity,
      isOperational: true,
      operationalType: 'closing',
      title: activity.title?.trim() && !/^atividade\s+\d+$/i.test(activity.title) ? activity.title : CLOSING_TITLE,
    };
  }
  if (kind === 'fixed') {
    return { ...activity, isOperational: true, operationalType: undefined };
  }
  return { ...activity, isOperational: false, operationalType: undefined };
};

const blankRow = (kind: RowKind = 'core'): Activity => ensureScheduleRow(applyKind({
  _uid: newActivityUid(),
  title: kind === 'break' ? BREAK_TITLE : 'Novo item',
  durationMinutes: kind === 'break' ? defaultScheduleOptions.breakMinutes : 15,
  educationalArea: EducationalArea.CARATER,
  description: '',
  materials: [],
  progressionObjective: '',
  responsible: '',
}, kind));

export const CronogramaBlock: React.FC<Props> = ({
  header,
  activities,
  startTime,
  editable = false,
  compact = false,
  onHeaderChange,
  onStartTimeChange,
  onActivitiesChange,
  activityCount = 3,
  coreDuration = 90,
}) => {
  const emitActivities = (next: Activity[], clock = startTime) => {
    const normalized = next.map((row, i) => ensureScheduleRow(applyKind(row, rowKind(row)), i));
    onActivitiesChange?.(stampActivities(normalized, clock || defaultScheduleOptions.startTime));
  };

  const updateRow = (index: number, patch: Partial<Activity>) => {
    const next = activities.map((row, i) => (i === index ? { ...row, ...patch } : row));
    emitActivities(next);
  };

  const changeKind = (index: number, kind: RowKind) => {
    emitActivities(activities.map((row, i) => (i === index ? applyKind(row, kind) : row)));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= activities.length) return;
    const next = [...activities];
    [next[index], next[target]] = [next[target], next[index]];
    emitActivities(next);
  };

  const removeRow = (index: number) => {
    if (activities.length <= 1) return;
    emitActivities(activities.filter((_, i) => i !== index));
  };

  const addRow = () => {
    emitActivities([...activities, blankRow()]);
  };

  const changeStart = (value: string) => {
    const clock = value || defaultScheduleOptions.startTime;
    onStartTimeChange?.(clock);
    emitActivities(activities, clock);
  };

  const applySimpleModel = () => {
    const options = { ...defaultScheduleOptions, startTime };
    emitActivities(buildDefaultCronograma(activityCount, coreDuration, options), startTime);
  };

  const applyPaperModel = () => {
    const options = { ...defaultScheduleOptions, startTime };
    emitActivities(buildPaperShapedCronograma(activityCount, options), startTime);
  };

  const fieldClass = compact
    ? 'w-full p-1.5 border rounded-lg text-[11px] bg-white outline-none'
    : 'w-full p-2 border rounded-lg text-sm bg-white outline-none';

  return (
    <section className={`rounded-xl border border-slate-200 bg-white min-w-0 ${compact ? 'p-3' : 'p-5'} print:border-slate-400 print:shadow-none`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">ScoutsAuto</p>
          <h3 className={`font-black text-slate-800 uppercase tracking-wide ${compact ? 'text-sm' : 'text-lg'}`}>
            Programação de reunião semanal
          </h3>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-1 no-print">
            <button
              type="button"
              onClick={applySimpleModel}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="IBEAGU, atividades de miolo, intervalos e IBOAGUCL"
            >
              Modelo simples
            </button>
            <button
              type="button"
              onClick={applyPaperModel}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              title="Esqueleto no formato do formulário de papel, sem nomes de jovens"
            >
              Sugerir programação
            </button>
          </div>
        )}
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} mb-3`}>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Unidade</span>
          <div className={`${fieldClass} bg-slate-50 font-bold text-slate-800`}>{header.unitName || '—'}</div>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Início da reunião</span>
          {editable ? (
            <input type="time" value={startTime} onChange={e => changeStart(e.target.value)} className={fieldClass} />
          ) : (
            <div className={`${fieldClass} bg-slate-50 font-bold`}>{startTime || '—'}</div>
          )}
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Data</span>
          {editable ? (
            <input
              type="date"
              value={header.meetingDate || ''}
              onChange={e => onHeaderChange?.({ meetingDate: e.target.value })}
              className={fieldClass}
            />
          ) : (
            <div className={`${fieldClass} bg-slate-50`}>{formatDateBR(header.meetingDate) || '—'}</div>
          )}
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Ciclo</span>
          {editable ? (
            <input
              type="text"
              value={header.cycleLabel || ''}
              onChange={e => onHeaderChange?.({ cycleLabel: e.target.value })}
              placeholder="02/2026"
              className={fieldClass}
            />
          ) : (
            <div className={`${fieldClass} bg-slate-50`}>{header.cycleLabel || '—'}</div>
          )}
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Reunião (tipo)</span>
          {editable ? (
            <input
              type="text"
              value={header.meetingType || ''}
              onChange={e => onHeaderChange?.({ meetingType: e.target.value })}
              placeholder="Normal"
              className={fieldClass}
            />
          ) : (
            <div className={`${fieldClass} bg-slate-50`}>{header.meetingType || '—'}</div>
          )}
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Tema da reunião</span>
          {editable ? (
            <input
              type="text"
              value={header.theme || ''}
              onChange={e => onHeaderChange?.({ theme: e.target.value })}
              placeholder="Tema da reunião"
              className={fieldClass}
            />
          ) : (
            <div className={`${fieldClass} bg-slate-50`}>{header.theme || '—'}</div>
          )}
        </label>
        <label className={`block ${compact ? '' : 'md:col-span-2'}`}>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Objetivos da reunião</span>
          {editable ? (
            <textarea
              value={header.objectives || ''}
              onChange={e => onHeaderChange?.({ objectives: e.target.value })}
              rows={compact ? 2 : 3}
              className={fieldClass}
            />
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-line mt-1">{header.objectives || '—'}</p>
          )}
        </label>
        <label className={`block ${compact ? '' : 'md:col-span-2'}`}>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Conteúdo técnico</span>
          {editable ? (
            <textarea
              value={header.technicalContent || ''}
              onChange={e => onHeaderChange?.({ technicalContent: e.target.value })}
              rows={compact ? 2 : 3}
              className={fieldClass}
            />
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-line mt-1">{header.technicalContent || '—'}</p>
          )}
        </label>
      </div>

      <div className="overflow-x-auto min-w-0">
        <table className="w-full min-w-0 table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
              <th className={`py-2 font-black whitespace-nowrap ${compact ? 'w-[12ch] px-1' : 'w-[13ch] px-2'}`}>Duração</th>
              {editable && <th className={`py-2 font-black ${compact ? 'w-10 px-1' : 'w-14 px-2'}`}>Min</th>}
              <th className={`py-2 font-black w-full min-w-0 ${compact ? 'px-1' : 'px-2'}`}>Itens da reunião</th>
              <th className={`py-2 font-black ${compact ? 'w-[9ch] px-1' : 'w-[10ch] px-2'}`}>Responsável</th>
              {editable && <th className={`py-2 font-black no-print ${compact ? 'w-[7.5rem] px-1' : 'w-28 px-2'}`}>Tipo</th>}
              {editable && <th className={`py-2 font-black no-print ${compact ? 'w-12 px-0.5' : 'w-16 px-2'}`}></th>}
            </tr>
          </thead>
          <tbody>
            {activities.map((row, index) => {
              const kind = rowKind(row);
              const cellPad = compact ? 'px-1 py-1' : 'px-2 py-1.5';
              return (
                <tr key={row._uid || index} className={`border-b border-slate-200 ${kindTone[kind]}`}>
                  <td className={`${cellPad} text-xs font-bold text-slate-800 whitespace-nowrap`}>
                    {formatPaperDuration(row.scheduledStartTime, row.durationMinutes)}
                  </td>
                  {editable && (
                    <td className={cellPad}>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={row.durationMinutes}
                        onChange={e => updateRow(index, { durationMinutes: Math.max(0, Number(e.target.value) || 0) })}
                        className={`${compact ? 'w-9' : 'w-12'} min-w-0 p-1 border rounded text-xs bg-white`}
                      />
                    </td>
                  )}
                  <td className={`${cellPad} min-w-0`}>
                    {editable ? (
                      <input
                        type="text"
                        value={row.title}
                        onChange={e => updateRow(index, { title: e.target.value })}
                        className="w-full min-w-0 p-1 border rounded text-xs bg-white"
                      />
                    ) : (
                      <span className="text-sm text-slate-800 break-words">{row.title}</span>
                    )}
                  </td>
                  <td className={`${cellPad} min-w-0`}>
                    {editable ? (
                      <input
                        type="text"
                        value={row.responsible || ''}
                        onChange={e => updateRow(index, { responsible: e.target.value })}
                        placeholder="Patrulha / chefia"
                        className="w-full min-w-0 p-1 border rounded text-xs bg-white"
                      />
                    ) : (
                      <span className="text-sm text-slate-700 break-words">{row.responsible || '—'}</span>
                    )}
                  </td>
                  {editable && (
                    <td className={`${cellPad} no-print min-w-0`}>
                      <select
                        value={kind}
                        onChange={e => changeKind(index, e.target.value as RowKind)}
                        className="w-full min-w-0 p-1 border rounded text-[10px] bg-white"
                      >
                        {(Object.keys(kindLabel) as RowKind[]).map(k => (
                          <option key={k} value={k}>{kindLabel[k]}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {editable && (
                    <td className={`${cellPad} no-print`}>
                      <div className="flex gap-0.5 justify-end">
                        <button type="button" onClick={() => moveRow(index, -1)} className="px-0.5 text-slate-400 hover:text-slate-700" title="Subir">↑</button>
                        <button type="button" onClick={() => moveRow(index, 1)} className="px-0.5 text-slate-400 hover:text-slate-700" title="Descer">↓</button>
                        <button type="button" onClick={() => removeRow(index)} className="px-0.5 text-red-300 hover:text-red-600" title="Remover">✕</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <button
          type="button"
          onClick={addRow}
          className="mt-2 w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:border-indigo-400 hover:text-indigo-600 no-print"
        >
          + Adicionar item
        </button>
      )}
    </section>
  );
};

export const headerFromPlan = (plan: MeetingPlan): CronogramaHeader => ({
  unitName: plan.unitName,
  meetingDate: plan.meetingDate,
  cycleLabel: plan.cycleLabel,
  meetingType: plan.meetingType,
  theme: plan.theme,
  objectives: plan.objectives,
  technicalContent: plan.technicalContent,
});
