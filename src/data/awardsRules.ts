import { ScoutBranch } from '../types';

export enum RequirementType {
  PROGRESSION_STAGE = 'PROGRESSION_STAGE', // Ex: Completar a etapa Travessia
  SPECIALTY_COUNT = 'SPECIALTY_COUNT', // Ex: Ter 5 especialidades
  SPECIALTY_BRANCH_DISTRIBUTION = 'SPECIALTY_BRANCH_DISTRIBUTION', // Ex: Distribuídas em 3 ramos de conhecimento
  SPECIFIC_ITEM = 'SPECIFIC_ITEM', // Ex: Ter feito o item 'Primeiros Socorros N2'
  INSIGNIA_GROUP = 'INSIGNIA_GROUP' // Ex: Ter uma das insígnias de interesse especial
}

export interface AwardRequirement {
  type: RequirementType;
  target?: string | number; // Quantidade ou Código do item/etapa
  params?: any; // Parâmetros extras (ex: quais ramos de conhecimento)
  description: string;
}

export interface AwardDefinition {
  id: string;
  name: string;
  branch: ScoutBranch;
  description: string;
  icon: string;
  requirements: AwardRequirement[];
}

export const AWARDS_RULES: AwardDefinition[] = [
  // --- LOBINHO ---
  {
    id: 'CRUZEIRO_SUL',
    name: 'Cruzeiro do Sul',
    branch: ScoutBranch.LOBINHO,
    description: 'Grau Máximo do Ramo Lobinho',
    icon: '🌟',
    requirements: [
      { type: RequirementType.PROGRESSION_STAGE, target: 'Caçador', description: 'Conquistar a Etapa Caçador (100%)' },
      { type: RequirementType.SPECIALTY_COUNT, target: 5, description: 'Ter no mínimo 5 Especialidades' },
      { type: RequirementType.SPECIALTY_BRANCH_DISTRIBUTION, target: 3, description: 'Especialidades em pelo menos 3 Ramos de Conhecimento' },
      { type: RequirementType.INSIGNIA_GROUP, target: 'INS-ESP', params: ['INS-CONE', 'INS-LUSO', 'INS-IMMA', 'INS-MOP', 'INS-BA', 'INS-AP'], description: 'Uma Insígnia de Interesse Especial (Cone Sul, Lusofonia, etc)' }
    ]
  },
  
  // --- ESCOTEIRO ---
  {
    id: 'CORD_VERMELHO_BRANCO',
    name: 'Cordão Vermelho e Branco',
    branch: ScoutBranch.ESCOTEIRO,
    description: 'Excelência em Especialidades',
    icon: '🔴⚪',
    requirements: [
      { type: RequirementType.SPECIALTY_COUNT, target: 12, description: 'Ter 12 Especialidades no total' },
      { type: RequirementType.SPECIALTY_BRANCH_DISTRIBUTION, target: 5, description: 'Cobrir todos os 5 Ramos de Conhecimento' },
      { type: RequirementType.SPECIFIC_ITEM, target: 'ESP-TEC-SOC-N2', params: ['BA-CORPO-F1', 'ESP-SOCOR'], description: 'Especialidade de Primeiros Socorros (Nível 2)' }
    ]
  },
  {
    id: 'LIS_OURO',
    name: 'Lis de Ouro',
    branch: ScoutBranch.ESCOTEIRO,
    description: 'Grau Máximo do Ramo Escoteiro',
    icon: '⚜️🥇',
    requirements: [
      { type: RequirementType.PROGRESSION_STAGE, target: 'Travessia', description: 'Conquistar a Etapa Travessia (100%)' },
      { type: RequirementType.SPECIFIC_ITEM, target: 'CORD-VB', description: 'Possuir o Cordão Vermelho e Branco' },
      { type: RequirementType.INSIGNIA_GROUP, target: 'INS-ESP', params: ['INS-CONE', 'INS-LUSO', 'INS-IMMA', 'INS-MOP'], description: 'Uma Insígnia de Interesse Especial ou Mundial' },
      { type: RequirementType.SPECIFIC_ITEM, target: 'BA-VAL-F1', description: 'Avaliação de conduta e Lei Escoteira (Recomendação da Corte de Honra)' }
    ]
  }
];
