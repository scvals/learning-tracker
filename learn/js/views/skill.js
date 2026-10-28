// Весь курс навыка: вступление и все недели с уроками.

import { h, ico } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, trail, skillClass, WEEKS } from './common.js';

export async function render(root, ctx) {
  const id = ctx.parts[0];
  const sk = content.skillInfo(id);
  root.append(pageHead(sk.name, null, { back: { href: '#/', label: 'Путь' } }));
  if (!content.SKILL_IDS.includes(id)) { root.append(soon('Такого курса нет')); return; }
  const wait = loader();
  root.append(wait);
  const c = await content.course(id);
  if (!ctx.alive()) return;
  wait.remove();
  if (!c) { root.append(soon('Курс скоро появится')); return; }
  ctx.setTitle(sk.name);

  const done = c.lessons.filter((l) => progress.status(l) === 'done').length;
  const pct = c.lessons.length ? Math.round(done / c.lessons.length * 100) : 0;
  const next = progress.nextLesson(c.lessons);
  root.append(h('section', { class: `card card--skill ${skillClass(id)} ln-course-intro` },
    h('div', { class: 'card__head' }, h('span', { class: 'card__icon' }, ico(sk.icon)),
      h('h2', { class: 'card__title' }, plain(c.title || sk.name))),
    h('div', { class: 'card__body stack stack--sm' },
      c.intro && mdBlock(c.intro),
      c.lessons.length > 0 && h('div', null,
        h('div', { class: 'row row--between small' }, h('span', { class: 'muted' }, 'Пройдено уроков'), h('span', { class: 'num' }, `${done} из ${c.lessons.length}`)),
        h('div', { class: 'progress progress--skill' }, h('div', { class: 'progress__bar', style: { width: `${pct}%` } })))),
    next && h('div', { class: 'card__foot' },
      h('span', { class: 'small' }, 'Дальше: ', plain(next.title)),
      h('a', { class: 'btn btn--primary btn--sm', href: `#/lesson/${encodeURIComponent(next.id)}` }, lico('play'), h('span', null, progress.status(next) === 'doing' ? 'Продолжить' : 'Начать')))));

  let n = 1;
  for (const w of WEEKS) {
    const wk = c.weeks.find((x) => Number(x.week) === w) || {};
    const lessons = c.lessons.filter((l) => l.week === w);
    root.append(h('section', { class: `section ln-course-week ${skillClass(id)}`, id: `week-${w}` },
      h('h2', { class: 'section__title' }, h('span', { class: 'ln-week-num' }, String(w)), h('span', null, wk.title ? plain(wk.title) : `Неделя ${w}`)),
      h('div', { class: 'card stack stack--sm' },
        wk.goal && h('div', { class: 'ln-goal' }, lico('flag', 'ico ico--sm'), mdBlock(wk.goal, 'ln-text small')),
        lessons.length ? trail(lessons, { startN: n, next: next || null }) : h('p', { class: 'small muted' }, 'Уроков на эту неделю нет.'),
        wk.tips?.length ? h('div', { class: 'hint-box' }, ico('leaf'), h('ul', { class: 'ln-bullets' }, wk.tips.map((t) => md(t, 'li')))) : null)));
    n += lessons.length;
  }
}
