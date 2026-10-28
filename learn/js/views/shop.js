// «Что купить»: что такое пряжа, список покупок с галочками, расчёт шарфа.

import { h, ico } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { pageHead, loader, soon, external } from './common.js';

const KEY = 'shop';

export async function render(root, ctx) {
  root.append(pageHead('Что купить', 'Для вязания: всё по списку, без лишнего', { back: { href: '#/more', label: 'Справочник' } }));
  const wait = loader();
  root.append(wait);
  const shop = await content.shopping();
  if (!ctx.alive()) return;
  wait.remove();
  if (!shop) { root.append(soon('Список покупок скоро появится')); return; }

  if (shop.yarnExplained) {
    root.append(h('section', { class: 'card card--skill sk-1 stack stack--sm ln-yarn' },
      h('div', { class: 'card__head' }, h('span', { class: 'card__icon' }, ico('yarn')), h('h2', { class: 'card__title' }, 'Что такое пряжа')),
      mdBlock(shop.yarnExplained)));
  }

  const items = Array.isArray(shop.items) ? shop.items.filter((i) => i && i.name) : [];
  if (shop.intro || items.length) {
    const checked = () => progress.getRec(KEY).checked || {};
    const countEl = h('span', { class: 'num small' });
    const bar = h('div', { class: 'progress__bar' });
    const paintCount = () => {
      const c = checked();
      const need = items.filter((i) => !i.optional);
      const got = need.filter((i) => c[i.name]).length;
      countEl.textContent = `куплено ${got} из ${need.length}`;
      bar.style.width = `${need.length ? Math.round(got / need.length * 100) : 0}%`;
    };
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Список покупок'),
      h('div', { class: 'card stack stack--sm' },
        shop.intro && mdBlock(shop.intro, 'ln-text small'),
        items.length > 0 && h('div', { class: 'row row--between small' }, h('span', { class: 'muted' }, 'Отмечай, что уже есть'), countEl),
        items.length > 0 && h('div', { class: 'progress' }, bar),
        h('div', { class: 'stack stack--sm' }, items.map((it) => {
          const input = h('input', { type: 'checkbox', class: 'checkbox', checked: !!checked()[it.name] });
          const row = h('label', { class: `check-item ln-shop-item${checked()[it.name] ? ' is-done' : ''}` }, input,
            h('span', { class: 'ln-shop-item__text' },
              h('strong', null, md(it.name)), it.optional && h('span', { class: 'badge' }, 'по желанию'),
              it.detail && h('span', { class: 'small' }, md(it.detail)),
              it.why && h('span', { class: 'small muted' }, 'Зачем: ', md(it.why))));
          input.addEventListener('change', () => {
            const c = { ...checked() };
            if (input.checked) c[it.name] = true; else delete c[it.name];
            progress.setRec(KEY, { checked: c });
            row.classList.toggle('is-done', input.checked);
            paintCount();
          });
          return row;
        })),
        external(`https://www.youtube.com/results?search_query=${encodeURIComponent('как выбрать пряжу и спицы для начинающих')}`, 'Видео: как выбрать пряжу и спицы', 'video', 'btn btn--ghost btn--sm'))));
    paintCount();
  }

  if (shop.scarfCalc) {
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Расчёт на шарф'),
      h('div', { class: 'card card--skill sk-1 stack stack--sm ln-calc' }, renderAny(shop.scarfCalc))));
  }
}

// Расчёт может быть строкой или объектом с text и дополнительными полями (списки, пары «название — значение»).
function renderAny(v) {
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number') return mdBlock(String(v));
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) return h('ul', { class: 'ln-bullets' }, v.map((x) => md(String(x), 'li')));
    return h('div', { class: 'ln-kv' }, v.map((x) => {
      if (x && typeof x === 'object' && (x.label || x.name || x.title)) {
        const label = x.label || x.name || x.title;
        const val = x.value ?? x.text ?? x.detail ?? '';
        return h('div', { class: 'ln-kv__row' }, h('span', { class: 'ln-kv__k' }, md(String(label))), h('span', { class: 'ln-kv__v' }, md(String(val))), x.note && h('span', { class: 'small muted ln-kv__note' }, md(String(x.note))));
      }
      return renderAny(x);
    }));
  }
  if (typeof v === 'object') {
    const out = [];
    if (v.title) out.push(h('h3', { class: 'h3' }, plain(v.title)));
    if (v.text) out.push(mdBlock(v.text));
    for (const [k, x] of Object.entries(v)) {
      if (k === 'text' || k === 'title') continue;
      if (typeof x === 'string' || typeof x === 'number') {
        out.push(h('div', { class: 'ln-kv__row' }, h('span', { class: 'ln-kv__k' }, LABELS[k] || humanKey(k)), h('span', { class: 'ln-kv__v' }, md(String(x)))));
      } else if (x && typeof x === 'object') {
        out.push(h('div', { class: 'ln-calc__part' }, LABELS[k] && h('h3', { class: 'h3' }, LABELS[k]), renderAny(x)));
      }
    }
    return out;
  }
  return null;
}

const LABELS = {
  width: 'Ширина', length: 'Длина', stitches: 'Петель в ширину', rows: 'Рядов', yarn: 'Пряжа', meters: 'Метраж', grams: 'Вес',
  skeins: 'Мотков', needles: 'Спицы', pattern: 'Вязка', stitch: 'Вязка', steps: 'Как посчитать', notes: 'Заметки', tips: 'Советы',
  gauge: 'Плотность', example: 'Пример', formula: 'Формула', result: 'Итог', total: 'Итого',
};

function humanKey(k) {
  return String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
}
