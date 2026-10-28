// Урок: зачем, что понадобится, шаги по одному, ошибки, самопроверка, тест, видео, «Готово».

import { h, ico, toast } from '../../../js/ui.js';
import * as content from '../content.js';
import * as progress from '../progress.js';
import { md, mdBlock, plain, openTerm } from '../markup.js';
import { artEl } from '../art.js';
import { timer } from '../timer.js';
import { lico } from '../lic.js';
import { pageHead, loader, soon, skillPill, skillClass, accordion, sectionTitle, external, ytUrl, checkItem, safeDecor } from './common.js';

const ui = new Map(); // состояние экрана по уроку: текущий шаг, тест

export async function render(root, ctx) {
  const id = ctx.parts[0] || '';
  const wait = loader();
  root.append(wait);
  const found = await content.findLesson(id);
  if (!ctx.alive()) return;
  wait.remove();
  if (!found) {
    root.append(pageHead('Урок', null, { back: { href: '#/', label: 'Путь' } }),
      soon('Этот урок скоро появится', 'Материалы ещё готовятся. Загляни позже или выбери другой урок на дорожке.'),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('a', { class: 'btn btn--primary', href: '#/' }, 'К дорожке')));
    return;
  }
  const { course, lesson, index } = found;
  const sk = content.skillInfo(lesson.skillId);
  ctx.setTitle(plain(lesson.title));
  if (!ui.has(id)) {
    const done = progress.lessonState(id).steps || {};
    const first = lesson.steps.findIndex((_, i) => !done[i]);
    ui.set(id, { step: first < 0 ? 0 : first, quiz: { i: 0, picked: null, score: 0, finished: false } });
  }
  const u = ui.get(id);
  const timers = new Set();
  const cleanup = () => { timers.forEach((t) => t.destroy()); timers.clear(); };
  const state = () => progress.lessonState(id);

  const wrap = h('div', { class: `ln-lesson ${skillClass(lesson.skillId)} stack` });
  root.append(wrap);

  // ---------- шапка ----------
  wrap.append(h('div', { class: 'ln-head' },
    h('a', { class: 'ln-backlink', href: `#/?week=${lesson.week}` }, ico('chevron-left', 'ico ico--sm'), h('span', null, 'Путь')),
    h('div', { class: 'ln-lesson__meta' },
      skillPill(lesson.skillId),
      h('a', { class: 'badge', href: `#/skill/${lesson.skillId}` }, `Неделя ${lesson.week}`),
      lesson.minutes ? h('span', { class: 'badge' }, ico('clock'), `≈ ${lesson.minutes} мин`) : null),
    h('h1', { class: 'h1 ln-lesson__title' }, plain(lesson.title)),
    lesson.short && h('p', { class: 'ln-lesson__short' }, md(lesson.short))));

  // ---------- зачем ----------
  if (lesson.why) {
    wrap.append(h('section', { class: 'card ln-why' },
      h('h2', { class: 'h3 ln-card-title' }, lico('help', 'ico ico--sm'), 'Что это и зачем'),
      mdBlock(lesson.why)));
  }

  // ---------- понадобится ----------
  if (lesson.need.length) {
    wrap.append(h('section', { class: 'card ln-need' },
      h('h2', { class: 'h3 ln-card-title' }, lico('bag', 'ico ico--sm'), 'Понадобится'),
      h('p', { class: 'small muted' }, 'Отметь, что уже под рукой.'),
      h('div', { class: 'stack stack--sm' }, lesson.need.map((txt, i) => checkItem(txt,
        () => !!state().need?.[i],
        (v) => progress.setLessonState(id, { need: { ...(state().need || {}), [i]: v || undefined } }))))));
  }

  // ---------- ссылки на разделы ----------
  const links = Array.isArray(lesson.links) ? lesson.links.filter((l) => l && (l.route || l.href) && l.title) : [];
  if (links.length) {
    wrap.append(h('div', { class: 'ln-links' }, links.map((l) => {
      const href = l.route || l.href;
      const ext = /^https?:/.test(href);
      return h('a', { class: 'btn btn--block ln-link', href, target: ext ? '_blank' : null, rel: ext ? 'noopener noreferrer' : null },
        lico(ext ? 'external' : 'book'), h('span', null, plain(l.title)), !ext && ico('chevron-right'));
    })));
  }

  // ---------- шаги ----------
  const stepsEl = h('section', { class: 'ln-steps', 'aria-label': 'Шаги' });
  if (lesson.steps.length) wrap.append(h('div', { class: 'ln-steps-wrap' }, sectionTitle('Шаг за шагом', 'path'), stepsEl));

  function stepDone(i) { return !!state().steps?.[i]; }
  function setStep(i, v) {
    const steps = { ...(state().steps || {}) };
    if (v) steps[i] = true; else delete steps[i];
    progress.setLessonState(id, { steps });
  }

  async function drawSteps(focus = false) {
    timers.forEach((t) => t.destroy()); timers.clear();
    const n = lesson.steps.length;
    const i = Math.min(u.step, n - 1);
    const s = lesson.steps[i];
    const doneN = lesson.steps.filter((_, k) => stepDone(k)).length;

    const dots = h('div', { class: 'ln-dots', role: 'tablist', 'aria-label': 'Шаги урока' },
      lesson.steps.map((st, k) => h('button', {
        class: `ln-dot${k === i ? ' is-current' : ''}${stepDone(k) ? ' is-done' : ''}`, type: 'button', role: 'tab',
        'aria-selected': String(k === i), 'aria-label': `Шаг ${k + 1}${stepDone(k) ? ', сделан' : ''}: ${plain(st.title)}`,
        onclick: () => { u.step = k; drawSteps(true); },
      }, stepDone(k) ? ico('check') : String(k + 1))));

    const checkBtn = h('button', {
      class: `ln-stepcheck${stepDone(i) ? ' is-on' : ''}`, type: 'button', 'aria-pressed': String(stepDone(i)),
      onclick: () => { setStep(i, !stepDone(i)); drawSteps(); drawFinish(); },
    }, ico('check'), h('span', null, stepDone(i) ? 'Сделано' : 'Отметить'));

    const pic = await artEl(s.img, 'ln-art ln-step__art');
    if (!ctx.alive()) return;
    let tm = null;
    if (Number(s.timer) > 0) {
      tm = timer({ minutes: s.timer, label: `Таймер на ${s.timer} мин — можно запускать и ставить на паузу` });
      timers.add(tm);
    }

    const last = i === n - 1;
    const card = h('article', { class: 'card ln-step', tabindex: '-1', 'aria-live': 'polite' },
      h('div', { class: 'ln-step__top' },
        h('span', { class: 'ln-step__num small' }, `Шаг ${i + 1} из ${n}`),
        checkBtn),
      pic,
      h('h3', { class: 'ln-step__title' }, md(s.title)),
      s.text && mdBlock(s.text, 'ln-text ln-step__text'),
      s.tip && h('div', { class: 'hint-box ln-step__tip' }, ico('leaf'), h('div', null, h('strong', null, 'Подсказка. '), md(s.tip))),
      tm && tm.el,
      h('div', { class: 'ln-step__nav' },
        h('button', { class: 'btn btn--ghost', type: 'button', disabled: i === 0, onclick: () => { u.step = i - 1; drawSteps(true); } },
          ico('chevron-left'), h('span', null, 'Назад')),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => {
          if (!stepDone(i)) setStep(i, true);
          if (last) {
            drawSteps(); drawFinish();
            const target = wrap.querySelector('.ln-after-steps');
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (lesson.steps.every((_, k) => stepDone(k))) toast('Все шаги сделаны! Осталось проверить себя.');
          } else { u.step = i + 1; drawSteps(true); }
        } }, h('span', null, last ? 'Готово' : 'Дальше'), ico(last ? 'check' : 'chevron-right'))));

    stepsEl.replaceChildren(
      h('div', { class: 'ln-steps__head' },
        h('div', { class: 'progress progress--skill', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': doneN, 'aria-label': 'Сделано шагов' },
          h('div', { class: 'progress__bar', style: { width: `${Math.round(doneN / n * 100)}%` } })),
        h('span', { class: 'small muted num' }, `${doneN}/${n}`)),
      dots, card);
    if (focus) {
      card.focus({ preventScroll: true });
      const top = stepsEl.getBoundingClientRect().top;
      if (top < 70 || top > window.innerHeight * 0.6) stepsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---------- после шагов ----------
  const after = h('div', { class: 'ln-after-steps stack' });
  wrap.append(after);

  if (lesson.mistakes.length) {
    after.append(h('section', { class: 'ln-block' },
      sectionTitle('Частые ошибки', 'info'),
      h('div', { class: 'stack stack--sm' }, lesson.mistakes.map((m) => accordion(md(m.problem || ''),
        h('div', { class: 'ln-fix' }, h('strong', null, 'Как исправить: '), md(m.fix || '')), { cls: 'card ln-mistake' })))));
  }

  if (lesson.check.length) {
    after.append(h('section', { class: 'ln-block' },
      sectionTitle('Проверь себя', 'check'),
      h('div', { class: 'card stack stack--sm' },
        h('p', { class: 'small muted' }, 'Получилось, если:'),
        lesson.check.map((txt, i) => checkItem(txt,
          () => !!state().check?.[i],
          (v) => { progress.setLessonState(id, { check: { ...(state().check || {}), [i]: v || undefined } }); })))));
  }

  const quizEl = h('div');
  if (lesson.quiz.length) after.append(h('section', { class: 'ln-block' }, sectionTitle('Мини-тест', 'star'), quizEl));

  function drawQuiz() {
    const q = u.quiz;
    const total = lesson.quiz.length;
    const best = state().quizBest;
    if (q.finished) {
      const great = q.score === total;
      quizEl.replaceChildren(h('div', { class: 'card ln-quiz ln-quiz--result' },
        h('p', { class: 'big-num' }, `${q.score} из ${total}`),
        h('p', null, great ? 'Все ответы верные — супер!' : q.score >= total / 2 ? 'Хорошо! Можно пройти ещё раз, чтобы закрепить.' : 'Ничего страшного — перечитай шаги и попробуй снова.'),
        best !== undefined && h('p', { class: 'small muted' }, `Лучший результат: ${best} из ${total}`),
        h('button', { class: 'btn', type: 'button', onclick: () => { u.quiz = { i: 0, picked: null, score: 0, finished: false }; drawQuiz(); } }, lico('undo'), h('span', null, 'Пройти ещё раз'))));
      return;
    }
    const item = lesson.quiz[q.i];
    const answered = q.picked !== null;
    const correct = answered && q.picked === Number(item.answer);
    quizEl.replaceChildren(h('div', { class: 'card ln-quiz' },
      h('div', { class: 'row row--between small muted' }, h('span', null, `Вопрос ${q.i + 1} из ${total}`),
        best !== undefined && h('span', null, `лучший: ${best}/${total}`)),
      h('p', { class: 'ln-quiz__q' }, md(item.q)),
      h('div', { class: 'ln-opts' }, item.options.map((o, k) => {
        let cls = 'ln-opt';
        if (answered && k === Number(item.answer)) cls += ' is-right';
        else if (answered && k === q.picked) cls += ' is-wrong';
        return h('button', { class: cls, type: 'button', disabled: answered, onclick: () => {
          q.picked = k;
          if (k === Number(item.answer)) q.score += 1;
          drawQuiz();
        } }, h('span', { class: 'ln-opt__mark', 'aria-hidden': 'true' }, answered && k === Number(item.answer) ? '✓' : answered && k === q.picked ? '✗' : String.fromCharCode(1040 + k)), h('span', null, md(o)));
      })),
      answered && h('div', { class: `ln-feedback ${correct ? 'is-right' : 'is-wrong'}`, role: 'status' },
        h('strong', null, correct ? 'Верно! ' : 'Не совсем. '), item.explain ? md(item.explain) : null),
      answered && h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => {
        if (q.i + 1 < total) { q.i += 1; q.picked = null; } else {
          q.finished = true;
          if (!(state().quizBest >= q.score)) progress.setLessonState(id, { quizBest: q.score });
        }
        drawQuiz();
      } }, q.i + 1 < total ? 'Следующий вопрос' : 'Показать результат')));
  }

  if (lesson.videos.length) {
    after.append(h('section', { class: 'ln-block' },
      sectionTitle('Видео по теме', 'video'),
      h('p', { class: 'small muted' }, 'Откроется поиск на YouTube в новой вкладке — выбери ролик, который понравится.'),
      h('div', { class: 'ln-videos' }, lesson.videos.map((q) => external(ytUrl(q), q, 'video', 'btn ln-video')))));
  }

  if (lesson.terms.length) {
    const terms = await content.glossary();
    if (!ctx.alive()) return cleanup;
    after.append(h('section', { class: 'ln-block' },
      sectionTitle('Слова из урока', 'book'),
      h('div', { class: 'chips' }, lesson.terms.map((tid) => {
        const t = terms.find((x) => x.id === tid);
        return h('button', { class: 'chip ln-term-chip', type: 'button', onclick: () => openTerm(tid) }, t ? t.term : tid.replace(/-/g, ' '));
      }))));
  }

  // ---------- готово ----------
  const finishEl = h('section', { class: 'ln-block ln-finish-wrap' });
  after.append(finishEl);
  const nav = h('nav', { class: 'ln-lesson-nav', 'aria-label': 'Соседние уроки' });
  after.append(nav);

  const courses = await content.courses();
  if (!ctx.alive()) return cleanup;
  const allLessons = content.SKILL_IDS.flatMap((s) => courses[s]?.lessons || []);

  function suggestion() {
    const rest = course.lessons.slice(index + 1).find((l) => progress.status(l) !== 'done');
    return rest || progress.nextLesson(allLessons.filter((l) => l.id !== id));
  }

  function drawFinish() {
    const done = progress.isDone(lesson);
    const tasks = progress.lessonTasks(lesson);
    if (!done) {
      const left = lesson.steps.filter((_, k) => !stepDone(k)).length;
      finishEl.replaceChildren(h('div', { class: 'card ln-finish' },
        h('h2', { class: 'h2' }, 'Всё получилось?'),
        left > 0 && h('p', { class: 'small muted' }, `Не отмечено шагов: ${left}. Это не страшно — урок можно закрыть и так.`),
        h('button', { class: 'check-toggle check-toggle--wide ln-finish__btn', type: 'button', onclick: finish },
          ico('check'), h('span', null, 'Готово — урок пройден')),
        tasks.length > 0 && h('p', { class: 'small muted' }, `В трекере отметится: ${tasks.map((t) => `«${t.text}»`).join(', ')}.`)));
      return;
    }
    const next = suggestion();
    finishEl.replaceChildren(h('div', { class: 'card ln-finish is-done' },
      h('div', { class: 'ln-finish__art', 'aria-hidden': 'true', html: safeDecor('celebrate') }),
      h('p', { class: 'hand ln-finish__text' }, 'Урок пройден — ты молодец!'),
      tasks.length > 0 && h('p', { class: 'small muted' }, `Задание в трекере отмечено: ${tasks.map((t) => `«${t.text}»`).join(', ')}.`),
      next && h('a', { class: 'btn btn--primary btn--block', href: `#/lesson/${encodeURIComponent(next.id)}` },
        h('span', null, `Дальше: ${plain(next.title)}`), ico('chevron-right')),
      h('div', { class: 'row row--wrap ln-finish__row' },
        h('a', { class: 'btn btn--ghost btn--sm', href: `#/?week=${lesson.week}` }, 'К дорожке'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { progress.unmarkDone(lesson); drawFinish(); toast('Отметка снята'); } },
          lico('undo'), h('span', null, 'Снять отметку')))));
  }

  function finish() {
    const changed = progress.markDone(lesson);
    drawFinish();
    toast('Урок пройден!', { action: 'Отменить', timeout: 5000, onAction: () => { progress.unmarkDone(lesson, changed); drawFinish(); } });
  }

  const prev = course.lessons[index - 1];
  const nxt = course.lessons[index + 1];
  nav.replaceChildren(
    prev ? h('a', { class: 'ln-lesson-nav__a', href: `#/lesson/${encodeURIComponent(prev.id)}` }, ico('chevron-left', 'ico ico--sm'), h('span', null, h('span', { class: 'small muted' }, 'Предыдущий'), h('span', null, plain(prev.title)))) : h('span'),
    nxt ? h('a', { class: 'ln-lesson-nav__a ln-lesson-nav__a--next', href: `#/lesson/${encodeURIComponent(nxt.id)}` }, h('span', null, h('span', { class: 'small muted' }, 'Следующий'), h('span', null, plain(nxt.title))), ico('chevron-right', 'ico ico--sm')) : h('span'));

  if (lesson.steps.length) await drawSteps();
  if (!ctx.alive()) return cleanup;
  if (lesson.quiz.length) drawQuiz();
  drawFinish();
  return cleanup;
}

