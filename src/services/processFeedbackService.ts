export const emitProcessProgress = (message: string, done = false): void => {
  window.dispatchEvent(new CustomEvent('paxtu:llm-progress', {
    detail: { provider: 'app', message, done },
  }));
};

export const emitProcessDone = (message: string): void => {
  emitProcessProgress(message, true);
};
