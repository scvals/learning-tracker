import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from '../js/streak.js';

// 2026-10-26 — понедельник
const MON = '2026-10-26', TUE = '2026-10-27', WED = '2026-10-28', THU = '2026-10-29', FRI = '2026-10-30';

test('пусто', () => {
  assert.deepEqual(computeStreak([], WED), { current: 0, best: 0, atRisk: false, doneToday: false });
  assert.deepEqual(computeStreak(undefined, WED), { current: 0, best: 0, atRisk: false, doneToday: false });
});

test('Пн ✓ Вт ✗ Ср ✓ → 2', () => {
  const r = computeStreak([MON, WED], WED);
  assert.equal(r.current, 2);
  assert.equal(r.doneToday, true);
  assert.equal(r.atRisk, false);
  assert.equal(r.best, 2);
});

test('подряд три дня → 3', () => {
  assert.equal(computeStreak([MON, TUE, WED], WED).current, 3);
});

test('два пропуска подряд обнуляют', () => {
  // Пн ✓, Вт ✗, Ср ✗, Чт — сегодня без отметки
  const r = computeStreak([MON], THU);
  assert.equal(r.current, 0);
  assert.equal(r.atRisk, false);
  assert.equal(r.best, 1);
  // Пн ✓ Вт ✗ Ср ✗ Чт ✓ → новая серия из 1
  assert.equal(computeStreak([MON, THU], THU).current, 1);
});

test('сегодня без отметки — ещё не пропуск', () => {
  const r = computeStreak([MON, TUE], WED);
  assert.equal(r.current, 2);
  assert.equal(r.doneToday, false);
  assert.equal(r.atRisk, false);
});

test('atRisk: вчера пропуск, сегодня нет отметки', () => {
  const r = computeStreak([MON], WED);
  assert.equal(r.current, 1);
  assert.equal(r.atRisk, true);
  assert.equal(r.doneToday, false);
  // отметили сегодня — риск снят
  const r2 = computeStreak([MON, WED], WED);
  assert.equal(r2.atRisk, false);
});

test('чередование ✓✗✓✗✓ не рвётся', () => {
  assert.equal(computeStreak([MON, WED, FRI], FRI).current, 3);
});

test('best — самая длинная серия в истории', () => {
  const old = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06']; // 5 (один пропуск 04)
  const r = computeStreak([...old, WED], WED);
  assert.equal(r.best, 5);
  assert.equal(r.current, 1);
  // пропуск двух дней внутри истории разделяет серии
  assert.equal(computeStreak(['2026-10-01', '2026-10-02', '2026-10-05'], '2026-10-05').best, 2);
});

test('дубли, порядок и будущие даты не влияют', () => {
  const r = computeStreak([WED, MON, WED, TUE, '2026-11-15'], WED);
  assert.equal(r.current, 3);
  assert.equal(r.best, 3);
});

test('через границу месяца и года', () => {
  assert.equal(computeStreak(['2026-12-30', '2026-12-31', '2027-01-02'], '2027-01-02').current, 3);
  assert.equal(computeStreak(['2026-02-27', '2026-02-28', '2026-03-01'], '2026-03-01').current, 3);
});
