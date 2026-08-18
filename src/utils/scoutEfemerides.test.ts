import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SCOUT_EFEMERIDES, efemerideForDay } from './scoutEfemerides.ts';

describe('efemerideForDay', () => {
  it('hides Lobinho-only days on Tropa/Escoteiro', () => {
    assert.equal(efemerideForDay('05-30', 'Escoteiro'), undefined);
    assert.equal(efemerideForDay('10-04', 'Escoteiro'), undefined);
    assert.equal(efemerideForDay('05-30', 'Lobinho'), '🦁 Dia do Ramo Lobinho');
    assert.equal(efemerideForDay('10-04', 'Lobinho'), '🐺 Dia de Francisco de Assis (Lobinho)');
  });

  it('keeps shared days on every branch', () => {
    assert.equal(efemerideForDay('02-22', 'Escoteiro'), '🎂 Dia do Fundador (B-P)');
    assert.equal(efemerideForDay('02-22', 'Lobinho'), '🎂 Dia do Fundador (B-P)');
    assert.equal(efemerideForDay('04-23', 'Escoteiro'), '⚜️ Dia Mundial do Escoteiro');
    assert.equal(efemerideForDay('08-01', 'Sênior'), '🌍 Dia Mundial do Lenço');
  });

  it('shows every known day on the unscoped global calendar', () => {
    assert.equal(SCOUT_EFEMERIDES.length, 8);
    assert.equal(efemerideForDay('05-30'), '🦁 Dia do Ramo Lobinho');
    assert.equal(efemerideForDay('10-04', null), '🐺 Dia de Francisco de Assis (Lobinho)');
  });
});
