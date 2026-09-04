import React, { useState } from 'react';
import { Activity, ObjectiveItem } from '../types';
import { ProgressionPicker } from './ProgressionPicker';

interface Props {
  activity: Activity;
  index: number;
  objectives: ObjectiveItem[];
  onChange: (patch: Partial<Activity>) => void;
}

const joinLines = (items?: string[]): string => (items || []).join('\n');

const splitLines = (value: string): string[] => value
  .split(/\r?\n|;/)
  .map(item => item.trim())
  .filter(Boolean);

/** Editor de uma atividade com o essencial visível e detalhes avançados recolhidos. */
export const ActivityEditor: React.FC<Props> = ({ activity, index, objectives, onChange }) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const missing = [
    !activity.title.trim() ? 'nome' : '',
    !activity.description.trim() ? 'descrição detalhada' : '',
    !(activity.materials || []).length ? 'materiais' : '',
  ].filter(Boolean);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
            Atividade {index + 1}
          </p>
          <p className="text-xs text-slate-500">Preencha o suficiente para outra pessoa conseguir aplicar.</p>
        </div>
        {missing.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
            Falta: {missing.join(', ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block md:col-span-2">
          <span className="text-[10px] font-bold uppercase text-slate-500">Nome</span>
          <input
            value={activity.title}
            onChange={event => onChange({ title: event.target.value })}
            className="mt-1 w-full rounded-lg border p-2 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase text-slate-500">Responsável</span>
          <input
            value={activity.responsible || ''}
            onChange={event => onChange({ responsible: event.target.value })}
            placeholder="Chefia ou patrulha"
            className="mt-1 w-full rounded-lg border p-2 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="block md:col-span-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">Objetivo curto</span>
          <input
            value={activity.objetivoEspecifico || ''}
            onChange={event => onChange({ objetivoEspecifico: event.target.value })}
            placeholder="O que os jovens devem praticar ou alcançar"
            className="mt-1 w-full rounded-lg border p-2 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="block md:col-span-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">Descrição detalhada — como fazer</span>
          <textarea
            value={activity.description}
            onChange={event => onChange({ description: event.target.value })}
            placeholder="Explique preparação, formação, regras, desenvolvimento e encerramento."
            rows={5}
            className="mt-1 w-full rounded-lg border p-2 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <label className="block md:col-span-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">Materiais — um por linha</span>
          <textarea
            value={joinLines(activity.materials)}
            onChange={event => onChange({ materials: splitLines(event.target.value) })}
            placeholder="Cordas\nCartões impressos\nCanetas"
            rows={3}
            className="mt-1 w-full rounded-lg border p-2 text-xs outline-none focus:border-indigo-400"
          />
        </label>
        <div className="md:col-span-3">
          <ProgressionPicker
            value={activity.progressionObjective || ''}
            objectives={objectives}
            onChange={progressionObjective => onChange({ progressionObjective })}
          />
        </div>
        <label className="block md:col-span-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">Informações adicionais para a chefia</span>
          <textarea
            value={activity.instrucaoChefia || ''}
            onChange={event => onChange({ instrucaoChefia: event.target.value })}
            placeholder="Divisão de tarefas, adaptações, alertas e observações práticas."
            rows={3}
            className="mt-1 w-full rounded-lg border p-2 text-xs outline-none focus:border-indigo-400"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen(open => !open)}
        className="mt-3 text-xs font-bold text-slate-500 hover:text-indigo-700"
        aria-expanded={advancedOpen}
      >
        {advancedOpen ? '− Ocultar detalhes opcionais' : '+ Mostrar detalhes opcionais'}
      </button>

      {advancedOpen && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-slate-500">Preparação prévia</span>
            <textarea
              value={joinLines(activity.preparacaoPrevia)}
              onChange={event => onChange({ preparacaoPrevia: splitLines(event.target.value) })}
              rows={3}
              className="mt-1 w-full rounded-lg border bg-white p-2 text-xs"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-slate-500">Segurança, se aplicável</span>
            <textarea
              value={activity.safetyNotes || ''}
              onChange={event => onChange({ safetyNotes: event.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border bg-white p-2 text-xs"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-500">Referência de manual ou ficha</span>
            <input
              value={activity.manualReferencia || ''}
              onChange={event => onChange({ manualReferencia: event.target.value })}
              placeholder="Documento, seção e página — não inventar"
              className="mt-1 w-full rounded-lg border bg-white p-2 text-xs"
            />
          </label>
        </div>
      )}
    </article>
  );
};
