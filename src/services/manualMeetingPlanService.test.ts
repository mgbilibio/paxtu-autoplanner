import assert from 'node:assert/strict';
import test from 'node:test';
import type { Activity } from '../types.ts';
import { EducationalArea } from '../types.ts';
import {
  canPersistManualDraft,
  validateManualActivities,
} from './manualActivityValidation.ts';

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

test('screenshot: descrição e materiais vazios não abortam o salvamento', () => {
  const draft = [
    activity({ description: '' }),
    activity({ materials: [] }),
    activity({ description: '', materials: [] }),
    activity({ title: '', description: '', materials: [] }),
  ];
  const result = validateManualActivities(draft);
  assert.equal(canPersistManualDraft(draft), true);
  assert.equal('errors' in result, false);
  assert.ok(result.warnings.some(item => /Atividade 1: descreva como fazer/i.test(item)));
  assert.ok(result.warnings.some(item => /Atividade 2: materiais ainda vazios/i.test(item)));
  assert.equal(result.warnings.some(item => /nenhum/i.test(item)), false);
});

test('validação manual avisa referências ausentes sem impedir persistir', () => {
  const result = validateManualActivities([
    activity({ progressionObjective: '', instrucaoChefia: '' }),
  ]);
  assert.equal(canPersistManualDraft(), true);
  assert.equal(result.warnings.length, 2);
});

test('título vazio e cronograma vazio continuam graváveis', () => {
  assert.equal(canPersistManualDraft([activity({ title: '' })]), true);
  assert.equal(canPersistManualDraft([]), true);
  const empty = validateManualActivities([]);
  assert.ok(empty.warnings.length > 0);
});
