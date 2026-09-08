export const AI_LOGIN_CHANGED_EVENT = 'paxtu:ai-login-changed';

export const notifyAiLoginChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AI_LOGIN_CHANGED_EVENT));
};
