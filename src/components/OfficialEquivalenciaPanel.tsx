import React from 'react';
import { ScoutMember } from '../types';
import { UEB_EQUIVALENCIA_CITA, UEB_EQUIVALENCIA_FONTE } from '../data/uebEquivalenciaEscoteiro';
import {
  etapaFromBlocoCount,
  formatOfficialDate,
  hasOfficialLayer,
  listOfficialEtapaTrail,
  listOfficialEtapas,
  listOfficialSpecialties,
  listOtherOfficialEtapas,
  mustKeepOfficialEtapa,
  officialEtapaEscoteiro,
  PAXTU_HISTORICO_AVISO,
} from '../services/equivalenciaService';

interface Props {
  member: ScoutMember;
  concludedBlocos?: number;
  compact?: boolean;
  /** column = trilha Paxtu; strip = resumo no modo só-2025; panel = aviso UEB. */
  variant?: 'panel' | 'column' | 'strip';
}

const EmptyOfficial: React.FC<{ compact?: boolean }> = ({ compact }) => (
  compact ? (
    <span className="text-slate-500">Sem histórico Paxtu neste jovem</span>
  ) : (
    <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      Sem histórico Paxtu neste jovem
    </p>
  )
);

const OfficialTrail: React.FC<{ member: ScoutMember }> = ({ member }) => {
  const trail = listOfficialEtapaTrail(member);
  const outras = listOtherOfficialEtapas(member);
  return (
    <div className="space-y-2">
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {trail.map((item, index) => (
          <li
            key={item.etapa}
            className={`rounded-lg border px-2 py-1.5 ${
              item.conquistado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <div className="text-[9px] uppercase tracking-wide font-bold opacity-70">
              {index + 1}/4
            </div>
            <div className="text-xs font-bold">{item.etapa}</div>
            <div className="text-[10px]">
              {item.conquistado ? (
                <>
                  Conquistado
                  {item.date && (
                    <span className="block text-emerald-800">{formatOfficialDate(item.date)}</span>
                  )}
                </>
              ) : (
                'Pendente'
              )}
            </div>
          </li>
        ))}
      </ol>
      {outras.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Outras etapas</div>
          <ul className="flex flex-wrap gap-1">
            {outras.map(item => (
              <li
                key={item.nome}
                className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-600"
              >
                {item.nome}
                {item.conquistado ? ' · conquistado' : ' · pendente'}
                {item.date ? ` · ${formatOfficialDate(item.date)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const SpecialtyList: React.FC<{ member: ScoutMember }> = ({ member }) => {
  const specialties = listOfficialSpecialties(member);
  if (specialties.length === 0) return null;
  const ativas = specialties.filter(item => (item.nivelOficial ?? 0) >= 1);
  const nivelZero = specialties.filter(item => item.nivelOficial === 0);
  return (
    <div>
      <div className="text-[10px] uppercase font-bold text-amber-900 mb-1">
        Especialidades oficiais
      </div>
      {ativas.length === 0 && nivelZero.length === 0 && (
        <p className="text-[11px] text-slate-500">Nenhuma especialidade no histórico Paxtu.</p>
      )}
      {ativas.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {ativas.map(item => (
            <li
              key={`${item.nome}-${item.nivelOficial || 0}`}
              className="text-[11px] bg-white border border-amber-200 rounded px-2 py-0.5"
            >
              {item.nome}
              {item.nivelOficial ? ` · N${item.nivelOficial}` : ''}
              {item.nivel2025 ? (
                <span className="text-amber-800"> → N{item.nivel2025} (2025+)</span>
              ) : null}
              {item.date ? (
                <span className="text-slate-500"> · {formatOfficialDate(item.date)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {nivelZero.length > 0 && (
        <ul className="flex flex-wrap gap-1 mt-1">
          {nivelZero.map(item => (
            <li
              key={`${item.nome}-0`}
              className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded px-2 py-0.5"
            >
              {item.nome} · N0
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const OfficialEquivalenciaPanel: React.FC<Props> = ({
  member,
  concludedBlocos,
  compact = false,
  variant,
}) => {
  const mode = variant || (compact ? 'strip' : 'panel');
  const hasOfficial = hasOfficialLayer(member);
  const oficial = officialEtapaEscoteiro(member);
  const etapas = listOfficialEtapas(member);
  const porEtapa = concludedBlocos === undefined ? null : etapaFromBlocoCount(concludedBlocos);
  const keep = concludedBlocos === undefined
    ? false
    : mustKeepOfficialEtapa(member.official, porEtapa);
  const specialties = listOfficialSpecialties(member);
  const especialidadesAtivas = specialties.filter(item => (item.nivelOficial ?? 0) >= 1).length;

  if (mode === 'strip') {
    return (
      <div className="text-[11px] text-slate-700 px-3 py-1.5 bg-amber-50 border-b border-amber-200">
        <span className="font-bold text-amber-950">Oficial (Paxtu):</span>{' '}
        {hasOfficial ? (
          <>
            {oficial || 'etapa não informada'}
            {etapas.length > 1 && <span className="text-slate-600"> ({etapas.join(' → ')})</span>}
            {' · '}
            {especialidadesAtivas} especialidade(s) N1+
            {keep && (
              <span className="ml-1 text-amber-800 font-bold">· manter etapa oficial</span>
            )}
          </>
        ) : (
          <EmptyOfficial compact />
        )}
      </div>
    );
  }

  if (mode === 'column') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3 h-fit">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-900">
            Oficial (Paxtu / POR antigo)
          </div>
          <p className="text-sm font-bold text-amber-950">
            Etapa oficial: {hasOfficial ? (oficial || 'não informada') : '—'}
          </p>
        </div>
        {hasOfficial ? (
          <>
            <OfficialTrail member={member} />
            <SpecialtyList member={member} />
          </>
        ) : (
          <EmptyOfficial />
        )}
        <p className="text-[10px] text-amber-900 leading-relaxed">{PAXTU_HISTORICO_AVISO}</p>
      </div>
    );
  }

  if (!hasOfficial) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-900">
            Oficial (Paxtu / POR antigo)
          </div>
          <p className="text-sm font-bold text-amber-950">
            Etapa oficial: {oficial || 'não informada'}
            {etapas.length > 1 && (
              <span className="font-normal"> ({etapas.join(' → ')})</span>
            )}
            {porEtapa && concludedBlocos !== undefined && (
              <span className="font-normal text-amber-800">
                {' '}· POR 2025+ pelos blocos: {porEtapa} ({concludedBlocos}/18)
              </span>
            )}
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
      <OfficialTrail member={member} />
      {keep && (
        <div className="bg-amber-100 border border-amber-400 rounded p-2 text-xs text-amber-950">
          A etapa oficial (<strong>{oficial}</strong>) está à frente da contagem de blocos.
          O ScoutsAuto <strong>mantém o distintivo oficial</strong> e sugere um plano de
          acompanhamento nos blocos abaixo — a chefia confirma cada crédito. A etapa oficial
          nunca é rebaixada automaticamente.
        </div>
      )}
      <SpecialtyList member={member} />
      <p className="text-[10px] text-amber-800">{PAXTU_HISTORICO_AVISO}</p>
    </div>
  );
};
