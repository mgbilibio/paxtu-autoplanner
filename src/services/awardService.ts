import { ProgressionRecord, CatalogCategory } from '../types';
import { AWARDS_RULES, AwardDefinition, RequirementType } from '../data/awardsRules';
import { isSpecialtyCode, getSpecialtyBranch } from '../utils/specialtyCodes';

export interface RequirementStatus {
  description: string;
  isMet: boolean;
  current: number;
  target: number;
  details?: string;
}

export interface AwardStatus {
  award: AwardDefinition;
  isUnlocked: boolean;
  progressPercent: number;
  requirements: RequirementStatus[];
}

export const checkAwardProgress = (
  achievements: ProgressionRecord[],
  fullCatalog: CatalogCategory[],
  // Conjunto unificado de codigos homologados (POR 2025 + legado), produzido por
  // getMemberHomologatedCodes. Usado nas etapas de progressao, cujos itens vivem
  // no bloco state consolidado e nao apenas em achievements legados.
  homologatedCodes: Set<string> = new Set()
): AwardStatus[] => {
  // Helper: Get all specialties earned (codes 'SP-*' do catalogo do planejador)
  const earnedSpecs = achievements.filter(a => isSpecialtyCode(a.code));

  // Helper: Check if specific item is earned (handling N1/N2 variations)
  const hasItem = (code: string) => achievements.some(a => a.code.includes(code) || a.code === code);

  // Helper: Count branches of knowledge (Serviços, Habilidades Escoteiras, etc).
  // Cada code 'SP-<SEG>-<ID>' mapeia para EXATAMENTE UM ramo canonico via
  // getSpecialtyBranch; ramos distintos sao contados uma unica vez.
  const getKnowledgeBranchCount = () => {
      const branchesFound = new Set<string>();
      earnedSpecs.forEach(s => {
          const branch = getSpecialtyBranch(s.code);
          if (branch) branchesFound.add(branch);
      });
      return branchesFound.size;
  };

  return AWARDS_RULES.map(award => {
    let reqsMet = 0;
    const reqStatus: RequirementStatus[] = award.requirements.map(req => {
      let isMet = false;
      let current = 0;
      let target = typeof req.target === 'number' ? req.target : 1;
      let details = '';

      switch (req.type) {
        case RequirementType.SPECIALTY_COUNT:
          current = earnedSpecs.length;
          isMet = current >= (req.target as number);
          details = `${current}/${req.target} especialidades`;
          break;

        case RequirementType.SPECIALTY_BRANCH_DISTRIBUTION:
          current = getKnowledgeBranchCount();
          isMet = current >= (req.target as number);
          details = `${current}/${req.target} ramos de conhecimento`;
          break;

        case RequirementType.SPECIFIC_ITEM:
          // Check for exact code OR one of the alternative params
          const codesToCheck = [req.target as string, ...(req.params || [])];
          isMet = codesToCheck.some(c => hasItem(c));
          current = isMet ? 1 : 0;
          details = isMet ? 'Conquistado' : 'Pendente';
          break;

        case RequirementType.INSIGNIA_GROUP:
          const groupOptions = req.params as string[];
          const found = groupOptions.find(opt => hasItem(opt));
          isMet = !!found;
          current = isMet ? 1 : 0;
          details = found ? 'Conquistado' : 'Nenhuma insígnia do grupo';
          break;

        case RequirementType.PROGRESSION_STAGE:
          // Check if all items of that stage (category) are done
          const stageName = req.target as string;
          const category = fullCatalog.find(c => c.name.includes(stageName));
          if (category) {
              const totalStage = category.items.length;
              // Considera tanto o conjunto unificado homologado (POR 2025) quanto
              // os achievements legados via hasItem, garantindo cobertura das duas fontes.
              const doneStage = category.items.filter(i => homologatedCodes.has(i.code) || hasItem(i.code)).length;
              // Allow 90% completion to account for minor optional items
              isMet = (doneStage / totalStage) >= 0.9;
              current = doneStage;
              target = totalStage;
              details = `${Math.round((doneStage/totalStage)*100)}% da etapa`;
          } else {
              details = 'Etapa não encontrada';
          }
          break;
      }

      if (isMet) reqsMet++;

      return {
        description: req.description,
        isMet,
        current,
        target,
        details
      };
    });

    return {
      award,
      isUnlocked: reqsMet === award.requirements.length,
      progressPercent: Math.round((reqsMet / award.requirements.length) * 100),
      requirements: reqStatus
    };
  });
};
