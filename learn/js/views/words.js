// «Слова» — английские слова по неделям: список, карточки, быстрый тест, выгрузка в Anki.

import { h, ico, toast, downloadFile } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { speak, speakBtn, canSpeak } from '../speech.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, accordion, safeDecor } from './common.js';

const S = { week: null, mode: 'list', onlyNew: false, deck: null, quiz: null };

const known = (w) => !!progress.wordState(w.en).known;

export async function render(root, ctx) {
  const head = h('div');
  root.append(head);
  const wait = loader();
  root.append(wait);
  const data = await content.words();
  if (!ctx.alive()) return;
  wait.remove();
  if (!data.length) {
    head.append(pageHead('Слова', 'Английские слова на каждую неделю'));
    root.append(soon('Слова скоро появятся'));
    return;
  }
  const weeks = data.map((d) => Number(d.week)).filter(Boolean).sort((a, b) => a - b);
  if (!weeks.includes(S.week)) {
    const dw = progress.defaultWeek();
    S.week = weeks.includes(dw) ? dw : weeks[0];
  }
  const allWords = () => data.flatMap((d) => d.groups.flatMap((g) => (g.words || []).filter((w) => w && w.en)));
  const weekData = () => data.find((d) => Number(d.week) === S.week) || { groups: [] };
  const weekWords = () => weekData().groups.flatMap((g) => (g.words || []).filter((w) => w && w.en));

  const counterEl = h('div', { class: 'page-head__sub' });
  head.append(h('div', { class: 'page-head' }, h('h1', { class: 'h1 page-head__title' }, 'Слова'), counterEl));

  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Недели' });
  const modeEl = h('div', { class: 'segmented ln-words-modes', role: 'tablist', 'aria-label': 'Режим' });
  const filterEl = h('label', { class: 'switch small ln-words-filter' });
  const weekInfo = h('div', { class: 'card ln-words-week stack stack--sm' });
  const body = h('div', { class: 'stack ln-words-body' });
  root.append(tabs, weekInfo, modeEl, filterEl, body, ankiBlock());

  const filterInput = h('input', { type: 'checkbox', checked: S.onlyNew, onchange: () => { S.onlyNew = filterInput.checked; S.deck = null; S.quiz = null; drawBody(); } });
  filterEl.append(filterInput, h('span', null, 'Только невыученные'));

  function drawCounter() {
    const all = allWords();
    const k = all.filter(known).length;
    counterEl.replaceChildren(`Выучено ${k} из ${all.length}. Отмечай «Знаю» — счётчик растёт.`);
    const ww = weekWords();
    const kw = ww.filter(known).length;
    const pct = ww.length ? Math.round(kw / ww.length * 100) : 0;
    weekInfo.replaceChildren(
      h('div', { class: 'row row--between' }, h('strong', null, weekData().title || `Неделя ${S.week}`), h('span', { class: 'num small' }, `${kw} из ${ww.length}`)),
      h('div', { class: 'progress' }, h('div', { class: 'progress__bar', style: { width: `${pct}%` } })));
  }

  function drawTabs() {
    tabs.replaceChildren(...weeks.map((w) => h('button', { class: `tab${w === S.week ? ' is-active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(w === S.week),
      onclick: () => { S.week = w; S.deck = null; S.quiz = null; drawAll(); } }, `Неделя ${w}`)));
    modeEl.replaceChildren(...[['list', 'Список'], ['cards', 'Карточки'], ['quiz', 'Тест']].map(([m, label]) => h('button', {
      class: `segmented__btn${S.mode === m ? ' is-active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(S.mode === m),
      onclick: () => { S.mode = m; drawTabs(); drawBody(); } }, label)));
  }

  function drawAll() { drawTabs(); drawCounter(); drawBody(); }

  function drawBody() {
    filterEl.hidden = S.mode === 'quiz';
    if (S.mode === 'cards') drawCards();
    else if (S.mode === 'quiz') drawQuiz();
    else drawList();
  }

  // ---------- список ----------
  function drawList() {
    const groups = weekData().groups.map((g) => ({ ...g, words: (g.words || []).filter((w) => w && w.en && (!S.onlyNew || !known(w))) })).filter((g) => g.words.length);
    if (!groups.length) {
      body.replaceChildren(h('div', { class: 'empty' }, h('p', { class: 'empty__title' }, 'Всё выучено!'), h('p', null, 'Сними фильтр, чтобы увидеть все слова.')));
      return;
    }
    body.replaceChildren(...groups.map((g) => h('section', { class: 'card ln-wgroup' },
      h('h2', { class: 'h3 ln-wgroup__title' }, g.title || 'Слова'),
      h('ul', { class: 'list ln-wlist' }, g.words.map(wordRow)))));
  }

  function wordRow(w) {
    const row = h('li', { class: `list__item ln-word${known(w) ? ' is-known' : ''}` });
    const paint = () => {
      const k = known(w);
      row.classList.toggle('is-known', k);
      row.replaceChildren(
        h('div', { class: 'ln-word__main' },
          h('div', { class: 'ln-word__en', lang: 'en' }, w.en, speakBtn(w.en)),
          h('div', { class: 'ln-word__sound small muted' }, w.ipa && h('span', { class: 'ln-ipa' }, `[${w.ipa}]`), w.sound && h('span', null, ` «${w.sound}»`)),
          h('div', { class: 'ln-word__ru' }, w.ru),
          w.ex && h('div', { class: 'ln-word__ex small muted' }, h('span', { lang: 'en' }, w.ex), w.exRu ? ` — ${w.exRu}` : '')),
        h('button', { class: `ln-know${k ? ' is-on' : ''}`, type: 'button', 'aria-pressed': String(k), 'aria-label': k ? `Снять «знаю»: ${w.en}` : `Знаю: ${w.en}`,
          onclick: () => {
            const st = progress.wordState(w.en);
            progress.setWordState(w.en, { known: !k, seen: (st.seen || 0) + (k ? 0 : 1) });
            drawCounter();
            if (S.onlyNew && !k) { row.classList.add('is-leaving'); setTimeout(() => { row.remove(); if (!body.querySelector('.ln-word')) drawList(); }, 250); } else paint();
          } }, ico('check'), h('span', null, k ? 'знаю' : 'знаю?')));
    };
    paint();
    return row;
  }

  // ---------- карточки ----------
  function newDeck() {
    const list = weekWords().filter((w) => !S.onlyNew || !known(w));
    const unknown = shuffle(list.filter((w) => !known(w)));
    const kn = shuffle(list.filter(known));
    return { cards: [...unknown, ...kn], i: 0, flipped: false, good: 0, again: 0, requeued: new Set() };
  }

  function drawCards() {
    if (!S.deck) S.deck = newDeck();
    const d = S.deck;
    if (!d.cards.length) {
      body.replaceChildren(h('div', { class: 'empty' }, h('p', { class: 'empty__title' }, 'Всё выучено!'), h('p', null, 'Сними фильтр «только невыученные», чтобы повторить все слова.')));
      return;
    }
    if (d.i >= d.cards.length) {
      body.replaceChildren(h('div', { class: 'card ln-summary stack' },
        h('div', { class: 'ln-finish__art', 'aria-hidden': 'true', html: safeDecor('celebrate') }),
        h('p', { class: 'hand ln-finish__text' }, 'Карточки закончились!'),
        h('p', null, `Знаю: ${d.good} · ещё повторю: ${d.again}`),
        h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => { S.deck = null; drawCards(); } }, lico('shuffle'), h('span', null, 'Ещё раз'))));
      return;
    }
    const w = d.cards[d.i];
    const flip = () => { d.flipped = !d.flipped; card.classList.toggle('is-flipped', d.flipped); card.setAttribute('aria-pressed', String(d.flipped)); };
    const card = h('div', { class: `ln-flash${d.flipped ? ' is-flipped' : ''}`, role: 'button', tabindex: '0', 'aria-pressed': String(d.flipped), 'aria-label': 'Перевернуть карточку',
      onclick: (e) => { if (!e.target.closest('.ln-speak')) flip(); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } } },
      h('div', { class: 'ln-flash__inner' },
        h('div', { class: 'ln-flash__face ln-flash__front' },
          h('span', { class: 'ln-flash__en', lang: 'en' }, w.en),
          speakBtn(w.en, { sm: false }),
          h('span', { class: 'small muted' }, 'Вспомни перевод и нажми, чтобы проверить')),
        h('div', { class: 'ln-flash__face ln-flash__back' },
          h('span', { class: 'ln-flash__ru' }, w.ru),
          h('span', { class: 'muted' }, w.ipa && `[${w.ipa}]`, w.sound && ` «${w.sound}»`),
          w.ex && h('span', { class: 'small' }, h('span', { lang: 'en' }, w.ex), w.exRu && h('span', { class: 'muted' }, ` — ${w.exRu}`)),
          speakBtn(w.ex || w.en, { sm: false, label: 'Послушать пример' }))));
    const answer = (good) => {
      const st = progress.wordState(w.en);
      progress.setWordState(w.en, { known: good, seen: (st.seen || 0) + 1 });
      if (good) d.good += 1; else {
        d.again += 1;
        if (!d.requeued.has(w.en)) { d.requeued.add(w.en); d.cards.push(w); }
      }
      d.i += 1; d.flipped = false;
      drawCounter();
      drawCards();
    };
    body.replaceChildren(
      h('div', { class: 'row row--between small muted' }, h('span', { class: 'num' }, `Карточка ${d.i + 1} из ${d.cards.length}`), known(w) && h('span', { class: 'badge badge--ok' }, ico('check'), 'знаю')),
      h('div', { class: 'progress' }, h('div', { class: 'progress__bar', style: { width: `${Math.round(d.i / d.cards.length * 100)}%` } })),
      card,
      h('div', { class: 'ln-flash__btns' },
        h('button', { class: 'btn', type: 'button', onclick: () => answer(false) }, lico('undo'), h('span', null, 'Ещё повторю')),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => answer(true) }, ico('check'), h('span', null, 'Знаю'))));
  }

  // ---------- тест ----------
  function newQuiz() {
    const pool = weekWords();
    const qs = shuffle(pool).slice(0, Math.min(10, pool.length)).map((w, k) => {
      const dir = k % 2 === 0 ? 'en' : 'ru';
      const others = shuffle(pool.filter((x) => x.en !== w.en && x.ru !== w.ru)).slice(0, 3);
      return { w, dir, options: shuffle([w, ...others]) };
    });
    return { qs, i: 0, picked: null, score: 0 };
  }

  function drawQuiz() {
    if (weekWords().length < 2) { body.replaceChildren(h('p', { class: 'muted' }, 'Для теста нужно хотя бы два слова.')); return; }
    if (!S.quiz) S.quiz = newQuiz();
    const q = S.quiz;
    if (q.i >= q.qs.length) {
      body.replaceChildren(h('div', { class: 'card ln-quiz ln-quiz--result' },
        h('p', { class: 'big-num' }, `${q.score} из ${q.qs.length}`),
        h('p', null, q.score === q.qs.length ? 'Идеально!' : 'Хорошая тренировка. Слова с ошибками повтори в карточках.'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { S.quiz = null; drawQuiz(); } }, lico('shuffle'), h('span', null, 'Новый тест'))));
      return;
    }
    const it = q.qs[q.i];
    const answered = q.picked !== null;
    const label = (x) => (it.dir === 'en' ? x.ru : x.en);
    body.replaceChildren(h('div', { class: 'card ln-quiz' },
      h('div', { class: 'row row--between small muted' }, h('span', null, `Вопрос ${q.i + 1} из ${q.qs.length}`), h('span', null, `верно: ${q.score}`)),
      h('p', { class: 'small muted' }, it.dir === 'en' ? 'Как это по-русски?' : 'Как это по-английски?'),
      h('p', { class: 'ln-quiz__word', lang: it.dir === 'en' ? 'en' : 'ru' }, it.dir === 'en' ? it.w.en : it.w.ru, it.dir === 'en' && speakBtn(it.w.en)),
      h('div', { class: 'ln-opts' }, it.options.map((o) => {
        const right = o.en === it.w.en;
        let cls = 'ln-opt';
        if (answered && right) cls += ' is-right';
        else if (answered && o.en === q.picked) cls += ' is-wrong';
        return h('button', { class: cls, type: 'button', disabled: answered, lang: it.dir === 'en' ? 'ru' : 'en', onclick: () => {
          q.picked = o.en;
          if (right) q.score += 1;
          const st = progress.wordState(it.w.en);
          progress.setWordState(it.w.en, { seen: (st.seen || 0) + 1 });
          if (it.dir === 'ru' && canSpeak) speak(it.w.en);
          drawQuiz();
        } }, h('span', null, label(o)));
      })),
      answered && h('div', { class: `ln-feedback ${q.picked === it.w.en ? 'is-right' : 'is-wrong'}`, role: 'status' },
        h('strong', null, q.picked === it.w.en ? 'Верно! ' : 'Не совсем. '), `${it.w.en} — ${it.w.ru}`, it.w.ipa ? ` [${it.w.ipa}]` : ''),
      answered && h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => { q.i += 1; q.picked = null; drawQuiz(); } },
        q.i + 1 < q.qs.length ? 'Дальше' : 'Результат')));
  }

  // ---------- Anki ----------
  function ankiBlock() {
    return h('section', { class: 'section stack stack--sm' },
      h('h2', { class: 'section__title' }, 'Anki'),
      h('div', { class: 'card stack stack--sm' },
        h('p', { class: 'small' }, 'Скачай слова недели файлом и добавь в Anki — приложение само напомнит, что пора повторить.'),
        h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: exportAnki }, ico('download'), h('span', null, 'Экспорт в Anki (CSV)')),
        accordion('Как добавить в Anki и куда записать число', h('ol', { class: 'ln-steps-list' },
          h('li', null, 'Открой Anki на компьютере или телефоне.'),
          h('li', null, 'Файл → Импорт (в AnkiDroid: меню ⋮ → Импорт) и выбери скачанный файл .csv.'),
          h('li', null, 'Разделитель — точка с запятой. Колонки: английское слово, перевод, транскрипция, произношение русскими буквами, пример и его перевод. Лицевая сторона — английское слово.'),
          h('li', null, 'Повторяй карточки каждый день хотя бы 5 минут — это «минимум» для английского.'),
          h('li', null, 'Раз в неделю посмотри в Anki, сколько всего карточек (Обзор → «Все карточки»), и запиши это число в трекере: Журнал → Английский → «Слов в Anki всего».')),
        { cls: 'ln-acc--flat' }),
        h('a', { class: 'btn btn--ghost btn--sm', href: '../#/journal' }, ico('book'), h('span', null, 'Открыть журнал в трекере'))));
  }

  function exportAnki() {
    const list = weekWords();
    if (!list.length) { toast('В этой неделе нет слов'); return; }
    const cell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = list.map((w) => [w.en, w.ru, w.ipa, w.sound, w.ex, w.exRu].map(cell).join(';'));
    downloadFile(`anki-slova-nedelya-${S.week}.csv`, `#separator:Semicolon\n#html:false\n#columns:en;ru;ipa;sound;ex;exRu\n${lines.join('\n')}\n`, 'text/csv;charset=utf-8');
    toast(`Файл со словами недели ${S.week} скачан`);
  }

  drawAll();
}

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
