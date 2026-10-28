// Первый запуск: приветствие → выбор дизайна → дата начала → навыки → «Начать».

import * as store from '../store.js';
import * as sync from '../sync.js';
import { h, ico, toast, actionMenu, formDialog } from '../ui.js';
import { todayISO, addDays, fromISO, weekRange, formatLong, formatShort, plural } from '../dates.js';
import { skinGallery, modeSegmented, safeDecor } from './settings-skins.js';
import { importBackup } from './settings-backup.js';

// Состояние мастера живёт между перерисовками (смена оформления перерисовывает экран).
const state = { step: 1, startDate: null, weeks: null };
const STEPS = 3;

function nearestMonday(iso) {
  const dow = fromISO(iso).getDay();            // 0 — вс, 1 — пн
  return dow === 1 ? iso : addDays(iso, (8 - dow) % 7);
}

function syncConfigured() {
  try { return !!sync.isConfigured(); } catch { return false; }
}

export function render(root, ctx) {
  const s = store.settings();
  if (!state.startDate) state.startDate = s.startDate || todayISO();
  if (!state.weeks) state.weeks = s.weeks || 4;
  const go = (n) => { state.step = n; ctx.rerender(); window.scrollTo(0, 0); };

  const hero = h('div', { class: `ob-hero${state.step > 1 ? ' ob-hero--small' : ''}` },
    h('div', { class: 'ob-hero__art', 'aria-hidden': 'true', html: safeDecor('onboarding', s.skin) }),
    state.step === 1 ? h('h1', { class: 'h1 ob-hero__title' }, 'Привет! Это твой трекер обучения') : null,
    state.step === 1 ? h('p', { class: 'muted ob-hero__text' },
      'Здесь удобно вести план по неделям, отмечать каждый день занятий и раз в неделю записывать, чего удалось достичь. Настроим всё за минуту.') : null);

  const dots = h('div', { class: 'ob-steps', 'aria-label': `Шаг ${state.step} из ${STEPS}` },
    Array.from({ length: STEPS }, (_, i) => h('span', { class: `ob-steps__dot${i + 1 === state.step ? ' is-active' : ''}${i + 1 < state.step ? ' is-done' : ''}`, 'aria-hidden': 'true' })),
    h('span', { class: 'small muted ob-steps__label' }, `Шаг ${state.step} из ${STEPS}`));

  let body;
  if (state.step === 1) body = stepDesign(go);
  else if (state.step === 2) body = stepDate(go);
  else body = stepSkills(go, ctx);

  root.append(h('div', { class: 'ob stack' }, hero, dots, body, extras()));
}

function stepDesign(go) {
  return h('div', { class: 'stack ob-step' },
    h('h2', { class: 'h2' }, 'Выбери оформление'),
    h('p', { class: 'small muted' }, 'Нажми на карточку — дизайн сразу применится. Поменять можно потом в Настройках.'),
    skinGallery({ large: true }),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Светлая или тёмная'), modeSegmented()),
    h('div', { class: 'ob-actions' },
      h('button', { type: 'button', class: 'btn btn--primary btn--block', onclick: () => go(2) }, 'Дальше', ico('chevron-right'))));
}

function stepDate(go) {
  const today = todayISO();
  const chips = [['Сегодня', today], ['Завтра', addDays(today, 1)], ['Ближайший понедельник', nearestMonday(today)]];
  const info = h('p', { class: 'small muted ob-date-info' });
  const chipsEl = h('div', { class: 'chips' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn--primary', onclick: () => go(3) }, 'Дальше', ico('chevron-right'));
  const input = h('input', { id: 'ob_start', class: 'input', type: 'date', value: state.startDate,
    oninput: () => setDate(input.value), onchange: () => setDate(input.value) });
  const weeksVal = h('span', { class: 'stepper__value num' });

  function paint() {
    chipsEl.replaceChildren(...chips.map(([label, iso]) => h('button', {
      type: 'button', class: `chip${state.startDate === iso ? ' is-active' : ''}`, 'aria-pressed': String(state.startDate === iso),
      onclick: () => { input.value = iso; setDate(iso); },
    }, label)));
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(state.startDate || '');
    nextBtn.disabled = !valid;
    weeksVal.textContent = `${state.weeks} ${plural(state.weeks, ['неделя', 'недели', 'недель'])}`;
    if (valid) {
      const [, end] = weekRange(state.weeks, state.startDate);
      info.textContent = `Неделя 1 начнётся: ${formatLong(state.startDate)}. План закончится ${formatShort(end)}.`;
    } else info.textContent = 'Выбери дату начала.';
  }
  function setDate(v) { state.startDate = v; paint(); }
  const stepW = (d) => { state.weeks = Math.max(1, Math.min(52, state.weeks + d)); paint(); };

  paint();
  return h('div', { class: 'stack ob-step' },
    h('h2', { class: 'h2' }, 'Когда начинаем?'),
    h('p', { class: 'small muted' }, 'Можно выбрать любую дату — и прошедшую, и будущую.'),
    chipsEl,
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'ob_start' }, 'Дата начала'), input),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Длина плана'),
      h('div', { class: 'stepper', role: 'group', 'aria-label': 'Длина плана в неделях' },
        h('button', { type: 'button', class: 'stepper__btn', 'aria-label': 'Меньше недель', onclick: () => stepW(-1) }, ico('minus')),
        weeksVal,
        h('button', { type: 'button', class: 'stepper__btn', 'aria-label': 'Больше недель', onclick: () => stepW(1) }, ico('plus')))),
    info,
    h('div', { class: 'ob-actions row' },
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => go(1) }, ico('chevron-left'), 'Назад'),
      nextBtn));
}

function stepSkills(go, ctx) {
  const skills = store.skills();
  return h('div', { class: 'stack ob-step' },
    h('h2', { class: 'h2' }, 'Что будем учить'),
    h('p', { class: 'small muted' }, 'Навыки, задания и показатели можно переименовать, добавить или удалить в любой момент в Настройках.'),
    skills.length
      ? h('div', { class: 'stack stack--sm' }, skills.map((sk) => h('div', { class: `card card--skill sk-${sk.color || 1} ob-skill` },
        h('div', { class: 'card__head' },
          h('span', { class: 'card__icon' }, ico(sk.icon || 'star')),
          h('div', null,
            h('div', { class: 'card__title' }, sk.name),
            sk.minimum ? h('div', { class: 'small muted' }, `Минимум на плохой день: ${sk.minimum}`) : null)))))
      : h('p', { class: 'muted' }, 'Навыков пока нет — добавишь их в Настройках.'),
    h('div', { class: 'ob-actions row' },
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => go(2) }, ico('chevron-left'), 'Назад'),
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(state.startDate || '')) { go(2); return; }
        const startDate = state.startDate, weeks = state.weeks;
        state.step = 1; state.startDate = null; state.weeks = null;
        store.setSettings({ startDate, weeks, onboarded: true });
        ctx.navigate('today');
        toast('Поехали! Удачи в первой неделе');
      } }, ico('sparkle'), 'Начать')));
}

function extras() {
  const links = [
    h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: async () => {
      if (await importBackup()) { state.step = 1; state.startDate = null; state.weeks = null; }
    } }, ico('upload'), ' У меня есть резервная копия'),
  ];
  if (syncConfigured()) {
    links.push(h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: signInMenu },
      ico('cloud'), ' Войти и загрузить мои данные'));
  }
  return h('div', { class: 'ob-extras stack stack--sm' }, h('div', { class: 'divider', 'aria-hidden': 'true' }), ...links);
}

function signInMenu() {
  actionMenu({ title: 'Войти и загрузить данные', items: [
    { label: 'Войти через Google', icon: 'google', onClick: async () => {
      try { await sync.signInGoogle(); toast('Вход выполнен — загружаю данные…'); }
      catch (e) { toast(e?.message || 'Не удалось войти', { timeout: 5000 }); }
    } },
    { label: 'Войти по ссылке на email', icon: 'mail', onClick: async () => {
      const res = await formDialog({ title: 'Вход по ссылке', okText: 'Отправить',
        fields: [{ name: 'email', label: 'Почта', type: 'email', required: true, placeholder: 'you@example.com' }] });
      if (!res?.email) return;
      try { await sync.sendEmailLink(res.email); toast(`Письмо отправлено на ${res.email}. Откройте ссылку из письма на этом устройстве.`, { timeout: 6000 }); }
      catch (e) { toast(e?.message || 'Не удалось отправить письмо', { timeout: 5000 }); }
    } },
  ] });
}
