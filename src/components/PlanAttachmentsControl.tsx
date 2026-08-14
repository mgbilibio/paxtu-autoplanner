import React, { useRef, useState } from 'react';
import { getAppConfig } from '../services/storageService';
import { normalizeProviderId } from '../services/llmProvider';
import {
  PLAN_ATTACHMENT_ACCEPT,
  PlanAttachment,
  addPlanAttachments,
  formatAttachmentSize,
  hasBinaryPlanAttachments,
  pdfWithoutExtractedText,
} from '../services/planAttachments';

interface Props {
  attachments: PlanAttachment[];
  onChange: (next: PlanAttachment[]) => void;
}

const kindIcon = (kind: PlanAttachment['kind']): string => {
  if (kind === 'image') return '🖼️';
  if (kind === 'pdf') return '📕';
  return '📄';
};

export const PlanAttachmentsControl: React.FC<Props> = ({ attachments, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const provider = normalizeProviderId(getAppConfig()?.llmProvider);
  const isGemini = provider === 'gemini';
  const showProviderHint = !isGemini;
  const pdfsSemTexto = !isGemini ? pdfWithoutExtractedText(attachments) : [];

  const ingest = async (files: FileList | File[]) => {
    setBusy(true);
    try {
      const result = await addPlanAttachments(attachments, files);
      onChange(result.attachments);
      setError(result.error || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ler o arquivo.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
    setError(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase">Anexos de contexto</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void ingest(e.dataTransfer.files);
        }}
        className={`rounded-lg border border-dashed p-2 space-y-1.5 ${
          dragOver ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {busy ? 'Lendo…' : 'Adicionar arquivo'}
          </button>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept={PLAN_ATTACHMENT_ACCEPT}
            onChange={(e) => {
              if (e.target.files?.length) void ingest(e.target.files);
            }}
          />
          {attachments.length > 0 && (
            <span className="text-[10px] text-slate-400">{attachments.length}/6</span>
          )}
        </div>
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {attachments.map(att => (
              <li
                key={att.id}
                className="inline-flex items-center gap-1 max-w-full bg-white border border-slate-200 rounded-full px-2 py-0.5 text-[10px] text-slate-700"
              >
                <span aria-hidden="true">{kindIcon(att.kind)}</span>
                <span className="truncate max-w-[9rem]" title={att.name}>{att.name}</span>
                <span className="text-slate-400">{formatAttachmentSize(att.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAt(att.id)}
                  className="text-slate-400 hover:text-red-600 font-black px-0.5"
                  aria-label={`Remover ${att.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[10px] text-slate-500">
        txt, md, html, imagem ou PDF. Fica só neste navegador e entra no contexto da IA.
      </p>
      {showProviderHint && (
        <p className="text-[10px] text-amber-800">
          PDF e imagem entram de fato no Gemini; nos outros providers só o texto extraído.
        </p>
      )}
      {pdfsSemTexto.length > 0 && (
        <p className="text-[10px] text-amber-800">
          Sem texto extraído de {pdfsSemTexto.map(a => a.name).join(', ')}. No Gemini o PDF vai como arquivo; aqui cole o texto se precisar.
        </p>
      )}
      {isGemini && hasBinaryPlanAttachments(attachments) && (
        <p className="text-[10px] text-slate-400">
          Imagem e PDF vão como partes do Gemini. Se o modelo recusar o PDF, troque o modelo ou cole o texto.
        </p>
      )}
      {error && (
        <p className="text-[10px] text-red-700" role="alert">{error}</p>
      )}
    </div>
  );
};
