import type { ScoutSection } from '../../types';

export type SectionsUpdatedDetail = {
  upsert?: ScoutSection;
  removedId?: string;
};

export const mergeSectionLists = (
  base: ScoutSection[],
  extra: ScoutSection[] = [],
): ScoutSection[] => {
  const byId = new Map<string, ScoutSection>();
  for (const item of base) {
    if (item?.id) byId.set(item.id, item);
  }
  for (const item of extra) {
    if (!item?.id) continue;
    const current = byId.get(item.id);
    byId.set(item.id, current ? { ...current, ...item } : item);
  }
  return [...byId.values()];
};

export const applySectionsUpdatedDetail = (
  current: ScoutSection[],
  detail?: SectionsUpdatedDetail | null,
): ScoutSection[] => {
  if (!detail) return current;
  let next = current;
  if (detail.removedId) next = next.filter(item => item.id !== detail.removedId);
  if (detail.upsert) next = mergeSectionLists(next, [detail.upsert]);
  return next;
};

export const sectionIdsMissingFrom = (
  listed: Array<{ id?: string }>,
  extraIds: string[],
): string[] => {
  const have = new Set(listed.map(item => item.id).filter((id): id is string => !!id));
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const id of extraIds) {
    if (!id || have.has(id) || seen.has(id)) continue;
    seen.add(id);
    missing.push(id);
  }
  return missing;
};
