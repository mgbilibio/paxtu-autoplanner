import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NATIONAL_ACTIVITIES_2026 } from '../data/nationalActivities2026.ts';
import { NATIONAL_ACTIVITY_FICHAS_2026 } from '../data/nationalActivityFichas2026.ts';
import type { CalendarEvent } from '../types.ts';
import {
  buildNationalActivityEvent,
  buildNationalActivitySeed,
  CADERNO_ATIVIDADES_2026_URL,
  cadernoPageUrl,
  fichasForCampaignAndBranch,
  formatOfficialWindow,
  isDateInOfficialWindow,
  MISSING_SECTION_DATE_ERROR,
  nationalActivitiesForBranch,
  nationalActivityAlreadyOnSection,
  officialWindowNotes,
  pickSeedAfterInclude,
  selectNationalActivitiesToInclude,
} from './nationalActivities.ts';
import { branchFromKind, resolveSectionBranch } from '../services/firebase/sectionKind.ts';

const semana = NATIONAL_ACTIVITIES_2026.find(item => item.title === 'Semana Escoteira 2026')!;
const jota = NATIONAL_ACTIVITIES_2026.find(item => item.title.includes('JOTA'))!;

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
    date: '2026-04-18',
    title: 'Semana Escoteira 2026',
    branch: 'Escoteiro',
    attendance: [],
    notes: officialWindowNotes('2026-04-11', '2026-04-26'),
  };
  const alcateiaEvent: CalendarEvent = {
    id: 'evt-alcateia',
    sectionId: 'alcateia-seeonee',
    date: '2026-04-19',
    title: 'Semana Escoteira 2026',
    branch: 'Lobinho',
    attendance: [],
    notes: officialWindowNotes('2026-04-11', '2026-04-26'),
  };

  it('matches the same title + sectionId even when the chosen day differs from the official start', () => {
    const found = nationalActivityAlreadyOnSection(
      [tropaEvent],
      'tropa-rondon',
      { title: 'Semana Escoteira 2026' },
    );
    assert.equal(found?.id, 'evt-tropa');
    assert.equal(found?.date, '2026-04-18');
  });

  it('treats Tropa 18/04 and Alcateia 19/04 as different events', () => {
    const tropa = nationalActivityAlreadyOnSection(
      [tropaEvent, alcateiaEvent],
      'tropa-rondon',
      { title: 'Semana Escoteira 2026' },
    );
    const alcateia = nationalActivityAlreadyOnSection(
      [tropaEvent, alcateiaEvent],
      'alcateia-seeonee',
      { title: 'Semana Escoteira 2026' },
    );
    assert.equal(tropa?.id, 'evt-tropa');
    assert.equal(alcateia?.id, 'evt-alcateia');
    assert.notEqual(tropa?.date, alcateia?.date);
  });

  it('does not treat the other section copy as included', () => {
    const found = nationalActivityAlreadyOnSection(
      [tropaEvent],
      'alcateia-seeonee',
      { title: 'Semana Escoteira 2026' },
    );
    assert.equal(found, undefined);
  });

  it('skips idempotent include of title+sectionId already on the section', () => {
    const toAdd = selectNationalActivitiesToInclude(
      [semana],
      [tropaEvent],
      'tropa-rondon',
    );
    assert.deepEqual(toAdd, []);
  });

  it('builds one event for one sectionId using the chosen day, not the window start', () => {
    const event = buildNationalActivityEvent(semana, 'tropa-rondon', 'Escoteiro', '2026-04-18', 'new-1');
    assert.equal(event.sectionId, 'tropa-rondon');
    assert.equal(event.date, '2026-04-18');
    assert.notEqual(event.date, semana.start);
    assert.equal(event.title, 'Semana Escoteira 2026');
    assert.equal(event.branch, 'Escoteiro');
    assert.deepEqual(event.attendance, []);
    assert.equal(event.notes, 'Janela oficial UEB: 11/04 a 26/04/2026. Caderno de Atividades 2026.');
  });

  it('formats official windows as DD/MM a DD/MM/YYYY', () => {
    assert.equal(formatOfficialWindow('2026-06-20', '2026-06-21'), '20/06 a 21/06/2026');
  });

  it('keeps the empty-date error copy for the panel', () => {
    assert.equal(MISSING_SECTION_DATE_ERROR, 'Escolha o dia desta seção.');
  });
});

describe('official window date policy', () => {
  it('treats Field Day / Naval / Radio / JOTA / Sangue as fixed windows', () => {
    const fixedTitles = [
      "14º Scout's Field Day",
      'Grande Jogo Naval 2026',
      '6º Atividade Nacional de Radioescotismo em Echolink e DMR',
      '69º JOTA e 30º JOTI',
      'Mutirão Nacional de Doação de Sangue e Cadastro REDOME (junho)',
    ];
    for (const title of fixedTitles) {
      const activity = NATIONAL_ACTIVITIES_2026.find(item => item.title === title)!;
      assert.equal(activity.datePolicy, 'fixed');
    }
  });

  it('allows Semana Escoteira / EducAção / GJA outside the printed window', () => {
    for (const title of ['Semana Escoteira 2026', '10º EducAção Escoteira', '12º Grande Jogo Aéreo']) {
      const activity = NATIONAL_ACTIVITIES_2026.find(item => item.title === title)!;
      assert.equal(activity.datePolicy, 'flexible');
      assert.equal(isDateInOfficialWindow('2026-03-01', activity.start, activity.end), false);
    }
  });
});

describe('national activity fichas and seed', () => {
  it('filters Semana fichas by ramo: Alcateia sees Kaa, Tropa sees CQWS', () => {
    const alcateia = fichasForCampaignAndBranch('Semana Escoteira 2026', 'Lobinho').map(item => item.title);
    const tropa = fichasForCampaignAndBranch('Semana Escoteira 2026', 'Escoteiro').map(item => item.title);
    assert.ok(alcateia.includes('As Caçadas de Kaa'));
    assert.ok(alcateia.includes('Caça aos Rastros'));
    assert.ok(alcateia.includes('Mini Acampamento na Praça'));
    assert.equal(alcateia.includes('CQWS Radioescuta'), false);
    assert.ok(tropa.includes('CQWS Radioescuta'));
    assert.ok(tropa.includes('Receitas Mateiras do Brasil'));
    assert.equal(tropa.includes('As Caçadas de Kaa'), false);
    assert.ok(tropa.includes('Escotismo em Movimento'));
    assert.ok(alcateia.includes('Escotismo em Movimento'));
  });

  it('maps filhotes onto Lobinho so Alcateia lists those cards', () => {
    const mini = NATIONAL_ACTIVITY_FICHAS_2026.find(item => item.title === 'Mini Acampamento na Praça')!;
    assert.deepEqual(mini.ramos, ['filhotes']);
    assert.ok(fichasForCampaignAndBranch('Semana Escoteira 2026', 'Lobinho').some(item => item.title === mini.title));
  });

  it('shares Sangue fichas between junho and novembro and hides them from Alcateia', () => {
    const junho = fichasForCampaignAndBranch(
      'Mutirão Nacional de Doação de Sangue e Cadastro REDOME (junho)',
      'Escoteiro',
    ).map(item => item.title);
    const novembro = fichasForCampaignAndBranch(
      'Mutirão Nacional de Doação de Sangue e Cadastro REDOME (novembro)',
      'Escoteiro',
    ).map(item => item.title);
    assert.ok(junho.includes('Campanha de Doação de Sangue'));
    assert.ok(junho.includes('Campanha de Cadastro no REDOME'));
    assert.deepEqual(junho, novembro);
    assert.deepEqual(
      fichasForCampaignAndBranch(
        'Mutirão Nacional de Doação de Sangue e Cadastro REDOME (junho)',
        'Lobinho',
      ),
      [],
    );
  });

  it('has no JOTA fichas', () => {
    assert.deepEqual(fichasForCampaignAndBranch(jota.title, 'Escoteiro'), []);
  });

  it('builds a Gerar seed with the chosen day and official ficha body', () => {
    const cqws = fichasForCampaignAndBranch('Semana Escoteira 2026', 'Escoteiro')
      .filter(item => item.title === 'CQWS Radioescuta');
    assert.equal(cqws.length, 1);
    const seed = buildNationalActivitySeed({
      activity: semana,
      meetingDate: '2026-04-18',
      fichas: cqws,
    });
    assert.equal(seed.meetingDate, '2026-04-18');
    assert.equal(seed.narrativeTheme, 'Semana Escoteira 2026 — CQWS Radioescuta');
    assert.equal(seed.scheduleDraft?.[0]?.title, 'CQWS Radioescuta');
    assert.equal(seed.scheduleDraft?.[0]?.durationMinutes, 60);
    assert.ok((seed.scheduleDraft?.[0]?.materials || []).length > 0);
    assert.ok(String(seed.objectives || '').includes('radioescotismo'));
    assert.ok((seed.activityBriefs || []).some(brief => /Como fazer|WebSDR|radioescuta/i.test(brief)));
    assert.ok(String(seed.technicalContent || '').includes('Materiais'));
    assert.match(String(seed.customInstruction || ''), /Não invente personagens de franquia/i);
    assert.ok(String(seed.customInstruction || '').includes(CADERNO_ATIVIDADES_2026_URL));
    assert.equal(seed.planningMode, 'auto_link');
  });

  it('seeds JOTA with theme and caderno link only', () => {
    const seed = buildNationalActivitySeed({
      activity: jota,
      meetingDate: '2026-10-17',
      fichas: [],
    });
    assert.equal(seed.meetingDate, '2026-10-17');
    assert.equal(seed.narrativeTheme, jota.title);
    assert.ok(String(seed.customInstruction || '').includes('#page=266'));
    assert.ok(String(seed.technicalContent || '').includes(CADERNO_ATIVIDADES_2026_URL));
  });

  it('points Caderno UEB links at the official PDF page', () => {
    assert.equal(cadernoPageUrl(9), `${CADERNO_ATIVIDADES_2026_URL}#page=9`);
    assert.equal(semana.cadernoPage, 9);
  });
});

describe('pickSeedAfterInclude', () => {
  it('opens Gerar with the marked Tropa ficha', () => {
    const pick = pickSeedAfterInclude(
      [semana],
      'Escoteiro',
      { 'Semana Escoteira 2026': ['CQWS Radioescuta'] },
    );
    assert.equal(pick.kind, 'seed');
    if (pick.kind === 'seed') {
      assert.equal(pick.activity.title, 'Semana Escoteira 2026');
      assert.deepEqual(pick.fichas.map(item => item.title), ['CQWS Radioescuta']);
    }
  });

  it('hints when Semana is included without a marked ficha', () => {
    const pick = pickSeedAfterInclude([semana], 'Escoteiro', {});
    assert.equal(pick.kind, 'hint');
  });

  it('seeds JOTA with theme only when that row is included', () => {
    const pick = pickSeedAfterInclude([jota], 'Escoteiro', {});
    assert.equal(pick.kind, 'seed');
    if (pick.kind === 'seed') {
      assert.equal(pick.activity.title, jota.title);
      assert.deepEqual(pick.fichas, []);
    }
  });

  it('does not mix Alcateia Kaa into a Tropa include', () => {
    const pick = pickSeedAfterInclude(
      [semana],
      'Escoteiro',
      { 'Semana Escoteira 2026': ['As Caçadas de Kaa', 'CQWS Radioescuta'] },
    );
    assert.equal(pick.kind, 'seed');
    if (pick.kind === 'seed') {
      assert.deepEqual(pick.fichas.map(item => item.title), ['CQWS Radioescuta']);
    }
  });
});

describe('Dia do Amigo official fichas', () => {
  it('keeps Tropa steps complete, not cut mid-sentence', () => {
    const pontes = NATIONAL_ACTIVITY_FICHAS_2026.find(item => item.title === 'Construindo Pontes')!;
    const joined = pontes.steps.join(' ');
    assert.ok(joined.includes('trabalhar a partir da ideia de outra equipe'));
    assert.ok(joined.includes('ninguém execute o próprio projeto'));
    assert.ok(joined.includes('construir a ponte conforme o projeto recebido'));
    assert.equal(pontes.steps.some(step => /a partir$/.test(step.trim())), false);
  });

  it('keeps Escape Room and Missão 360 through the last official step', () => {
    const escape = NATIONAL_ACTIVITY_FICHAS_2026.find(item => item.title === 'Escape Room')!;
    const missao = NATIONAL_ACTIVITY_FICHAS_2026.find(item => item.title === 'Missão Escoteira 360º')!;
    assert.ok(escape.steps.join(' ').includes('celebrar o trabalho coletivo'));
    assert.ok(missao.steps.join(' ').includes('Avaliação entre patrulhas'));
    assert.ok(missao.steps.join(' ').includes('Primeiros socorros'));
  });
});

describe('caderno fichas completeness', () => {
  it('has 72 fichas and no last step cut mid-sentence', () => {
    assert.equal(NATIONAL_ACTIVITY_FICHAS_2026.length, 72);
    const cutEnds = /(\s(a partir|investigar|critérios|cooperativas)|,)$/;
    const bad = NATIONAL_ACTIVITY_FICHAS_2026.filter(ficha => {
      const last = String(ficha.steps[ficha.steps.length - 1] || '').trim();
      return cutEnds.test(last);
    }).map(ficha => ficha.title);
    assert.deepEqual(bad, []);
  });
});
