// Таймер обратного отсчёта: старт / пауза / сброс, мягкий звук и вибрация в конце.

import { h, toast } from '../../js/ui.js';
import { lico } from './lic.js';

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let audioCtx = null;
export function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    [[660, 0], [880, 0.28], [990, 0.56]].forEach(([f, t]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const at = ctx.currentTime + t;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.18, at + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(at);
      o.stop(at + 1);
    });
  } catch { /* звук не обязателен */ }
}

function buzz() {
  try { navigator.vibrate?.([180, 120, 180]); } catch { /* нет вибрации */ }
}

// timer({ minutes, label, onDone, autoStart }) → { el, start, pause, reset, destroy, running() }
export function timer({ minutes, label = 'Таймер', onDone, compact = false } = {}) {
  const total = Math.max(1, Math.round(Number(minutes) * 60) || 60);
  let left = total;
  let endAt = 0;
  let tick = null;
  let finished = false;

  const R = 26, C = 2 * Math.PI * R;
  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bar.setAttribute('cx', '30'); bar.setAttribute('cy', '30'); bar.setAttribute('r', String(R));
  bar.setAttribute('class', 'ring__bar');
  bar.style.strokeDasharray = String(C);
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('cx', '30'); track.setAttribute('cy', '30'); track.setAttribute('r', String(R));
  track.setAttribute('class', 'ring__track');
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 60 60');
  ring.setAttribute('class', 'ring ln-timer__ring');
  ring.setAttribute('aria-hidden', 'true');
  ring.append(track, bar);

  const time = h('span', { class: 'ln-timer__time num', role: 'timer', 'aria-live': 'off' }, fmt(left));
  const mainBtn = h('button', { class: 'btn btn--primary btn--sm ln-timer__main', type: 'button', onclick: () => (tick ? pause() : start()) });
  const resetBtn = h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': 'Сбросить таймер', title: 'Сбросить', onclick: () => reset() }, lico('undo'));
  const el = h('div', { class: `ln-timer${compact ? ' ln-timer--compact' : ''}` },
    h('div', { class: 'ln-timer__dial' }, ring, time),
    h('div', { class: 'ln-timer__side' },
      h('span', { class: 'small muted ln-timer__label' }, label),
      h('div', { class: 'row ln-timer__btns' }, mainBtn, resetBtn)));

  function paint() {
    time.textContent = fmt(left);
    bar.style.strokeDashoffset = String(C * (1 - left / total));
    mainBtn.replaceChildren(lico(tick ? 'pause' : 'play'), h('span', null, tick ? 'Пауза' : finished ? 'Ещё раз' : left < total ? 'Дальше' : 'Старт'));
    mainBtn.setAttribute('aria-label', tick ? 'Пауза' : 'Запустить таймер');
    el.classList.toggle('is-running', !!tick);
    el.classList.toggle('is-finished', finished);
  }

  function start() {
    if (tick) return;
    if (finished || left <= 0) { left = total; finished = false; }
    endAt = Date.now() + left * 1000;
    tick = setInterval(step, 250);
    paint();
  }
  function step() {
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) {
      left = 0;
      clearInterval(tick); tick = null;
      finished = true;
      paint();
      chime(); buzz();
      toast('Время вышло — отличная работа!');
      onDone?.();
      return;
    }
    paint();
  }
  function pause() {
    if (!tick) return;
    clearInterval(tick); tick = null;
    left = Math.max(0, (endAt - Date.now()) / 1000);
    paint();
  }
  function reset() {
    clearInterval(tick); tick = null;
    left = total; finished = false;
    paint();
  }
  function destroy() { clearInterval(tick); tick = null; }

  paint();
  return { el, start, pause, reset, destroy, running: () => !!tick, elapsed: () => total - left };
}
