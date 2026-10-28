// «Журнал» — недельная запись: показатели, чек-лист освоенного, заметки по каждому навыку.

import * as store from '../store.js';
import { h, ico, sheet, confirmDialog } from '../ui.js';
import { weekRange, daysOfWeek, formatShort } from '../dates.js';
import { openMetricsEditor } from './settings-metrics.js';
import { moveInList } from './settings-skills.js';

const editing = new Set();     // навыки, у которых открыт режим «Изменить список»
  const expanded = new Set(); // навыки, у которых чек-лист развёрнут полностью
let focusAddFor = null;        // после добавления пункта вернуть фокус в поле

const NUMERIC = new Set(['number', 'percent', 'scale']);
const isEmpty = (v) => v === undefined || v === null || v === '';

function fmtValue(m, v) {
  if (isEmpty(v)) return '—';
  if (m.type === 'bool') return v ? 'да' : 'нет';
  if (m.type === 'percent') return `${v}%`;
  if (m.type === 'scale') return `${v}/5`;
  if (m.type === 'number' && m.unit) return `${v} ${m.unit}`;
  return String(v);
}

export function render(root, ctx) {
  const pending = new Set();   // отложенные сохранения — сбросить при уходе с экрана

  function saver(fn, ms = 500) {
    let t = null, last;
    const fire = () => { clearTimeout(t); t = null; pending.delete(fire); fn(last); };
    return (v) => { last = v; clearTimeout(t); t = setTimeout(fire, ms); pending.add(fire); };
  }

  const s = store.settings();
  const weeks = store.planWeeks();
  const cur = store.currentWeek() || 1;
  let week = parseInt(ctx.params.week, 10);
  if (!Number.isFinite(week) || week < 1) week = cur;
  week = Math.min(week, weeks);
  const j = store.journal(week);
  const skills = store.skills();

  // ---------- шапка и вкладки ----------
  let sub = '';
  if (s.startDate) {
    const [from, to] = weekRange(week, s.startDate);
    sub = `${formatShort(from)} – ${formatShort(to)}`;
    if (week === store.calendarWeek()) sub += ' · текущая неделя';
  }
  root.append(
    h('div', { class: 'page-head' },
      h('div', null,
        h('h1', { class: 'h1 page-head__title' }, 'Журнал'),
        h('div', { class: 'page-head__sub muted' }, `Неделя ${week}${sub ? ' · ' + sub : ''}`)),
      h('a', { class: 'icon-btn page-help', href: 'learn/#/guide/journal', 'aria-label': 'Как заполнять журнал', title: 'Как заполнять журнал' }, ico('info'))));

  const tabs = h('div', { class: 'tabs jr-tabs', role: 'tablist', 'aria-label': 'Недели' },
    Array.from({ length: weeks }, (_, i) => i + 1).map((w) => h('button', {
      type: 'button', role: 'tab', class: `tab${w === week ? ' is-active' : ''}`,
      'aria-selected': String(w === week),
      onclick: () => { if (w !== week) ctx.navigate('journal', { week: w }); },
    }, `Неделя ${w}`, w === cur && store.calendarWeek() <= weeks ? h('span', { class: 'jr-tab-dot', 'aria-label': ' (сейчас)' }) : null)));
  root.append(tabs);
  requestAnimationFrame(() => {
    const act = tabs.querySelector('.is-active');
    if (act) tabs.scrollLeft = act.offsetLeft - (tabs.clientWidth - act.offsetWidth) / 2;
  });

  if (!skills.length) {
    root.append(h('div', { class: 'empty' },
      h('p', null, 'Пока нет ни одного навыка.'),
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => ctx.navigate('settings') }, 'Добавить навык в настройках')));
    return () => pending.forEach((f) => f());
  }

  root.append(h('p', { class: 'small muted jr-intro' },
    'Раз в неделю подведите короткий итог: цифры, что освоено и пара слов о том, как шло.'));

  for (const skill of skills) root.append(skillCard(skill));

  if (focusAddFor) {
    const el = root.querySelector(`[data-add-for="${CSS.escape(focusAddFor)}"]`);
    focusAddFor = null;
    el?.focus({ preventScroll: true });
  }

  return () => pending.forEach((f) => f());

  // ---------- карточка навыка ----------
  function skillCard(skill) {
    return h('section', { class: `card card--skill sk-${skill.color || 1} jr-skill`, 'aria-label': skill.name },
      h('div', { class: 'card__head' },
        h('span', { class: 'card__icon' }, ico(skill.icon || 'star')),
        h('div', { class: 'jr-skill__title' },
          h('h2', { class: 'card__title' }, skill.name),
          weekStats(skill))),
      h('div', { class: 'card__body stack' },
        metricsBlock(skill),
        checklistBlock(skill),
        notesBlock(skill)));
  }

  function weekStats(skill) {
    if (!s.startDate) return null;
    let done = 0, minutes = 0;
    for (const d of daysOfWeek(week, s.startDate)) {
      const rec = store.day(d, skill.id);
      if (rec?.done) done++;
      if (rec && Number(rec.minutes) > 0) minutes += Number(rec.minutes);
    }
    const parts = [`занимался ${done} из 7 дней`];
    if (minutes) parts.push(`${minutes} мин`);
    return h('div', { class: 'small muted jr-stats' }, ico('calendar', 'ico ico--sm'), ' ', parts.join(' · '));
  }

  // ---------- показатели ----------
  function metricsBlock(skill) {
    const ms = store.metrics(skill.id);
    const head = h('div', { class: 'row row--between jr-block-head' },
      h('h3', { class: 'h3' }, 'Показатели'),
      h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => openMetricsEditor(skill.id, { onChange: () => ctx.rerender() }) },
        ico('edit'), ' Изменить показатели'));
    if (!ms.length) return h('div', { class: 'jr-block' }, head, h('p', { class: 'small muted' }, 'Показателей нет — добавьте, если хочется отслеживать цифры.'));
    return h('div', { class: 'jr-block' }, head, h('div', { class: 'stack stack--sm' }, ms.map(metricField)));
  }

  function metricField(m) {
    const value = j.values?.[m.id];
    const prev = store.previousValue(m.id, week);
    const id = `jr_${m.id}`;
    const deltaEl = h('div', { class: 'jr-delta small' });
    const paintDelta = (v) => paintDeltaEl(deltaEl, m, prev, v);
    const save = (v) => { store.setJournal(week, 'values', m.id, v); paintDelta(v); };
    let control;

    if (m.type === 'number' || m.type === 'percent') {
      const deb = saver((raw) => {
        const val = raw === '' ? null : Number(raw);
        store.setJournal(week, 'values', m.id, Number.isFinite(val) ? val : null);
      });
      const input = h('input', { id, class: 'input jr-num-input num', type: 'number', inputmode: 'decimal', step: 'any',
        min: m.type === 'percent' ? 0 : undefined, max: m.type === 'percent' ? 100 : undefined,
        value: isEmpty(value) ? '' : value, placeholder: '—',
        oninput: () => {
          let raw = input.value;
          if (m.type === 'percent' && raw !== '') {
            const n = Math.max(0, Math.min(100, Number(raw)));
            if (String(n) !== raw) { raw = String(n); input.value = raw; }
          }
          deb(raw);
          paintDelta(raw === '' ? null : Number(raw));
        } });
      const unit = m.type === 'percent' ? '%' : (m.unit || '');
      control = h('div', { class: 'jr-num' }, input, unit && h('span', { class: 'jr-unit muted' }, unit));
    } else if (m.type === 'scale') {
      control = h('div', { class: 'scale', role: 'radiogroup', 'aria-labelledby': `${id}_l` });
      const paint = (v) => control.replaceChildren(...[1, 2, 3, 4, 5].map((n) => h('button', {
        type: 'button', class: `scale__btn${v === n ? ' is-active' : ''}`, role: 'radio', 'aria-checked': String(v === n),
        'aria-label': `${n} из 5`,
        onclick: () => { const nv = v === n ? null : n; save(nv); paint(nv); },
      }, String(n))));
      paint(value);
    } else if (m.type === 'bool') {
      control = h('div', { class: 'segmented jr-bool', role: 'radiogroup', 'aria-labelledby': `${id}_l` });
      const paint = (v) => control.replaceChildren(...[[true, 'Да'], [false, 'Нет']].map(([bv, label]) => h('button', {
        type: 'button', class: `segmented__btn${v === bv ? ' is-active' : ''}`, role: 'radio', 'aria-checked': String(v === bv),
        onclick: () => { const nv = v === bv ? null : bv; save(nv); paint(nv); },
      }, label)));
      paint(value);
    } else if (m.type === 'select') {
      const opts = m.options || [];
      control = h('select', { id, class: 'input', onchange: (e) => save(e.target.value || null) },
        h('option', { value: '' }, '— не выбрано —'),
        opts.map((o) => h('option', { value: o, selected: o === value }, o)),
        !isEmpty(value) && !opts.includes(value) ? h('option', { value, selected: true }, value) : null);
    } else {
      control = h('span', { class: 'muted small' }, `Неизвестный тип: ${m.type}`);
    }

    paintDelta(value);
    return h('div', { class: 'field jr-metric' },
      h('label', { class: 'field__label', id: `${id}_l`, for: (m.type === 'number' || m.type === 'percent' || m.type === 'select') ? id : undefined },
        m.label, m.optional && !/необязательн/i.test(m.hint || '') ? h('span', { class: 'badge jr-opt' }, 'необязательно') : null),
      control,
      m.hint ? h('div', { class: 'field__hint' }, m.hint) : null,
      deltaEl);
  }

  function paintDeltaEl(el, m, prev, v) {
    el.replaceChildren();
    el.className = 'jr-delta small';
    if (!prev) { el.hidden = true; return; }
    el.hidden = false;
    const pv = prev.value;
    const wk = h('span', { class: 'muted' }, ` (нед. ${prev.week})`);
    if (!NUMERIC.has(m.type)) {
      el.append(h('span', { class: 'muted' }, `Было: ${fmtValue(m, pv)}`), wk);
      return;
    }
    if (isEmpty(v) || !Number.isFinite(Number(v))) {
      el.append(h('span', { class: 'muted' }, `Было: ${fmtValue(m, pv)}`), wk);
      return;
    }
    const diff = Number(v) - Number(pv);
    const good = m.lowerIsBetter ? diff < 0 : diff > 0;
    const cls = diff === 0 ? 'delta--same' : good ? 'delta--up' : 'delta--down';
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
    const abs = Math.round(Math.abs(diff) * 100) / 100;
    el.append(h('span', { class: `delta ${cls}` },
      diff === 0 ? null : ico(diff > 0 ? 'arrow-up' : 'arrow-down', 'ico ico--sm'),
      `${fmtValue(m, pv)} → ${fmtValue(m, v)}`,
      h('span', { class: 'num' }, ` (${sign}${abs})`)), wk);
  }

  // ---------- чек-лист ----------
  function checklistBlock(skill) {
    const items = store.checklist(skill.id);
    const isEditing = editing.has(skill.id);
    const title = skill.checklistTitle || 'Освоено';
    const counterEl = h('span', { class: 'small muted jr-counter num' });
    const bar = h('div', { class: 'progress__bar' });
    const stateOf = (it) => {
      const mw = store.masteredWeek(it.id, week);
      const carried = mw !== null && mw < week;
      return { carried, mw, done: carried || !!store.journal(week).checks?.[it.id] };
    };
    const paintCounter = () => {
      const done = items.filter((it) => stateOf(it).done).length;
      counterEl.textContent = items.length ? `освоено ${done} из ${items.length}` : '';
      bar.style.width = items.length ? `${Math.round((done / items.length) * 100)}%` : '0%';
    };

    const toggleBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm',
      'aria-pressed': String(isEditing),
      onclick: () => { if (isEditing) editing.delete(skill.id); else editing.add(skill.id); ctx.rerender(); } },
    isEditing ? ico('check') : ico('edit'), isEditing ? ' Готово' : ' Изменить список');

    const head = h('div', { class: 'jr-block-head' },
      h('div', { class: 'row row--between' }, h('h3', { class: 'h3' }, title), toggleBtn),
      items.length ? h('div', { class: 'row row--between jr-counter-row' }, counterEl) : null,
      items.length ? h('div', { class: 'progress progress--skill' }, bar) : null);

    let body;
    if (isEditing) body = checklistEditor(skill, items);
    else if (!items.length) {
      body = h('p', { class: 'small muted' }, 'Список пуст. Нажмите «Изменить список», чтобы добавить приёмы или темы.');
    } else {
      // Длинный список сворачиваем: видны первые пункты, остальное — по кнопке.
      const LIMIT = 6;
      const long = items.length > LIMIT + 2;
      const open = !long || expanded.has(skill.id);
      const shown = open ? items : items.slice(0, LIMIT);
      body = h('div', null,
        h('div', { class: 'list jr-checklist' }, shown.map((it) => checkItem(it, stateOf, paintCounter))),
        long && h('button', { type: 'button', class: 'btn btn--ghost btn--sm btn--block',
          'aria-expanded': String(open),
          onclick: () => { if (open) expanded.delete(skill.id); else expanded.add(skill.id); ctx.rerender(); } },
        ico(open ? 'chevron-up' : 'chevron-down'), open ? ' Свернуть' : ` Показать все (${items.length})`));
    }
    paintCounter();
    return h('div', { class: 'jr-block' }, head, body);
  }

  function checkItem(it, stateOf, paintCounter) {
    let st = stateOf(it);
    const box = h('input', { type: 'checkbox', class: 'checkbox', checked: st.done });
    const note = h('span', { class: 'jr-carried small muted' });
    const label = h('label', { class: 'check-item jr-check' }, box,
      h('span', { class: 'jr-check__text' }, it.text, note));
    const paint = () => {
      label.className = `check-item jr-check${st.done ? ' is-done' : ''}${st.carried ? ' is-carried' : ''}`;
      box.checked = st.done;
      box.setAttribute('aria-readonly', st.carried ? 'true' : 'false');
      note.textContent = st.carried ? ` · с недели ${st.mw}` : '';
    };
    label.addEventListener('click', (e) => {
      if (!st.carried) return;
      e.preventDefault();
      explainCarried(it, st.mw);
    });
    box.addEventListener('change', () => {
      if (st.carried) { paint(); return; }
      store.setJournal(week, 'checks', it.id, box.checked ? true : null);
      st = stateOf(it);
      paint();
      paintCounter();
    });
    paint();
    return label;
  }

  function explainCarried(it, mw) {
    const s2 = sheet({
      title: it.text,
      content: h('p', { class: 'muted' }, `Отмечено как освоенное в неделе ${mw} и переносится на следующие недели. Снять отметку можно в неделе ${mw}.`),
      actions: [
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => s2.close() }, 'Понятно'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { s2.close(); ctx.navigate('journal', { week: mw }); } },
          `Перейти к неделе ${mw}`),
      ],
    });
  }

  function checklistEditor(skill, items) {
    const titleSave = saver((v) => store.patch('skills', skill.id, { checklistTitle: v.trim() || 'Освоено' }));
    const titleInput = h('input', { class: 'input', type: 'text', value: skill.checklistTitle || '', maxlength: 60,
      'aria-label': 'Название списка', placeholder: 'Освоенные приёмы', oninput: () => titleSave(titleInput.value) });

    const rows = items.map((it, i) => {
      const deb = saver((v) => { if (v.trim()) store.patch('checklist', it.id, { text: v.trim() }); });
      const input = h('input', { class: 'input jr-edit__input', type: 'text', value: it.text, maxlength: 120,
        'aria-label': 'Текст пункта', oninput: () => deb(input.value) });
      return h('div', { class: 'list__item jr-edit__row' },
        input,
        h('div', { class: 'jr-edit__actions' },
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Выше', disabled: i === 0,
            onclick: () => { flushAll(); if (moveInList('checklist', store.checklist(skill.id), i, -1)) ctx.rerender(); } }, ico('arrow-up')),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Ниже', disabled: i === items.length - 1,
            onclick: () => { flushAll(); if (moveInList('checklist', store.checklist(skill.id), i, 1)) ctx.rerender(); } }, ico('arrow-down')),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Удалить «${it.text}»`,
            onclick: async () => {
              const ok = await confirmDialog({ title: 'Удалить пункт?', text: `«${it.text}» пропадёт из списка всех недель.`,
                okText: 'Удалить', danger: true });
              if (ok) { flushAll(); store.remove('checklist', it.id); ctx.rerender(); }
            } }, ico('trash'))));
    });

    const addInput = h('input', { class: 'input', type: 'text', placeholder: 'Новый пункт', maxlength: 120,
      'aria-label': 'Новый пункт', dataset: { addFor: skill.id },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } } });
    function add() {
      const text = addInput.value.trim();
      if (!text) { addInput.focus(); return; }
      flushAll();
      const order = Math.max(0, ...store.checklist(skill.id).map((c) => c.order ?? 0)) + 1;
      store.put('checklist', { id: store.uid('c'), skillId: skill.id, text, order });
      focusAddFor = skill.id;
      ctx.rerender();
    }
    return h('div', { class: 'stack stack--sm jr-edit' },
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Название списка'), titleInput),
      rows.length ? h('div', { class: 'list' }, rows) : null,
      h('div', { class: 'row jr-edit__add' }, addInput,
        h('button', { type: 'button', class: 'btn btn--primary', 'aria-label': 'Добавить пункт', onclick: add }, ico('plus'))));
  }

  function flushAll() { [...pending].forEach((f) => f()); }

  // ---------- заметка ----------
  function notesBlock(skill) {
    const id = `jr_note_${skill.id}`;
    const status = h('span', { class: 'small muted jr-saved', 'aria-live': 'polite' });
    const deb = saver((v) => {
      store.setJournal(week, 'notes', skill.id, v.trim() ? v : null);
      status.textContent = 'Сохранено';
      status.classList.add('is-shown');
    }, 600);
    const ta = h('textarea', { id, class: 'input jr-note', rows: 3,
      placeholder: 'Что получилось, что было трудно, что дальше…',
      oninput: () => { status.textContent = 'Сохраняю…'; status.classList.add('is-shown'); deb(ta.value); } });
    ta.value = j.notes?.[skill.id] || '';
    return h('div', { class: 'field jr-block' },
      h('div', { class: 'row row--between' },
        h('label', { class: 'field__label h3', for: id }, 'Заметка за неделю'), status),
      ta);
  }
}

