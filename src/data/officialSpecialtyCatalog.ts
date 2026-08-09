import { CatalogCategory, CatalogItem } from '../types';
import {
  ESPECIALIDADES_GUIA,
  RAMOS_ESPECIALIDADES,
  REQUISITOS_GUIA,
} from './generated/especialidades_guia';

export const OFFICIAL_SPECIALTY_PREFIX = 'ESP-GUIA-';
const TRANSITION_LABEL = 'programa anterior / transição';

const requirementsFor = (especialidadeId: number): string[] =>
  REQUISITOS_GUIA
    .filter(requirement => requirement.especialidadeId === especialidadeId)
    .sort((left, right) => left.posicao - right.posicao)
    .map(requirement => `${requirement.posicao}. ${requirement.texto}`);

const levelGuidance = (item: typeof ESPECIALIDADES_GUIA[number]): string => {
  const requirements = requirementsFor(item.id);
  const levels = [item.nivel1, item.nivel2, item.nivel3];
  return levels.map((limit, index) => {
    const content = requirements.slice(0, limit).join('\n');
    return `N${index + 1}:\n${content}`;
  }).join('\n\n');
};

export const getOfficialSpecialtyId = (code: string): number | null => {
  const match = code.match(/^ESP-GUIA-(\d+)(?:-N[1-3])?$/);
  return match ? Number(match[1]) : null;
};

export const getOfficialSpecialtyLevel = (
  especialidadeId: number,
  completedRequirements: number,
): 0 | 1 | 2 | 3 => {
  const specialty = ESPECIALIDADES_GUIA.find(item => item.id === especialidadeId);
  if (!specialty) return 0;
  if (completedRequirements >= specialty.nivel3) return 3;
  if (completedRequirements >= specialty.nivel2) return 2;
  if (completedRequirements >= specialty.nivel1) return 1;
  return 0;
};

export const getOfficialSpecialtyTarget = (
  especialidadeId: number,
  level: number,
): number => {
  const specialty = ESPECIALIDADES_GUIA.find(item => item.id === especialidadeId);
  if (!specialty) return 0;
  return [specialty.nivel1, specialty.nivel2, specialty.nivel3][level - 1] || 0;
};

export const getOfficialSpecialtyCatalog = (): CatalogCategory[] =>
  RAMOS_ESPECIALIDADES.map(branch => {
    const items: CatalogItem[] = ESPECIALIDADES_GUIA
      .filter(item => item.ramoId === branch.id)
      .map(item => ({
        code: `${OFFICIAL_SPECIALTY_PREFIX}${item.id}`,
        description: item.nome,
        guidance: levelGuidance(item),
        isSpecialty: true,
        officialSpecialtyId: item.id,
        specialtyBranch: branch.nome,
      }));
    return { name: `Especialidades (${TRANSITION_LABEL}): ${branch.nome}`, items };
  });
