import React, { useState, useMemo } from 'react';
import {
  RAMOS_2025,
  EIXOS_2025,
  ETAPAS_2025,
  BLOCOS_2025,
  BLOCO_RAMO_META_2025,
  ACOES_FIXAS_2025,
  ACOES_VARIAVEIS_2025,
  BLOCO_ESPECIALIDADES_2025,
  BLOCO_INSIGNIAS_2025,
  RECONHECIMENTOS_2025,
  RECONHECIMENTO_REQUISITOS_2025,
} from '../data/generated/progressao_2025';
import { openPdfAtPage, fonteParaRamo } from '../services/pdfLinkService';

interface Props {
  onClose: () => void;
}

type Modalidade = 'geral' | 'ar' | 'mar';

const modalidadeBadge = (m: Modalidade) =>
  m === 'ar' ? '✈️' : m === 'mar' ? '⚓' : '';

export const ProgressaoBlocos2025: React.FC<Props> = ({ onClose }) => {
  const [ramoId, setRamoId] = useState<number>(2); // default Escoteiro
  const [etapaId, setEtapaId] = useState<number | 'todas'>('todas');
  const [eixoFiltro, setEixoFiltro] = useState<number | 'todos'>('todos');
  const [blocoAberto, setBlocoAberto] = useState<number | null>(null);

  const ramo = useMemo(() => RAMOS_2025.find(r => r.id === ramoId)!, [ramoId]);

  const etapasRamo = useMemo(
    () => ETAPAS_2025.filter(e => e.ramoId === ramoId),
    [ramoId],
  );

  const blocosVisiveis = useMemo(() => {
    let blocos = [...BLOCOS_2025];
    if (etapaId !== 'todas') {
      const etapa = etapasRamo.find(e => e.id === etapaId);
      if (etapa) blocos = blocos.filter(b => b.ordemGlobal <= etapa.blocosCumulativos);
    }
    if (eixoFiltro !== 'todos') blocos = blocos.filter(b => b.eixoId === eixoFiltro);
    return blocos;
  }, [etapaId, etapasRamo, eixoFiltro]);

  const reconhecimento = useMemo(
    () => RECONHECIMENTOS_2025.find(r => r.ramoId === ramoId),
    [ramoId],
  );

  const reconhecimentoReqs = useMemo(
    () =>
      reconhecimento
        ? RECONHECIMENTO_REQUISITOS_2025.filter(r => r.reconhecimentoId === reconhecimento.id)
        : [],
    [reconhecimento],
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col animate-fade-in">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">← Voltar</button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">🧭 Progressão Pessoal 2025+</h2>
            <p className="text-xs text-gray-400">18 blocos × 4 eixos | Manual do Escotista 2025.10</p>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white border-b sticky top-[64px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto p-4 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {RAMOS_2025.map(r => (
              <button
                key={r.id}
                onClick={() => { setRamoId(r.id); setEtapaId('todas'); }}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  ramoId === r.id
                    ? r.slug === 'lobinho' ? 'bg-blue-600 text-white' : 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r.slug === 'lobinho' ? '🐺' : '⚜️'} {r.nome}
              </button>
            ))}
          </div>

          <select
            value={etapaId}
            onChange={e => setEtapaId(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
            className="px-3 py-2 rounded-lg border text-sm"
          >
            <option value="todas">Todas as etapas</option>
            {etapasRamo.map(e => (
              <option key={e.id} value={e.id}>
                {e.nome} (até {e.blocosCumulativos} blocos)
              </option>
            ))}
          </select>

          <select
            value={eixoFiltro}
            onChange={e => setEixoFiltro(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            className="px-3 py-2 rounded-lg border text-sm"
          >
            <option value="todos">Todos os eixos</option>
            {EIXOS_2025.map(eixo => (
              <option key={eixo.id} value={eixo.id}>{eixo.nome}</option>
            ))}
          </select>

          <span className="text-xs text-gray-500 ml-auto">
            {blocosVisiveis.length} bloco{blocosVisiveis.length !== 1 ? 's' : ''} | {ramo.faixaEtaria}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 space-y-3">
          {blocosVisiveis.map(bloco => {
            const eixo = EIXOS_2025.find(e => e.id === bloco.eixoId)!;
            const meta = BLOCO_RAMO_META_2025.find(m => m.blocoId === bloco.id && m.ramoId === ramoId);
            const fixas = ACOES_FIXAS_2025.filter(a => a.blocoId === bloco.id && a.ramoId === ramoId);
            const variaveis = ACOES_VARIAVEIS_2025.filter(a => a.blocoId === bloco.id && a.ramoId === ramoId);
            const especialidades = BLOCO_ESPECIALIDADES_2025.filter(e => e.blocoId === bloco.id && e.ramoId === ramoId);
            const insignias = BLOCO_INSIGNIAS_2025.filter(i => i.blocoId === bloco.id && i.ramoId === ramoId);
            const aberto = blocoAberto === bloco.id;

            return (
              <div
                key={bloco.id}
                className="bg-white rounded-lg shadow-sm border overflow-hidden"
                style={{ borderLeftWidth: 4, borderLeftColor: eixo.corHex }}
              >
                <button
                  onClick={() => setBlocoAberto(aberto ? null : bloco.id)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: eixo.corHex }}>
                      {eixo.nome} · Bloco {bloco.ordemGlobal}/18
                    </div>
                    <div className="text-lg font-bold mt-1">{bloco.nome}</div>
                    {meta && (
                      <div className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                        {meta.intencionalidade}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500 ml-4 shrink-0">
                    <div><strong>{fixas.length}</strong> fixa{fixas.length !== 1 ? 's' : ''}</div>
                    <div><strong>{meta?.variaveisMinimo || 0}</strong>/{variaveis.length} variáveis</div>
                    {meta?.fontePagina && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const fonte = fonteParaRamo(ramo.slug);
                          if (fonte && meta.fontePagina) openPdfAtPage(fonte, parseInt(meta.fontePagina, 10));
                        }}
                        className="text-blue-600 hover:underline opacity-70 hover:opacity-100"
                        title="Abrir PDF na página correspondente"
                      >
                        📄 p.{meta.fontePagina}
                      </button>
                    )}
                  </div>
                </button>

                {aberto && (
                  <div className="px-4 pb-4 border-t bg-gray-50/50">
                    {meta?.intencionalidade && (
                      <section className="mt-3">
                        <h4 className="text-xs uppercase font-semibold text-gray-500 mb-1">Intencionalidade educativa</h4>
                        <p className="text-sm text-gray-800">{meta.intencionalidade}</p>
                      </section>
                    )}

                    {fixas.length > 0 && (
                      <section className="mt-4">
                        <h4 className="text-xs uppercase font-semibold text-rose-700 mb-2">
                          📌 Ações Fixas (todas obrigatórias)
                        </h4>
                        <ul className="space-y-1.5 text-sm">
                          {fixas.map((a, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-rose-600">{modalidadeBadge(a.modalidade) || '✓'}</span>
                              <span className="text-gray-800">{a.descricao}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {variaveis.length > 0 && (
                      <section className="mt-4">
                        <h4 className="text-xs uppercase font-semibold text-blue-700 mb-2">
                          📋 Ações Variáveis — escolher pelo menos {meta?.variaveisMinimo || 0} de {variaveis.length}
                        </h4>
                        <ul className="space-y-1.5 text-sm">
                          {variaveis.map((a, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-blue-600">{modalidadeBadge(a.modalidade) || '○'}</span>
                              <span className="text-gray-700">{a.descricao}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {especialidades.filter(e => e.tipo === 'substitui').length > 0 && (
                      <section className="mt-4">
                        <h4 className="text-xs uppercase font-semibold text-amber-700 mb-2">
                          🏅 Especialidades que substituem variáveis
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {especialidades.filter(e => e.tipo === 'substitui').map((e, idx) => (
                            <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                              {e.nome}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {insignias.length > 0 && (
                      <section className="mt-4">
                        <h4 className="text-xs uppercase font-semibold text-purple-700 mb-2">
                          🎖️ Insígnias
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {insignias.map((i, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              {i.nome}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {especialidades.filter(e => e.tipo === 'complemento').length > 0 && (
                      <section className="mt-4">
                        <h4 className="text-xs uppercase font-semibold text-gray-500 mb-2">
                          💡 Especialidades sugeridas (complemento)
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {especialidades.filter(e => e.tipo === 'complemento').map((e, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">
                              {e.nome}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Reconhecimento de Ramo */}
          {reconhecimento && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5 mt-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="text-xs uppercase font-semibold text-yellow-800">Reconhecimento de Ramo</div>
                  <h3 className="text-2xl font-bold text-yellow-900">{reconhecimento.nome}</h3>
                  {reconhecimento.idadeLimiteAnos && (
                    <p className="text-xs text-yellow-800">Antes dos {reconhecimento.idadeLimiteAnos} anos</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-800 mb-4">{reconhecimento.descricao}</p>
              <ul className="space-y-1.5 text-sm">
                {reconhecimentoReqs.map((req, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-yellow-700 font-semibold">{idx + 1}.</span>
                    <span><strong className="text-yellow-900 uppercase text-xs">[{req.tipo}]</strong> {req.descricao}</span>
                  </li>
                ))}
              </ul>
              {reconhecimento.fontePagina && (
                <button
                  onClick={() => {
                    const fonte = fonteParaRamo(ramo.slug);
                    if (fonte) openPdfAtPage(fonte, parseInt(reconhecimento.fontePagina, 10));
                  }}
                  className="text-[11px] text-blue-700 hover:underline mt-3"
                >
                  📄 Abrir Manual do Escotista 2025 na página {reconhecimento.fontePagina}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
