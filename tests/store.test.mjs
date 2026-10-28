import { storage } from './helpers.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../js/store.js';

beforeEach(() => {
  storage.clear();
  store.wipeLocal();
});

// Данные без updatedAt — для сравнения после импорта (импорт ставит свежие метки).
function strip(data) {
  const out = {};
  for (const [col, recs] of Object.entries(data)) {
    out[col] = {};
    for (const [id, r] of Object.entries(recs)) { const { updatedAt, ...rest } = r; out[col][id] = rest; }
  }
  return out;
}

test('первый запуск: исходный план с updatedAt = 0', () => {
  store.load();
  assert.equal(store.settings().onboarded, false);
  assert.equal(store.skills().length, 3);
  assert.ok(store.tasks(1).length > 0);
  for (const { rec } of store.allRecords()) assert.equal(rec.updatedAt, 0);
});

test('put / patch / remove (надгробие)', () => {
  const local = [];
  const off = store.onLocalChange((col, rec) => local.push([col, rec.id, rec.deleted]));
  const t = store.put('tasks', { skillId: 'knit', week: 1, text: 'Новое', done: false, order: 99 });
  assert.ok(t.id);
  assert.ok(t.updatedAt > 0);
  assert.equal(store.get('tasks', t.id).text, 'Новое');

  const p = store.patch('tasks', t.id, { done: true });
  assert.equal(p.text, 'Новое');
  assert.equal(p.done, true);
  assert.ok(p.updatedAt > t.updatedAt, 'монотонные метки');

  store.remove('tasks', t.id);
  assert.equal(store.get('tasks', t.id), null);
  const raw = store.rawGet('tasks', t.id);
  assert.equal(raw.deleted, true);
  assert.ok(raw.updatedAt > p.updatedAt);
  assert.ok(!store.list('tasks').some((x) => x.id === t.id));
  assert.deepEqual(local.map((x) => x[2]), [false, false, true]);
  off();

  // восстановление поверх надгробия не тянет старые поля
  const again = store.put('tasks', { id: t.id, text: 'Снова' });
  assert.equal(again.done, undefined);
  assert.equal(again.deleted, false);
});

test('данные переживают перезагрузку (persist + load)', () => {
  store.setDay('2026-10-28', 'knit', { done: true, minutes: 20 });
  store.load();
  assert.equal(store.day('2026-10-28', 'knit').minutes, 20);
  assert.deepEqual(store.doneDates('knit'), ['2026-10-28']);
});

test('applyRemote: последнее изменение побеждает', () => {
  const events = [];
  const off = store.subscribe((i) => events.push(i.source));
  const local = store.setDay('2026-10-28', 'eng', { done: true, note: 'локально' });

  // старее — не применяется
  assert.equal(store.applyRemote('days', { ...local, note: 'старое', updatedAt: local.updatedAt - 10 }), false);
  // равная метка — остаётся локальное
  assert.equal(store.applyRemote('days', { ...local, note: 'равное' }), false);
  assert.equal(store.day('2026-10-28', 'eng').note, 'локально');
  // новее — применяется
  assert.equal(store.applyRemote('days', { ...local, note: 'облако', updatedAt: local.updatedAt + 10 }), true);
  assert.equal(store.day('2026-10-28', 'eng').note, 'облако');
  // удалённое надгробие новее — запись исчезает
  assert.equal(store.applyRemote('days', { id: local.id, deleted: true, updatedAt: local.updatedAt + 20 }), true);
  assert.equal(store.day('2026-10-28', 'eng'), null);
  assert.ok(events.includes('remote'));
  off();
});

test('applyRemoteBatch: облако важнее исходного плана, но не свежих правок', () => {
  const mine = store.patch('skills', 'eng', { name: 'Мой английский' });
  const n = store.applyRemoteBatch([
    { col: 'skills', rec: { id: 'knit', name: 'Вязание (облако)', updatedAt: 5 } },  // исходная запись updatedAt 0
    { col: 'skills', rec: { id: 'eng', name: 'Английский (облако)', updatedAt: mine.updatedAt - 1 } },
    { col: 'nope', rec: { id: 'x', updatedAt: 1 } },
  ]);
  assert.equal(n, 1);
  assert.equal(store.skill('knit').name, 'Вязание (облако)');
  assert.equal(store.skill('eng').name, 'Мой английский');
});

test('экспорт → сброс → импорт восстанавливает всё', () => {
  store.setSettings({ startDate: '2026-10-26', onboarded: true, skin: 'linen' });
  store.setDay('2026-10-26', 'knit', { done: true, minutes: 15, note: 'набор петель' });
  store.setDay('2026-10-27', 'eng', { done: true, minutes: null, note: '' });
  const s = store.put('skills', { name: 'Рисование', icon: 'brush', color: 4, order: 4 });
  store.remove('tasks', 't_knit_1_1');
  store.setJournal(1, 'values', 'm_knit_scarf', 12);
  store.setJournal(1, 'checks', 'c_knit_1', true);
  store.setJournal(1, 'notes', 'knit', 'Получается!');
  store.put('summaries', { kind: 'interim', createdAt: '2026-11-01', week: 1, title: 'Неделя 1', overall: 'ok', notes: {}, snapshot: { a: [1, 2] } });

  const exported = JSON.parse(JSON.stringify(store.exportData()));
  assert.equal(store.validateImport(exported), null);
  const before = strip(exported.data);

  store.resetAll();
  assert.equal(store.settings().onboarded, false);
  assert.equal(store.skill(s.id), null);
  assert.equal(store.day('2026-10-26', 'knit'), null);

  const seen = [];
  const off = store.onLocalChange((col, rec) => seen.push(rec.updatedAt));
  store.importData(exported);
  off();
  assert.ok(seen.length > 0 && seen.every((t) => t > 0), 'импорт уходит в синхронизацию со свежими метками');

  assert.deepEqual(strip(store.exportData().data), before);
  assert.equal(store.settings().skin, 'linen');
  assert.equal(store.skill(s.id).name, 'Рисование');
  assert.equal(store.get('tasks', 't_knit_1_1'), null);
  assert.equal(store.journal(1).values.m_knit_scarf, 12);

  // и после перезагрузки страницы
  store.load();
  assert.deepEqual(strip(store.exportData().data), before);
});

test('resetAll помечает добавленное удалённым', () => {
  const s = store.put('skills', { name: 'X' });
  store.resetAll();
  assert.equal(store.rawGet('skills', s.id).deleted, true);
  assert.ok(store.rawGet('skills', 'knit').updatedAt > 0, 'исходный план со свежей меткой — сброс уходит в облако');
});

test('validateImport: понятные ошибки', () => {
  assert.match(store.validateImport(null), /не похож/);
  assert.match(store.validateImport('abc'), /не похож/);
  assert.match(store.validateImport({ app: 'other', schemaVersion: 1, data: {} }), /другого приложения/);
  assert.match(store.validateImport({ app: store.APP_ID, data: { settings: {} } }), /версия/);
  assert.match(store.validateImport({ app: store.APP_ID, schemaVersion: store.SCHEMA_VERSION + 1, data: { settings: {} } }), /новой версией/);
  assert.match(store.validateImport({ app: store.APP_ID, schemaVersion: 1 }), /нет данных/);
  assert.equal(store.validateImport({ app: store.APP_ID, schemaVersion: 1, data: { settings: {} } }), null);
  assert.throws(() => store.importData({ app: 'x' }), /другого приложения/);
});

test('setJournal: пустое значение удаляет ключ', () => {
  store.setJournal(2, 'values', 'm1', 5);
  store.setJournal(2, 'values', 'm2', 0);
  assert.deepEqual(store.journal(2).values, { m1: 5, m2: 0 });
  store.setJournal(2, 'values', 'm1', '');
  store.setJournal(2, 'values', 'm2', null);
  assert.deepEqual(store.journal(2).values, {});
  assert.deepEqual(store.journal(7), { id: 'w7', week: 7, values: {}, checks: {}, notes: {} });
});

test('masteredWeek: отмеченное переносится на следующие недели', () => {
  store.setJournal(2, 'checks', 'c1', true);
  store.setJournal(4, 'checks', 'c1', true);
  assert.equal(store.masteredWeek('c1', 1), null);
  assert.equal(store.masteredWeek('c1', 2), 2);
  assert.equal(store.masteredWeek('c1', 3), 2);
  assert.equal(store.masteredWeek('c1'), 2);
  assert.equal(store.masteredWeek('c2', 4), null);
  store.setJournal(2, 'checks', 'c1', null);
  assert.equal(store.masteredWeek('c1', 3), null);
  assert.equal(store.masteredWeek('c1', 4), 4);
});

test('previousValue: ближайшая предыдущая заполненная неделя', () => {
  store.setJournal(1, 'values', 'm', 10);
  store.setJournal(3, 'values', 'm', 0);
  assert.equal(store.previousValue('m', 1), null);
  assert.deepEqual(store.previousValue('m', 2), { week: 1, value: 10 });
  assert.deepEqual(store.previousValue('m', 3), { week: 1, value: 10 });
  assert.deepEqual(store.previousValue('m', 5), { week: 3, value: 0 });
  assert.equal(store.previousValue('other', 5), null);
});

test('currentWeek / calendarWeek', () => {
  store.setSettings({ startDate: '2026-10-26', weeks: 4 });
  assert.equal(store.currentWeek('2026-10-25'), 0);
  assert.equal(store.currentWeek('2026-10-28'), 1);
  assert.equal(store.currentWeek('2026-12-28'), 4);
  assert.equal(store.calendarWeek('2026-12-28'), 10);
});

test('wipeLocal возвращает исходный план без отправки в облако', () => {
  store.setSettings({ onboarded: true });
  let calls = 0;
  const off = store.onLocalChange(() => calls++);
  store.wipeLocal();
  off();
  assert.equal(calls, 0);
  assert.equal(store.settings().onboarded, false);
  assert.equal(store.rawGet('settings', 'main').updatedAt, 0);
});
