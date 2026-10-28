// Хранилище данных. Источник правды — локальная копия (localStorage),
// облако синхронизируется поверх неё (см. sync.js). У каждой записи есть updatedAt;
// удаление — «надгробие» { deleted: true }, чтобы удаление тоже синхронизировалось.

import { defaultSettings, DEFAULT_SKILLS, defaultTasks, defaultChecklist, defaultMetrics } from './defaults.js';
import { todayISO, weekOf } from './dates.js';

export const SCHEMA_VERSION = 1;
export const APP_ID = 'learning-tracker';
export const COLLECTIONS = ['settings', 'skills', 'tasks', 'days', 'journal', 'checklist', 'metrics', 'summaries', 'learn'];

const LS_KEY = 'lt:data:v1';

let db = emptyDb();
const listeners = new Set();
const localListeners = new Set();

function emptyDb() {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, {}]));
}

let lastStamp = 0;
// Монотонная метка времени: две правки в одну миллисекунду не получат одинаковый updatedAt.
export function stamp() {
  const now = Date.now();
  lastStamp = now > lastStamp ? now : lastStamp + 1;
  return lastStamp;
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- загрузка / сохранение ----------

export function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      db = { ...emptyDb(), ...parsed };
    }
  } catch (e) {
    console.warn('Не удалось прочитать локальные данные', e);
  }
  if (!db.settings.main) seed();
  renameOldLabels();
}

// Старые названия показателей → нейтральные (для данных, созданных прежней версией).
function renameOldLabels() {
  const map = { 'Записал минутный рассказ': 'Минутный рассказ записан', 'Понял в контрольном видео': 'Понято в контрольном видео' };
  for (const m of Object.values(db.metrics)) if (m && map[m.label]) m.label = map[m.label];
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Не удалось сохранить данные', e);
  }
}

function seedRecords() {
  const t = stamp();
  const add = (col, rec) => { db[col][rec.id] = { ...rec, updatedAt: t }; };
  add('settings', defaultSettings());
  DEFAULT_SKILLS.forEach((r) => add('skills', r));
  defaultTasks().forEach((r) => add('tasks', r));
  defaultChecklist().forEach((r) => add('checklist', r));
  defaultMetrics().forEach((r) => add('metrics', r));
}

// Начальные данные получают updatedAt = 0 → любые данные из облака важнее.
function seed() {
  seedRecords();
  for (const col of COLLECTIONS) for (const r of Object.values(db[col])) r.updatedAt = 0;
  persist();
}

// ---------- подписки ----------

// fn({ source: 'local' | 'remote' | 'import', col, id })
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Для sync.js: вызывается на каждую локальную правку записи.
export function onLocalChange(fn) {
  localListeners.add(fn);
  return () => localListeners.delete(fn);
}

function emit(info) {
  for (const fn of listeners) {
    try { fn(info); } catch (e) { console.error(e); }
  }
}

// ---------- базовые операции ----------

export function get(col, id) {
  const r = db[col][id];
  return r && !r.deleted ? r : null;
}

// Все не удалённые записи коллекции, по полю order (если есть).
export function list(col, filter) {
  let arr = Object.values(db[col]).filter((r) => !r.deleted);
  if (filter) arr = arr.filter(filter);
  return arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)));
}

// Создать или частично обновить запись. Возвращает итоговую запись.
export function put(col, rec) {
  if (!rec.id) rec = { ...rec, id: uid(col.slice(0, 2)) };
  const prev = db[col][rec.id];
  const next = { ...(prev && !prev.deleted ? prev : {}), ...rec, deleted: false, updatedAt: stamp() };
  db[col][rec.id] = next;
  persist();
  for (const fn of localListeners) fn(col, next);
  emit({ source: 'local', col, id: rec.id });
  return next;
}

export function patch(col, id, partial) {
  return put(col, { ...partial, id });
}

export function remove(col, id) {
  if (!db[col][id]) return;
  const next = { id, deleted: true, updatedAt: stamp() };
  db[col][id] = next;
  persist();
  for (const fn of localListeners) fn(col, next);
  emit({ source: 'local', col, id });
}

// ---------- для синхронизации ----------

export function allRecords() {
  const out = [];
  for (const col of COLLECTIONS) for (const r of Object.values(db[col])) out.push({ col, rec: r });
  return out;
}

export function rawGet(col, id) {
  return db[col]?.[id] ?? null;
}

// Слияние по правилу «последнее изменение побеждает». true — если запись применена.
export function applyRemote(col, rec, { silent = false } = {}) {
  if (!db[col] || !rec?.id) return false;
  const cur = db[col][rec.id];
  if (cur && (cur.updatedAt ?? 0) >= (rec.updatedAt ?? 0)) return false;
  db[col][rec.id] = rec;
  if (!silent) {
    persist();
    emit({ source: 'remote', col, id: rec.id });
  }
  return true;
}

// Применить пачку записей из облака одним сохранением.
export function applyRemoteBatch(items) {
  let changed = 0;
  for (const { col, rec } of items) if (applyRemote(col, rec, { silent: true })) changed++;
  if (changed) {
    persist();
    emit({ source: 'remote' });
  }
  return changed;
}

// ---------- экспорт / импорт ----------

export function exportData() {
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(db)),
  };
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') return 'Файл не похож на резервную копию.';
  if (obj.app !== APP_ID) return 'Это резервная копия другого приложения.';
  if (typeof obj.schemaVersion !== 'number') return 'В файле не указана версия схемы данных.';
  if (obj.schemaVersion > SCHEMA_VERSION) return 'Файл создан более новой версией трекера. Обновите страницу и попробуйте снова.';
  if (!obj.data || typeof obj.data !== 'object' || !obj.data.settings) return 'В файле нет данных трекера.';
  return null;
}

// Заменить текущие данные данными из файла. Все записи получают свежий updatedAt,
// а отсутствующие в файле — помечаются удалёнными, чтобы облако тоже «откатилось».
export function importData(obj) {
  const err = validateImport(obj);
  if (err) throw new Error(err);
  const incoming = { ...emptyDb(), ...migrate(obj).data };
  const next = emptyDb();
  for (const col of COLLECTIONS) {
    const ids = new Set([...Object.keys(db[col]), ...Object.keys(incoming[col] || {})]);
    for (const id of ids) {
      const r = incoming[col]?.[id];
      next[col][id] = r ? { ...r, id, updatedAt: stamp() } : { id, deleted: true, updatedAt: stamp() };
    }
  }
  db = next;
  persist();
  for (const { col, rec } of allRecords()) for (const fn of localListeners) fn(col, rec);
  emit({ source: 'import' });
}

function migrate(obj) {
  // Сейчас версия схемы одна; здесь будут преобразования старых версий.
  return obj;
}

// Полная очистка: данные заменяются исходным планом (удаления синхронизируются).
export function resetAll() {
  const old = db;
  db = emptyDb();
  seedRecords();
  for (const col of COLLECTIONS) {
    for (const id of Object.keys(old[col])) {
      if (!db[col][id]) db[col][id] = { id, deleted: true, updatedAt: stamp() };
    }
  }
  persist();
  for (const { col, rec } of allRecords()) for (const fn of localListeners) fn(col, rec);
  emit({ source: 'import' });
}

// Удалить только локальную копию (при выходе из аккаунта по желанию).
export function wipeLocal() {
  db = emptyDb();
  try { localStorage.removeItem(LS_KEY); } catch { /* хранилище недоступно */ }
  seed();
  emit({ source: 'import' });
}

// ---------- доменные помощники ----------

export function settings() {
  return db.settings.main && !db.settings.main.deleted ? db.settings.main : defaultSettingsFallback();
}

function defaultSettingsFallback() {
  const s = { ...defaultSettings(), updatedAt: 0 };
  db.settings.main = s;
  return s;
}

export function setSettings(partial) {
  return patch('settings', 'main', partial);
}

export function skills() {
  return list('skills');
}

export function skill(id) {
  return get('skills', id);
}

export function planWeeks() {
  return settings().weeks || 4;
}

// Текущая неделя плана (ограничена диапазоном 1…weeks). 0 — план ещё не начался.
export function currentWeek(date = todayISO()) {
  const w = weekOf(date, settings().startDate);
  if (w === 0) return 0;
  return Math.min(w, planWeeks());
}

// Неделя по календарю без ограничения (может быть больше weeks — план закончился).
export function calendarWeek(date = todayISO()) {
  return weekOf(date, settings().startDate);
}

// --- дни ---

export const dayId = (date, skillId) => `${date}_${skillId}`;

export function day(date, skillId) {
  return get('days', dayId(date, skillId));
}

export function setDay(date, skillId, partial) {
  return put('days', { id: dayId(date, skillId), date, skillId, ...partial });
}

// Даты, когда навык отмечен как выполненный.
export function doneDates(skillId) {
  return list('days', (d) => d.skillId === skillId && d.done).map((d) => d.date).sort();
}

// --- задания плана ---

export function tasks(week, skillId) {
  return list('tasks', (t) => t.week === week && (!skillId || t.skillId === skillId));
}

// --- журнал ---

export const journalId = (week) => `w${week}`;

export function journal(week) {
  return get('journal', journalId(week)) || { id: journalId(week), week, values: {}, checks: {}, notes: {} };
}

// part: 'values' | 'checks' | 'notes'
export function setJournal(week, part, key, value) {
  const j = journal(week);
  const nextPart = { ...(j[part] || {}), [key]: value };
  if (value === null || value === undefined || value === '') delete nextPart[key];
  return put('journal', { id: journalId(week), week, values: j.values || {}, checks: j.checks || {}, notes: j.notes || {}, [part]: nextPart });
}

export function metrics(skillId) {
  return list('metrics', (m) => !skillId || m.skillId === skillId);
}

export function checklist(skillId) {
  return list('checklist', (c) => !skillId || c.skillId === skillId);
}

// Неделя, в которую пункт чек-листа впервые отмечен (≤ week), или null.
// Отмеченное переносится на следующие недели.
export function masteredWeek(itemId, week = Infinity) {
  let best = null;
  for (const j of list('journal')) {
    if (j.week <= week && j.checks?.[itemId] && (best === null || j.week < best)) best = j.week;
  }
  return best;
}

// Значение показателя за ближайшую предыдущую неделю, где оно было заполнено.
export function previousValue(metricId, week) {
  for (let w = week - 1; w >= 1; w--) {
    const v = get('journal', journalId(w))?.values?.[metricId];
    if (v !== undefined && v !== null && v !== '') return { week: w, value: v };
  }
  return null;
}

// --- итоги ---

export function summaries() {
  return list('summaries').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// --- прогресс обучения (приложение «Уроки», learn/) ---
// Записи коллекции learn: `lesson:<id>` — { steps:{[i]:true}, done, quizBest }, `word:<en>` — { known, seen }.

export function learn(id) {
  return get('learn', id);
}

export function setLearn(id, partial) {
  return put('learn', { id, ...partial });
}
