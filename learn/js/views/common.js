// Общие кусочки экранов «Уроков».

import { h, ico } from '../../../js/ui.js';
import { decor } from '../../../js/decor.js';
import * as store from '../../../js/store.js';
import { lico } from '../lic.js';
import { skillInfo } from '../content.js';
import * as progress from '../progress.js';
import { md, plain } from '../markup.js';

export const WEEKS = [1, 2, 3, 4];

export function safeDecor(name) {
  try { return decor(name, store.settings().skin) || ''; } catch { return ''; }
}

export function backLink(href, label) {
  return h('a', { class: 'ln-backlink', href }, ico('chevron-left', 'ico ico--sm'), h('span', null, label));
}

export function pageHead(title, sub, { back, actions } = {}) {
  return h('div', { class: 'ln-head' },
    back && backLink(back.href, back.label),
    h('div', { class: 'page-head' },
      h('h1', { class: 'h1 page-head__title' }, title),
      actions && h('div', { class: 'page-head__actions' }, actions),
      sub && h('div', { class: 'page-head__sub' }, sub)));
}

export function loader() {
  return h('div', { class: 'ln-loading', role: 'status' }, h('span', { class: 'ln-loading__dot' }), h('span', { class: 'muted' }, 'Загружаю…'));
}

export function soon(text = 'Этот раздел скоро появится', more = 'Материалы ещё готовятся — загляни чуть позже.') {
  return h('div', { class: 'empty ln-soon' },
    h('div', { class: 'empty__art', 'aria-hidden': 'true', html: safeDecor('empty') }),
    h('p', { class: 'empty__title' }, text),
    more && h('p', { class: 'small' }, more));
}

export function skillPill(skillId, extra) {
  const s = skillInfo(skillId);
  return h('span', { class: `pill sk-${s.color} ln-skill-pill` }, ico(s.icon), h('span', null, s.name), extra);
}

export function skillClass(skillId) {
  return `sk-${skillInfo(skillId).color}`;
}

// Вкладки недель. onPick(w) — без перерисовки всего экрана.
export function weekTabs(week, onPick, { current = 0, label = 'Недели' } = {}) {
  const el = h('div', { class: 'tabs ln-week-tabs', role: 'tablist', 'aria-label': label });
  function paint(w) {
    el.replaceChildren(...WEEKS.map((n) => h('button', {
      class: `tab${n === w ? ' is-active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(n === w),
      onclick: () => { if (n !== w) { paint(n); onPick(n); } },
    }, `Неделя ${n}`, n === current && h('span', { class: 'ln-now-dot', title: 'идёт сейчас', 'aria-label': ' (сейчас)' }))));
  }
  paint(week);
  return el;
}

export function minutesText(n) {
  return n ? `≈ ${n} мин` : '';
}

export function statusBadge(lesson) {
  const st = progress.status(lesson);
  return h('span', { class: `badge ln-status ln-status--${st}${st === 'done' ? ' badge--ok' : st === 'doing' ? ' badge--accent' : ''}` },
    st === 'done' && ico('check'), progress.statusText(lesson));
}

// Камень дорожки — номер или галочка.
export function stone(lesson, n) {
  const st = progress.status(lesson);
  const pct = lesson.steps.length ? Math.round(progress.stepsDone(lesson) / lesson.steps.length * 100) : 0;
  return h('span', { class: `ln-stone ln-stone--${st}`, style: st === 'doing' ? `--pct:${pct}%` : null, 'aria-hidden': 'true' },
    st === 'done' ? ico('check') : h('span', { class: 'ln-stone__n' }, String(n)));
}

// Карточка урока на дорожке.
export function lessonStep(lesson, n, { highlight = false } = {}) {
  const st = progress.status(lesson);
  return h('li', { class: `ln-trail__item ln-trail__item--${st}${highlight ? ' is-next' : ''}` },
    stone(lesson, n),
    h('a', { class: 'ln-trail__card', href: `#/lesson/${encodeURIComponent(lesson.id)}` },
      h('span', { class: 'ln-trail__title' }, plain(lesson.title)),
      lesson.short && h('span', { class: 'ln-trail__short small muted' }, plain(lesson.short)),
      h('span', { class: 'ln-trail__meta' },
        statusBadge(lesson),
        lesson.minutes ? h('span', { class: 'small muted ln-trail__min' }, ico('clock', 'ico ico--sm'), ` ${lesson.minutes} мин`) : null,
        highlight && h('span', { class: 'badge badge--accent ln-trail__next' }, 'следующий')),
      ico('chevron-right', 'ico ln-trail__chev')));
}

export function trail(lessons, { startN = 1, next } = {}) {
  if (next === undefined) next = progress.nextLesson(lessons);
  return h('ol', { class: 'ln-trail' }, lessons.map((l, i) => lessonStep(l, startN + i, { highlight: next && l.id === next.id })));
}

// Раскрывающийся блок (<details>).
export function accordion(summary, body, { open = false, cls = '' } = {}) {
  return h('details', { class: `ln-acc ${cls}`, open },
    h('summary', { class: 'ln-acc__sum' }, h('span', { class: 'ln-acc__title' }, summary), ico('chevron-down', 'ico ln-acc__chev')),
    h('div', { class: 'ln-acc__body' }, body));
}

export function sectionTitle(text, icon) {
  return h('h2', { class: 'section__title' }, icon && lico(icon), h('span', null, text));
}

export function external(href, label, icon = 'external', cls = 'btn') {
  return h('a', { class: cls, href, target: '_blank', rel: 'noopener noreferrer' }, lico(icon), h('span', null, label));
}

export function ytUrl(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

// Чекбокс-пункт с сохранением. get() → bool, set(bool).
export function checkItem(label, get, set, { cls = '' } = {}) {
  const input = h('input', { type: 'checkbox', class: 'checkbox', checked: !!get() });
  const row = h('label', { class: `check-item ${cls}${get() ? ' is-done' : ''}` }, input, typeof label === 'string' ? md(label) : label);
  input.addEventListener('change', () => { set(input.checked); row.classList.toggle('is-done', input.checked); });
  return row;
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* запасной путь ниже */ }
  try {
    const ta = h('textarea', { style: { position: 'fixed', top: '-1000px', opacity: '0' }, readonly: true });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}
