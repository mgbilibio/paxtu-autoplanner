import React from 'react';
import {
  MemberSpecialtyState,
  ScoutMember,
  ScoutSection,
  ProgressionRecord,
} from '../../types';
import { getMemberCatalog } from '../../services/catalogService';
import {
  getOfficialSpecialtyId,
  getOfficialSpecialtyLevel,
} from '../../data/officialSpecialtyCatalog';
import {
  formatOfficialDate,
  hasOfficialLayer,
  listOfficialConquistas,
  listOfficialEtapaTrail,
  listOfficialSpecialties,
  listOfficialVidaEscoteira,
  listOtherOfficialEtapas,
  officialEtapaEscoteiro,
  officialStatusLabel,
  PAXTU_HISTORICO_AVISO,
} from '../../services/equivalenciaService';

interface Props {
  member: ScoutMember;
  section?: ScoutSection | null;
  achievements: ProgressionRecord[];
  specialtyStates?: MemberSpecialtyState[];
}

export const IndividualSheet: React.FC<Props> = ({
  member,
  section,
  achievements,
  specialtyStates = [],
}) => {
  const catalog = getMemberCatalog(member, section);
  const officialTrail = listOfficialEtapaTrail(member);
  const officialOther = listOtherOfficialEtapas(member);
  const officialConquistas = listOfficialConquistas(member);
  const officialSpecs = listOfficialSpecialties(member);
  const officialVida = listOfficialVidaEscoteira(member);

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto text-black print:p-0">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">Ficha de Acompanhamento</h1>
            <p className="text-sm">Ramo {member.branch} • {section?.name || 'Seção'}</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-xs">Registro: {member.registerNumber || 'N/A'} • Patrulha: {member.patrol || 'N/A'}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold border-b border-black mb-2 text-sm uppercase">
          Oficial (Paxtu / POR antigo)
        </h3>
        {hasOfficialLayer(member) ? (
          <>
            <p className="text-xs mb-2">
              Etapa oficial: <strong>{officialEtapaEscoteiro(member) || 'não informada'}</strong>
            </p>
            <h4 className="font-bold text-xs uppercase mb-1">Progressão — Ramo escoteiro</h4>
            <table className="w-full text-xs border-collapse mb-3">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-left bg-gray-100">Etapa</th>
                  <th className="border border-black p-1 text-center bg-gray-100">Situação</th>
                  <th className="border border-black p-1 text-center bg-gray-100">Data</th>
                </tr>
              </thead>
              <tbody>
                {officialTrail.map(item => (
                  <tr key={item.etapa}>
                    <td className="border border-black p-1 font-bold">{item.etapa}</td>
                    <td className="border border-black p-1 text-center">
                      {officialStatusLabel(item.status, item.conquistado)}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {formatOfficialDate(item.date) || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {officialOther.length > 0 && (
              <>
                <h4 className="font-bold text-xs uppercase mb-1">Outros ramos e passagens</h4>
                <p className="text-[10px] mb-1 text-slate-600">
                  Pendente aqui não significa que o jovem falhou — muitas etapas são de outro ramo.
                </p>
                <table className="w-full text-xs border-collapse mb-3">
                  <thead>
                    <tr>
                      <th className="border border-black p-1 text-left bg-gray-100">Etapa</th>
                      <th className="border border-black p-1 text-center bg-gray-100">Situação</th>
                      <th className="border border-black p-1 text-center bg-gray-100">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialOther.map(item => (
                      <tr key={item.nome}>
                        <td className="border border-black p-1">{item.nome}</td>
                        <td className="border border-black p-1 text-center">
                          {officialStatusLabel(undefined, item.conquistado)}
                        </td>
                        <td className="border border-black p-1 text-center">
                          {formatOfficialDate(item.date) || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <h4 className="font-bold text-xs uppercase mb-1">Conquistas e certificações</h4>
            <table className="w-full text-xs border-collapse mb-3">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-left bg-gray-100">Conquista</th>
                  <th className="border border-black p-1 text-center bg-gray-100">Data</th>
                </tr>
              </thead>
              <tbody>
                {officialConquistas.length === 0 ? (
                  <tr>
                    <td className="border border-black p-1" colSpan={2}>Nenhuma conquista no histórico Paxtu.</td>
                  </tr>
                ) : (
                  officialConquistas.map(item => (
                    <tr key={`${item.nome}-${item.date || ''}`}>
                      <td className="border border-black p-1">{item.nome}</td>
                      <td className="border border-black p-1 text-center">{formatOfficialDate(item.date) || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <h4 className="font-bold text-xs uppercase mb-1">Especialidades oficiais</h4>
            <table className="w-full text-xs border-collapse mb-3">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-left bg-gray-100">Nome</th>
                  <th className="border border-black p-1 text-center bg-gray-100">Nível</th>
                  <th className="border border-black p-1 text-center bg-gray-100">Data</th>
                </tr>
              </thead>
              <tbody>
                {officialSpecs.length === 0 ? (
                  <tr>
                    <td className="border border-black p-1" colSpan={3}>Nenhuma especialidade no histórico Paxtu.</td>
                  </tr>
                ) : (
                  officialSpecs.map(item => (
                      <tr key={`${item.nome}-${item.nivelOficial || 0}`}>
                        <td className="border border-black p-1">{item.nome}</td>
                        <td className="border border-black p-1 text-center">{item.nivelOficial != null ? `N${item.nivelOficial}` : ''}</td>
                        <td className="border border-black p-1 text-center">{formatOfficialDate(item.date) || ''}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
            {officialVida.length > 0 && (
              <>
                <h4 className="font-bold text-xs uppercase mb-1">Vida escoteira</h4>
                <table className="w-full text-xs border-collapse mb-3">
                  <thead>
                    <tr>
                      <th className="border border-black p-1 text-left bg-gray-100">Data</th>
                      <th className="border border-black p-1 text-left bg-gray-100">Atividade</th>
                      <th className="border border-black p-1 text-left bg-gray-100">Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialVida.map((row, index) => (
                      <tr key={`${row.data || ''}-${row.atividade}-${index}`}>
                        <td className="border border-black p-1">{row.data || ''}</td>
                        <td className="border border-black p-1">{row.atividade}</td>
                        <td className="border border-black p-1">{row.local || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <p className="text-[10px] text-slate-600">{PAXTU_HISTORICO_AVISO}</p>
          </>
        ) : (
          <p className="text-xs text-slate-600">Sem histórico Paxtu neste jovem</p>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6">
        {catalog.map((cat, idx) => (
            <div key={idx} className="break-inside-avoid">
                <h3 className="font-bold border-b border-black mb-2 text-sm uppercase">{cat.name}</h3>
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 w-12 text-center bg-gray-100">Cód.</th>
                            <th className="border border-black p-1 text-left bg-gray-100">Item / Descrição</th>
                            <th className="border border-black p-1 w-24 text-center bg-gray-100">Data</th>
                            <th className="border border-black p-1 w-32 text-center bg-gray-100">Avaliador</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cat.items.map(item => {
                            const record = achievements.find(a => a.code === item.code);
                            const officialId = getOfficialSpecialtyId(item.code);
                            const specialtyState = officialId === null
                              ? null
                              : specialtyStates.find(state => state.especialidadeId === officialId);
                            const specialtyLevel = officialId === null || !specialtyState
                              ? 0
                              : specialtyState.nivelAtual || getOfficialSpecialtyLevel(
                                officialId,
                                specialtyState.requisitosConcluidos.length,
                              );
                            // Check for sub-levels (Specialties)
                            const levels = achievements.filter(a => a.code.startsWith(`${item.code}-N`));
                            const hasLevels = levels.length > 0;

                            if (officialId !== null) {
                                return (
                                    <tr key={item.code}>
                                        <td className="border border-black p-1 text-center font-mono">{item.code}</td>
                                        <td className="border border-black p-1">
                                            {item.description}
                                            {specialtyLevel > 0 && <span className="font-bold"> (N{specialtyLevel})</span>}
                                        </td>
                                        <td className="border border-black p-1 text-center">
                                            {specialtyState?.lastUpdate
                                              ? new Date(specialtyState.lastUpdate).toLocaleDateString()
                                              : ''}
                                        </td>
                                        <td className="border border-black p-1 text-center italic">
                                            {specialtyState
                                              ? `${specialtyState.requisitosConcluidos.length} requisito(s)`
                                              : ''}
                                        </td>
                                    </tr>
                                );
                            }
                            
                            if (hasLevels) {
                                return levels.map(lvl => (
                                    <tr key={lvl.code}>
                                        <td className="border border-black p-1 text-center font-mono">{item.code}</td>
                                        <td className="border border-black p-1">
                                            {item.description} <span className="font-bold">({lvl.code.split('-').pop()})</span>
                                        </td>
                                        <td className="border border-black p-1 text-center">{new Date(lvl.date).toLocaleDateString()}</td>
                                        <td className="border border-black p-1 text-center italic">{lvl.notes || '___'}</td>
                                    </tr>
                                ));
                            }

                            return (
                                <tr key={item.code}>
                                    <td className="border border-black p-1 text-center font-mono">{item.code}</td>
                                    <td className="border border-black p-1">{item.description}</td>
                                    <td className="border border-black p-1 text-center font-medium">
                                        {record ? new Date(record.date).toLocaleDateString() : ''}
                                    </td>
                                    <td className="border border-black p-1 text-center italic">
                                        {record ? (record.notes || '___') : ''}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        ))}
      </div>

      <div className="mt-8 text-[10px] text-center border-t pt-2">
        Documento gerado pelo Paxtu AutoPlanner em {new Date().toLocaleDateString()}. Válido para conferência interna.
      </div>
    </div>
  );
};
