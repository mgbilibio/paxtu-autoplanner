import React, { useState } from 'react';
import { ScoutMember } from '../types';
import { UEB_EQUIVALENCIA_CITA, UEB_EQUIVALENCIA_FONTE } from '../data/uebEquivalenciaEscoteiro';
import {
  etapaFromBlocoCount,
  formatOfficialDate,
  hasOfficialLayer,
  listOfficialCondecoracoes,
  listOfficialConquistas,
  listOfficialEtapaTrail,
  listOfficialEtapas,
  listOfficialSpecialties,
  listOfficialVidaEscoteira,
  listOtherOfficialEtapas,
  mustKeepOfficialEtapa,
  officialEtapaEscoteiro,
  officialStatusLabel,
  PAXTU_HISTORICO_AVISO,
  type OfficialConquistaView,
  type OfficialEtapaItemView,
  type OfficialEtapaOtherItem,
  type OfficialEtapaTrailItem,
  type OfficialSpecialtyView,
  type OfficialVidaRow,
} from '../services/equivalenciaService';

interface Props {
  member: ScoutMember;
  concludedBlocos?: number;
  compact?: boolean;
  /** column = ficha Paxtu; strip = resumo no modo só-2025; panel = aviso UEB. */
  variant?: 'panel' | 'column' | 'strip';
}

const VIDA_PREVIEW = 12;

const EmptyOfficial: React.FC<{ compact?: boolean }> = ({ compact }) => (
  compact ? (
    <span className="text-slate-500">Sem histórico Paxtu neste jovem</span>
  ) : (
    <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      Sem histórico Paxtu neste jovem
    </p>
  )
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] uppercase font-bold tracking-wider text-amber-900 mb-1.5">
    {children}
  </h3>
);

const situacaoClass = (conquistado: boolean) =>
  conquistado ? 'text-emerald-800 font-semibold' : 'text-slate-500';

const EtapaItens: React.FC<{ itens: OfficialEtapaItemView[] }> = ({ itens }) => (
  <ul className="mt-1 space-y-0.5">
    {itens.map((item, index) => (
      <li
        key={`${item.codigo || item.nome}-${index}`}
        className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 text-[11px] text-slate-700"
      >
        <span className="font-mono text-slate-500">{item.codigo || ''}</span>
        <span>{item.nome}</span>
        <span className={situacaoClass(item.conquistado)}>
          {officialStatusLabel(item.status, item.conquistado)}
        </span>
        <span className="tabular-nums text-slate-500">{formatOfficialDate(item.date) || ''}</span>
      </li>
    ))}
  </ul>
);

const EtapaBody: React.FC<{ item: OfficialEtapaTrailItem }> = ({ item }) => {
  const situacao = officialStatusLabel(item.status, item.conquistado);
  const data = formatOfficialDate(item.date);
  return (
    <div className="px-2 pb-2 pt-1 border-t border-amber-100 bg-white/70">
      <p className="text-[11px] text-slate-700">
        {situacao}
        {data ? ` · ${data}` : ''}
      </p>
      {item.itens.length > 0 ? (
        <EtapaItens itens={item.itens} />
      ) : (
        <>
          {item.conquistasRelacionadas.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {item.conquistasRelacionadas.map(conquista => (
                <li key={`${conquista.nome}-${conquista.date || ''}`} className="text-[11px] text-slate-700">
                  {conquista.nome}
                  {conquista.date ? ` · ${formatOfficialDate(conquista.date)}` : ''}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-500 italic mt-1">
            Itens da etapa não vieram na cópia do Paxtu.
          </p>
        </>
      )}
    </div>
  );
};

const ProgressaoEscoteiro: React.FC<{ trail: OfficialEtapaTrailItem[] }> = ({ trail }) => (
  <section>
    <SectionTitle>Progressão — Ramo escoteiro</SectionTitle>
    <div className="rounded-md border border-amber-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[1fr_7rem_6rem] gap-2 px-2 py-1 text-[10px] uppercase font-bold text-slate-500 bg-amber-50/80">
        <span>Etapa</span>
        <span>Situação</span>
        <span>Data</span>
      </div>
      <ol>
        {trail.map(item => (
          <li key={item.etapa} className="border-t border-amber-100">
            <details>
              <summary className="cursor-pointer px-2 py-1.5 hover:bg-amber-50/60">
                <div className="grid grid-cols-[1fr_7rem_6rem] gap-2 items-center text-xs">
                  <span className="font-bold text-amber-950">{item.etapa}</span>
                  <span className={situacaoClass(item.conquistado)}>
                    {officialStatusLabel(item.status, item.conquistado)}
                  </span>
                  <span className="tabular-nums text-slate-600">
                    {formatOfficialDate(item.date) || '—'}
                  </span>
                </div>
              </summary>
              <EtapaBody item={item} />
            </details>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const OutrosRamos: React.FC<{ outras: OfficialEtapaOtherItem[] }> = ({ outras }) => {
  if (outras.length === 0) return null;
  return (
    <details className="rounded-md border border-slate-200 bg-white">
      <summary className="cursor-pointer px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-600 hover:bg-slate-50">
        Outros ramos e passagens
      </summary>
      <div className="px-2 pb-2">
        <p className="text-[11px] text-slate-500 mb-1.5">
          Dump completo do Paxtu (lobinho, sênior, pioneiro e passagens). Pendente aqui não
          significa que o jovem falhou — muitas etapas são de outro ramo.
        </p>
        <div className="grid grid-cols-[1fr_7rem_6rem] gap-2 px-1 text-[10px] uppercase font-bold text-slate-400">
          <span>Etapa</span>
          <span>Situação</span>
          <span>Data</span>
        </div>
        <ul>
          {outras.map(item => (
            <li
              key={item.nome}
              className="grid grid-cols-[1fr_7rem_6rem] gap-2 px-1 py-0.5 text-[11px] text-slate-700 border-t border-slate-100"
            >
              <span>{item.nome}</span>
              <span className={situacaoClass(item.conquistado)}>
                {officialStatusLabel(undefined, item.conquistado)}
              </span>
              <span className="tabular-nums text-slate-500">{formatOfficialDate(item.date) || '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
};

const ConquistaList: React.FC<{
  title: string;
  items: OfficialConquistaView[];
}> = ({ title, items }) => {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ol className="rounded-md border border-amber-200 bg-white divide-y divide-amber-100">
        {items.map(item => (
          <li
            key={`${item.nome}-${item.date || ''}`}
            className="flex justify-between gap-3 px-2 py-1 text-[12px] text-slate-800"
          >
            <span>{item.nome}</span>
            <span className="tabular-nums text-slate-500 shrink-0">
              {formatOfficialDate(item.date) || '—'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

const SpecialtyTable: React.FC<{ specialties: OfficialSpecialtyView[] }> = ({ specialties }) => {
  if (specialties.length === 0) return null;
  return (
    <section>
      <SectionTitle>Especialidades oficiais</SectionTitle>
      <div className="rounded-md border border-amber-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_3.5rem_6rem] gap-2 px-2 py-1 text-[10px] uppercase font-bold text-slate-500 bg-amber-50/80">
          <span>Nome</span>
          <span>Nível</span>
          <span>Data</span>
        </div>
        <ul>
          {specialties.map(item => (
            <li
              key={`${item.nome}-${item.nivelOficial ?? 'x'}`}
              className="grid grid-cols-[1fr_3.5rem_6rem] gap-2 px-2 py-1 text-[12px] text-slate-800 border-t border-amber-100"
            >
              <span>{item.nome}</span>
              <span className="text-slate-600">
                {item.nivelOficial != null ? `N${item.nivelOficial}` : '—'}
              </span>
              <span className="tabular-nums text-slate-500">{formatOfficialDate(item.date) || '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const VidaEscoteira: React.FC<{ rows: OfficialVidaRow[] }> = ({ rows }) => {
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) return null;
  const visible = showAll ? rows : rows.slice(0, VIDA_PREVIEW);
  return (
    <section>
      <SectionTitle>Vida escoteira</SectionTitle>
      <div className="rounded-md border border-amber-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[7.5rem_1fr_1fr] gap-2 px-2 py-1 text-[10px] uppercase font-bold text-slate-500 bg-amber-50/80">
          <span>Data</span>
          <span>Atividade</span>
          <span>Local</span>
        </div>
        <ul>
          {visible.map((row, index) => (
            <li
              key={`${row.data || ''}-${row.atividade}-${index}`}
              className="grid grid-cols-[7.5rem_1fr_1fr] gap-2 px-2 py-1 text-[11px] text-slate-700 border-t border-amber-100"
            >
              <span className="tabular-nums text-slate-500">{row.data || '—'}</span>
              <span>{row.atividade}</span>
              <span className="text-slate-600">{row.local || '—'}</span>
            </li>
          ))}
        </ul>
      </div>
      {rows.length > VIDA_PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll(value => !value)}
          className="mt-1 text-[11px] font-bold text-amber-900 underline"
        >
          {showAll ? 'Mostrar menos' : `Mostrar todas (${rows.length})`}
        </button>
      )}
    </section>
  );
};

const OfficialLists: React.FC<{ member: ScoutMember }> = ({ member }) => {
  const trail = listOfficialEtapaTrail(member);
  const outras = listOtherOfficialEtapas(member);
  const conquistas = listOfficialConquistas(member);
  const condecoracoes = listOfficialCondecoracoes(member);
  const specialties = listOfficialSpecialties(member);
  const vida = listOfficialVidaEscoteira(member);
  return (
    <div className="space-y-3">
      <ProgressaoEscoteiro trail={trail} />
      <OutrosRamos outras={outras} />
      <ConquistaList title="Conquistas e certificações" items={conquistas} />
      <ConquistaList title="Condecorações" items={condecoracoes} />
      <SpecialtyTable specialties={specialties} />
      <VidaEscoteira rows={vida} />
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
        {hasOfficial ? <OfficialLists member={member} /> : <EmptyOfficial />}
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
      <OfficialLists member={member} />
      {keep && (
        <div className="bg-amber-100 border border-amber-400 rounded p-2 text-xs text-amber-950">
          A etapa oficial (<strong>{oficial}</strong>) está à frente da contagem de blocos.
          O ScoutsAuto <strong>mantém o distintivo oficial</strong> e sugere um plano de
          acompanhamento nos blocos abaixo — a chefia confirma cada crédito. A etapa oficial
          nunca é rebaixada automaticamente.
        </div>
      )}
      <p className="text-[10px] text-amber-800">{PAXTU_HISTORICO_AVISO}</p>
    </div>
  );
};
