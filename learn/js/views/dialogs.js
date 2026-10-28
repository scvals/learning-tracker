// «Диалоги с ИИ»: готовые запросы для практики английского с Claude или ChatGPT.

import { h, ico, toast } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain } from '../markup.js';
import { speakBtn } from '../speech.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, weekTabs, accordion, external, copyText } from './common.js';

let selWeek = null;

export async function render(root, ctx) {
  root.append(pageHead('Диалоги с ИИ', 'Практика английского в чате: ИИ — терпеливый собеседник', { back: { href: '#/more', label: 'Справочник' } }));
  const wait = loader();
  root.append(wait);
  const list = await content.dialogs();
  if (!ctx.alive()) return;
  wait.remove();
  if (!list.length) { root.append(soon('Диалоги скоро появятся')); return; }

  root.append(accordion('Как это работает', h('ol', { class: 'ln-steps-list' },
    h('li', null, 'Выбери сценарий и нажми «Скопировать запрос».'),
    h('li', null, 'Открой Claude или ChatGPT (кнопки ниже), вставь запрос в поле сообщения и отправь.'),
    h('li', null, 'Отвечай по-английски короткими фразами. Не знаешь слово — пиши по-русски, ИИ подскажет.'),
    h('li', null, 'Для голосовых сценариев открой приложение на телефоне и включи голосовой режим (значок микрофона или «волны»).')),
  { cls: 'card', open: false }));

  let week = selWeek || progress.defaultWeek();
  const weeksWith = new Set(list.map((d) => Number(d.week)));
  if (!weeksWith.has(week)) week = [...weeksWith].sort()[0] || 1;
  const body = h('div', { class: 'stack' });
  root.append(weekTabs(week, (w) => { week = w; selWeek = w; draw(); }, { current: progress.defaultWeek() }), body);

  function draw() {
    const items = list.filter((d) => Number(d.week) === week);
    if (!items.length) { body.replaceChildren(h('p', { class: 'muted ln-center' }, 'На эту неделю сценариев нет — попробуй соседнюю.')); return; }
    body.replaceChildren(...items.map(card));
  }

  function card(d) {
    const promptBox = h('pre', { class: 'ln-prompt' }, String(d.prompt || ''));
    const phrases = Array.isArray(d.phrases) ? d.phrases.filter((p) => p && p.en) : [];
    const tips = Array.isArray(d.tips) ? d.tips : [];
    const promptDetails = d.prompt ? accordion('Показать текст запроса', promptBox, { cls: 'ln-acc--flat' }) : null;
    return h('article', { class: 'card card--skill sk-2 stack stack--sm ln-dialog' },
      h('div', { class: 'row row--wrap' },
        d.level && h('span', { class: 'badge' }, d.level),
        d.voice ? h('span', { class: 'badge badge--accent' }, lico('mic'), 'голосом') : h('span', { class: 'badge' }, lico('chat'), 'в чате')),
      h('h2', { class: 'card__title' }, plain(d.title)),
      d.goal && h('p', { class: 'small' }, h('strong', null, 'Цель: '), md(d.goal)),
      d.prompt && h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: async () => {
        const ok = await copyText(String(d.prompt));
        if (ok) toast('Запрос скопирован — вставь его в чат');
        else { toast('Не получилось скопировать — выдели текст запроса вручную'); if (promptDetails) promptDetails.open = true; }
      } }, lico('copy'), h('span', null, 'Скопировать запрос')),
      h('div', { class: 'grid-2' },
        external('https://claude.ai/new', 'Claude', 'external', 'btn btn--sm'),
        external('https://chatgpt.com/', 'ChatGPT', 'external', 'btn btn--sm')),
      promptDetails,
      phrases.length > 0 && h('div', { class: 'ln-phrases' },
        h('h3', { class: 'h3' }, 'Полезные фразы'),
        h('ul', { class: 'list' }, phrases.map((p) => h('li', { class: 'list__item ln-phrase' },
          h('div', { class: 'ln-phrase__text' }, md(p.en, 'span', { class: 'ln-phrase__en', lang: 'en' }), p.ru && md(p.ru, 'span', { class: 'small muted' })),
          speakBtn(plain(p.en)))))),
      tips.length > 0 && h('div', { class: 'hint-box' }, ico('leaf'), h('ul', { class: 'ln-bullets' }, tips.map((t) => md(t, 'li')))));
  }
  draw();
}
