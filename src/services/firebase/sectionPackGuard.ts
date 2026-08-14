import { ScoutSection, UserProfile } from '../../types';
import { getRoleLabel } from '../roleService';
import { suggestPackSectionId } from './sectionPackMatch';

export {
  describeSectionPackMismatch,
  normalizePackName,
  packKindDiffersFromSection,
  packNameDiffersFromSection,
  requireExplicitSectionId,
  resolveSectionKind,
} from './sectionPackMatch';

export const canManageSectionPack = (user?: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  const role = getRoleLabel(user.role);
  return role === 'ADMINISTRADOR' || role === 'Chefe de Seção';
};

export const canPickSectionForPack = (user?: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return getRoleLabel(user.role) === 'ADMINISTRADOR';
};

/**
 * Sugestão inicial do seletor. Nunca devolve a primeira seção da lista.
 * Administrador: só a seção atual se ela existir na lista; senão vazio (tem de escolher).
 * Chefe: só uma seção à qual já está vinculado.
 */
export const sectionIdForPack = (
  user?: UserProfile | null,
  currentSection?: ScoutSection | null,
  sections: ScoutSection[] = [],
): string => {
  const allowed = [user?.sectionId, ...(user?.sectionIds || [])].filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  );
  return suggestPackSectionId({
    canPick: canPickSectionForPack(user),
    currentSectionId: currentSection?.id,
    allowedSectionIds: allowed,
    sectionIds: sections.map(item => item.id),
  });
};
