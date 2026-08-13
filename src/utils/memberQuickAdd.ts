import { ScoutBranch, ScoutMember, TroopRole } from '../types';

/** Gera id estável para novos membros. */
export const newMemberId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

const ROLE_ALIASES: Record<string, TroopRole> = {
  chefe: TroopRole.CHEFE,
  chefia: TroopRole.CHEFE,
  scouter: TroopRole.CHEFE,
  assistente: TroopRole.ASSISTENTE,
  assist: TroopRole.ASSISTENTE,
  adjunto: TroopRole.ASSISTENTE,
  juvenil: TroopRole.JUVENIL,
  jovem: TroopRole.JUVENIL,
  escoteiro: TroopRole.JUVENIL,
  lobinho: TroopRole.JUVENIL,
  senior: TroopRole.JUVENIL,
  pioneiro: TroopRole.JUVENIL,
};

const parseRoleToken = (token: string): TroopRole | undefined => {
  const key = token.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return ROLE_ALIASES[key];
};

export type ParsedMemberLine = {
  name: string;
  registerNumber?: string;
  patrol?: string;
  role?: TroopRole;
};

/**
 * Aceita listas flexíveis, uma pessoa por linha (ou separadas por ;):
 * - "João"
 * - "Maria Silva"
 * - "Pedro, 12345, Águia"
 * - "Ana | Chefe"
 * - "Bruno | Assistente"
 * - "Carla; Chefe" (pipe ou última coluna como função se bater com alias)
 */
export const parseMemberLines = (text: string): ParsedMemberLine[] => {
  if (!text?.trim()) return [];

  const rawLines = text
    .split(/\r?\n|;/)
    .map(l => l.trim())
    .filter(Boolean);

  const out: ParsedMemberLine[] = [];

  for (const line of rawLines) {
    // "Nome | Função"
    if (line.includes('|')) {
      const [namePart, rolePart] = line.split('|').map(s => s.trim());
      if (!namePart) continue;
      out.push({ name: cleanName(namePart), role: rolePart ? parseRoleToken(rolePart) : undefined });
      continue;
    }

    // CSV: Nome, Registro?, Patrulha?/Função?
    if (line.includes(',')) {
      const parts = line.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      const name = cleanName(parts[0]);
      if (!name) continue;

      if (parts.length === 1) {
        out.push({ name });
        continue;
      }

      // 2 colunas: nome + (função OU registro OU patrulha)
      if (parts.length === 2) {
        const role = parseRoleToken(parts[1]);
        if (role) out.push({ name, role });
        else if (/^\d[\d.\-\/]*$/.test(parts[1])) out.push({ name, registerNumber: parts[1] });
        else out.push({ name, patrol: parts[1] });
        continue;
      }

      // 3+: nome, registro, patrulha [, função]
      const registerNumber = parts[1] || undefined;
      const patrol = parts[2] || undefined;
      const role = parts[3] ? parseRoleToken(parts[3]) : parseRoleToken(parts[2] || '');
      out.push({
        name,
        registerNumber: registerNumber && !parseRoleToken(registerNumber) ? registerNumber : undefined,
        patrol: role && parts[2] && parseRoleToken(parts[2]) ? undefined : patrol,
        role: role || undefined,
      });
      continue;
    }

    // Só nome (pode ser primeiro nome)
    const name = cleanName(line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''));
    if (name) out.push({ name });
  }

  // Dedup por nome (case-insensitive) mantendo a primeira ocorrência
  const seen = new Set<string>();
  return out.filter(p => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const cleanName = (s: string): string =>
  s.replace(/^[-*•\d.)\s]+/, '').replace(/\s+/g, ' ').trim();

/** Perfil incompleto: dá para usar, mas falta completar depois. */
export const isMemberProfileIncomplete = (m: ScoutMember): boolean => {
  const name = (m.name || '').trim();
  if (!name) return true;
  // Juvenil de lobinho/escoteiro sem nascimento (idade-limite / reconhecimentos)
  if (
    m.role === TroopRole.JUVENIL &&
    (m.branch === ScoutBranch.LOBINHO || m.branch === ScoutBranch.ESCOTEIRO) &&
    !m.birthDate
  ) {
    return true;
  }
  return false;
};

export const incompleteReasons = (m: ScoutMember): string[] => {
  const reasons: string[] = [];
  if (!(m.name || '').trim()) reasons.push('nome');
  if (
    m.role === TroopRole.JUVENIL &&
    (m.branch === ScoutBranch.LOBINHO || m.branch === ScoutBranch.ESCOTEIRO) &&
    !m.birthDate
  ) {
    reasons.push('nascimento');
  }
  if (m.role === TroopRole.JUVENIL && !m.patrol) reasons.push('patrulha/matilha');
  if (!m.registerNumber) reasons.push('registro UEB');
  return reasons;
};

export const buildMinimalMember = (opts: {
  name: string;
  sectionId: string;
  branch: ScoutBranch;
  role?: TroopRole;
  patrol?: string;
  registerNumber?: string;
}): ScoutMember => {
  const member: ScoutMember = {
    id: newMemberId(),
    name: opts.name.trim(),
    sectionId: opts.sectionId,
    branch: opts.branch,
    role: opts.role || TroopRole.JUVENIL,
    isArchived: false,
  };
  if (opts.patrol) member.patrol = opts.patrol;
  if (opts.registerNumber) member.registerNumber = opts.registerNumber;
  return member;
};

/** Mensagem em português para falha de gravação (Firestore/lock/FS). */
export const formatMemberWriteError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err || '');
  if (/permission-denied|insufficient permissions/i.test(raw)) {
    return 'Sem permissão para gravar nesta seção. Peça a um administrador para liberar o acesso.';
  }
  if (/modo consulta|sem lock/i.test(raw)) {
    return 'A seção está em modo consulta. Ative a edição para cadastrar membros.';
  }
  if (/unsupported field value: undefined/i.test(raw)) {
    return 'Não foi possível gravar os membros (campo vazio incompatível com o Firestore). Tente novamente.';
  }
  if (/seção não definida/i.test(raw)) {
    return 'Seção não definida. Recarregue a página e tente de novo.';
  }
  return raw
    ? `Não foi possível cadastrar os membros. ${raw}`
    : 'Não foi possível cadastrar os membros. Tente novamente.';
};
