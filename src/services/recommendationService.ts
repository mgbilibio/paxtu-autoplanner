import { ScoutBranch, ScoutSection } from '../types';
import { getCatalogForSection } from './catalogService';
import { getMembersAsync } from './storageService';
import { getMemberHomologatedCodes } from './reportingService';
import { isYouthMember } from '../utils/memberQuickAdd';

export interface TroopStat {
  itemCode: string;
  description: string;
  category: string;
  missingCount: number;
  totalMembers: number;
  percentageMissing: number;
  isSpecialty: boolean;
}

export interface CategorySummary {
    name: string;
    completionAverage: number; // 0 to 100
    priority: number; // Higher means more people need items here
}

export interface SectionAnalysis {
    branch: ScoutBranch;
    totalMembers: number;
    topMissingItems: TroopStat[];
    categorySummaries: CategorySummary[];
}

export const analyzeTroopGaps = async (branch: ScoutBranch, section?: ScoutSection | null): Promise<SectionAnalysis | null> => {
  const allMembers = await getMembersAsync(section?.id, { hydrateOfficial: false });
  const activeMembers = allMembers.filter(m => m.branch === branch && !m.isArchived && isYouthMember(m));
  
  if (activeMembers.length === 0) return null;

  const catalog = getCatalogForSection(branch, section);
  if (!catalog) return null;

  // Codigos homologados por membro a partir da fonte REAL (blocos + legado),
  // nao mais do cache legado isolado que ficava vazio no fluxo POR 2025.
  const codesByMember = new Map<string, Set<string>>();
  const batchSize = 6;
  for (let i = 0; i < activeMembers.length; i += batchSize) {
    const chunk = activeMembers.slice(i, i + batchSize);
    await Promise.all(chunk.map(async member => {
      codesByMember.set(member.id, await getMemberHomologatedCodes(member.id));
    }));
  }

  const stats: TroopStat[] = [];
  const categorySummaries: CategorySummary[] = [];

  catalog.forEach(cat => {
    let catTotalItems = cat.items.length;
    let catTotalCompleted = 0;
    let catMissingUrgency = 0;

    cat.items.forEach(item => {
      let missingCount = 0;

      activeMembers.forEach(member => {
        const hasAchieved = codesByMember.get(member.id)?.has(item.code);

        if (!hasAchieved) {
          missingCount++;
        } else {
          catTotalCompleted++;
        }
      });

      const percentageMissing = Math.round((missingCount / activeMembers.length) * 100);
      catMissingUrgency += percentageMissing;

      if (percentageMissing > 0) {
        stats.push({
          itemCode: item.code,
          description: item.description,
          category: cat.name,
          missingCount,
          totalMembers: activeMembers.length,
          percentageMissing,
          isSpecialty: !!item.isSpecialty
        });
      }
    });

    categorySummaries.push({
        name: cat.name,
        completionAverage: Math.round(catTotalCompleted / (catTotalItems * activeMembers.length) * 100) || 0,
        priority: catMissingUrgency / catTotalItems
    });
  });

  return {
      branch,
      totalMembers: activeMembers.length,
      // Sort items by percentage missing (descending)
      topMissingItems: stats.sort((a, b) => b.percentageMissing - a.percentageMissing).slice(0, 40),
      // Sort categories by priority (where more items are missing)
      categorySummaries: categorySummaries.sort((a, b) => b.priority - a.priority)
  };
};