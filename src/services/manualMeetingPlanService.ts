import { Activity, MeetingPlan, ScoutBranch } from '../types';
import { buildGenerationSeed } from './generationSeed';
import {
  applyMeetingHeader,
  isCoreScheduleSlot,
  stampActivities,
  stampScheduleTimes,
} from './meetingScheduleService';
import { normalizePlanForUse } from './planNormalizationService';
export { validateManualActivities } from './manualActivityValidation';

export interface ManualPlanInput {
  branch: ScoutBranch;
  activities: Activity[];
  theme: string;
  totalDuration: number;
  participantsCount: number;
  meetingStartTime: string;
  unitName?: string;
  meetingDate?: string;
  cycleLabel?: string;
  meetingType?: string;
  objectives?: string;
  technicalContent?: string;
  authorId?: string;
  authorName?: string;
  sectionId?: string;
}

/** Monta um plano completo a partir do cronograma, sem usar provedor de IA. */
export const buildManualMeetingPlan = (input: ManualPlanInput): MeetingPlan => {
  const activities = stampActivities(input.activities, input.meetingStartTime);
  const totalDuration = activities.reduce(
    (sum, activity) => sum + Math.max(0, Number(activity.durationMinutes) || 0),
    0,
  );
  const plan = applyMeetingHeader(
    stampScheduleTimes({
      theme: input.theme.trim() || 'Reunião da seção',
      branch: input.branch,
      totalDuration: totalDuration || input.totalDuration,
      generalNotes: 'Planejamento preenchido manualmente pela chefia.',
      activities,
      studyGuide: [],
      authorId: input.authorId,
      authorName: input.authorName,
      sectionId: input.sectionId,
    }, input.meetingStartTime),
    {
      unitName: input.unitName,
      meetingDate: input.meetingDate,
      cycleLabel: input.cycleLabel,
      meetingType: input.meetingType,
      objectives: input.objectives,
      technicalContent: input.technicalContent,
      meetingStartTime: input.meetingStartTime,
      theme: input.theme,
    },
  );
  plan.generationSeed = buildGenerationSeed({
    narrativeTheme: input.theme,
    planningMode: 'from_selection',
    activityCount: activities.filter(isCoreScheduleSlot).length,
    totalDuration: plan.totalDuration,
    participantsCount: input.participantsCount,
    meetingDate: input.meetingDate,
    cycleLabel: input.cycleLabel,
    meetingType: input.meetingType,
    objectives: input.objectives,
    technicalContent: input.technicalContent,
    meetingStartTime: input.meetingStartTime,
    unitName: input.unitName,
    scheduleDraft: activities,
  });
  return normalizePlanForUse(plan);
};
