// «Как пользоваться трекером»: экраны трекера с нарисованными схемами (HTML/CSS) и шагами.

import { h, ico } from '../../../js/ui.js';
import * as content from '../content.js';
import { md, mdBlock } from '../markup.js';
import { pageHead, loader, soon } from './common.js';

export async function render(root, ctx) {
  const id = ctx.parts[0];
  const wait = loader();
  root.append(wait);
  const g = await content.guide();
  if (!ctx.alive()) return;
  wait.remove();
  const screens = Array.isArray(g?.screens) ? g.screens : [];
  if (!screens.length) { root.append(pageHead('Как пользоваться трекером', null, { back: { href: '#/more', label: 'Справочник' } }), soon()); return; }
  if (id) return screenPage(root, ctx, screens, id);

  root.append(pageHead('Как пользоваться трекером', 'Каждый экран по порядку, простыми словами', { back: { href: '#/more', label: 'Справочник' } }));
  if (g.intro) root.append(h('div', { class: 'card' }, mdBlock(g.intro)));
  if (Array.isArray(g.daily) && g.daily.length) {
    root.append(h('section', { class: 'section' }, h('h2', { class: 'section__title' }, 'Коротко: что когда делать'),
      h('div', { class: 'card' }, h('ol', { class: 'ln-numlist' }, g.daily.map((t) => md(t, 'li'))))));
  }
  root.append(h('section', { class: 'section' }, h('h2', { class: 'section__title' }, 'Экраны трекера'),
    h('div', { class: 'ln-more' }, screens.map((s) => h('a', { class: 'card ln-more__card', href: `#/guide/${encodeURIComponent(s.id)}` },
      h('span', { class: 'card__icon' }, ico(s.icon || 'info')),
      h('span', { class: 'ln-more__text' }, h('span', { class: 'ln-more__title' }, s.title), s.what && h('span', { class: 'small muted' }, s.what)),
      ico('chevron-right', 'ico ln-more__chev'))))));
}

function screenPage(root, ctx, screens, id) {
  const i = screens.findIndex((s) => s.id === id);
  const s = screens[i];
  if (!s) {
    root.append(pageHead('Как пользоваться трекером', null, { back: { href: '#/guide', label: 'Все экраны' } }), soon('Такого раздела нет', null));
    return;
  }
  ctx.setTitle(`${s.title} — как пользоваться`);
  root.append(pageHead(`Экран «${s.title}»`, s.what, { back: { href: '#/guide', label: 'Все экраны' } }));

  const callouts = Array.isArray(s.callouts) ? s.callouts : [];
  const mock = MOCKS[s.id];
  if (mock || callouts.length) {
    root.append(h('section', { class: 'card ln-guide-mock' },
      mock && h('div', { class: 'ln-mk', 'aria-hidden': 'true' }, mock()),
      callouts.length > 0 && h('ol', { class: 'ln-callouts' }, callouts.map((c, k) => h('li', null,
        h('span', { class: 'ln-mk__n' }, String(k + 1)), md(c))))));
  }
  for (const sec of Array.isArray(s.sections) ? s.sections : []) {
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, sec.title),
      h('div', { class: 'card' }, h('ol', { class: 'ln-numlist' }, (sec.steps || []).map((t) => md(t, 'li'))))));
  }
  const prev = screens[i - 1];
  const next = screens[i + 1];
  root.append(
    h('a', { class: 'btn btn--primary btn--block ln-guide-open', href: `../#/${s.id}` }, ico(s.icon || 'info'), h('span', null, `Открыть «${s.title}» в трекере`)),
    h('nav', { class: 'ln-lesson-nav', 'aria-label': 'Другие экраны' },
      prev ? h('a', { class: 'ln-lesson-nav__a', href: `#/guide/${prev.id}` }, ico('chevron-left', 'ico ico--sm'), h('span', null, h('span', { class: 'small muted' }, 'Предыдущий'), h('span', null, prev.title))) : h('span'),
      next ? h('a', { class: 'ln-lesson-nav__a ln-lesson-nav__a--next', href: `#/guide/${next.id}` }, h('span', null, h('span', { class: 'small muted' }, 'Следующий'), h('span', null, next.title)), ico('chevron-right', 'ico ico--sm')) : h('span')));
}

// ---------- схемы экранов ----------
const n = (k) => h('span', { class: 'ln-mk__n' }, String(k));
const line = (w = '60%', cls = '') => h('span', { class: `ln-mk__line ${cls}`, style: { width: w } });

const MOCKS = {
  today: () => h('div', { class: 'ln-mk__screen' },
    h('div', { class: 'ln-mk__head' }, h('span', { class: 'ln-mk__h1' }, 'Сегодня'), n(1), h('span', { class: 'ln-mk__sub' }, 'среда, 28 октября · Неделя 2 из 4')),
    h('div', { class: 'ln-mk__strip' }, n(2), ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d, k) => h('span', { class: `ln-mk__day${k === 2 ? ' is-today' : ''}${k > 2 ? ' is-future' : ''}` },
      h('span', null, d), h('b', null, String(26 + k > 31 ? 26 + k - 31 : 26 + k)),
      h('span', { class: 'ln-mk__dots' }, k < 2 ? [h('i', { class: 'sk-1 on' }), h('i', { class: `sk-2${k ? ' on' : ''}` }), h('i', { class: 'sk-3 on' })] : k === 2 ? [h('i', { class: 'sk-1 on' }), h('i', { class: 'sk-2' }), h('i', { class: 'sk-3' })] : [])))),
    h('div', { class: 'ln-mk__card' }, n(3), h('span', { class: 'ln-mk__row' }, h('span', null, 'Сегодня отмечено'), h('b', { class: 'ln-mk__big' }, '1'), h('span', { class: 'ln-mk__muted' }, 'из 3')), h('span', { class: 'ln-mk__bar' }, h('i', { style: { width: '33%' } }))),
    h('div', { class: 'ln-mk__card ln-mk__skill sk-1' },
      h('span', { class: 'ln-mk__title' }, h('span', { class: 'ln-mk__icon' }, ico('yarn')), 'Вязание'),
      h('span', { class: 'ln-mk__toggle' }, n(4), ico('check'), 'Сделано'),
      h('span', { class: 'ln-mk__row' }, n(5), h('span', null, 'Минуты'), h('span', { class: 'ln-mk__stepper' }, '−', h('b', null, '20'), '+'), h('span', { class: 'ln-mk__chip' }, '+5'), h('span', { class: 'ln-mk__chip' }, '+15')),
      h('span', { class: 'ln-mk__input' }, n(6), '20 петель набрано, ровно!'),
      h('span', { class: 'ln-mk__foot' }, h('span', null, n(7), ico('flame', 'ico ico--sm'), 'Серия: 4 дня', h('span', { class: 'ln-mk__muted' }, ' · лучшая: 6')),
        h('span', null, n(8), ico('list', 'ico ico--sm'), 'Задания недели 2: 1 из 6')))),

  plan: () => h('div', { class: 'ln-mk__screen' },
    h('div', { class: 'ln-mk__head' }, h('span', { class: 'ln-mk__h1' }, 'План'), h('span', { class: 'ln-mk__sub' }, 'Неделя 2 из 4 · 2 ноя – 8 ноя')),
    h('div', { class: 'ln-mk__tabs' }, n(1), h('span', { class: 'ln-mk__tab' }, 'Неделя 1 ', ico('check', 'ico ico--sm')), h('span', { class: 'ln-mk__tab is-active' }, 'Неделя 2 ', h('i', { class: 'ln-mk__dot' })), h('span', { class: 'ln-mk__tab' }, 'Неделя 3')),
    h('div', { class: 'ln-mk__card' }, n(2), h('span', { class: 'ln-mk__row' }, h('span', null, 'Выполнено за неделю'), h('b', { class: 'ln-mk__big' }, '3'), h('span', { class: 'ln-mk__muted' }, 'из 15')), h('span', { class: 'ln-mk__bar' }, h('i', { style: { width: '20%' } }))),
    h('div', { class: 'ln-mk__card ln-mk__skill sk-1' },
      h('span', { class: 'ln-mk__title' }, n(3), h('span', { class: 'ln-mk__icon' }, ico('yarn')), 'Вязание', h('span', { class: 'ln-mk__muted' }, ' выполнено 1 из 6')),
      h('span', { class: 'ln-mk__bar sk' }, h('i', { style: { width: '17%' } })),
      h('span', { class: 'ln-mk__task is-done' }, n(4), h('span', { class: 'ln-mk__circle on' }, ico('check')), h('s', null, 'Спущенная петля, распускание')),
      h('span', { class: 'ln-mk__task' }, h('span', { class: 'ln-mk__circle' }), h('span', { class: 'ln-mk__grow' }, n(5), 'Изнаночная петля'), h('span', { class: 'ln-mk__how' }, n(7), 'Как сделать'), h('span', { class: 'ln-mk__more' }, n(6), '⋯')),
      h('span', { class: 'ln-mk__task' }, h('span', { class: 'ln-mk__circle' }), h('span', { class: 'ln-mk__grow' }, 'Чулочная гладь'), h('span', { class: 'ln-mk__how' }, 'Как сделать'), h('span', { class: 'ln-mk__more' }, '⋯')))),

  journal: () => h('div', { class: 'ln-mk__screen' },
    h('div', { class: 'ln-mk__head' }, h('span', { class: 'ln-mk__h1' }, 'Журнал'), h('span', { class: 'ln-mk__sub' }, 'Неделя 2 · текущая неделя')),
    h('div', { class: 'ln-mk__tabs' }, n(1), h('span', { class: 'ln-mk__tab' }, 'Неделя 1'), h('span', { class: 'ln-mk__tab is-active' }, 'Неделя 2'), h('span', { class: 'ln-mk__tab' }, 'Неделя 3')),
    h('div', { class: 'ln-mk__card ln-mk__skill sk-1' },
      h('span', { class: 'ln-mk__title' }, h('span', { class: 'ln-mk__icon' }, ico('yarn')), 'Вязание'),
      h('span', { class: 'ln-mk__muted ln-mk__row' }, n(2), ico('calendar', 'ico ico--sm'), 'занятия: 5 из 7 дней · 120 мин'),
      h('span', { class: 'ln-mk__label' }, 'Показатели'),
      h('span', { class: 'ln-mk__row' }, n(3), h('span', null, 'Длина шарфа'), h('span', { class: 'ln-mk__num' }, '24'), h('span', { class: 'ln-mk__muted' }, 'см')),
      h('span', { class: 'ln-mk__row ln-mk__muted' }, n(4), 'Было: 12 см (нед. 1)', h('b', { class: 'ln-mk__up' }, '+12')),
      h('span', { class: 'ln-mk__label' }, 'Освоенные приёмы'),
      h('span', { class: 'ln-mk__check' }, n(5), h('i', { class: 'ln-mk__box on dim' }), 'Лицевая петля'),
      h('span', { class: 'ln-mk__check' }, h('i', { class: 'ln-mk__box on' }), 'Изнаночная петля'),
      h('span', { class: 'ln-mk__check' }, h('i', { class: 'ln-mk__box' }), 'Резинка 1×1'),
      h('span', { class: 'ln-mk__input tall' }, n(6), 'Изнанка сначала не шла, к пятнице — ровно.'))),

  summary: () => h('div', { class: 'ln-mk__screen' },
    h('div', { class: 'ln-mk__head' }, h('span', { class: 'ln-mk__h1' }, 'Итоги'), h('span', { class: 'ln-mk__sub' }, 'Неделя 3 из 4')),
    h('div', { class: 'ln-mk__row' }, n(1), h('span', { class: 'ln-mk__chip' }, 'Промежуточный итог'), h('span', { class: 'ln-mk__chip accent' }, 'Итоговый отчёт')),
    h('div', { class: 'ln-mk__card ln-mk__skill sk-1' },
      h('span', { class: 'ln-mk__title' }, h('span', { class: 'ln-mk__icon' }, ico('yarn')), 'Вязание'),
      h('span', { class: 'ln-mk__stats' }, n(2), [['14', 'дней занятий'], ['380', 'минут'], ['4', 'серия · лучшая 6'], ['60%', 'заданий']].map(([v, l]) => h('span', { class: 'ln-mk__stat' }, h('b', null, v), h('span', null, l)))),
      h('span', { class: 'ln-mk__row ln-mk__muted' }, n(3), 'Освоенные приёмы', h('span', { class: 'ln-mk__grow' }), 'освоено 7 из 17'),
      h('span', { class: 'ln-mk__bar sk' }, h('i', { style: { width: '41%' } })),
      h('span', { class: 'ln-mk__weeks' }, n(4), [5, 6, 3, 0].map((v, k) => h('span', { class: 'ln-mk__col' }, h('span', { class: 'ln-mk__colbar', style: { height: `${v / 7 * 100}%` } }), h('span', null, `Н${k + 1}`)))),
      h('span', { class: 'ln-mk__row' }, n(5), h('span', null, 'Длина шарфа'), h('b', null, '36 см'),
        h('span', { class: 'ln-mk__spark', html: '<svg viewBox="0 0 60 20"><polyline points="2,18 22,14 42,8 58,3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }),
        h('b', { class: 'ln-mk__up' }, '+24'))),
    h('div', { class: 'ln-mk__card' }, n(6), h('span', { class: 'ln-mk__heat' },
      [0, 3, 4, 2, 4, 1, 0, 4, 4, 3, 0, 4, 2, 4, 3, 4, 4, 1, 0, 0, 0].map((l) => h('i', { class: `l${l}` }))))),

  settings: () => h('div', { class: 'ln-mk__screen' },
    h('div', { class: 'ln-mk__head' }, h('span', { class: 'ln-mk__h1' }, 'Настройки')),
    h('div', { class: 'ln-mk__card' },
      h('span', { class: 'ln-mk__label' }, 'Тема'),
      h('span', { class: 'ln-mk__seg' }, n(1), h('span', null, 'Авто'), h('span', { class: 'is-active' }, 'Светлая'), h('span', null, 'Тёмная')),
      h('span', { class: 'ln-mk__label' }, 'Дизайн'),
      h('span', { class: 'ln-mk__row' }, n(2), ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((c) => h('i', { class: `ln-mk__sw ${c}` })))),
    h('div', { class: 'ln-mk__card' }, h('span', { class: 'ln-mk__row' }, n(3), 'План: с 20 окт, 4 недели'), line('70%')),
    h('div', { class: 'ln-mk__card' }, h('span', { class: 'ln-mk__row' }, n(4), h('span', { class: 'ln-mk__icon sk-1' }, ico('yarn')), h('span', { class: 'ln-mk__icon sk-2' }, ico('letters')), h('span', { class: 'ln-mk__icon sk-3' }, ico('pen')), 'Навыки')),
    h('div', { class: 'ln-mk__card' }, h('span', { class: 'ln-mk__row' }, n(5), ico('cloud', 'ico ico--sm'), 'Аккаунт и синхронизация')),
    h('div', { class: 'ln-mk__card' }, h('span', { class: 'ln-mk__row' }, n(6), ico('download', 'ico ico--sm'), 'Скачать резервную копию'))),
};
