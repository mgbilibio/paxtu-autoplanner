import { CatalogCategory, CatalogItem, ScoutBranch } from '../types';
import {
  EspecialidadeGuia,
  RamoEspecialidade,
  RequisitoEspecialidade,
} from './generated/especialidades_guia';
import { ESPECIALIDADES_UEB_2026 } from './generated/especialidades_ueb_2026';

export const UPDATED_SPECIALTY_PREFIX = 'ESP-UEB26-';

type UebEspecialidade = typeof ESPECIALIDADES_UEB_2026.especialidades[number];

export interface EspecialidadeAtualizadaGuia extends EspecialidadeGuia {
  publico: string;
  eixo: string;
  url: string;
  imagem: string;
}

const RAMO_ID_BY_PUBLICO_EIXO: Record<string, number> = {
  'Lobinho/Escoteiro|Habilidades para a Vida': 2601,
  'Lobinho/Escoteiro|Meio Ambiente': 2602,
  'Lobinho/Escoteiro|Paz e Desenvolvimento': 2603,
  'Lobinho/Escoteiro|Saúde e Bem-Estar': 2604,
  'Sênior/Pioneiro|Habilidades para a Vida': 2611,
  'Sênior/Pioneiro|Meio Ambiente': 2612,
  'Sênior/Pioneiro|Paz e Desenvolvimento': 2613,
  'Sênior/Pioneiro|Saúde e Bem-Estar': 2614,
};

const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const ramoIdFor = (item: UebEspecialidade): number =>
  RAMO_ID_BY_PUBLICO_EIXO[`${item.publico}|${item.eixo}`] || 2699;

const niveisFor = (item: UebEspecialidade): [number, number, number] => {
  const total = item.requisitos.length;
  const niveis = item.niveis as readonly { nome: string; itens: number }[];
  const nivel1 = niveis.find(nivel => nivel.nome === 'Nível I')?.itens;
  const nivel2 = niveis.find(nivel => nivel.nome === 'Nível II')?.itens;
  const nivel3 = niveis.find(nivel => nivel.nome === 'Nível III')?.itens;
  if (nivel1 || nivel2 || nivel3) {
    return [nivel1 || total, nivel2 || total, nivel3 || 0];
  }
  return [1, total, 0];
};

export const UPDATED_RAMOS_ESPECIALIDADES: RamoEspecialidade[] = [
  {
    id: 2601,
    nome: 'Lobinho/Escoteiro · Habilidades para a Vida',
    slug: 'le-habilidades-para-a-vida',
  },
  {
    id: 2602,
    nome: 'Lobinho/Escoteiro · Meio Ambiente',
    slug: 'le-meio-ambiente',
  },
  {
    id: 2603,
    nome: 'Lobinho/Escoteiro · Paz e Desenvolvimento',
    slug: 'le-paz-e-desenvolvimento',
  },
  {
    id: 2604,
    nome: 'Lobinho/Escoteiro · Saúde e Bem-Estar',
    slug: 'le-saude-e-bem-estar',
  },
  {
    id: 2611,
    nome: 'Sênior/Pioneiro · Habilidades para a Vida',
    slug: 'sp-habilidades-para-a-vida',
  },
  {
    id: 2612,
    nome: 'Sênior/Pioneiro · Meio Ambiente',
    slug: 'sp-meio-ambiente',
  },
  {
    id: 2613,
    nome: 'Sênior/Pioneiro · Paz e Desenvolvimento',
    slug: 'sp-paz-e-desenvolvimento',
  },
  {
    id: 2614,
    nome: 'Sênior/Pioneiro · Saúde e Bem-Estar',
    slug: 'sp-saude-e-bem-estar',
  },
];

export const UPDATED_ESPECIALIDADES_GUIA: EspecialidadeAtualizadaGuia[] =
  ESPECIALIDADES_UEB_2026.especialidades.map(item => {
    const [nivel1, nivel2, nivel3] = niveisFor(item);
    return {
      id: item.id,
      ramoId: ramoIdFor(item),
      nome: item.titulo,
      slug: item.post_slug,
      nivel1,
      nivel2,
      nivel3,
      totalItens: item.requisitos.length,
      fonte: 'UEB Especialidades 2026',
      publico: item.publico,
      eixo: item.eixo,
      url: item.url,
      imagem: item.imagem,
    };
  });

export const UPDATED_REQUISITOS_GUIA: RequisitoEspecialidade[] =
  ESPECIALIDADES_UEB_2026.especialidades.flatMap(item =>
    item.requisitos.map((texto, index) => ({
      especialidadeId: item.id,
      posicao: index + 1,
      texto: texto.replace(/^\d+\.\s*/, ''),
      opcional: 0,
    })),
  );

const requisitosFor = (especialidadeId: number): string[] =>
  UPDATED_REQUISITOS_GUIA
    .filter(requirement => requirement.especialidadeId === especialidadeId)
    .sort((left, right) => left.posicao - right.posicao)
    .map(requirement => `${requirement.posicao}. ${requirement.texto}`);

const levelGuidance = (item: EspecialidadeAtualizadaGuia): string => {
  const requisitos = requisitosFor(item.id);
  const blocks = [
    ['N1', item.nivel1],
    ['N2', item.nivel2],
    ['N3', item.nivel3],
  ].filter(([, limit]) => Number(limit) > 0);
  return blocks.map(([label, limit]) => {
    const content = requisitos.slice(0, Number(limit)).join('\n');
    return `${label}:\n${content}`;
  }).join('\n\n');
};

const publicoForBranch = (branch: ScoutBranch): string => {
  if (branch === ScoutBranch.SENIOR || branch === ScoutBranch.PIONEIRO) {
    return 'Sênior/Pioneiro';
  }
  return 'Lobinho/Escoteiro';
};

export const getUpdatedSpecialtyId = (code: string): number | null => {
  const match = code.match(/^ESP-UEB26-(\d+)(?:-N[1-3])?$/);
  return match ? Number(match[1]) : null;
};

export const getUpdatedSpecialtyLevel = (
  especialidadeId: number,
  completedRequirements: number,
): 0 | 1 | 2 | 3 => {
  const specialty = UPDATED_ESPECIALIDADES_GUIA.find(item => item.id === especialidadeId);
  if (!specialty || completedRequirements <= 0) return 0;
  if (specialty.nivel3 && completedRequirements >= specialty.nivel3) return 3;
  if (completedRequirements >= specialty.nivel2) return 2;
  if (completedRequirements >= specialty.nivel1) return 1;
  return 0;
};

export const getUpdatedSpecialtyTarget = (
  especialidadeId: number,
  level: number,
): number => {
  const specialty = UPDATED_ESPECIALIDADES_GUIA.find(item => item.id === especialidadeId);
  if (!specialty) return 0;
  return [specialty.nivel1, specialty.nivel2, specialty.nivel3][level - 1] || 0;
};

export const getUpdatedSpecialtySourceUrl = (especialidadeId: number): string | null =>
  UPDATED_ESPECIALIDADES_GUIA.find(item => item.id === especialidadeId)?.url || null;

export const getUpdatedSpecialtyCatalog = (branch: ScoutBranch): CatalogCategory[] => {
  const publico = publicoForBranch(branch);
  return UPDATED_RAMOS_ESPECIALIDADES
    .filter(ramo => ramo.nome.startsWith(publico))
    .map(ramo => {
      const items: CatalogItem[] = UPDATED_ESPECIALIDADES_GUIA
        .filter(item => item.ramoId === ramo.id)
        .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'))
        .map(item => ({
          code: `${UPDATED_SPECIALTY_PREFIX}${item.id}`,
          description: item.nome,
          guidance: levelGuidance(item),
          isSpecialty: true,
          officialSpecialtyId: item.id,
          specialtyBranch: item.eixo,
        }));
      return {
        name: `Especialidades UEB 2026: ${ramo.nome.replace(`${publico} · `, '')}`,
        items,
      };
    });
};
