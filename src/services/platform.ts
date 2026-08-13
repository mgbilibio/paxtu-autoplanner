/**
 * Electron expõe window.fileSystem no preload. No browser (GitHub Pages)
 * essa ponte não existe — persistência web vai para Firebase (Auth + Firestore).
 * Sem Firebase configurado a UI avisa; dados de seção não ficam no localStorage.
 */
export const isElectronApp = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.fileSystem);

export const isWebApp = (): boolean => !isElectronApp();
