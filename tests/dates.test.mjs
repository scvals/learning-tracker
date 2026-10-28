import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../js/dates.js';

test('weekOf', () => {
  const start = '2026-10-26';
  assert.equal(d.weekOf('2026-10-25', start), 0);
  assert.equal(d.weekOf(start, start), 1);
  assert.equal(d.weekOf('2026-11-01', start), 1);
  assert.equal(d.weekOf('2026-11-02', start), 2);
  assert.equal(d.weekOf('2026-11-22', start), 4);
  assert.equal(d.weekOf('2026-11-23', start), 5);
  assert.equal(d.weekOf('2026-11-01', null), 0);
});

test('weekRange / daysOfWeek', () => {
  assert.deepEqual(d.weekRange(2, '2026-10-26'), ['2026-11-02', '2026-11-08']);
  const days = d.daysOfWeek(1, '2026-10-26');
  assert.equal(days.length, 7);
  assert.equal(days[0], '2026-10-26');
  assert.equal(days[6], '2026-11-01');
});

test('addDays / diffDays (в т.ч. переход на зимнее время)', () => {
  assert.equal(d.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(d.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(d.addDays('2024-03-01', -1), '2024-02-29');
  assert.equal(d.diffDays('2026-10-24', '2026-10-27'), 3);
  assert.equal(d.diffDays('2026-03-27', '2026-03-31'), 4);
  assert.equal(d.diffDays('2026-10-27', '2026-10-24'), -3);
});

test('plural', () => {
  const f = ['день', 'дня', 'дней'];
  const cases = { 0: 'дней', 1: 'день', 2: 'дня', 4: 'дня', 5: 'дней', 11: 'дней', 12: 'дней', 14: 'дней',
    21: 'день', 22: 'дня', 25: 'дней', 101: 'день', 111: 'дней', 112: 'дней', 1001: 'день' };
  for (const [n, w] of Object.entries(cases)) assert.equal(d.plural(Number(n), f), w, `n=${n}`);
  assert.equal(d.plural(-1, f), 'день');
});

test('форматирование', () => {
  assert.equal(d.formatLong('2026-10-28'), 'среда, 28 октября');
  assert.equal(d.formatShort('2026-10-28'), '28 окт');
  assert.equal(d.formatNumeric('2026-10-28'), '28.10.2026');
  assert.equal(d.weekdayShort('2026-10-28'), 'ср');
  assert.equal(d.dayNum('2026-10-05'), 5);
  assert.match(d.todayISO(), /^\d{4}-\d{2}-\d{2}$/);
});
