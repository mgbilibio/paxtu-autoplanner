/**
 * Electron expõe window.fileSystem no preload. No browser (GitHub Pages)
 * essa ponte não existe — persistência cai no localStorage via dualBackend.
 */
export const isElectronApp = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.fileSystem);

export const isWebApp = (): boolean => !isElectronApp();
