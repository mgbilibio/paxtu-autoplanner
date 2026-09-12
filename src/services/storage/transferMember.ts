import type { ScoutMember, SectionEnrollment } from '../../types.ts';
import { ScoutBranch } from '../../types.ts';
import { applyIdentifiedPatch, type RevisionedList } from './revisionList.ts';

export const TRANSFER_IN_FLIGHT_MESSAGE =
  'Transferência já em andamento para este jovem. Aguarde ou retome o comando.';

export const TRANSFER_PHASES = [
  'started',
  'copied-subdocs',
  'dest-upserted',
  'source-removed',
  'source-purged',
  'done',
] as const;

export type TransferPhase = typeof TRANSFER_PHASES[number];

export type TransferCommand = {
  memberId: string;
  fromSectionId: string;
  toSectionId: string;
  toBranch?: ScoutBranch;
  at: string;
};

export type TransferJournal = TransferCommand & {
  phase: TransferPhase;
};

export const beginTransferJournal = (command: TransferCommand): TransferJournal => ({
  ...command,
  phase: 'started',
});

export const transferPhaseIndex = (phase: TransferPhase): number =>
  TRANSFER_PHASES.indexOf(phase);

export const advanceTransferJournal = (journal: TransferJournal, phase: TransferPhase): TransferJournal => {
  if (transferPhaseIndex(journal.phase) >= transferPhaseIndex(phase)) return journal;
  return { ...journal, phase };
};

export const isTransferPhaseDone = (journal: TransferJournal | null | undefined, phase: TransferPhase): boolean =>
  !!journal && transferPhaseIndex(journal.phase) >= transferPhaseIndex(phase);

export const assertTransferJournalAllows = (
  existing: TransferJournal | null | undefined,
  command: TransferCommand,
): void => {
  if (!existing || existing.phase === 'done') return;
  if (
    existing.memberId === command.memberId
    && existing.fromSectionId === command.fromSectionId
    && existing.toSectionId === command.toSectionId
  ) {
    return;
  }
  throw new Error(TRANSFER_IN_FLIGHT_MESSAGE);
};

/** Merge usado no Firestore: delete na origem + upsert no destino sobre as listas *vivas*. */
export const applyTransferPatchesOnLive = <T extends { id: string }>(
  sourceLive: RevisionedList<T>,
  destLive: RevisionedList<T>,
  memberToRemove: T,
  transferred: T,
): { source: RevisionedList<T>; dest: RevisionedList<T> } => {
  const source = applyIdentifiedPatch(sourceLive, {
    kind: 'delete',
    item: memberToRemove,
    baseItem: sourceLive.items.find(item => item.id === memberToRemove.id) || memberToRemove,
  });
  const destExisting = destLive.items.find(item => item.id === transferred.id) || null;
  const dest = applyIdentifiedPatch(destLive, {
    kind: 'upsert',
    item: transferred,
    baseItem: destExisting,
  });
  return { source, dest };
};

export const applyMembershipTransfer = (args: {
  member: ScoutMember;
  fromMembers: ScoutMember[];
  toMembers: ScoutMember[];
  command: TransferCommand;
}): { fromMembers: ScoutMember[]; toMembers: ScoutMember[]; transferred: ScoutMember } => {
  const { member, command } = args;
  if (command.fromSectionId === command.toSectionId) {
    throw new Error('Origem e destino da transferência precisam ser seções diferentes.');
  }
  if (member.id !== command.memberId) {
    throw new Error('O jovem do comando não confere com o cadastro lido.');
  }
  const alreadyGone = !args.fromMembers.some(item => item.id === member.id);
  const alreadyThere = args.toMembers.some(item => item.id === member.id);
  if (alreadyGone && alreadyThere) {
    const existing = args.toMembers.find(item => item.id === member.id)!;
    return { fromMembers: args.fromMembers, toMembers: args.toMembers, transferred: existing };
  }

  const now = command.at;
  const prior = member.enrollments || [];
  const closedPrior = prior.map(entry =>
    entry.isActive ? { ...entry, isActive: false, endDate: now } : entry,
  );
  const hadActive = prior.some(entry => entry.isActive);
  const closingEntry: SectionEnrollment[] = hadActive
    ? []
    : [{
        sectionId: command.fromSectionId,
        role: member.role,
        startDate: member.admissionDate || now,
        endDate: now,
        isActive: false,
      }];
  const newActive: SectionEnrollment = {
    sectionId: command.toSectionId,
    role: member.role,
    startDate: now,
    isActive: true,
  };
  const transferred: ScoutMember = {
    ...member,
    sectionId: command.toSectionId,
    branch: command.toBranch ?? member.branch,
    enrollments: [...closedPrior, ...closingEntry, newActive],
    isArchived: false,
  };
  const fromMembers = args.fromMembers.filter(item => item.id !== member.id);
  const withoutDup = args.toMembers.filter(item => item.id !== member.id);
  return {
    fromMembers,
    toMembers: [...withoutDup, transferred],
    transferred,
  };
};
