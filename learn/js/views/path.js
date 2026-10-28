// «Путь» — дорожка уроков по неделям вместо таблицы плана.

import { h, ico } from '../../../js/ui.js';
import * as store from '../../../js/store.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, weekTabs, trail, accordion, skillClass, sectionTitle, stone, safeDecor, WEEKS } from './common.js';

let selWeek = null;

export async function render(root, ctx) {
  const cur = store.settings().startDate ? store.currentWeek() : 0;
  const curW = cur >= 1 ? Math.min(cur, 4) : 0;
  const qw = parseInt(ctx.params.week, 10);
  let week = qw >= 1 && qw <= 4 ? qw : selWeek || progress.defaultWeek();

  const sub = !store.settings().startDate ? 'План в трекере ещё не начат — начни с первой недели.'
    : cur === 0 ? 'План скоро начнётся — можно заглянуть заранее.'
      : store.calendarWeek() > store.planWeeks() ? 'План позади — можно повторить любой урок.'
        : `Сейчас идёт неделя ${curW} из 4. Маленькими шагами — каждый день понемногу.`;
  root.append(pageHead('Твой путь', sub));
  const wait = loader();
  root.append(wait);
  const courses = await content.courses();
  if (!ctx.alive()) return;
  wait.remove();

  const ids = content.SKILL_IDS;
  const anyCourse = ids.some((id) => courses[id]);
  if (!anyCourse) {
    root.append(soon('Уроки скоро появятся', 'Материалы курсов ещё готовятся. А пока загляни в «Справочник» — там, например, есть объяснение, как пользоваться трекером.'),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('a', { class: 'btn btn--primary', href: '#/more' }, 'Открыть справочник')));
    return;
  }

  const contEl = h('div');
  const tabsEl = weekTabs(week, (w) => { week = w; selWeek = w; history.replaceState(null, '', `#/?week=${w}`); drawWeek(); }, { current: curW });
  const weekEl = h('div', { class: 'stack' });
  root.append(contEl, tabsEl, weekEl, overview());
  drawWeek();

  function weekLessons(w) {
    return ids.flatMap((id) => (courses[id] ? courses[id].lessons.filter((l) => l.week === w) : []));
  }

  function drawContinue() {
    let next = progress.nextLesson(weekLessons(week));
    let note = null;
    if (!next) {
      const all = ids.flatMap((id) => courses[id]?.lessons || []);
      next = progress.nextLesson(all);
      if (next) note = `На неделе ${week} всё пройдено! Следующий урок — с недели ${next.week}.`;
    }
    if (!next) {
      contEl.replaceChildren(h('div', { class: 'card ln-continue is-all-done' },
        h('div', { class: 'ln-continue__art', 'aria-hidden': 'true', html: safeDecor('celebrate') }),
        h('p', { class: 'hand ln-continue__done' }, 'Все уроки пройдены — ты огромный молодец!')));
      return;
    }
    const sk = content.skillInfo(next.skillId);
    const st = progress.status(next);
    contEl.replaceChildren(h('a', { class: `card card--skill ${skillClass(next.skillId)} ln-continue`, href: `#/lesson/${encodeURIComponent(next.id)}` },
      h('div', { class: 'ln-continue__row' },
        h('span', { class: 'card__icon' }, ico(sk.icon)),
        h('div', { class: 'ln-continue__text' },
          h('span', { class: 'small muted' }, `${st === 'doing' ? 'Продолжить' : 'Следующий урок'} · ${sk.name}`),
          h('span', { class: 'ln-continue__title' }, plain(next.title)),
          h('span', { class: 'small muted' }, `${progress.statusText(next)}${next.minutes ? ` · ≈ ${next.minutes} мин` : ''}`)),
        h('span', { class: 'btn btn--primary ln-continue__btn' }, lico('play'), h('span', null, st === 'doing' ? 'Продолжить' : 'Начать'))),
      note && h('p', { class: 'small muted ln-continue__note' }, note)));
  }

  function drawWeek() {
    drawContinue();
    weekEl.replaceChildren(...ids.map((id) => skillWeekCard(id)));
  }

  function skillWeekCard(id) {
    const c = courses[id];
    const sk = content.skillInfo(id);
    const head = h('div', { class: 'card__head' },
      h('span', { class: 'card__icon' }, ico(sk.icon)),
      h('div', { class: 'ln-skill-head' },
        h('h2', { class: 'card__title' }, sk.name),
        c && h('span', { class: 'small muted' }, weekTitle(c, week))));
    if (!c) {
      return h('section', { class: `card card--skill ${skillClass(id)} ln-skill-week` }, head,
        h('p', { class: 'card__body small muted' }, 'Уроки по этому навыку скоро появятся.'));
    }
    const lessons = c.lessons.filter((l) => l.week === week);
    const wk = c.weeks.find((w) => Number(w.week) === week);
    const done = lessons.filter((l) => progress.status(l) === 'done').length;
    const pct = lessons.length ? Math.round(done / lessons.length * 100) : 0;
    return h('section', { class: `card card--skill ${skillClass(id)} ln-skill-week`, 'aria-label': sk.name },
      head,
      h('div', { class: 'card__body stack stack--sm' },
        wk?.goal && h('div', { class: 'ln-goal' }, lico('flag', 'ico ico--sm'), mdBlock(wk.goal, 'ln-text small')),
        lessons.length > 0 && h('div', { class: 'ln-skill-week__prog' },
          h('div', { class: 'row row--between small' }, h('span', { class: 'muted' }, 'Уроки недели'), h('span', { class: 'num' }, `${done} из ${lessons.length}`)),
          h('div', { class: 'progress progress--skill' }, h('div', { class: 'progress__bar', style: { width: `${pct}%` } }))),
        lessons.length ? trail(lessons) : h('p', { class: 'small muted' }, 'На эту неделю уроков нет.'),
        wk?.tips?.length ? accordion('Советы на неделю', h('ul', { class: 'ln-bullets' }, wk.tips.map((t) => md(t, 'li'))), { cls: 'ln-acc--flat' }) : null),
      h('div', { class: 'card__foot' },
        h('a', { class: 'btn btn--ghost btn--sm', href: `#/skill/${id}` }, h('span', null, 'Весь курс'), ico('chevron-right'))));
  }

  function overview() {
    return h('section', { class: 'section ln-overview' },
      sectionTitle('Вся программа', 'list'),
      h('p', { class: 'small muted ln-overview__intro' }, '4 недели × 3 навыка. Нажми на неделю, чтобы раскрыть.'),
      h('div', { class: 'stack stack--sm' }, WEEKS.map((w) => {
        const all = weekLessons(w);
        const done = all.filter((l) => progress.status(l) === 'done').length;
        return accordion(
          h('span', { class: 'ln-ov__sum' },
            h('span', { class: 'ln-ov__wk' }, `Неделя ${w}`),
            w === curW && h('span', { class: 'badge badge--accent' }, 'сейчас'),
            h('span', { class: 'small muted ln-ov__cnt' }, all.length ? `${done}/${all.length}` : '')),
          h('div', { class: 'stack stack--sm' }, ids.map((id) => overviewSkill(id, w))),
          { open: w === (curW || 1), cls: 'card ln-ov' });
      })));
  }

  function overviewSkill(id, w) {
    const c = courses[id];
    const sk = content.skillInfo(id);
    const lessons = c ? c.lessons.filter((l) => l.week === w) : [];
    const wk = c?.weeks.find((x) => Number(x.week) === w);
    return h('div', { class: `ln-ov__skill ${skillClass(id)}` },
      h('div', { class: 'ln-ov__skill-head' }, ico(sk.icon, 'ico ico--sm'), h('strong', null, sk.name), wk?.title && h('span', { class: 'muted small' }, ` · ${plain(wk.title)}`)),
      wk?.goal && h('p', { class: 'small muted ln-ov__goal' }, md(wk.goal)),
      !c ? h('p', { class: 'small muted' }, 'скоро появится')
        : h('ul', { class: 'ln-ov__lessons' }, lessons.map((l, i) => h('li', null,
          h('a', { class: `ln-ov__lesson is-${progress.status(l)}`, href: `#/lesson/${encodeURIComponent(l.id)}` },
            stone(l, i + 1), h('span', null, plain(l.title)), l.minutes ? h('span', { class: 'small muted' }, `${l.minutes} мин`) : null)))));
  }
}

function weekTitle(c, w) {
  const wk = c.weeks.find((x) => Number(x.week) === w);
  return wk?.title ? `Неделя ${w}: ${plain(wk.title)}` : `Неделя ${w}`;
}

