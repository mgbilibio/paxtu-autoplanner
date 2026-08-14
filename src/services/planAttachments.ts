/** Anexos de contexto do planejador. Ficam só na sessão do navegador — nunca no git/Firebase. */

export type PlanAttachmentKind = 'text' | 'image' | 'pdf';

export interface PlanAttachment {
  id: string;
  name: string;
  mime: string;
  kind: PlanAttachmentKind;
  text?: string;
  dataBase64?: string;
  size: number;
}

export interface GeminiInlinePart {
  inlineData: { mimeType: string; data: string };
}

export const PLAN_ATTACHMENT_MAX_FILES = 6;
export const PLAN_ATTACHMENT_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const PLAN_ATTACHMENT_MAX_TOTAL_BYTES = 24 * 1024 * 1024;
export const PLAN_ATTACHMENT_MAX_TEXT_CHARS = 80_000;
export const PLAN_ATTACHMENT_ACCEPT = '.txt,.md,.html,.htm,.pdf,image/*';

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const newId = (): string =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

export const formatAttachmentSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
};

/** Classifica o arquivo ou devolve motivo de recusa (uma linha). */
export const classifyPlanFile = (file: File): { kind: PlanAttachmentKind; mime: string } | { error: string } => {
  const name = file.name || 'arquivo';
  const ext = extOf(name);
  const type = (file.type || '').toLowerCase();

  if (type === 'application/pdf' || ext === '.pdf') {
    return { kind: 'pdf', mime: 'application/pdf' };
  }
  if (type === 'image/jpeg' || type === 'image/jpg' || ext === '.jpg' || ext === '.jpeg') {
    return { kind: 'image', mime: 'image/jpeg' };
  }
  if (type === 'image/png' || ext === '.png') {
    return { kind: 'image', mime: 'image/png' };
  }
  if (type === 'image/webp' || ext === '.webp') {
    return { kind: 'image', mime: 'image/webp' };
  }
  if (type === 'image/gif' || ext === '.gif') {
    return { kind: 'image', mime: 'image/gif' };
  }
  if (type.startsWith('image/')) {
    return { error: `${name}: use jpeg, png, webp ou gif.` };
  }
  if (type === 'text/plain' || ext === '.txt') {
    return { kind: 'text', mime: 'text/plain' };
  }
  if (type === 'text/markdown' || ext === '.md') {
    return { kind: 'text', mime: 'text/markdown' };
  }
  if (type === 'text/html' || ext === '.html' || ext === '.htm') {
    return { kind: 'text', mime: 'text/html' };
  }
  return { error: `${name}: tipo não suportado. Use txt, md, html, imagem (jpeg/png/webp/gif) ou PDF.` };
};

/** Remove script/style e devolve texto legível. Não executa HTML. */
export const stripHtmlToReadableText = (html: string): string => {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped) return stripped;
  const truncated = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .slice(0, 20_000);
  return truncated;
};

const bytesToLatin1 = (bytes: Uint8Array): string => {
  let out = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    out += String.fromCharCode.apply(null, Array.from(slice));
  }
  return out;
};

/** Extração best-effort de strings de um PDF, sem pdf.js. */
export const tryExtractPdfText = (bytes: Uint8Array): string | undefined => {
  try {
    const raw = bytesToLatin1(bytes);
    const chunks: string[] = [];
    const paren = /\((?:\\.|[^\\)])*\)/g;
    let match: RegExpExecArray | null;
    while ((match = paren.exec(raw)) !== null) {
      const inner = match[0].slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\(.)/g, '$1');
      if (/[A-Za-zÀ-ÿ]{3,}/.test(inner)) chunks.push(inner);
      if (chunks.length > 4000) break;
    }
    const text = chunks.join(' ').replace(/\s+/g, ' ').trim();
    return text.length >= 20 ? text : undefined;
  } catch {
    return undefined;
  }
};

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
    reader.readAsDataURL(file);
  });

const capText = (text: string, remaining: number): { text: string; used: number; truncated: boolean } => {
  if (remaining <= 0) return { text: '', used: 0, truncated: true };
  if (text.length <= remaining) return { text, used: text.length, truncated: false };
  const note = '\n[…texto truncado por limite de 80 mil caracteres]';
  const keep = Math.max(0, remaining - note.length);
  return { text: text.slice(0, keep) + note, used: remaining, truncated: true };
};

export const readPlanAttachment = async (file: File, textBudget = PLAN_ATTACHMENT_MAX_TEXT_CHARS): Promise<PlanAttachment> => {
  const classified = classifyPlanFile(file);
  if ('error' in classified) throw new Error(classified.error);

  const base: PlanAttachment = {
    id: newId(),
    name: file.name || 'arquivo',
    mime: classified.mime,
    kind: classified.kind,
    size: file.size,
  };

  if (classified.kind === 'image') {
    if (!IMAGE_MIMES.has(classified.mime)) {
      throw new Error(`${file.name}: use jpeg, png, webp ou gif.`);
    }
    return { ...base, dataBase64: await readAsBase64(file) };
  }

  if (classified.kind === 'pdf') {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const extracted = tryExtractPdfText(bytes);
    const capped = extracted ? capText(extracted, textBudget) : undefined;
    return {
      ...base,
      dataBase64: await readAsBase64(file),
      text: capped?.text,
    };
  }

  let raw = await file.text();
  if (classified.mime === 'text/html') {
    raw = stripHtmlToReadableText(raw);
  }
  const capped = capText(raw, textBudget);
  return { ...base, text: capped.text };
};

export const attachmentsToPromptBlock = (atts: PlanAttachment[] | undefined): string => {
  if (!atts || atts.length === 0) return '';

  const lines: string[] = [
    'ANEXOS DE CONTEXTO:',
    'Use os anexos como referência (cerimonial, fotos do local, PDF da UEB, rascunho em md, etc.).',
    'Não invente o conteúdo dos arquivos. Se um anexo não estiver legível, diga isso em vez de inventar.',
  ];

  const binaries = atts.filter(a => a.kind === 'image' || a.kind === 'pdf');
  if (binaries.length > 0) {
    lines.push(
      'Arquivos binários (imagem/PDF): ' +
        binaries.map(a => `${a.name} (${a.kind}${a.text ? ', texto extraído abaixo' : ''})`).join('; ') +
        '.',
    );
  }

  for (const att of atts) {
    if (!att.text) continue;
    lines.push('');
    lines.push(`--- ${att.name} (${att.kind}) ---`);
    lines.push(att.text);
  }

  return lines.join('\n');
};

export const attachmentsToGeminiParts = (atts: PlanAttachment[] | undefined): GeminiInlinePart[] => {
  if (!atts) return [];
  return atts
    .filter(a => (a.kind === 'image' || a.kind === 'pdf') && a.dataBase64)
    .map(a => ({ inlineData: { mimeType: a.mime, data: a.dataBase64 as string } }));
};

export const hasBinaryPlanAttachments = (atts: PlanAttachment[] | undefined): boolean =>
  Boolean(atts?.some(a => a.kind === 'image' || a.kind === 'pdf'));

export const pdfWithoutExtractedText = (atts: PlanAttachment[] | undefined): PlanAttachment[] =>
  (atts || []).filter(a => a.kind === 'pdf' && !a.text?.trim());

export const addPlanAttachments = async (
  current: PlanAttachment[],
  incoming: FileList | File[],
): Promise<{ attachments: PlanAttachment[]; error?: string }> => {
  const files = Array.from(incoming || []);
  if (files.length === 0) return { attachments: current };

  const errors: string[] = [];
  const accepted: File[] = [];
  let total = current.reduce((sum, a) => sum + a.size, 0);
  let slots = PLAN_ATTACHMENT_MAX_FILES - current.length;

  if (slots <= 0) {
    return { attachments: current, error: `No máximo ${PLAN_ATTACHMENT_MAX_FILES} arquivos.` };
  }

  for (const file of files) {
    if (slots <= 0) {
      errors.push(`Limite de ${PLAN_ATTACHMENT_MAX_FILES} arquivos. Os demais foram ignorados.`);
      break;
    }
    const classified = classifyPlanFile(file);
    if ('error' in classified) {
      errors.push(classified.error);
      continue;
    }
    if (file.size > PLAN_ATTACHMENT_MAX_FILE_BYTES) {
      errors.push(`${file.name}: acima de 8 MB (${formatAttachmentSize(file.size)}).`);
      continue;
    }
    if (total + file.size > PLAN_ATTACHMENT_MAX_TOTAL_BYTES) {
      errors.push(`${file.name}: estoura o total de 24 MB.`);
      continue;
    }
    accepted.push(file);
    total += file.size;
    slots -= 1;
  }

  if (accepted.length === 0) {
    return { attachments: current, error: errors[0] || 'Nenhum arquivo válido.' };
  }

  const next = [...current];
  let textUsed = next.reduce((sum, a) => sum + (a.text?.length || 0), 0);
  let truncated = false;

  for (const file of accepted) {
    try {
      const att = await readPlanAttachment(file, Math.max(0, PLAN_ATTACHMENT_MAX_TEXT_CHARS - textUsed));
      textUsed += att.text?.length || 0;
      if (att.text && textUsed >= PLAN_ATTACHMENT_MAX_TEXT_CHARS) truncated = true;
      next.push(att);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Falha ao ler ${file.name}.`);
    }
  }

  if (truncated) {
    errors.push('Texto extraído limitado a 80 mil caracteres no total.');
  }

  return { attachments: next, error: errors[0] };
};
