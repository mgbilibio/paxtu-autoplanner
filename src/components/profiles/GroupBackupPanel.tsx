import React, { useRef, useState } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { PasswordField } from '../PasswordField';
import {
  downloadGroupFirestoreBackup,
  importGroupFirestoreBackup,
  parseGroupFirestoreBackupFile,
  summarizeGroupBackup,
  type GroupBackupSummary,
  type GroupFirestoreBackup,
} from '../../services/firebase/groupBackup';
import { GROUP_BACKUP_MIN_PASSWORD } from '../../services/firebase/groupBackupCrypto';

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
  const [pendingPlain, setPendingPlain] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');

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
      const summary = await downloadGroupFirestoreBackup(exportPassword);
      setExportPassword('');
      showOk(`Backup criptografado baixado: ${formatSummary(summary)}. Guarde a senha — sem ela o arquivo não abre.`);
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
      const parsed = await parseGroupFirestoreBackupFile(file, importPassword);
      setPending(parsed.backup);
      setPendingPlain(!parsed.encrypted);
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
    setPendingPlain(false);
    setBusy(true);
    try {
      const summary = await importGroupFirestoreBackup(toRestore);
      setImportPassword('');
      showOk(`Backup restaurado: ${formatSummary(summary)}. Seu acesso de administrador foi preservado.`);
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
          O JSON contém dados de jovens (nomes, progressão, às vezes saúde/contato). Sai sempre
          criptografado com a senha abaixo. Não inclui senhas do Firebase Auth nem chaves de API.
          Restaurar grava por cima, mas não rebaixa o administrador que está logado.
        </p>
      </div>
      <PasswordField
        label={`Senha do backup (mín. ${GROUP_BACKUP_MIN_PASSWORD} caracteres)`}
        className="w-full p-2 border rounded bg-white"
        value={exportPassword}
        onChange={e => setExportPassword(e.target.value)}
        autoComplete="new-password"
        minLength={GROUP_BACKUP_MIN_PASSWORD}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => { void handleDownload(); }}
          className="px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Aguarde…' : 'Baixar backup criptografado'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={e => { void handlePickFile(e.target.files?.[0]); }}
        />
      </div>
      <PasswordField
        label="Senha para restaurar (se o arquivo for criptografado)"
        className="w-full p-2 border rounded bg-white"
        value={importPassword}
        onChange={e => setImportPassword(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="px-3 py-2 bg-amber-700 text-white rounded text-xs font-bold hover:bg-amber-600 disabled:opacity-60"
      >
        Restaurar backup…
      </button>
      {feedback && <p className="text-xs text-green-700 font-bold">{feedback}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {pending && pendingSummary && (
        <ConfirmDialog
          title="Restaurar backup do grupo?"
          message={
            pendingPlain
              ? `Arquivo antigo sem criptografia (${formatSummary(pendingSummary)}). Isto substitui os documentos atuais. Seu login de administrador não será rebaixado. Continuar?`
              : `Isto grava no Firestore os dados do arquivo (${formatSummary(pendingSummary)}). Não recria contas do Firebase Authentication. Seu acesso de administrador é preservado. Continuar?`
          }
          confirmText="Restaurar"
          danger
          onConfirm={() => { void handleRestore(); }}
          onCancel={() => { setPending(null); setPendingPlain(false); }}
        />
      )}
    </div>
  );
};
