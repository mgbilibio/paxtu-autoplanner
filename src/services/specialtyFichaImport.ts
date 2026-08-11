import {
  EspecialidadeAtualizadaGuia as EspecialidadeGuia,
  UPDATED_ESPECIALIDADES_GUIA as ESPECIALIDADES_GUIA,
} from '../data/updatedSpecialtyCatalog';
import {
  MemberSpecialtyState,
  SpecialtyEvidence,
  SpecialtyRequirementEvaluation,
  SpecialtyRequirementStatus,
} from '../types';
import { saveMemberSpecialtyState } from './storage/specialtyStateStorage';

const STATUS_VALIDOS: SpecialtyRequirementStatus[] = ['em_estudo', 'cumprido', 'validado', 'revisar'];

export interface ParsedFicha {
  especialidadeId: number;
  nome: string;
  totalItens: number;
  requisitosConcluidos: number[];
  avaliador: string;
  notas: string;
  avaliacoes: SpecialtyRequirementEvaluation[];
  evidencias: SpecialtyEvidence[];
}

export interface ParsedDevolucao {
  member: { id: string; name: string } | null;
  fichas: ParsedFicha[];
}

const calcularNivel = (concluidos: number, esp: EspecialidadeGuia): 1 | 2 | 3 | undefined => {
  // Ficha sem nenhum requisito cumprido nunca atinge nível — evita Nível 1 falso
  // quando esp.nivel1 vale 0 (guia mal preenchido) com concluidos == 0.
  if (concluidos <= 0) return undefined;
  if (esp.nivel3 && concluidos >= esp.nivel3) return 3;
  if (concluidos >= esp.nivel2) return 2;
  if (concluidos >= esp.nivel1) return 1;
  return undefined;
};

// Le e valida o arquivo de devolucao. Confia apenas no que cruza com o guia
// oficial (especialidadeId existe, posicoes dentro de [1..totalItens], status no enum).
export const parseDevolucao = (raw: unknown): ParsedDevolucao | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind !== 'paxtu-ficha-devolucao') return null;
  if (!Array.isArray(obj.fichas)) return null;

  let member: ParsedDevolucao['member'] = null;
  if (obj.member && typeof obj.member === 'object') {
    const m = obj.member as Record<string, unknown>;
    if (typeof m.id === 'string' && typeof m.name === 'string') {
      member = { id: m.id, name: m.name };
    }
  }

  const fichas: ParsedFicha[] = [];
  for (const item of obj.fichas as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    const especialidadeId = Number(f.especialidadeId);
    const esp = ESPECIALIDADES_GUIA.find(e => e.id === especialidadeId);
    if (!esp) continue;

    const concluidosBrutos = Array.isArray(f.requisitosConcluidos) ? f.requisitosConcluidos : [];
    const requisitosConcluidos = Array.from(new Set(
      concluidosBrutos
        .map(Number)
        .filter(p => Number.isInteger(p) && p >= 1 && p <= esp.totalItens),
    )).sort((a, b) => a - b);

    const avaliacoesBrutas = Array.isArray(f.avaliacoes) ? f.avaliacoes : [];
    const avaliacoes: SpecialtyRequirementEvaluation[] = [];
    for (const a of avaliacoesBrutas as unknown[]) {
      if (!a || typeof a !== 'object') continue;
      const av = a as Record<string, unknown>;
      const pos = Number(av.requisitoPosicao);
      const status = av.status as SpecialtyRequirementStatus;
      if (!Number.isInteger(pos) || pos < 1 || pos > esp.totalItens) continue;
      if (!STATUS_VALIDOS.includes(status)) continue;
      avaliacoes.push({
        requisitoPosicao: pos,
        status,
        data: typeof av.data === 'string' ? av.data : new Date().toISOString().slice(0, 10),
        avaliador: typeof av.avaliador === 'string' ? av.avaliador : undefined,
      });
    }

    const evidenciasBrutas = Array.isArray(f.evidencias) ? f.evidencias : [];
    const evidencias: SpecialtyEvidence[] = [];
    for (const e of evidenciasBrutas as unknown[]) {
      if (!e || typeof e !== 'object') continue;
      const ev = e as Record<string, unknown>;
      const pos = Number(ev.requisitoPosicao);
      if (!Number.isInteger(pos) || pos < 1 || pos > esp.totalItens) continue;
      if (typeof ev.texto !== 'string' || !ev.texto.trim()) continue;
      evidencias.push({
        requisitoPosicao: pos,
        texto: ev.texto.trim().slice(0, 2000),
        data: typeof ev.data === 'string' ? ev.data : new Date().toISOString().slice(0, 10),
      });
    }

    fichas.push({
      especialidadeId,
      nome: esp.nome,
      totalItens: esp.totalItens,
      requisitosConcluidos,
      avaliador: typeof f.avaliador === 'string' ? f.avaliador.slice(0, 200) : '',
      notas: typeof f.notas === 'string' ? f.notas.slice(0, 2000) : '',
      avaliacoes: avaliacoes.sort((x, y) => x.requisitoPosicao - y.requisitoPosicao),
      evidencias: evidencias.sort((x, y) => x.requisitoPosicao - y.requisitoPosicao),
    });
  }

  if (fichas.length === 0) return null;
  return { member, fichas };
};

// Grava as fichas no jovem informado. nivelAtual/dataConclusao sao recalculados
// pelo app (nao se confia no arquivo externo). Uma ficha por especialidade.
export const applyDevolucao = async (
  parsed: ParsedDevolucao,
  memberId: string,
): Promise<{ aplicadas: number }> => {
  let aplicadas = 0;
  for (const ficha of parsed.fichas) {
    const esp = ESPECIALIDADES_GUIA.find(e => e.id === ficha.especialidadeId);
    if (!esp) continue;
    const nivelAtual = calcularNivel(ficha.requisitosConcluidos.length, esp);
    const concluida = ficha.requisitosConcluidos.length >= esp.totalItens;
    const state: MemberSpecialtyState = {
      memberId,
      especialidadeId: ficha.especialidadeId,
      requisitosConcluidos: ficha.requisitosConcluidos,
      nivelAtual,
      dataConclusao: concluida ? new Date().toISOString().slice(0, 10) : undefined,
      avaliador: ficha.avaliador || undefined,
      notas: ficha.notas || undefined,
      avaliacoes: ficha.avaliacoes.length ? ficha.avaliacoes : undefined,
      evidencias: ficha.evidencias.length ? ficha.evidencias : undefined,
      lastUpdate: new Date().toISOString(),
    };
    await saveMemberSpecialtyState(state);
    aplicadas++;
  }
  return { aplicadas };
};
