// Глоссарий: поиск по всем терминам и страница термина.

import { h, ico } from '../../../js/ui.js';
import * as content from '../content.js';
import { mdBlock, plain } from '../markup.js';
import { artEl } from '../art.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, skillPill, skillClass } from './common.js';

const S = { q: '', skill: '' };

export async function render(root, ctx) {
  const id = ctx.parts[0];
  const wait = loader();
  root.append(wait);
  const terms = await content.glossary();
  if (!ctx.alive()) return;
  wait.remove();
  if (id) return termPage(root, ctx, terms, id);

  root.append(pageHead('Глоссарий', 'Термины из уроков простыми словами', { back: { href: '#/more', label: 'Справочник' } }));
  if (!terms.length) { root.append(soon('Глоссарий скоро появится')); return; }

  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, 'ru'));
  const input = h('input', { class: 'input ln-search__input', type: 'search', placeholder: 'Найти термин…', 'aria-label': 'Поиск по глоссарию', value: S.q,
    oninput: () => { S.q = input.value; paint(); } });
  const skills = content.SKILL_IDS.filter((s) => terms.some((t) => t.skillId === s));
  const chips = h('div', { class: 'chips' });
  const list = h('ul', { class: 'list ln-gloss' });
  const empty = h('p', { class: 'muted ln-center', hidden: true }, 'Ничего не нашлось. Попробуй другое слово.');
  root.append(h('div', { class: 'ln-search' }, lico('search', 'ico ln-search__ico'), input), chips, h('div', { class: 'card' }, list, empty));

  function paintChips() {
    chips.replaceChildren(
      h('button', { class: `chip${!S.skill ? ' is-active' : ''}`, type: 'button', onclick: () => { S.skill = ''; paintChips(); paint(); } }, 'Все'),
      ...skills.map((s) => {
        const sk = content.skillInfo(s);
        return h('button', { class: `chip ${skillClass(s)}${S.skill === s ? ' is-active' : ''}`, type: 'button', onclick: () => { S.skill = s; paintChips(); paint(); } }, ico(sk.icon), sk.name);
      }));
  }

  const rows = sorted.map((t) => ({ t, hay: `${t.term} ${plain(t.short)} ${t.id}`.toLowerCase(),
    el: h('li', { class: 'list__item ln-gloss__item' }, h('a', { class: `ln-gloss__a ${skillClass(t.skillId)}`, href: `#/glossary/${encodeURIComponent(t.id)}` },
      h('span', { class: 'ln-gloss__dot', 'aria-hidden': 'true' }),
      h('span', { class: 'ln-gloss__text' }, h('strong', null, t.term), t.short && h('span', { class: 'small muted' }, plain(t.short))),
      ico('chevron-right', 'ico ico--sm'))) }));
  list.append(...rows.map((r) => r.el));

  function paint() {
    const q = S.q.trim().toLowerCase();
    let n = 0;
    for (const r of rows) {
      const show = (!S.skill || r.t.skillId === S.skill) && (!q || r.hay.includes(q));
      r.el.hidden = !show;
      if (show) n++;
    }
    empty.hidden = n > 0;
  }
  paintChips();
  paint();
}

async function termPage(root, ctx, terms, id) {
  const t = terms.find((x) => x.id === id);
  root.append(pageHead(t ? t.term : 'Термин', null, { back: { href: '#/glossary', label: 'Глоссарий' } }));
  if (!t) { root.append(soon('Этот термин скоро появится')); return; }
  ctx.setTitle(t.term);
  const pic = t.img ? await artEl(t.img, 'ln-art ln-term-page__art') : null;
  if (!ctx.alive()) return;
  root.append(h('article', { class: `card card--skill ${skillClass(t.skillId)} stack ln-term-page` },
    h('div', null, skillPill(t.skillId)),
    pic,
    t.short && mdBlock(t.short, 'ln-text ln-term-page__short'),
    t.more && mdBlock(t.more)));
  const related = terms.filter((x) => x.skillId === t.skillId && x.id !== t.id).slice(0, 12);
  if (related.length) {
    root.append(h('section', { class: 'section' }, h('h2', { class: 'section__title' }, 'Ещё термины'),
      h('div', { class: 'chips' }, related.map((x) => h('a', { class: 'chip', href: `#/glossary/${encodeURIComponent(x.id)}` }, x.term)))));
  }
}
