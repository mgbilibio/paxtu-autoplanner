import { useEffect, useRef } from 'react';

interface GlobalEventHandlers {
  onSearchOpen: () => void;
  onMenuClose: () => void;
  onMobileNavClose: () => void;
  onToast: (message: string, kind: 'info' | 'error') => void;
  onLlmProgress: (message: string | null) => void;
  onLlmStartedAtSet: (updater: (prev: number | null) => number | null) => void;
  onLlmReset: () => void;
  onHtmlPreview: (preview: { fileName: string; html: string }) => void;
}

export const useGlobalEvents = (handlers: GlobalEventHandlers): void => {
  // Mantem sempre os handlers do render atual numa ref. Os listeners sao registrados
  // uma unica vez (deps []), mas leem da ref — assim nunca chamam closures do render 0.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlersRef.current.onSearchOpen();
      }
      if (e.key === 'Escape') {
        handlersRef.current.onMenuClose();
        handlersRef.current.onMobileNavClose();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-por2025-menu]')) handlersRef.current.onMenuClose();
    };
    window.addEventListener('click', onClickOutside);
    window.addEventListener('keydown', onKey);

    const onToast = (e: any) => {
      const message = e.detail?.message;
      if (message) handlersRef.current.onToast(message, e.detail?.kind || 'info');
    };
    window.addEventListener('paxtu:toast', onToast);

    const onStorageBlocked = () => {
      handlersRef.current.onToast('Seção em modo consulta: assuma a edição para gravar alterações.', 'error');
    };
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const message = String(e.reason?.message || e.reason || '');
      if (!message.includes('modo consulta')) return;
      e.preventDefault();
      handlersRef.current.onToast('Gravação bloqueada porque a seção está em modo consulta.', 'error');
    };
    window.addEventListener('paxtu:storage-blocked', onStorageBlocked);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    const onLlmProgress = (e: any) => {
      handlersRef.current.onLlmProgress(e.detail?.message || null);
      handlersRef.current.onLlmStartedAtSet(prev => prev || Date.now());
      // Reset unico e confiavel: o emissor sinaliza o fim via e.detail.done.
      // (heuristica por substring removida — era fragil e duplicava o timer do App.)
      if (e.detail?.done) {
        setTimeout(() => {
          handlersRef.current.onLlmReset();
        }, 4000);
      }
    };
    window.addEventListener('paxtu:llm-progress', onLlmProgress);

    const onHtmlPreview = (e: any) => {
      if (!e.detail?.html) return;
      handlersRef.current.onHtmlPreview({
        fileName: e.detail.fileName || 'roteiro.html',
        html: e.detail.html,
      });
    };
    window.addEventListener('paxtu:html-preview', onHtmlPreview);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClickOutside);
      window.removeEventListener('paxtu:toast', onToast);
      window.removeEventListener('paxtu:storage-blocked', onStorageBlocked);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('paxtu:llm-progress', onLlmProgress);
      window.removeEventListener('paxtu:html-preview', onHtmlPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
