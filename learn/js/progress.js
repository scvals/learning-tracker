// Прогресс уроков и слов поверх хранилища трекера (коллекция learn).

import * as store from '../../js/store.js';

export const lessonKey = (id) => `lesson:${id}`;
export const wordKey = (en) => `word:${en}`;

export function lessonState(id) {
  return store.learn(lessonKey(id)) || {};
}

export function setLessonState(id, partial) {
  return store.setLearn(lessonKey(id), partial);
}

export function stepsDone(lesson) {
  const st = lessonState(lesson.id).steps || {};
  return lesson.steps.reduce((n, _, i) => n + (st[i] ? 1 : 0), 0);
}

// Задания трекера, которые закрывает урок (только существующие).
export function lessonTasks(lesson) {
  return lesson.taskIds.map((id) => store.get('tasks', id)).filter(Boolean);
}

export function isDone(lesson) {
  if (lessonState(lesson.id).done) return true;
  const ts = lessonTasks(lesson);
  return ts.length > 0 && ts.every((t) => t.done);
}

// 'todo' | 'doing' | 'done'
export function status(lesson) {
  if (isDone(lesson)) return 'done';
  return stepsDone(lesson) > 0 ? 'doing' : 'todo';
}

export const STATUS_LABEL = { todo: 'не начат', doing: 'в процессе', done: 'готово' };

export function statusText(lesson) {
  const s = status(lesson);
  if (s === 'doing') return `в процессе · ${stepsDone(lesson)}/${lesson.steps.length} ${lesson.steps.length === 1 ? 'шага' : 'шагов'}`;
  return STATUS_LABEL[s];
}

export function markDone(lesson) {
  setLessonState(lesson.id, { done: true, doneAt: Date.now() });
  const changed = [];
  for (const t of lessonTasks(lesson)) {
    if (!t.done) { store.patch('tasks', t.id, { done: true }); changed.push(t.id); }
  }
  return changed;
}

export function unmarkDone(lesson, taskIds = null) {
  setLessonState(lesson.id, { done: false, doneAt: null });
  const ids = taskIds || lesson.taskIds;
  for (const id of ids) if (store.get('tasks', id)?.done) store.patch('tasks', id, { done: false });
}

// Следующий урок: сначала начатый, потом первый не пройденный (по порядку курса).
export function nextLesson(lessons) {
  const doing = lessons.filter((l) => status(l) === 'doing');
  if (doing.length) {
    return doing.sort((a, b) => (lessonState(b.id).updatedAt || 0) - (lessonState(a.id).updatedAt || 0))[0];
  }
  return lessons.find((l) => status(l) !== 'done') || null;
}

// --- слова ---
export function wordState(en) {
  return store.learn(wordKey(en)) || {};
}
export function setWordState(en, partial) {
  return store.setLearn(wordKey(en), partial);
}

// --- прочие записи (список покупок, критерии этапов, проверка в уроке) ---
export function getRec(id) { return store.learn(id) || {}; }
export function setRec(id, partial) { return store.setLearn(id, partial); }

// Неделя по умолчанию: текущая неделя плана, если он идёт, иначе первая.
export function defaultWeek() {
  const w = store.settings().startDate ? store.currentWeek() : 0;
  return w >= 1 ? Math.min(w, 4) : 1;
}
