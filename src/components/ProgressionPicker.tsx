import React, { useId } from 'react';
import { ObjectiveItem } from '../types';

interface Props {
  value: string;
  objectives: ObjectiveItem[];
  onChange: (value: string) => void;
}

/** Campo compacto para vincular uma atividade à progressão ou especialidade. */
export const ProgressionPicker: React.FC<Props> = ({ value, objectives, onChange }) => {
  const listId = useId();
  const choices = objectives
    .map(item => `${item.code ? `${item.code} — ` : ''}${item.description}`)
    .filter(Boolean);

  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase text-slate-500">Referência da progressão</span>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Código e descrição, quando houver"
        className="mt-1 w-full rounded-lg border bg-white p-2 text-xs outline-none focus:border-indigo-400"
      />
      <datalist id={listId}>
        {choices.map(choice => <option key={choice} value={choice} />)}
      </datalist>
      <span className="mt-1 block text-[10px] text-slate-400">
        Use uma referência real. Deixe vazio quando a atividade não trabalhar progressão.
      </span>
    </label>
  );
};
