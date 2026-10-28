// Экран «План»: задания по неделям и навыкам.

import * as store from '../store.js';
import { h, ico, toast, confirmDialog, formDialog, actionMenu } from '../ui.js';
import { weekRange, formatShort, plural } from '../dates.js';

const TASKS = ['задание', 'задания', 'заданий'];

// Уроки (learn/) для заданий: «Как сделать». Грузится лениво, без уроков экран работает как обычно.
let lessonMap = null;
let lessonMapPromise = null;
function loadLessonMap() {
  if (!lessonMapPromise) {
    lessonMapPromise = import('../../learn/js/task-map.js')
      .then((m) => m.lessonMap())
      .then((map) => { lessonMap = map; return map; })
      .catch(() => { lessonMap = new Map(); return lessonMap; });
  }
  return lessonMapPromise;
}

export function render(root, ctx) {
  const weeks = store.planWeeks();
  const start = store.settings().startDate;
  const calW = store.calendarWeek();
  const cur = calW >= 1 && calW <= weeks ? calW : 0; // 0 — план не идёт сейчас
  let week = parseInt(ctx.params.week, 10);
  if (!(week >= 1 && week <= weeks)) week = cur || (calW > weeks ? weeks : 1);
  // задания только существующих навыков
  const weekTasks = (w) => { const ids = new Set(store.skills().map((k) => k.id)); return store.tasks(w).filter((t) => ids.has(t.skillId)); };

  const tabsEl = h('div', { class: 'tabs plan-tabs', role: 'tablist', 'aria-label': 'Недели плана' });
  const headEl = h('div');
  const bodyEl = h('div', { class: 'stack plan-body' });
  root.append(h('div', { class: 'plan stack' }, headEl, tabsEl, bodyEl));

  function go(w) {
    week = w;
    const hash = `#/plan?week=${w}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    drawTabs();
    draw();
  }

  function drawTabs() {
    const n = store.planWeeks();
    tabsEl.replaceChildren(
      ...Array.from({ length: n }, (_, i) => i + 1).map((w) => {
        const list = weekTasks(w);
        const all = list.length > 0 && list.every((t) => t.done);
        return h('button', {
          class: `tab plan-tab${w === week ? ' is-active' : ''}${w === cur ? ' is-current' : ''}${all ? ' is-complete' : ''}`,
          type: 'button', role: 'tab', 'aria-selected': w === week ? 'true' : 'false',
          'aria-label': `Неделя ${w}${w === cur ? ', текущая' : ''}${all ? ', всё выполнено' : ''}`,
          onclick: () => go(w),
        }, `Неделя ${w}`, w === cur && h('span', { class: 'plan-tab__now', 'aria-hidden': 'true' }), all && ico('check', 'ico ico--sm plan-tab__ok'));
      }),
      h('button', { class: 'tab plan-tab--extend', type: 'button', onclick: extend }, ico('plus'), h('span', null, 'Продлить план')));
    requestAnimationFrame(() => {
      const act = tabsEl.querySelector('.is-active');
      if (act) tabsEl.scrollLeft = Math.max(0, act.offsetLeft - (tabsEl.clientWidth - act.offsetWidth) / 2);
    });
  }

  async function extend() {
    const n = store.planWeeks() + 1;
    const ok = await confirmDialog({
      title: 'Продлить план?',
      text: `Добавится неделя ${n}. Задания на неё можно будет добавить здесь же.`,
      okText: `Добавить неделю ${n}`,
    });
    if (!ok) return;
    store.setSettings({ weeks: n, finishedAt: null });
    toast(`План продлён до ${n} ${plural(n, ['недели', 'недель', 'недель'])}`);
    ctx.navigate('plan', { week: n });
  }

  function draw() {
    const skills = store.skills();
    const all = weekTasks(week);
    const done = all.filter((t) => t.done).length;
    const range = start ? weekRange(week, start) : null;

    headEl.replaceChildren(h('div', { class: 'page-head' },
      h('h1', { class: 'h1 page-head__title' }, 'План'),
      h('a', { class: 'icon-btn page-help', href: 'learn/#/guide/plan', 'aria-label': 'Как пользоваться экраном «План»', title: 'Как пользоваться' }, ico('info')),
      h('div', { class: 'page-head__sub' },
        `Неделя ${week} из ${store.planWeeks()}`,
        range && ` · ${formatShort(range[0])} – ${formatShort(range[1])}`,
        week === cur && h('span', { class: 'badge badge--accent plan-now' }, 'сейчас'))));

    const pct = all.length ? Math.round((done / all.length) * 100) : 0;
    const overall = h('div', { class: 'card plan-overall' },
      all.length ? h('div', { class: 'row row--between' },
        h('span', null, 'Выполнено за неделю'),
        h('span', null, h('span', { class: 'big-num' }, done), h('span', { class: 'muted' }, ` из ${all.length}`)))
        : h('span', { class: 'muted' }, 'На эту неделю пока нет заданий — добавьте их ниже.'),
      all.length > 0 && h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct },
        h('div', { class: 'progress__bar', style: { width: `${pct}%` } })));

    if (!skills.length) {
      bodyEl.replaceChildren(overall, h('div', { class: 'empty' },
        h('p', null, 'Нет навыков — добавьте их в настройках.'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => ctx.navigate('settings') }, 'Открыть настройки')));
      return;
    }
    bodyEl.replaceChildren(overall, ...skills.map(skillGroup));
  }

  function skillGroup(skill) {
    const list = store.tasks(week, skill.id);
    const done = list.filter((t) => t.done).length;
    const pct = list.length ? Math.round((done / list.length) * 100) : 0;
    return h('section', { class: `card card--skill sk-${skill.color} plan-skill`, 'aria-label': skill.name },
      h('div', { class: 'card__head' },
        h('span', { class: 'card__icon' }, ico(skill.icon || 'star')),
        h('div', { class: 'plan-skill__title' },
          h('h2', { class: 'card__title' }, skill.name),
          list.length > 0 && h('span', { class: 'small muted' }, `выполнено ${done} из ${list.length}`))),
      list.length > 0 && h('div', { class: 'progress progress--skill' }, h('div', { class: 'progress__bar', style: { width: `${pct}%` } })),
      h('div', { class: 'card__body' },
        list.length
          ? h('ul', { class: 'list plan-tasks' }, list.map((t, i) => taskRow(t, i, list)))
          : h('p', { class: 'plan-empty muted small' }, 'На эту неделю заданий нет.')),
      h('div', { class: 'card__foot' },
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => addTask(skill) }, ico('plus'), h('span', null, 'Добавить задание'))));
  }

  function taskRow(t, i, list) {
    return h('li', { class: `list__item task${t.done ? ' is-done' : ''}` },
      h('button', { class: 'task__check', type: 'button', role: 'checkbox', 'aria-checked': t.done ? 'true' : 'false',
        'aria-label': t.done ? `Снять отметку: ${t.text}` : `Отметить выполненным: ${t.text}`,
        onclick: () => { store.patch('tasks', t.id, { done: !t.done }); refresh(); } }, ico('check')),
      h('div', { class: 'plan-task__main' },
        h('button', { class: 'task__text', type: 'button', onclick: () => editTask(t) }, t.text),
        lessonMap?.get(t.id) && h('a', { class: 'plan-howto', href: `learn/#/lesson/${encodeURIComponent(lessonMap.get(t.id))}` },
          ico('book', 'ico ico--sm'), h('span', null, 'Как сделать'))),
      h('div', { class: 'task__actions' },
        h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': `Действия: ${t.text}`, onclick: () => menu(t, i, list) }, ico('more'))));
  }

  function refresh() {
    drawTabs();
    draw();
  }

  function weekOptions() {
    return Array.from({ length: store.planWeeks() }, (_, i) => [String(i + 1), `Неделя ${i + 1}`]);
  }

  function nextOrder(skillId, w) {
    return store.tasks(w, skillId).reduce((m, t) => Math.max(m, t.order ?? 0), 0) + 1;
  }

  async function addTask(skill) {
    const v = await formDialog({
      title: `Новое задание · ${skill.name}`,
      fields: [{ name: 'text', label: 'Что сделать', type: 'textarea', rows: 2, required: true, autofocus: true }],
      okText: 'Добавить',
    });
    if (!v || !v.text) return;
    store.put('tasks', { skillId: skill.id, week, text: v.text, done: false, order: nextOrder(skill.id, week) });
    refresh();
  }

  async function editTask(t) {
    const v = await formDialog({
      title: 'Задание',
      fields: [
        { name: 'text', label: 'Что сделать', type: 'textarea', rows: 2, value: t.text, required: true },
        { name: 'week', label: 'Неделя', type: 'select', options: weekOptions(), value: String(t.week) },
        { name: 'done', label: 'Выполнено', type: 'checkbox', value: t.done },
      ],
    });
    if (!v || !v.text) return;
    const w = Number(v.week);
    const part = { text: v.text, done: v.done };
    if (w !== t.week) Object.assign(part, { week: w, order: nextOrder(t.skillId, w) });
    store.patch('tasks', t.id, part);
    if (w !== t.week) toast(`Перенесено на неделю ${w}`);
    refresh();
  }

  async function moveTask(t) {
    const v = await formDialog({
      title: 'Перенести на неделю',
      fields: [{ name: 'week', label: 'Неделя', type: 'select', options: weekOptions(), value: String(t.week) }],
      okText: 'Перенести',
    });
    if (!v) return;
    const w = Number(v.week);
    if (w === t.week) return;
    store.patch('tasks', t.id, { week: w, order: nextOrder(t.skillId, w) });
    toast(`Перенесено на неделю ${w}`, { action: 'Открыть', onAction: () => go(w) });
    refresh();
  }

  function reorder(list, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const arr = [...list];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    arr.forEach((t, k) => { if (t.order !== k + 1) store.patch('tasks', t.id, { order: k + 1 }); });
    refresh();
  }

  function removeTask(t) {
    const snapshot = { ...store.get('tasks', t.id) };
    store.remove('tasks', t.id);
    refresh();
    toast('Задание удалено', { action: 'Вернуть', timeout: 5000, onAction: () => { store.put('tasks', snapshot); refresh(); } });
  }

  function menu(t, i, list) {
    actionMenu({
      title: t.text,
      items: [
        { label: t.done ? 'Снять отметку' : 'Отметить выполненным', icon: 'check', onClick: () => { store.patch('tasks', t.id, { done: !t.done }); refresh(); } },
        { label: 'Изменить', icon: 'edit', onClick: () => editTask(t) },
        i > 0 && { label: 'Выше', icon: 'arrow-up', onClick: () => reorder(list, i, -1) },
        i < list.length - 1 && { label: 'Ниже', icon: 'arrow-down', onClick: () => reorder(list, i, 1) },
        store.planWeeks() > 1 && { label: 'Перенести на другую неделю', icon: 'calendar', onClick: () => moveTask(t) },
        { label: 'Удалить', icon: 'trash', danger: true, onClick: () => removeTask(t) },
      ].filter(Boolean),
    });
  }

  drawTabs();
  draw();
  if (!lessonMap) loadLessonMap().then((map) => { if (map.size && root.isConnected) draw(); });
}
