// «Занятие» — необязательный режим: собирает занятие на 10–40 минут из блоков недели
// и ведёт по ним с таймером. В конце можно отметить занятие в трекере.

import { h, ico, toast, confirmDialog } from '../../../js/ui.js';
import * as store from '../../../js/store.js';
import { todayISO } from '../../../js/dates.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { timer } from '../timer.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, weekTabs, skillPill, skillClass, safeDecor } from './common.js';

const DURATIONS = [10, 20, 30, 40];
let setup = null;  // { week, skills:Set, minutes }
let run = null;    // { blocks, i, marks:[], finished, saved }

export function buildSession(courses, week, skillIds, total) {
  const pools = skillIds.map((id) => ({ id, blocks: (courses[id]?.sessions?.[week] || courses[id]?.sessions?.[String(week)] || [])
    .filter((b) => b && b.title).map((b, k) => ({ ...b, skillId: id, minutes: Math.max(1, Number(b.minutes) || 5), k })) }))
    .filter((p) => p.blocks.length);
  if (!pools.length) return [];
  const budget = total / pools.length;
  const chosen = pools.map((p) => {
    const out = [];
    let sum = 0;
    for (const b of p.blocks) if (sum + b.minutes <= budget) { out.push(b); sum += b.minutes; }
    if (!out.length) out.push([...p.blocks].sort((a, b) => a.minutes - b.minutes)[0]);
    return out;
  });
  // остаток времени добираем неиспользованными блоками
  let used = chosen.flat().reduce((s, b) => s + b.minutes, 0);
  let added = true;
  while (added) {
    added = false;
    pools.forEach((p, pi) => {
      const extra = p.blocks.find((b) => !chosen[pi].includes(b) && used + b.minutes <= total);
      if (extra) { chosen[pi].push(extra); used += extra.minutes; added = true; }
    });
  }
  return chosen.flatMap((list) => list.sort((a, b) => a.k - b.k));
}

export async function render(root, ctx) {
  root.append(pageHead('Занятие', 'По желанию: я соберу короткое занятие и проведу по шагам с таймером. Можно и просто проходить уроки на «Пути».'));
  const wait = loader();
  root.append(wait);
  const courses = await content.courses();
  if (!ctx.alive()) return;
  wait.remove();
  const body = h('div', { class: 'stack' });
  root.append(body);
  const timers = new Set();
  const stopTimers = () => { timers.forEach((t) => t.destroy()); timers.clear(); };

  const available = (w) => content.SKILL_IDS.filter((id) => (courses[id]?.sessions?.[w] || courses[id]?.sessions?.[String(w)] || []).length);

  if (!setup) {
    const w = progress.defaultWeek();
    setup = { week: w, skills: new Set(available(w)), minutes: 20 };
  }

  draw();
  return stopTimers;

  function draw() {
    stopTimers();
    if (run?.finished) return drawSummary();
    if (run) return drawRunner();
    drawSetup();
  }

  // ---------- настройка ----------
  function drawSetup() {
    const av = available(setup.week);
    if (!content.SKILL_IDS.some((id) => courses[id])) {
      body.replaceChildren(soon('Занятия скоро появятся'));
      return;
    }
    const blocks = buildSession(courses, setup.week, [...setup.skills].filter((s) => av.includes(s)), setup.minutes);
    const total = blocks.reduce((s, b) => s + b.minutes, 0);
    body.replaceChildren(
      h('div', { class: 'card stack' },
        h('div', { class: 'field' },
          h('span', { class: 'field__label' }, 'Неделя'),
          weekTabs(setup.week, (w) => { setup.week = w; setup.skills = new Set(available(w)); drawSetup(); }, { current: progress.defaultWeek() })),
        h('div', { class: 'field' },
          h('span', { class: 'field__label' }, 'Что сегодня'),
          av.length ? h('div', { class: 'chips' }, content.SKILL_IDS.filter((id) => av.includes(id)).map((id) => {
            const sk = content.skillInfo(id);
            const on = setup.skills.has(id);
            return h('button', { class: `chip ${skillClass(id)}${on ? ' is-active' : ''}`, type: 'button', 'aria-pressed': String(on),
              onclick: () => { if (on) setup.skills.delete(id); else setup.skills.add(id); drawSetup(); } }, ico(on ? 'check' : sk.icon), sk.name);
          })) : h('p', { class: 'small muted' }, 'На эту неделю блоков для занятия пока нет.')),
        h('div', { class: 'field' },
          h('span', { class: 'field__label' }, 'Сколько есть времени'),
          h('div', { class: 'segmented ln-dur', role: 'radiogroup', 'aria-label': 'Длительность' }, DURATIONS.map((m) => h('button', {
            class: `segmented__btn${setup.minutes === m ? ' is-active' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(setup.minutes === m),
            onclick: () => { setup.minutes = m; drawSetup(); },
          }, `${m} мин`))))),
      blocks.length ? h('section', { class: 'card stack stack--sm ln-plan' },
        h('div', { class: 'row row--between' }, h('h2', { class: 'h3' }, 'План занятия'), h('span', { class: 'badge' }, ico('clock'), `${total} мин`)),
        h('ol', { class: 'ln-plan__list' }, blocks.map((b) => h('li', { class: `ln-plan__item ${skillClass(b.skillId)}` },
          h('span', { class: 'ln-plan__dot', 'aria-hidden': 'true' }),
          h('span', { class: 'ln-plan__title' }, plain(b.title)),
          h('span', { class: 'small muted num' }, `${b.minutes} мин`)))),
        h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => {
          run = { blocks, i: 0, marks: [], finished: false, saved: false, week: setup.week };
          draw();
          window.scrollTo({ top: 0 });
        } }, lico('play'), h('span', null, 'Начать занятие')))
        : h('p', { class: 'small muted ln-center' }, setup.skills.size ? 'Не из чего собрать занятие — выбери другую неделю.' : 'Выбери хотя бы один навык.'));
  }

  // ---------- ход занятия ----------
  function drawRunner() {
    const b = run.blocks[run.i];
    const n = run.blocks.length;
    const tm = timer({ minutes: b.minutes, label: `${b.minutes} мин на этот блок` });
    timers.add(tm);
    const next = run.blocks[run.i + 1];
    body.replaceChildren(
      h('div', { class: 'ln-run__head' },
        h('div', { class: 'row row--between small muted' }, h('span', null, `Блок ${run.i + 1} из ${n}`),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => {
            if (await confirmDialog({ title: 'Закончить занятие?', text: 'Сделанные блоки засчитаются.', okText: 'Закончить' })) { run.finished = true; draw(); }
          } }, 'Закончить')),
        h('div', { class: 'ln-run__bar' }, run.blocks.map((x, k) => h('span', {
          class: `ln-run__seg ${skillClass(x.skillId)}${k < run.i ? (run.marks[k] === 'done' ? ' is-done' : ' is-skipped') : k === run.i ? ' is-current' : ''}`,
          style: `flex-grow:${x.minutes}`,
        })))),
      h('article', { class: `card card--skill ${skillClass(b.skillId)} ln-run__card` },
        h('div', { class: 'row row--between row--wrap' }, skillPill(b.skillId), h('span', { class: 'badge' }, ico('clock'), `${b.minutes} мин`)),
        h('h2', { class: 'h2 ln-run__title' }, md(b.title)),
        b.text && mdBlock(b.text),
        b.lessonId && h('a', { class: 'btn btn--ghost btn--sm ln-run__lesson', href: `#/lesson/${encodeURIComponent(b.lessonId)}` }, ico('book'), h('span', null, 'Подробно в уроке')),
        tm.el,
        h('div', { class: 'ln-step__nav' },
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => advance('skipped') }, 'Пропустить'),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => advance('done') }, h('span', null, run.i + 1 < n ? 'Готово, дальше' : 'Готово'), ico('check')))),
      next && h('p', { class: 'small muted ln-center' }, 'Дальше: ', plain(next.title), ` · ${next.minutes} мин`),
      b.lessonId && h('p', { class: 'small muted ln-center' }, 'Если откроешь урок — занятие подождёт тут, во вкладке «Занятие».'));
  }

  function advance(mark) {
    run.marks[run.i] = mark;
    if (run.i + 1 >= run.blocks.length) run.finished = true;
    else run.i += 1;
    draw();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- итог ----------
  function drawSummary() {
    const per = {};
    run.blocks.forEach((b, k) => { if (run.marks[k] === 'done') per[b.skillId] = (per[b.skillId] || 0) + b.minutes; });
    const ids = Object.keys(per);
    const total = ids.reduce((s, id) => s + per[id], 0);
    const pick = new Set(ids.filter((id) => store.skill(id)));
    const today = todayISO();
    body.replaceChildren(h('div', { class: 'card ln-summary stack' },
      h('div', { class: 'ln-finish__art', 'aria-hidden': 'true', html: safeDecor('celebrate') }),
      h('p', { class: 'hand ln-finish__text' }, total ? `Занятие окончено: ${total} мин!` : 'Занятие окончено'),
      total ? h('div', { class: 'stack stack--sm' },
        run.saved ? h('p', { class: 'hint-box' }, ico('check'), h('span', null, 'Отмечено в трекере на сегодня.'))
          : h('p', { class: 'small muted' }, 'Отметить в трекере? Минуты прибавятся к уже записанным за сегодня.'),
        ids.map((id) => {
          const sk = content.skillInfo(id);
          const inTracker = !!store.skill(id);
          const input = h('input', { type: 'checkbox', class: 'checkbox', checked: inTracker, disabled: !inTracker || run.saved,
            onchange: () => { if (input.checked) pick.add(id); else pick.delete(id); } });
          return h('label', { class: `check-item ${skillClass(id)}` }, input,
            h('span', null, h('strong', null, sk.name), ` · ${per[id]} мин`, !inTracker && h('span', { class: 'small muted' }, ' (навыка нет в трекере)')));
        }),
        !run.saved && h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => {
          for (const id of pick) {
            const prev = store.day(today, id);
            store.setDay(today, id, { done: true, minutes: (Number(prev?.minutes) || 0) + per[id] });
          }
          if (pick.size) toast('Отмечено в трекере');
          run.saved = true;
          drawSummary();
        } }, ico('check'), h('span', null, 'Отметить в трекере')),
        run.saved && h('a', { class: 'btn btn--ghost btn--block', href: '../#/today' }, 'Открыть «Сегодня» в трекере'))
        : h('p', { class: 'small muted' }, 'Ни один блок не отмечен как сделанный — ничего страшного, в другой раз.'),
      h('button', { class: 'btn btn--block', type: 'button', onclick: () => { run = null; draw(); } }, 'Новое занятие')));
  }
}
