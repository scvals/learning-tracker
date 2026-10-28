// «Прописи»: листы для печати (A4) и критерии перехода по этапам письма левой рукой.

import { h, ico, sheet } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { cleanSvg } from '../art.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, skillClass } from './common.js';

const KEY = 'stages';

const SIZE_KEY = 'sheets:opts';
const sizeOpt = () => (progress.getRec(SIZE_KEY).size === 'school' ? 'school' : 'large');

function sheetSvg(ws, id) {
  try {
    const str = ws.renderSheet ? ws.renderSheet(id, { size: sizeOpt(), hand: 'left' }) : null;
    return str ? cleanSvg(str) : null;
  } catch (e) {
    console.warn('renderSheet', id, e);
    return null;
  }
}

export async function render(root, ctx) {
  root.append(pageHead('Прописи', 'Листы для письма левой рукой — распечатай или сохрани в PDF', { back: { href: '#/more', label: 'Справочник' } }));
  const wait = loader();
  root.append(wait);
  const ws = await content.worksheets();
  if (!ctx.alive()) return;
  wait.remove();
  if (!ws || (!ws.sheets.length && !ws.stageCriteria.length)) { root.append(soon('Прописи скоро появятся')); return; }
  const sheetsHost = h('div');
  const drawSheets = () => sheetsHost.replaceChildren(sheetList());

  const sheets = ws.sheets.filter((s) => s && s.id).sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0));
  function sheetList() {
    return h('div', { class: 'ln-sheets' }, sheets.map((s) => {
      const thumb = sheetSvg(ws, s.id);
      return h('article', { class: `card ln-sheet ${skillClass('left')}` },
        h('button', { class: 'ln-sheet__thumb', type: 'button', 'aria-label': `Посмотреть лист: ${plain(s.title)}`, onclick: () => preview(ws, s) },
          thumb || h('span', { class: 'small muted' }, 'нет картинки')),
        h('div', { class: 'ln-sheet__info' },
          h('div', { class: 'row row--wrap' }, s.week && h('span', { class: 'badge' }, `Неделя ${s.week}`)),
          h('h2', { class: 'h3' }, plain(s.title)),
          s.desc && h('p', { class: 'small muted' }, md(s.desc)),
          h('div', { class: 'row row--wrap ln-sheet__btns' },
            h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => openPrint(ws, s) }, lico('print'), h('span', null, 'Распечатать / PDF')),
            h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => preview(ws, s) }, lico('eye'), h('span', null, 'Посмотреть')))));
    }));
  }
  if (sheets.length) {
    const seg = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Размер линовки' });
    const paintSeg = () => seg.replaceChildren(...[['large', 'Крупная (6 мм)'], ['school', 'Школьная']].map(([v, label]) => h('button', {
      class: `segmented__btn${sizeOpt() === v ? ' is-active' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(sizeOpt() === v),
      onclick: () => { progress.setRec(SIZE_KEY, { size: v }); paintSeg(); drawSheets(); } }, label)));
    paintSeg();
    root.append(
      h('div', { class: 'hint-box' }, lico('print'),
        md('Нажми «Распечатать». В окне печати поставь **Масштаб: 100%** (не «Подогнать по размеру»), бумага A4. На телефоне там же можно выбрать «Сохранить как PDF».')),
      h('div', { class: 'field ln-sheet-size' }, h('span', { class: 'field__label' }, 'Размер линовки'), seg,
        h('span', { class: 'field__hint' }, 'Начни с крупной версии — так левой руке легче. Школьная — когда буквы станут ровными.')),
      sheetsHost);
    drawSheets();
  }

  if (ws.controlText || ws.legibilityScale) {
    const scale = Array.isArray(ws.legibilityScale) ? ws.legibilityScale : [];
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Контрольный текст'),
      h('div', { class: 'card card--skill sk-3 stack stack--sm' },
        typeof ws.controlText === 'string' && h('blockquote', { class: 'ln-control' }, ws.controlText),
        h('ol', { class: 'ln-numlist' },
          h('li', null, 'Раз в неделю перепиши этот текст левой рукой в обычном спокойном темпе.'),
          h('li', null, 'Засеки время секундомером и запиши секунды в журнал трекера: «Время на контрольный текст».'),
          h('li', null, 'Через час перечитай и оцени разборчивость по шкале ниже — это «Разборчивость» в журнале.')),
        scale.length > 0 && h('div', { class: 'ln-scale' }, scale.map((x) => h('div', { class: 'ln-scale__row' },
          h('span', { class: 'ln-scale__n' }, String(x.score)),
          h('span', null, h('strong', null, x.label), x.text && h('span', { class: 'small muted' }, ` — ${x.text}`))))))));
  }

  if (ws.stageCriteria.length) {
    const checked = () => progress.getRec(KEY).checked || {};
    root.append(h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Когда переходить дальше'),
      h('p', { class: 'small muted ln-sec-intro' }, 'Этапы идут по порядку. Отметь, что уже получается, — когда всё отмечено, переходи и поменяй «Текущий этап» в журнале трекера.'),
      h('div', { class: 'stack' }, ws.stageCriteria.map((st) => {
        const crit = Array.isArray(st.criteria) ? st.criteria : [];
        const status = h('span');
        const paint = () => {
          const c = checked();
          const all = crit.length > 0 && crit.every((_, i) => c[`${st.stage}|${i}`]);
          status.replaceChildren(all ? h('span', { class: 'badge badge--ok' }, ico('check'), 'можно переходить') : h('span', { class: 'badge' }, `${crit.filter((_, i) => c[`${st.stage}|${i}`]).length} из ${crit.length}`));
        };
        paint();
        return h('div', { class: `card card--skill ${skillClass('left')} stack stack--sm ln-stage` },
          h('div', { class: 'row row--between row--wrap' },
            h('h3', { class: 'h3' }, st.from ? `${plain(st.from)} → ${plain(st.stage)}` : plain(st.stage)), status),
          crit.map((txt, i) => {
            const k = `${st.stage}|${i}`;
            const input = h('input', { type: 'checkbox', class: 'checkbox', checked: !!checked()[k] });
            const row = h('label', { class: `check-item${checked()[k] ? ' is-done' : ''}` }, input, md(txt));
            input.addEventListener('change', () => {
              const c = { ...checked() };
              if (input.checked) c[k] = true; else delete c[k];
              progress.setRec(KEY, { checked: c });
              row.classList.toggle('is-done', input.checked);
              paint();
            });
            return row;
          }));
      })),
      h('a', { class: 'btn btn--ghost btn--sm ln-sec-link', href: '../#/journal' }, ico('book'), h('span', null, 'Открыть журнал в трекере'))));
  }

  return closePrint;
}

function preview(ws, s) {
  const svg = sheetSvg(ws, s.id);
  const sh = sheet({
    title: plain(s.title),
    content: h('div', { class: 'ln-sheet-preview' }, svg || h('p', { class: 'muted' }, 'Не получилось нарисовать лист.')),
    actions: [
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => sh.close() }, 'Закрыть'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { sh.close(); openPrint(ws, s); } }, lico('print'), h('span', null, 'Распечатать')),
    ],
  });
}

// ---------- режим печати ----------
let onKey = null;

export function openPrint(ws, s) {
  const host = document.getElementById('print-root');
  const svg = sheetSvg(ws, s.id);
  if (!host || !svg) return;
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  host.replaceChildren(
    h('div', { class: 'ln-print-bar' },
      h('div', { class: 'ln-print-bar__text' }, h('strong', null, plain(s.title)), h('span', { class: 'small muted' }, 'A4 · Масштаб 100% · можно «Сохранить как PDF»')),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: closePrint }, ico('close'), h('span', null, 'Закрыть')),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => window.print() }, lico('print'), h('span', null, 'Печать')))),
    h('div', { class: 'ln-print-page' }, svg));
  host.hidden = false;
  document.body.classList.add('is-printing');
  onKey = (e) => { if (e.key === 'Escape') closePrint(); };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', closePrint, { once: true });
  host.querySelector('.btn--primary')?.focus();
}

export function closePrint() {
  const host = document.getElementById('print-root');
  if (!host || host.hidden) return;
  host.hidden = true;
  host.replaceChildren();
  document.body.classList.remove('is-printing');
  if (onKey) document.removeEventListener('keydown', onKey);
  onKey = null;
}
