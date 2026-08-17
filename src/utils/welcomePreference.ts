const HIDE_WELCOME_KEY = 'scoutsauto.hideWelcome';

export const shouldShowWelcome = (): boolean => {
  try {
    return localStorage.getItem(HIDE_WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
};

export const hideWelcomePermanently = (): void => {
  try {
    localStorage.setItem(HIDE_WELCOME_KEY, '1');
  } catch {
    // preferência local: se o storage falhar, a tela inicial continua aparecendo
  }
};

export const clearWelcomePreference = (): void => {
  try {
    localStorage.removeItem(HIDE_WELCOME_KEY);
  } catch {
    // ignore
  }
};
