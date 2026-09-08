import assert from 'node:assert/strict';
import test from 'node:test';
import type { Activity } from '../types.ts';
import { EducationalArea, ScoutBranch } from '../types.ts';
import { validateManualActivities } from './manualActivityValidation.ts';
import { buildManualMeetingPlan } from './manualMeetingPlanService.ts';

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

test('validação manual não bloqueia rascunho incompleto', () => {
  const result = validateManualActivities([activity({ description: '', materials: [] })]);
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some(item => /descreva como fazer/i.test(item)));
  assert.ok(result.warnings.some(item => /materiais ainda vazios/i.test(item)));
  assert.equal(result.warnings.some(item => /nenhum/i.test(item)), false);
});

test('validação manual avisa referências ausentes sem erro', () => {
  const result = validateManualActivities([
    activity({ progressionObjective: '', instrucaoChefia: '' }),
  ]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 2);
});

test('título vazio e cronograma vazio só avisam', () => {
  assert.equal(validateManualActivities([activity({ title: '' })]).errors.length, 0);
  const empty = validateManualActivities([]);
  assert.equal(empty.errors.length, 0);
  assert.ok(empty.warnings.length > 0);
});

test('plano manual monta rascunho incompleto sem lançar', () => {
  const plan = buildManualMeetingPlan({
    branch: ScoutBranch.ESCOTEIRO,
    activities: [activity({ title: '', description: '', materials: [] })],
    theme: 'Rascunho da tropa',
    totalDuration: 90,
    participantsCount: 20,
    meetingStartTime: '19:00',
  });
  assert.ok(plan.activities.length >= 1);
  assert.equal(plan.theme.includes('Rascunho') || plan.theme.length > 0, true);
});
