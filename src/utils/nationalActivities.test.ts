import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NATIONAL_ACTIVITIES_2026 } from '../data/nationalActivities2026.ts';
import type { CalendarEvent } from '../types.ts';
import {
  buildNationalActivityEvent,
  formatOfficialWindow,
  nationalActivitiesForBranch,
  nationalActivityAlreadyOnSection,
  officialWindowNotes,
  selectNationalActivitiesToInclude,
} from './nationalActivities.ts';
import { branchFromKind, resolveSectionBranch } from '../services/firebase/sectionKind.ts';

describe('nationalActivitiesForBranch', () => {
  it('lists shared windows for Alcateia and hides Sangue/REDOME, Field Day and Radio', () => {
    const titles = nationalActivitiesForBranch('Lobinho').map(item => item.title);
    assert.ok(titles.includes('Semana Escoteira 2026'));
    assert.ok(titles.includes('12º Grande Jogo Aéreo'));
    assert.ok(titles.includes('Grande Jogo Naval 2026'));
    assert.equal(titles.some(title => title.includes('Sangue') || title.includes('REDOME')), false);
    assert.equal(titles.some(title => title.includes('Field Day')), false);
    assert.equal(titles.some(title => title.includes('Echolink') || title.includes('DMR')), false);
  });

  it('lists Tropa/Escoteiro items including Field Day and REDOME', () => {
    const titles = nationalActivitiesForBranch('Escoteiro').map(item => item.title);
    assert.ok(titles.includes('Semana Escoteira 2026'));
    assert.ok(titles.includes("14º Scout's Field Day"));
    assert.ok(titles.includes('Mutirão Nacional de Doação de Sangue e Cadastro REDOME (junho)'));
    assert.ok(titles.includes('6º Atividade Nacional de Radioescotismo em Echolink e DMR'));
    assert.equal(titles.length, NATIONAL_ACTIVITIES_2026.length);
  });

  it('maps tropa → Escoteiro and alcateia → Lobinho like the rest of the app', () => {
    assert.equal(branchFromKind('tropa'), 'Escoteiro');
    assert.equal(branchFromKind('alcateia'), 'Lobinho');
    assert.equal(resolveSectionBranch({ kind: 'tropa', branch: 'Sênior' }), 'Sênior');
    assert.equal(resolveSectionBranch({ kind: 'tropa' }), 'Escoteiro');
  });
});

describe('national activity include/exclude matching', () => {
  const tropaEvent: CalendarEvent = {
    id: 'evt-tropa',
    sectionId: 'tropa-rondon',
    date: '2026-04-11',
    title: 'Semana Escoteira 2026',
    branch: 'Escoteiro',
    attendance: [],
    notes: officialWindowNotes('2026-04-11', '2026-04-26'),
  };

  it('treats same title+start on this section as already included', () => {
    const found = nationalActivityAlreadyOnSection(
      [tropaEvent],
      'tropa-rondon',
      { title: 'Semana Escoteira 2026', start: '2026-04-11' },
    );
    assert.equal(found?.id, 'evt-tropa');
  });

  it('does not treat the other section copy as included', () => {
    const found = nationalActivityAlreadyOnSection(
      [tropaEvent],
      'alcateia-seeonee',
      { title: 'Semana Escoteira 2026', start: '2026-04-11' },
    );
    assert.equal(found, undefined);
  });

  it('skips idempotent include of title+date already on the section', () => {
    const toAdd = selectNationalActivitiesToInclude(
      NATIONAL_ACTIVITIES_2026.filter(item => item.title === 'Semana Escoteira 2026'),
      [tropaEvent],
      'tropa-rondon',
    );
    assert.deepEqual(toAdd, []);
  });

  it('builds one event for one sectionId with the official window in notes', () => {
    const activity = NATIONAL_ACTIVITIES_2026.find(item => item.title === 'Semana Escoteira 2026')!;
    const event = buildNationalActivityEvent(activity, 'tropa-rondon', 'Escoteiro', 'new-1');
    assert.equal(event.sectionId, 'tropa-rondon');
    assert.equal(event.date, '2026-04-11');
    assert.equal(event.title, 'Semana Escoteira 2026');
    assert.equal(event.branch, 'Escoteiro');
    assert.deepEqual(event.attendance, []);
    assert.equal(event.notes, 'Janela oficial UEB: 11/04 a 26/04/2026. Caderno de Atividades 2026.');
  });

  it('formats official windows as DD/MM a DD/MM/YYYY', () => {
    assert.equal(formatOfficialWindow('2026-06-20', '2026-06-21'), '20/06 a 21/06/2026');
  });
});
