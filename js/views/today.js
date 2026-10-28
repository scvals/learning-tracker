// Экран «Сегодня»: отметки занятий по навыкам за выбранный день.

import * as store from '../store.js';
import { h, ico, debounce, toast } from '../ui.js';
import { todayISO, addDays, diffDays, weekOf, daysOfWeek, formatLong, formatShort, weekdayShort, dayNum, plural } from '../dates.js';
import { computeStreak } from '../streak.js';
import { decor } from '../decor.js';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS = ['день', 'дня', 'дней'];
const MAX_MIN = 600;

export function render(root, ctx) {
  const today = todayISO();
  const settings = store.settings();
  const start = settings.startDate;

  let selected = ISO_RE.test(ctx.params.date || '') && ctx.params.date <= today ? ctx.params.date : today;
  let stripStart = stripStartFor(selected);
  const pending = new Set(); // отложенные сохранения заметок/минут

  function stripStartFor(date) {
    const w = weekOf(date, start);
    if (start && w >= 1 && w <= store.planWeeks()) return daysOfWeek(w, start)[0];
    // вне плана — последние 7 дней, заканчивающиеся выбранной датой (или сегодня)
    return addDays(date, -6);
  }

  function flushAll() {
    for (const fn of pending) fn.flush();
    pending.clear();
  }

  function setUrl() {
    const hash = selected === today ? '#/today' : `#/today?date=${selected}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  function select(date) {
    if (date > today) return;
    flushAll();
    selected = date;
    const days = stripDays();
    if (!days.includes(date)) stripStart = stripStartFor(date);
    setUrl();
    draw();
  }

  function stripDays() {
    return Array.from({ length: 7 }, (_, i) => addDays(stripStart, i));
  }

  // ---------- разметка ----------

  const headEl = h('div');
  const stripEl = h('div', { class: 'today-strip-wrap' });
  const bannerEl = h('div');
  const progressEl = h('div');
  const cardsEl = h('div', { class: 'stack today-cards' });
  const hintEl = h('div');
  root.append(h('div', { class: 'today stack' }, headEl, stripEl, bannerEl, progressEl, cardsEl, hintEl));

  function draw() {
    drawHead();
    drawStrip();
    drawBanner();
    drawProgress();
    drawCards();
    drawHint();
  }

  function drawHead() {
    const weeks = store.planWeeks();
    const calW = store.calendarWeek(today);
    let sub;
    let extra = null;
    if (!start) {
      sub = 'Дата начала плана не задана';
    } else if (calW === 0) {
      const n = diffDays(today, start);
      sub = `План начнётся через ${n} ${plural(n, DAYS)}`;
    } else if (calW > weeks) {
      sub = settings.finishedAt ? 'План завершён' : `${weeks} ${plural(weeks, ['неделя', 'недели', 'недель'])} плана позади`;
      extra = h('div', { class: 'hint-box today-finished' },
        h('p', null, settings.finishedAt
          ? 'План завершён. Можно продолжать отмечать занятия или продлить план.'
          : 'План завершён — подведите итоги или продлите его, история сохранится.'),
        h('div', { class: 'row row--wrap' },
          h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => ctx.navigate('summary') },
            ico('trophy'), h('span', null, 'Подвести итоги')),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => ctx.navigate('summary') },
            ico('plus'), h('span', null, 'Продлить план'))));
    } else {
      sub = `Неделя ${calW} из ${weeks}`;
    }
    headEl.replaceChildren(
      h('div', { class: 'page-head' },
        h('h1', { class: 'h1 page-head__title' }, 'Сегодня'),
      h('a', { class: 'icon-btn page-help', href: 'learn/#/guide/today', 'aria-label': 'Как пользоваться экраном «Сегодня»', title: 'Как пользоваться' }, ico('info')),
        h('div', { class: 'page-head__sub' },
          h('span', { class: 'today-date' }, formatLong(today)),
          h('span', { class: 'today-week muted' }, sub))),
      ...(extra ? [extra] : []));
  }

  function drawStrip() {
    const skills = store.skills();
    const days = stripDays();
    const canNext = addDays(stripStart, 7) <= today;
    const w = start ? weekOf(days[0], start) : 0;
    const inPlan = start && w >= 1 && w <= store.planWeeks() && days[0] === daysOfWeek(w, start)[0];
    const label = inPlan ? `Неделя ${w}` : `${formatShort(days[0])} – ${formatShort(days[6])}`;

    stripEl.replaceChildren(
      h('div', { class: 'today-strip__head row row--between' },
        h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': 'Предыдущие дни',
          onclick: () => { stripStart = addDays(stripStart, -7); drawStrip(); } }, ico('chevron-left')),
        h('span', { class: 'small muted today-strip__label' }, label),
        h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': 'Следующие дни', disabled: !canNext,
          onclick: () => { if (canNext) { stripStart = addDays(stripStart, 7); drawStrip(); } } }, ico('chevron-right'))),
      h('div', { class: 'today-strip', role: 'group', 'aria-label': 'Выбор дня' },
        days.map((d) => {
          const future = d > today;
          const doneCount = skills.filter((s) => store.day(d, s.id)?.done).length;
          const cls = ['today-day'];
          if (d === today) cls.push('is-today');
          if (d === selected) cls.push('is-selected');
          if (future) cls.push('is-future');
          if (skills.length && doneCount === skills.length) cls.push('is-full');
          return h('button', {
            class: cls.join(' '), type: 'button', disabled: future,
            'aria-pressed': d === selected ? 'true' : 'false',
            'aria-label': `${formatLong(d)}${future ? '' : `, отмечено ${doneCount} из ${skills.length}`}`,
            onclick: () => select(d),
          },
          h('span', { class: 'today-day__wd' }, weekdayShort(d)),
          h('span', { class: 'today-day__num num' }, dayNum(d)),
          h('span', { class: 'today-day__dots', 'aria-hidden': 'true' },
            skills.map((s) => h('span', { class: `today-dot sk-${s.color}${store.day(d, s.id)?.done ? ' is-done' : ''}` }))));
        })));
  }

  function drawBanner() {
    if (selected === today) { bannerEl.replaceChildren(); return; }
    const ago = diffDays(selected, today);
    bannerEl.replaceChildren(h('div', { class: 'today-past', role: 'status' },
      ico('calendar'),
      h('div', { class: 'today-past__text' },
        h('strong', null, formatLong(selected)),
        h('span', { class: 'small muted' }, ago === 1 ? 'Вчера — можно дописать то, что забыли отметить' : `${ago} ${plural(ago, DAYS)} назад — можно дописать то, что забыли отметить`)),
      h('button', { class: 'btn btn--sm btn--primary', type: 'button', onclick: () => select(today) }, 'Вернуться к сегодня')));
  }

  function drawProgress() {
    const skills = store.skills();
    if (!skills.length) { progressEl.replaceChildren(); return; }
    const done = skills.filter((s) => store.day(selected, s.id)?.done).length;
    const all = done === skills.length;
    const pct = Math.round((done / skills.length) * 100);
    progressEl.replaceChildren(h('div', { class: `card today-progress${all ? ' is-complete' : ''}` },
      h('div', { class: 'row row--between' },
        h('span', { class: 'today-progress__label' },
          selected === today ? 'Сегодня отмечено' : 'В этот день отмечено'),
        h('span', { class: 'today-progress__count' },
          h('span', { class: 'big-num' }, done), h('span', { class: 'muted' }, ` из ${skills.length}`))),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': skills.length, 'aria-valuenow': done },
        h('div', { class: 'progress__bar', style: { width: `${pct}%` } })),
      all && h('div', { class: 'today-celebrate' },
        h('div', { class: 'today-celebrate__art', 'aria-hidden': 'true', html: safeDecor('celebrate', settings.skin) }),
        h('p', { class: 'hand today-celebrate__text' },
          selected === today ? 'Все навыки сегодня — вы молодец!' : 'В этот день — все навыки!'))));
  }

  function drawCards() {
    flushAll();
    const skills = store.skills();
    if (!skills.length) {
      cardsEl.replaceChildren(h('div', { class: 'empty' },
        h('div', { class: 'empty__art', 'aria-hidden': 'true', html: safeDecor('empty', settings.skin) }),
        h('p', null, 'Пока нет ни одного навыка.'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => ctx.navigate('settings') }, ico('plus'), h('span', null, 'Добавить навык'))));
      return;
    }
    cardsEl.replaceChildren(...skills.map(skillCard));
  }

  function skillCard(skill) {
    const rec = () => store.day(selected, skill.id) || {};
    const card = h('section', { class: `card card--skill sk-${skill.color} today-skill${skill.priority ? ' is-priority' : ''}`, 'aria-label': skill.name });

    // --- отметка ---
    const toggle = h('button', { class: 'check-toggle check-toggle--wide', type: 'button', onclick: () => setDone(!rec().done) },
      ico('check'),
      h('span', { class: 'check-toggle__label' }, 'Сделано'));

    function setDone(done) {
      store.setDay(selected, skill.id, { done });
      updateCard();
      drawStrip();
      drawProgress();
      if (done && selected !== today) toast(`${skill.name}: отмечено за ${formatShort(selected)}`);
    }

    // --- минуты ---
    const minInput = h('input', { class: 'stepper__value input num', type: 'number', inputmode: 'numeric', min: 0, max: MAX_MIN, step: 1,
      placeholder: '0', 'aria-label': `Минуты: ${skill.name}`, value: rec().minutes ?? '' });
    let minDirty = false;
    const saveMinutes = debounce(() => { if (minDirty) { minDirty = false; commitMinutes(minInput.value); } }, 500);
    pending.add({ flush: () => saveMinutes.flush() });

    function commitMinutes(val, fromButton) {
      let n = val === '' || val === null ? null : Math.round(Number(val));
      if (n !== null && (!Number.isFinite(n) || n < 0)) n = 0;
      if (n !== null && n > MAX_MIN) n = MAX_MIN;
      if (n === 0) n = null;
      const partial = { minutes: n };
      const wasDone = !!rec().done;
      if (n && !wasDone) partial.done = true; // указали время — значит, занятие было
      store.setDay(selected, skill.id, partial);
      if (fromButton || document.activeElement !== minInput) minInput.value = n ?? '';
      if (partial.done) { updateCard(); drawStrip(); drawProgress(); }
    }

    function addMinutes(delta) {
      minDirty = false;
      const cur = Number(minInput.value) || 0;
      const next = Math.max(0, Math.min(MAX_MIN, cur + delta));
      minInput.value = next || '';
      commitMinutes(next, true);
    }
    minInput.addEventListener('input', () => { minDirty = true; saveMinutes(); });
    minInput.addEventListener('change', () => saveMinutes.flush());

    const minutes = h('div', { class: 'today-minutes' },
      h('div', { class: 'today-minutes__row' },
        h('span', { class: 'field__label today-minutes__label' }, ico('clock'), h('span', null, 'Минуты')),
        h('div', { class: 'stepper' },
          h('button', { class: 'stepper__btn', type: 'button', 'aria-label': 'Меньше на 5 минут', onclick: () => addMinutes(-5) }, ico('minus')),
          minInput,
          h('button', { class: 'stepper__btn', type: 'button', 'aria-label': 'Больше на 5 минут', onclick: () => addMinutes(5) }, ico('plus')))),
      h('div', { class: 'chips today-minutes__chips' },
        [5, 15, 30].map((n) => h('button', { class: 'chip', type: 'button', 'aria-label': `Добавить ${n} минут`, onclick: () => addMinutes(n) }, `+${n}`))));

    // --- заметка ---
    const noteInput = h('input', { class: 'input today-note', type: 'text', maxlength: 300,
      placeholder: 'Короткая заметка: что получилось, что нет…', 'aria-label': `Заметка: ${skill.name}`, value: rec().note || '' });
    const saveNote = debounce(() => {
      const v = noteInput.value;
      if ((rec().note || '') !== v) store.setDay(selected, skill.id, { note: v });
    }, 500);
    pending.add({ flush: () => saveNote.flush() });
    noteInput.addEventListener('input', () => saveNote());
    noteInput.addEventListener('blur', () => saveNote.flush());

    // --- серия и задания ---
    const streakEl = h('div', { class: 'today-streak' });
    const tasksEl = h('div');

    function updateCard() {
      const r = rec();
      toggle.classList.toggle('is-on', !!r.done);
      toggle.setAttribute('aria-pressed', r.done ? 'true' : 'false');
      card.classList.toggle('is-done', !!r.done);

      const st = computeStreak(store.doneDates(skill.id), today);
      const parts = [];
      if (st.current > 0) {
        parts.push(h('span', { class: 'today-streak__cur' }, ico('flame'),
          h('span', null, `Серия: ${st.current} ${plural(st.current, DAYS)}`)));
      } else {
        parts.push(h('span', { class: 'today-streak__cur is-empty muted' }, ico('flame'), h('span', null, 'Серия начнётся с отметки')));
      }
      if (st.best > 0) parts.push(h('span', { class: 'small muted today-streak__best' }, `лучшая: ${st.best}`));
      const warn = st.atRisk && selected === today
        ? h('div', { class: 'today-warn small', role: 'note' }, ico('info'), h('span', null, 'Вчера пропуск — сегодня важно не пропустить'))
        : null;
      streakEl.replaceChildren(h('div', { class: 'row row--between' }, ...parts), ...(warn ? [warn] : []));

      const w = start ? weekOf(selected, start) : 0;
      if (w >= 1 && w <= store.planWeeks()) {
        const list = store.tasks(w, skill.id);
        if (list.length) {
          const d = list.filter((t) => t.done).length;
          tasksEl.replaceChildren(h('button', { class: 'today-tasks-link small', type: 'button',
            onclick: () => ctx.navigate('plan', { week: w }) },
          ico('list'), h('span', null, `Задания недели ${w}: ${d} из ${list.length}`), ico('chevron-right')));
          return;
        }
      }
      tasksEl.replaceChildren();
    }

    card.append(
      h('div', { class: 'card__head' },
        h('span', { class: 'card__icon' }, ico(skill.icon || 'star')),
        h('h2', { class: 'card__title' }, skill.name),
        skill.priority && h('span', { class: 'today-priority', title: 'Главный навык', 'aria-label': 'Главный навык' }, ico('star'))),
      h('div', { class: 'card__body stack stack--sm' }, toggle, minutes, noteInput),
      h('div', { class: 'card__foot stack stack--sm' }, streakEl, tasksEl));
    updateCard();
    return card;
  }

  function drawHint() {
    const skills = store.skills();
    if (!skills.length) { hintEl.replaceChildren(); return; }
    const list = [...skills]
      .sort((a, b) => (a.hintOrder ?? 999) - (b.hintOrder ?? 999) || (a.order ?? 0) - (b.order ?? 0))
      .map((s) => (s.minimum || '').trim())
      .filter(Boolean);
    hintEl.replaceChildren(h('aside', { class: 'hint-box today-hint' },
      ico('leaf'),
      h('div', { class: 'today-hint__text' },
        list.length
          ? [h('strong', null, 'Плохой день? '), `Минимум: ${list.join(', ')}.`]
          : [h('strong', null, 'Плохой день? '), 'Задайте «минимум» для навыков — маленький шаг, который можно сделать всегда.'],
        ' ',
        h('button', { class: 'today-hint__link', type: 'button', onclick: () => ctx.navigate('settings') }, 'Изменить'))));
  }

  setUrl();
  draw();

  return () => flushAll();
}

function safeDecor(name, skin) {
  try { return decor(name, skin) || ''; } catch { return ''; }
}
