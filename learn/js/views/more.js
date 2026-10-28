// «Справочник» — вход во все дополнительные материалы.

import { h, ico } from '../../../js/ui.js';
import { lico } from '../lic.js';
import { pageHead } from './common.js';

const ITEMS = [
  { href: '#/guide', icon: 'help', title: 'Как пользоваться трекером', text: 'Что значит каждый экран, цифра и кнопка. Как заполнять журнал и читать итоги.', sk: 0 },
  { href: '#/glossary', icon: 'book', title: 'Глоссарий', text: 'Все термины из уроков простыми словами, с картинками.', sk: 0 },
  { href: '#/shop', icon: 'bag', title: 'Что купить', text: 'Что такое пряжа, список покупок и расчёт на белый шарф.', sk: 1 },
  { href: '#/dialogs', icon: 'chat', title: 'Диалоги с ИИ', text: 'Готовые запросы для Claude или ChatGPT — практика английского.', sk: 2 },
  { href: '#/sheets', icon: 'sheet', title: 'Прописи', text: 'Листы для печати: линейки, круги, фигуры, графические диктанты.', sk: 3 },
  { href: '#/words', icon: 'letters', title: 'Слова', text: 'Английские слова недели: карточки, тест, выгрузка в Anki.', sk: 2 },
  { href: '#/session', icon: 'clock', title: 'Занятие с таймером', text: 'По желанию: короткое занятие на 10–40 минут по шагам.', sk: 0 },
];

export function render(root) {
  root.append(pageHead('Справочник', 'Всё, что пригодится по ходу'),
    h('div', { class: 'ln-more' }, ITEMS.map((it) => h('a', { class: `card ln-more__card${it.sk ? ` sk-${it.sk}` : ''}`, href: it.href },
      h('span', { class: 'card__icon' }, lico(it.icon)),
      h('span', { class: 'ln-more__text' }, h('span', { class: 'ln-more__title' }, it.title), h('span', { class: 'small muted' }, it.text)),
      ico('chevron-right', 'ico ln-more__chev')))),
    h('div', { class: 'divider', 'aria-hidden': 'true' }),
    h('p', { class: 'small muted ln-center' }, h('a', { href: '../#/today' }, 'Вернуться в трекер')));
}
