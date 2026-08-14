export type FichaViewMode = 'oficial' | 'lado-a-lado' | 'blocos';

const STORAGE_KEY = 'paxtu.fichaViewMode';

const isFichaViewMode = (value: unknown): value is FichaViewMode =>
  value === 'oficial' || value === 'lado-a-lado' || value === 'blocos';

export const readFichaViewMode = (): FichaViewMode => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (isFichaViewMode(stored)) return stored;
  } catch {
    // sessionStorage indisponível (modo privado / testes)
  }
  return 'lado-a-lado';
};

export const writeFichaViewMode = (mode: FichaViewMode): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
};
