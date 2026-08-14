import React, { useEffect, useRef, useState } from 'react';
import { ScoutSection, UserProfile } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  canManageSectionPack,
  canPickSectionForPack,
  describeSectionPackMismatch,
  downloadSectionPack,
  importSectionPack,
  parseSectionPackFile,
  sectionIdForPack,
  summarizeSectionPack,
  type SectionPack,
  type SectionPackSummary,
} from '../../services/firebase/sectionPack';

interface Props {
  user?: UserProfile | null;
  currentSection?: ScoutSection | null;
  sections: ScoutSection[];
}

const formatSummary = (summary: SectionPackSummary): string => {
  const base = `${summary.members} jovem(ns)/adulto(s), ${summary.teams} equipe(s), ${summary.withOfficial} com histórico oficial`;
  if (summary.created || summary.updated) {
    return `${base}. Mesclados: ${summary.updated} atualizado(s), ${summary.created} novo(s)`;
  }
  return base;
};

export const SectionPackPanel: React.FC<Props> = ({ user, currentSection, sections }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SectionPack | null>(null);
  const [sectionId, setSectionId] = useState('');

  const canManage = canManageSectionPack(user);
  const canPick = canPickSectionForPack(user);

  useEffect(() => {
    const preferred = sectionIdForPack(user, currentSection, sections);
    setSectionId(prev => {
      if (canPick) {
        if (prev && sections.some(item => item.id === prev)) return prev;
        if (preferred && sections.some(item => item.id === preferred)) return preferred;
        return '';
      }
      return preferred;
    });
  }, [user, currentSection, sections, canPick]);

  if (!canManage) return null;

  const selected = sections.find(item => item.id === sectionId) || null;
  const mismatchWarning = pending && selected ? describeSectionPackMismatch(pending, selected) : null;

  const showOk = (message: string) => {
    setError(null);
    setFeedback(message);
  };
  const showErr = (err: unknown) => {
    setFeedback(null);
    setError(err instanceof Error ? err.message : 'Operação recusada.');
  };

  const requireSelectedSection = (action: 'exportar' | 'importar'): string | null => {
    const targetId = sectionId.trim();
    if (!targetId || !selected || selected.id !== targetId) {
      showErr(new Error(`Selecione uma seção para ${action} o pacote.`));
      return null;
    }
    return targetId;
  };

  const handleDownload = async () => {
    const targetId = requireSelectedSection('exportar');
    if (!targetId) return;
    setBusy(true);
    try {
      const summary = await downloadSectionPack(targetId);
      showOk(`Pacote baixado: ${formatSummary(summary)}.`);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  };

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!requireSelectedSection('importar')) return;
    setBusy(true);
    try {
      const pack = await parseSectionPackFile(file);
      setPending(pack);
      setError(null);
      setFeedback(null);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!pending) return;
    const targetId = requireSelectedSection('importar');
    if (!targetId) {
      setPending(null);
      return;
    }
    const toImport = pending;
    setPending(null);
    setBusy(true);
    try {
      const summary = await importSectionPack(toImport, targetId);
      showOk(`Pacote mesclado: ${formatSummary(summary)}. Progressão por blocos e legado não foram apagadas.`);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  };

  const pendingSummary = pending ? summarizeSectionPack(pending) : null;
  const targetName = selected?.name || 'a seção escolhida';

  return (
    <div className="border rounded-lg p-4 bg-indigo-50 space-y-3">
      <div>
        <h4 className="font-bold text-sm text-indigo-950">Pacote da seção (ScoutsAuto)</h4>
        <p className="text-[11px] text-indigo-900 mt-1 leading-relaxed">
          JSON da seção escolhida: equipes, efetivo e histórico oficial UEB. Não inclui senhas nem chaves.
          Importar <strong>mescla</strong> por registro UEB, depois id, depois nome — não apaga quem falta
          no arquivo e não limpa progressão POR 2025+ nem o mapa legado.
          Jovens e equipes vão só para a seção selecionada neste painel.
          {canPick ? ' Administrador escolhe a seção; o arquivo não decide o destino.' : ' Chefe exporta e importa só a própria seção.'}
        </p>
      </div>
      {canPick && (
        <label className="block text-xs font-bold text-indigo-950">
          Seção
          <select
            className="mt-1 w-full p-2 border rounded bg-white font-normal"
            value={sectionId}
            onChange={e => setSectionId(e.target.value)}
            disabled={busy}
          >
            <option value="">Selecione a seção…</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </label>
      )}
      {!canPick && selected && (
        <p className="text-xs text-indigo-900">Seção: <strong>{selected.name}</strong></p>
      )}
      {!canPick && !selected && (
        <p role="alert" className="text-xs text-red-700">Nenhuma seção vinculada para exportar ou importar.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() => { void handleDownload(); }}
          className="px-3 py-2 bg-indigo-800 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Aguarde…' : 'Exportar pacote JSON'}
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
          disabled={busy || !selected}
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 bg-amber-700 text-white rounded text-xs font-bold hover:bg-amber-600 disabled:opacity-60"
        >
          Importar pacote…
        </button>
      </div>
      {feedback && <p className="text-xs text-green-800 font-bold">{feedback}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {pending && pendingSummary && (
        <ConfirmDialog
          title={mismatchWarning ? 'Pacote de outra seção. Mesclar mesmo assim?' : 'Mesclar pacote da seção?'}
          message={(
            <>
              Isto atualiza <strong>{targetName}</strong> com o arquivo ({formatSummary(pendingSummary)}).
              {mismatchWarning && (
                <>
                  {'\n\n'}
                  <span className="text-amber-900 font-semibold">{mismatchWarning}</span>
                </>
              )}
              {'\n\n'}
              Ninguém é excluído por estar ausente no JSON. A progressão por blocos e o histórico legado permanecem. Continuar?
            </>
          )}
          confirmText={mismatchWarning ? 'Mesclar na seção escolhida' : 'Mesclar'}
          cancelText="Cancelar"
          danger={!!mismatchWarning}
          onConfirm={() => { void handleImport(); }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
};
