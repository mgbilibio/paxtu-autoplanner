import { Activity, EducationalArea, MeetingPlan } from '../types';

export interface ScheduleOptions {
  includeOpening: boolean;
  includeBreaks: boolean;
  includeClosing: boolean;
  startTime: string;
  openingMinutes: number;
  breakMinutes: number;
  closingMinutes: number;
}

export const defaultScheduleOptions: ScheduleOptions = {
  includeOpening: true,
  includeBreaks: true,
  includeClosing: true,
  startTime: '15:30',
  openingMinutes: 10,
  breakMinutes: 5,
  closingMinutes: 10,
};

export const estimateOperationalMinutes = (
  activityCount: number,
  options: ScheduleOptions,
): number => {
  const breaks = options.includeBreaks ? Math.max(0, activityCount - 1) * options.breakMinutes : 0;
  return (options.includeOpening ? options.openingMinutes : 0) +
    breaks +
    (options.includeClosing ? options.closingMinutes : 0);
};

const timeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return ((hours || 0) * 60) + (minutes || 0);
};

const minutesToTime = (value: number): string => {
  const normalized = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

const operationalActivity = (
  title: string,
  minutes: number,
  type: Activity['operationalType'],
  description: string,
): Activity => ({
  title,
  durationMinutes: minutes,
  educationalArea: EducationalArea.CARATER,
  description,
  materials: type === 'break' ? ['Água disponível', 'Acesso ao banheiro'] : ['Bandeira', 'Apito', 'Livro de cerimônias'],
  progressionObjective: 'Operacional',
  isOperational: true,
  operationalType: type,
  evaluation: {
    acompanhamento: 'Chefia acompanha organização, segurança, pontualidade e participação.',
    avaliacaoJovens: 'Jovens avaliam rapidamente postura, prontidão e cuidado coletivo.',
    avaliacaoChefia: 'Registrar apenas observações relevantes para condução da reunião.',
    requisitosObservaveis: ['Participação organizada', 'Respeito aos combinados', 'Segurança mantida'],
    criteriosDeAceite: ['Bloco executado no tempo previsto e sem perda de controle da seção'],
    evidenciasSugeridas: ['Anotação de ocorrência se houver'],
  },
});

export const applyOperationalSchedule = (
  plan: MeetingPlan,
  options: ScheduleOptions,
): MeetingPlan => {
  const core = plan.activities || [];
  const activities: Activity[] = [];
  if (options.includeOpening) {
    activities.push(operationalActivity(
      'IBOA e abertura da bandeira',
      options.openingMinutes,
      'opening',
      'Recepção, inspeção breve, organização da seção, oração/reflexão quando aplicável e abertura da bandeira.',
    ));
  }
  core.forEach((activity, index) => {
    activities.push(activity);
    if (options.includeBreaks && index < core.length - 1) {
      activities.push(operationalActivity(
        'Intervalo de banheiro e hidratação',
        options.breakMinutes,
        'break',
        'Pausa curta entre atividades para água, banheiro, reorganização de materiais e transição segura.',
      ));
    }
  });
  if (options.includeClosing) {
    activities.push(operationalActivity(
      'Encerramento da bandeira',
      options.closingMinutes,
      'closing',
      'Fechamento da reunião, avisos finais, agradecimentos, avaliação rápida e encerramento da bandeira.',
    ));
  }
  let cursor = timeToMinutes(options.startTime);
  const scheduled = activities.map(activity => {
    const start = cursor;
    cursor += activity.durationMinutes || 0;
    return {
      ...activity,
      scheduledStartTime: minutesToTime(start),
      scheduledEndTime: minutesToTime(cursor),
    };
  });
  return {
    ...plan,
    activities: scheduled,
    totalDuration: scheduled.reduce((sum, activity) => sum + (activity.durationMinutes || 0), 0),
  };
};
