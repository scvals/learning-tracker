// «Что купить»: что такое пряжа, рекомендация, список покупок с галочками,
// значки на этикетке, расчёт шарфа и мини-калькулятор мотков.

import { h, ico } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { artEl } from '../art.js';
import { pageHead, loader, soon, external } from './common.js';

const KEY = 'shop';
const STITCH = { garter: 'платочная', stockinette: 'чулочная гладь', rib: 'резинка' };
const arr = (v) => (Array.isArray(v) ? v : []);

export async function render(root, ctx) {
  root.append(pageHead('Что купить', 'Для вязания: всё по списку, без лишнего', { back: { href: '#/more', label: 'Справочник' } }));
  const wait = loader();
  root.append(wait);
  const shop = await content.shopping();
  const pics = shop ? (await Promise.all(arr(shop.yarnImgs).map((id) => artEl(id, 'ln-art ln-yarn__art')))).filter(Boolean) : [];
  if (!ctx.alive()) return;
  wait.remove();
  if (!shop) { root.append(soon('Список покупок скоро появится')); return; }

  if (shop.yarnExplained || pics.length) {
    root.append(h('section', { class: 'card card--skill sk-1 stack stack--sm ln-yarn' },
      h('div', { class: 'card__head' }, h('span', { class: 'card__icon' }, ico('yarn')), h('h2', { class: 'card__title' }, 'Что такое пряжа')),
      pics[0],
      shop.yarnExplained && mdBlock(shop.yarnExplained),
      pics.slice(1)));
  }

  const rec = shop.recommendation;
  if (rec && (rec.title || arr(rec.points).length || rec.text)) {
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, plain(rec.title || 'Какую пряжу брать')),
      h('div', { class: 'card card--skill sk-1 stack stack--sm' },
        arr(rec.points).length > 0 && h('ul', { class: 'ln-bullets' }, rec.points.map((t) => md(t, 'li'))),
        rec.text && mdBlock(rec.text, 'ln-text small'))));
  }

  const items = arr(shop.items).filter((i) => i && i.name);
  if (shop.intro || items.length) {
    const checked = () => progress.getRec(KEY).checked || {};
    const countEl = h('span', { class: 'num small' });
    const bar = h('div', { class: 'progress__bar' });
    const paintCount = () => {
      const c = checked();
      const need = items.filter((i) => !i.optional);
      const got = need.filter((i) => c[i.name]).length;
      countEl.textContent = `есть ${got} из ${need.length}`;
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
              it.why && h('span', { class: 'small muted' }, 'Зачем: ', md(it.why)),
              it.price && h('span', { class: 'small ln-price' }, ico('star', 'ico ico--sm'), md(String(it.price)))));
          input.addEventListener('change', () => {
            const c = { ...checked() };
            if (input.checked) c[it.name] = true; else delete c[it.name];
            progress.setRec(KEY, { checked: c });
            row.classList.toggle('is-done', input.checked);
            paintCount();
          });
          return row;
        })),
        shop.priceNote && h('p', { class: 'small muted' }, md(shop.priceNote)),
        external(`https://www.youtube.com/results?search_query=${encodeURIComponent('как выбрать пряжу и спицы для начинающих')}`, 'Видео: как выбрать пряжу и спицы', 'video', 'btn btn--ghost btn--sm ln-video'))));
    paintCount();
  }

  if (arr(shop.care).length) {
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Значки на этикетке'),
      h('div', { class: 'card ln-kv' }, shop.care.filter(Boolean).map((c) => h('div', { class: 'ln-kv__row ln-care' },
        h('span', { class: 'ln-kv__v' }, md(String(c.symbol || ''))), h('span', { class: 'ln-kv__k' }, md(String(c.meaning || ''))))))));
  }

  const sc = shop.scarfCalc;
  if (sc) {
    const pills = [];
    if (typeof sc === 'object') {
      if (sc.widthCm && sc.lengthCm) pills.push(`${sc.widthCm} × ${sc.lengthCm} см`);
      if (sc.stitch) pills.push(STITCH[sc.stitch] || sc.stitch);
      if (sc.needlesMm) pills.push(`спицы ${String(sc.needlesMm).replace('.', ',')} мм`);
    }
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Расчёт на шарф'),
      h('div', { class: 'card card--skill sk-1 stack stack--sm ln-calc' },
        pills.length > 0 && h('div', { class: 'row row--wrap' }, pills.map((p) => h('span', { class: 'pill' }, p))),
        typeof sc === 'string' ? mdBlock(sc) : sc.text && mdBlock(sc.text),
        arr(sc.plan).length > 0 && h('div', { class: 'stack stack--sm' },
          h('h3', { class: 'h3' }, 'План по неделям'),
          h('div', { class: 'ln-kv' }, sc.plan.map((p) => h('div', { class: 'ln-kv__row' },
            h('span', { class: 'ln-kv__k' }, p.week ? `Неделя ${p.week}` : ''),
            h('span', { class: 'ln-kv__v' }, p.cm != null ? `${p.cm} см` : ''),
            p.note && h('span', { class: 'small muted ln-kv__note' }, md(String(p.note)))))))),
      shop.calcSkeins && calculator(shop.calcSkeins, sc)));
  }
}

function calculator(calc, sc) {
  const S = progress.getRec('shop:calc');
  const fields = [
    ['lengthCm', 'Длина шарфа', 'см', S.lengthCm ?? sc?.lengthCm ?? 160],
    ['widthCm', 'Ширина', 'см', S.widthCm ?? sc?.widthCm ?? 20],
    ['metersPerSkein', 'Метраж мотка', 'м', S.metersPerSkein ?? 225],
    ['gramsPerSkein', 'Вес мотка', 'г', S.gramsPerSkein ?? 100],
  ];
  const inputs = {};
  const out = h('div', { class: 'ln-calc__out', role: 'status', 'aria-live': 'polite' });
  const paint = () => {
    const vals = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, Number(String(el.value).replace(',', '.'))]));
    let r = null;
    try { r = calc({ ...vals, stitch: sc?.stitch || 'garter' }); } catch { r = null; }
    if (!r) { out.replaceChildren(h('p', { class: 'small muted' }, 'Впиши все четыре числа — больше нуля.')); return; }
    progress.setRec('shop:calc', vals);
    out.replaceChildren(
      h('div', { class: 'ln-calc__big' }, h('span', { class: 'big-num' }, String(r.skeinsTotal ?? r.skeins)), h('span', null, ' мотков купить')),
      h('div', { class: 'ln-kv' },
        h('div', { class: 'ln-kv__row' }, h('span', { class: 'ln-kv__k' }, 'Пряжи на шарф'), h('span', { class: 'ln-kv__v' }, `≈ ${r.meters} м`)),
        h('div', { class: 'ln-kv__row' }, h('span', { class: 'ln-kv__k' }, 'С запасом'), h('span', { class: 'ln-kv__v' }, `≈ ${r.metersWithMargin} м · ${r.grams} г`)),
        h('div', { class: 'ln-kv__row' }, h('span', { class: 'ln-kv__k' }, 'Мотков на шарф'), h('span', { class: 'ln-kv__v' }, String(r.skeins))),
        r.skeinsTotal > r.skeins && h('div', { class: 'ln-kv__row' }, h('span', { class: 'ln-kv__k' }, 'И на образец/тренировки'), h('span', { class: 'ln-kv__v' }, `+${r.skeinsTotal - r.skeins}`))));
  };
  const grid = h('div', { class: 'grid-2 ln-calc__grid' }, fields.map(([k, label, unit, v]) => {
    const id = `calc_${k}`;
    const el = h('input', { id, class: 'input num', type: 'number', inputmode: 'decimal', min: 1, step: 'any', value: v, oninput: paint });
    inputs[k] = el;
    return h('div', { class: 'field' }, h('label', { class: 'field__label', for: id }, `${label}, ${unit}`), el);
  }));
  const card = h('div', { class: 'card stack ln-calc-card' },
    h('h3', { class: 'h3' }, 'Калькулятор мотков'),
    h('p', { class: 'small muted' }, 'Метраж и вес — с этикетки мотка (например, «225 м / 100 г»).'),
    grid, out);
  paint();
  return h('div', { class: 'ln-calc-wrap' }, card);
}
