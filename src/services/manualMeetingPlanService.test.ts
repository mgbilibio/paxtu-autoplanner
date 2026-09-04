import assert from 'node:assert/strict';
import test from 'node:test';
import type { Activity } from '../types.ts';
import { EducationalArea } from '../types.ts';
import { buildManualMeetingPlan } from './manualMeetingPlanService.ts';
import { validateManualActivities } from './manualActivityValidation.ts';

const activity = (patch: Partial<Activity> = {}): Activity => ({
  title: 'Jogo de nós',
  durationMinutes: 30,
  educationalArea: EducationalArea.INTELECTUAL,
  description: 'Demonstrar o nó, praticar em duplas e encerrar com aplicação.',
  materials: ['cordas'],
  progressionObjective: 'E12 — Aplicar nós em situações práticas',
  instrucaoChefia: 'Separar as duplas antes do início.',
  ...patch,
});

test('validação manual bloqueia apenas lacunas operacionais essenciais', () => {
  const result = validateManualActivities([activity({ description: '', materials: [] })]);
  assert.equal(result.errors.length, 2);
  assert.equal(result.warnings.length, 0);
});

test('validação manual avisa referências ausentes sem impedir o salvamento', () => {
  const result = validateManualActivities([
    activity({ progressionObjective: '', instrucaoChefia: '' }),
  ]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 2);
});

test('plano manual monta roteiro sem provedor de IA', () => {
  const plan = buildManualMeetingPlan({
    branch: 'Escoteiro',
    theme: 'Nós e amarras',
    totalDuration: 90,
    participantsCount: 16,
    meetingStartTime: '14:00',
    activities: [activity()],
  });
  assert.equal(plan.theme, 'Nós e amarras');
  assert.ok((plan.activities || []).length >= 1);
  assert.match(plan.generalNotes || '', /manualmente/i);
});
