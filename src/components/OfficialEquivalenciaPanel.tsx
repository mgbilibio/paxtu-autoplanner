import React from 'react';
import { ScoutMember } from '../types';
import { UEB_EQUIVALENCIA_CITA, UEB_EQUIVALENCIA_FONTE } from '../data/uebEquivalenciaEscoteiro';
import {
  etapaFromBlocoCount,
  hasOfficialLayer,
  listOfficialSpecialties,
  mustKeepOfficialEtapa,
  officialEtapaEscoteiro,
} from '../services/equivalenciaService';

interface Props {
  member: ScoutMember;
  concludedBlocos?: number;
  compact?: boolean;
}

export const OfficialEquivalenciaPanel: React.FC<Props> = ({
  member,
  concludedBlocos = 0,
  compact = false,
}) => {
  if (!hasOfficialLayer(member)) return null;

  const oficial = officialEtapaEscoteiro(member);
  const porEtapa = etapaFromBlocoCount(concludedBlocos);
  const keep = mustKeepOfficialEtapa(member, concludedBlocos);
  const specialties = listOfficialSpecialties(member);

  if (compact) {
    return (
      <div className="text-[11px] text-slate-600">
        <span className="font-bold text-slate-700">Oficial UEB:</span>{' '}
        {oficial || 'etapa não informada'}
        {specialties.length > 0 && (
          <> · {specialties.length} especialidade(s)</>
        )}
        {keep && (
          <span className="ml-1 text-amber-800 font-bold">· manter etapa oficial</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-900">
            Camada oficial (UEB)
          </div>
          <p className="text-sm font-bold text-amber-950">
            Etapa oficial: {oficial || 'não informada'}
            <span className="font-normal text-amber-800">
              {' '}· POR 2025+ pelos blocos: {porEtapa} ({concludedBlocos}/18)
            </span>
          </p>
        </div>
        <a
          href={UEB_EQUIVALENCIA_FONTE}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-amber-900 underline"
        >
          {UEB_EQUIVALENCIA_CITA}
        </a>
      </div>
      {keep && (
        <div className="bg-amber-100 border border-amber-400 rounded p-2 text-xs text-amber-950">
          A etapa oficial (<strong>{oficial}</strong>) está à frente da contagem de blocos.
          O ScoutsAuto <strong>mantém o distintivo oficial</strong> e sugere um plano de
          acompanhamento nos blocos abaixo — a chefia confirma cada crédito. A etapa oficial
          nunca é rebaixada automaticamente.
        </div>
      )}
      {specialties.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-bold text-amber-900 mb-1">
            Especialidades oficiais
          </div>
          <ul className="flex flex-wrap gap-1">
            {specialties.map(item => (
              <li
                key={`${item.nome}-${item.nivelOficial || 0}`}
                className="text-[11px] bg-white border border-amber-200 rounded px-2 py-0.5"
              >
                {item.nome}
                {item.nivelOficial ? ` · N${item.nivelOficial}` : ''}
                {item.nivel2025 ? (
                  <span className="text-amber-800"> → N{item.nivel2025} (2025+)</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[10px] text-amber-800">
        Histórico oficial só leitura. Sugestões de equivalência não fecham blocos nem apagam
        itens antigos.
      </p>
    </div>
  );
};
