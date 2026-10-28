import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../js/sync-core.js';

const COLS = ['settings', 'skills', 'tasks', 'days', 'journal', 'checklist', 'metrics', 'summaries'];

test('docId: безопасно для Firestore и обратимо', () => {
  const ids = ['main', '2026-10-28_knit', 'w3', 'a/b', '..', '.', '__x__', 'Вязание', 'a~41', 'A', 'пробел и %', '😀', ''];
  const seen = new Set();
  for (const id of ids) {
    const doc = c.docIdFor('days', id);
    assert.match(doc, /^[A-Za-z0-9_.~-]+$/, doc);
    assert.ok(!doc.includes('/'));
    assert.ok(!/^__.*__$/.test(doc));
    assert.notEqual(doc, '.');
    assert.notEqual(doc, '..');
    assert.ok(!seen.has(doc), 'без коллизий: ' + doc);
    seen.add(doc);
    assert.deepEqual(c.parseDocId(doc), { col: 'days', id });
  }
  assert.equal(c.docIdFor('days', '2026-10-28_knit'), 'days__2026-10-28_knit');
  assert.equal(c.parseDocId('nodelimiter'), null);
});

test('toRemote / fromRemote: запись как есть + col', () => {
  const rec = { id: 'w1', week: 1, values: { m: 5 }, checks: { c1: true }, notes: {}, updatedAt: 123, deleted: false, extra: undefined };
  const doc = c.toRemote('journal', rec);
  assert.equal(doc.col, 'journal');
  assert.equal(doc.week, 1);
  assert.ok(!('extra' in doc));
  assert.equal(doc._json, undefined);
  const back = c.fromRemote(doc, COLS);
  assert.equal(back.col, 'journal');
  const { extra, ...expected } = rec;
  assert.deepEqual(back.rec, expected);
});

test('toRemote: надгробие и «неудобные» для Firestore данные', () => {
  const t = c.toRemote('tasks', { id: 't1', text: 'x', deleted: true, updatedAt: 9 });
  assert.deepEqual(t, { col: 'tasks', id: 't1', updatedAt: 9, deleted: true });
  assert.deepEqual(c.fromRemote(t, COLS), { col: 'tasks', rec: { id: 't1', deleted: true, updatedAt: 9 } });

  const tricky = { id: 's1', snapshot: { grid: [[1, 2], [3]] }, notes: { '': 'пусто' }, updatedAt: 5 };
  const doc = c.toRemote('summaries', tricky);
  assert.equal(typeof doc._json, 'string');
  assert.equal(doc.updatedAt, 5);
  assert.deepEqual(c.fromRemote(doc, COLS).rec, tricky);
});

test('fromRemote отбрасывает мусор', () => {
  assert.equal(c.fromRemote(null, COLS), null);
  assert.equal(c.fromRemote({ id: 'x', updatedAt: 1 }, COLS), null);
  assert.equal(c.fromRemote({ col: 'hack', id: 'x', updatedAt: 1 }, COLS), null);
  assert.equal(c.fromRemote({ col: 'days', updatedAt: 1 }, COLS), null);
  assert.equal(c.fromRemote({ col: 'days', id: 'x', updatedAt: 'abc' }, COLS).rec.updatedAt, 0);
  assert.equal(c.fromRemote({ col: 'days', id: 'x', _json: '{bad' }, COLS), null);
});

test('outbox: слияние и подтверждение', () => {
  const ob = {};
  c.outboxAdd(ob, 'days', { id: 'd1', updatedAt: 10 });
  c.outboxAdd(ob, 'days', { id: 'd1', updatedAt: 5 }); // старая метка не затирает новую
  c.outboxAdd(ob, 'tasks', { id: 'a/b', updatedAt: 7 });
  assert.deepEqual(ob, { 'days/d1': 10, 'tasks/a/b': 7 });
  assert.deepEqual(c.splitKey('tasks/a/b'), { col: 'tasks', id: 'a/b' });

  c.outboxAdd(ob, 'days', { id: 'd1', updatedAt: 12 }); // правка во время отправки
  c.outboxAck(ob, [{ key: 'days/d1', updatedAt: 10 }, { key: 'tasks/a/b', updatedAt: 7 }]);
  assert.deepEqual(ob, { 'days/d1': 12 }, 'неотправленная правка остаётся');
  c.outboxAck(ob, [{ key: 'days/d1', updatedAt: 12 }]);
  assert.deepEqual(ob, {});
});

test('planFlush: не перезаписывать более новое облако', () => {
  const local = {
    'days/a': { id: 'a', updatedAt: 10 },
    'days/b': { id: 'b', updatedAt: 10 },
    'days/c': { id: 'c', updatedAt: 10, deleted: true },
  };
  const ob = { 'days/a': 10, 'days/b': 10, 'days/c': 10, 'days/gone': 3 };
  const { send, drop } = c.planFlush(ob, (col, id) => local[`${col}/${id}`] || null, { 'days/b': 11, 'days/a': 9 });
  assert.deepEqual(send.map((s) => s.key).sort(), ['days/a', 'days/c']);
  assert.deepEqual(drop.sort(), ['days/b', 'days/gone']);
});

test('planInitialPush: новее облака или нет в облаке; исходный план не затирает облако', () => {
  const records = [
    { col: 'settings', rec: { id: 'main', updatedAt: 0 } },      // исходные, в облаке есть настоящие
    { col: 'skills', rec: { id: 'knit', updatedAt: 0 } },        // в облаке нет — загрузить
    { col: 'days', rec: { id: 'd1', updatedAt: 50 } },           // локально новее
    { col: 'days', rec: { id: 'd2', updatedAt: 20 } },           // в облаке новее
  ];
  const remote = { 'settings/main': 100, 'days/d1': 40, 'days/d2': 30 };
  assert.deepEqual(c.planInitialPush(records, remote).map((r) => `${r.col}/${r.rec.id}`), ['skills/knit', 'days/d1']);
  assert.equal(c.planInitialPush(records, {}).length, 4, 'первое подключение — загрузить всё');
});

test('chunk ≤ 400', () => {
  const parts = c.chunk(Array.from({ length: 901 }, (_, i) => i));
  assert.deepEqual(parts.map((p) => p.length), [400, 400, 101]);
  assert.deepEqual(c.chunk([]), []);
});

test('errorMessage — по-русски', () => {
  assert.match(c.errorMessage({ code: 'auth/unauthorized-domain' }), /Разрешённые домены/);
  assert.match(c.errorMessage({ code: 'auth/popup-blocked' }), /всплывающие/);
  assert.match(c.errorMessage({ code: 'auth/network-request-failed' }), /интернет/);
  assert.match(c.errorMessage({ code: 'permission-denied' }), /правила Firestore/);
  assert.match(c.errorMessage({ code: 'cdn' }), /модуль облака/);
  assert.match(c.errorMessage(new Error('x')), /Ошибка синхронизации/);
  assert.match(c.errorMessage(undefined), /Ошибка синхронизации/);
});
