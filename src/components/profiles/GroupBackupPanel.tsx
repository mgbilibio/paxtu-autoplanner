import React, { useRef, useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  downloadGroupFirestoreBackup,
  importGroupFirestoreBackup,
  parseGroupFirestoreBackupFile,
  summarizeGroupBackup,
  type GroupBackupSummary,
  type GroupFirestoreBackup,
} from '../../services/firebase/groupBackup';

interface Props {
  enabled: boolean;
}

const formatSummary = (summary: GroupBackupSummary): string =>
  `${summary.users} usuário(s), ${summary.invites} convite(s), ${summary.groups} grupo(s), ${summary.sections} seção(ões), ${summary.sectionDocs} doc(s) de seção, ${summary.memberDocs} doc(s) de jovem`;

export const GroupBackupPanel: React.FC<Props> = ({ enabled }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<GroupFirestoreBackup | null>(null);

  if (!enabled) return null;

  const showOk = (message: string) => {
    setError(null);
    setFeedback(message);
  };
  const showErr = (err: unknown) => {
    setFeedback(null);
    setError(err instanceof Error ? err.message : 'Operação recusada.');
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const summary = await downloadGroupFirestoreBackup();
      showOk(`Backup baixado: ${formatSummary(summary)}.`);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const backup = await parseGroupFirestoreBackupFile(file);
      setPending(backup);
      setError(null);
      setFeedback(null);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!pending) return;
    const toRestore = pending;
    setPending(null);
    setBusy(true);
    try {
      const summary = await importGroupFirestoreBackup(toRestore);
      showOk(`Backup restaurado: ${formatSummary(summary)}.`);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  };

  const pendingSummary = pending ? summarizeGroupBackup(pending) : null;

  return (
    <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
      <div>
        <h4 className="font-bold text-sm text-slate-800">Backup do grupo (Firestore)</h4>
        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
          Baixa um JSON com usuários, convites, grupos, seções e os documentos de cada seção
          (jovens, reuniões, progressão etc.). Não inclui senhas, hashes do Firebase Auth nem chaves de API.
          Funciona no plano Spark, sem Cloud Storage. Restaurar grava por cima dos documentos do arquivo;
          contas do Authentication não são criadas por este JSON.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => { void handleDownload(); }}
          className="px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Aguarde…' : 'Baixar backup JSON'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={e => { void handlePickFile(e.target.files?.[0]); }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 bg-amber-700 text-white rounded text-xs font-bold hover:bg-amber-600 disabled:opacity-60"
        >
          Restaurar backup…
        </button>
      </div>
      {feedback && <p className="text-xs text-green-700 font-bold">{feedback}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {pending && pendingSummary && (
        <ConfirmDialog
          title="Restaurar backup do grupo?"
          message={`Isto grava no Firestore os dados do arquivo (${formatSummary(pendingSummary)}). Não recria contas do Firebase Authentication. Documentos do arquivo substituem os atuais. Continuar?`}
          confirmText="Restaurar"
          danger
          onConfirm={() => { void handleRestore(); }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
};
