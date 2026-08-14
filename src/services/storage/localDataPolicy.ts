import { isWebFirebaseMode } from '../firebase/session';
import { isOperationalLocalKey } from './localDataKeys';

export { isOperationalLocalKey } from './localDataKeys';

export const usesLocalDataStore = (): boolean => !isWebFirebaseMode();

/** Apaga tropa/usuários/progressão que tenham vazado para o localStorage no site. */
export const clearWebLocalOperationalData = (): number => {
  if (!isWebFirebaseMode() || typeof localStorage === 'undefined') return 0;
  let removed = 0;
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (!isOperationalLocalKey(key)) continue;
    localStorage.removeItem(key);
    removed += 1;
  }
  return removed;
};
