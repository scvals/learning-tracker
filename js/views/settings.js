// «Настройки»: оформление, план, навыки, аккаунт, резервная копия, о приложении.

import * as store from '../store.js';
import * as sync from '../sync.js';
import { h, ico, toast, confirmDialog, formDialog, actionMenu, debounce } from '../ui.js';
import { weekRange, formatShort, formatNumeric, plural, todayISO } from '../dates.js';
import { defaultTasks } from '../defaults.js';
import { skinGallery, modeSegmented } from './settings-skins.js';
import { editSkill, deleteSkill, moveInList, hintSkills, hintText } from './settings-skills.js';
import { openMetricsEditor } from './settings-metrics.js';
import { exportBackup, importBackup, resetEverything } from './settings-backup.js';

const section = (title, iconName, ...children) => h('section', { class: 'section set-section' },
  h('h2', { class: 'section__title' }, iconName ? ico(iconName) : null, ' ', title),
  ...children);

export function render(root, ctx) {
  const cleanups = [];
  root.append(
    h('div', { class: 'page-head' },
      h('div', null, h('h1', { class: 'h1 page-head__title' }, 'Настройки'),
        h('div', { class: 'page-head__sub muted' }, 'Всё можно поменять в любой момент'))),
    appearanceSection(),
    planSection(ctx),
    skillsSection(ctx),
    accountSection(cleanups),
    backupSection(),
    aboutSection());
  return () => cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
}

// ---------- Оформление ----------
function appearanceSection() {
  return section('Оформление', 'palette',
    h('div', { class: 'card set-card stack' },
      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, 'Тема'),
        modeSegmented()),
      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, 'Дизайн'),
        skinGallery())));
}

// ---------- План ----------
function weeksWithData(fromWeek) {
  const s = store.settings();
  const weeks = new Set();
  for (const j of store.list('journal')) {
    if (j.week >= fromWeek && (Object.keys(j.values || {}).length || Object.keys(j.checks || {}).length
      || Object.values(j.notes || {}).some((t) => t && t.trim()))) weeks.add(j.week);
  }
  for (const t of store.list('tasks', (t) => t.week >= fromWeek && t.done)) weeks.add(t.week);
  if (s.startDate) {
    for (const d of store.list('days', (d) => d.done || d.minutes || d.note)) {
      const w = store.calendarWeek(d.date);
      if (w >= fromWeek) weeks.add(w);
    }
  }
  return [...weeks].sort((a, b) => a - b);
}

function planInfo() {
  const s = store.settings();
  if (!s.startDate) return 'Дата начала не выбрана.';
  const weeks = store.planWeeks();
  const [, end] = weekRange(weeks, s.startDate);
  const cw = store.calendarWeek();
  let now;
  if (cw === 0) now = 'План ещё не начался.';
  else if (cw > weeks) now = 'План завершён — можно продлить.';
  else now = `Сейчас идёт неделя ${cw} из ${weeks}.`;
  return `С ${formatShort(s.startDate)} по ${formatShort(end)}. ${now}`;
}

function planSection(ctx) {
  const s = store.settings();
  const weeks = store.planWeeks();
  const info = h('p', { class: 'small muted set-plan-info' }, planInfo());

  const dateInput = h('input', { id: 'set_start', class: 'input', type: 'date', value: s.startDate || '',
    onchange: () => {
      const v = dateInput.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
      if (v === store.settings().startDate) return;
      store.setSettings({ startDate: v });
      info.textContent = planInfo();
      toast(`Начало плана: ${formatNumeric(v)}`);
    } });

  async function setWeeks(n) {
    if (n < 1 || n > 52) return;
    if (n < weeks) {
      const hidden = weeksWithData(n + 1);
      if (hidden.length) {
        const ok = await confirmDialog({
          title: 'Сократить план?',
          text: `В ${hidden.length === 1 ? 'неделе' : 'неделях'} ${hidden.join(', ')} уже есть записи. Они не удалятся, но будут скрыты, пока план снова не станет длиннее.`,
          okText: 'Сократить',
          danger: true,
        });
        if (!ok) return;
      }
    }
    store.setSettings({ weeks: n });   // приложение перерисует экран
  }

  const stepper = h('div', { class: 'stepper', role: 'group', 'aria-label': 'Длина плана в неделях' },
    h('button', { type: 'button', class: 'stepper__btn', 'aria-label': 'Меньше недель', disabled: weeks <= 1,
      onclick: () => setWeeks(weeks - 1) }, ico('minus')),
    h('span', { class: 'stepper__value num', 'aria-live': 'polite' }, `${weeks} ${plural(weeks, ['неделя', 'недели', 'недель'])}`),
    h('button', { type: 'button', class: 'stepper__btn', 'aria-label': 'Больше недель', disabled: weeks >= 52,
      onclick: () => setWeeks(weeks + 1) }, ico('plus')));

  return section('План', 'calendar',
    h('div', { class: 'card set-card stack' },
      h('div', { class: 'field' },
        h('label', { class: 'field__label', for: 'set_start' }, 'Дата начала'),
        dateInput,
        h('div', { class: 'field__hint' }, 'Неделя 1 начинается в этот день. Можно выбрать любой.')),
      h('div', { class: 'field' },
        h('span', { class: 'field__label' }, 'Длина плана'),
        stepper),
      info,
      h('div', { class: 'divider', 'aria-hidden': 'true' }),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: () => restoreTasks(ctx) },
        ico('undo'), ' Восстановить исходные задания'),
      h('p', { class: 'small muted' }, 'Вернёт удалённые задания из исходного плана. Ваши задания и отметки останутся.')));
}

async function restoreTasks() {
  const missing = defaultTasks().filter((t) => !store.get('tasks', t.id) && store.skill(t.skillId));
  if (!missing.length) {
    toast('Все исходные задания на месте');
    return;
  }
  const ok = await confirmDialog({
    title: 'Восстановить исходные задания?',
    text: `Вернётся ${missing.length} ${plural(missing.length, ['задание', 'задания', 'заданий'])} из исходного плана.`,
    okText: 'Восстановить',
  });
  if (!ok) return;
  missing.forEach((t) => store.put('tasks', t));
  toast(`Восстановлено: ${missing.length}`);
}

// ---------- Навыки ----------
function skillsSection(ctx) {
  const skills = store.skills();
  const rerender = () => ctx.rerender();

  const rows = skills.map((sk, i) => h('div', { class: `list__item set-skill sk-${sk.color || 1}` },
    h('button', { type: 'button', class: 'set-skill__main', 'aria-label': `Изменить навык «${sk.name}»`,
      onclick: () => editSkill(sk, { onDone: rerender }) },
    h('span', { class: 'set-skill__icon card__icon' }, ico(sk.icon || 'star')),
    h('span', { class: 'set-skill__text' },
      h('span', { class: 'set-skill__name' }, sk.name, sk.priority ? h('span', { class: 'badge badge--accent set-skill__prio' }, ico('star', 'ico ico--sm'), ' приоритет') : null),
      h('span', { class: 'small muted' }, sk.minimum ? `Минимум: ${sk.minimum}` : 'Минимум не задан'))),
    h('div', { class: 'set-skill__actions' },
      h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Выше', disabled: i === 0,
        onclick: () => { if (moveInList('skills', skills, i, -1)) rerender(); } }, ico('arrow-up')),
      h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Ниже', disabled: i === skills.length - 1,
        onclick: () => { if (moveInList('skills', skills, i, 1)) rerender(); } }, ico('arrow-down')),
      h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Действия с «${sk.name}»`,
        onclick: () => actionMenu({ title: sk.name, items: [
          { label: 'Изменить', icon: 'edit', onClick: () => editSkill(sk, { onDone: rerender }) },
          { label: sk.priority ? 'Снять приоритет' : 'Сделать приоритетным', icon: 'star',
            onClick: () => { store.patch('skills', sk.id, { priority: !sk.priority }); rerender(); } },
          { label: 'Показатели журнала', icon: 'chart', onClick: () => openMetricsEditor(sk.id, { onChange: rerender }) },
          { label: 'Удалить', icon: 'trash', danger: true, onClick: async () => { if (await deleteSkill(sk)) rerender(); } },
        ] }) }, ico('more')))));

  return section('Навыки', 'star',
    h('div', { class: 'card set-card stack' },
      skills.length ? h('div', { class: 'list set-skills' }, rows) : h('p', { class: 'muted' }, 'Навыков пока нет.'),
      h('button', { type: 'button', class: 'btn btn--primary btn--block', onclick: () => editSkill(null, { onDone: rerender }) },
        ico('plus'), ' Добавить навык')),
    skills.length ? hintCard(rerender) : null);
}

function hintCard(rerender) {
  const preview = h('div', { class: 'hint-box set-hint-preview' }, hintText());
  const list = hintSkills();
  const rows = list.map((sk, i) => {
    const save = debounce((v) => { store.patch('skills', sk.id, { minimum: v.trim() }); preview.textContent = hintText(); }, 400);
    const input = h('input', { class: 'input', type: 'text', value: sk.minimum || '', maxlength: 80,
      placeholder: 'Например, 5 минут', 'aria-label': `Минимум для «${sk.name}»`,
      oninput: () => save(input.value), onblur: () => save.flush(input.value) });
    return h('div', { class: `list__item set-hint-row sk-${sk.color || 1}` },
      h('div', { class: 'set-hint-row__main' },
        h('div', { class: 'small set-hint-row__name' }, h('span', { class: 'set-dot', 'aria-hidden': 'true' }), sk.name),
        input),
      h('div', { class: 'set-hint-row__actions' },
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Раньше в подсказке', disabled: i === 0,
          onclick: () => { if (moveInList('skills', list, i, -1, 'hintOrder')) rerender(); } }, ico('arrow-up')),
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Позже в подсказке', disabled: i === list.length - 1,
          onclick: () => { if (moveInList('skills', list, i, 1, 'hintOrder')) rerender(); } }, ico('arrow-down'))));
  });
  return h('div', { class: 'card set-card stack set-hint' },
    h('h3', { class: 'h3' }, 'Плохой день: минимум'),
    h('p', { class: 'small muted' }, 'Так подсказка выглядит на экране «Сегодня». Порядок — стрелками.'),
    preview,
    h('div', { class: 'list' }, rows));
}

// ---------- Аккаунт и синхронизация ----------
function statusText(st) {
  if (!st.configured) return { cls: 'local', text: 'Только на этом устройстве' };
  if (!st.user) return { cls: 'signed-out', text: 'Вход не выполнен — данные только на этом устройстве' };
  if (!st.online) return { cls: 'offline', text: 'Нет сети — изменения отправятся позже' };
  if (st.error) return { cls: 'error', text: `Ошибка синхронизации: ${st.error}` };
  if (st.syncing || st.pending > 0) return { cls: 'syncing', text: 'Синхронизация…' };
  let t = 'Синхронизировано';
  if (st.lastSyncAt) {
    const d = new Date(st.lastSyncAt);
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    t += ` · ${hm}`;
  }
  return { cls: 'synced', text: t };
}

async function run(fn, okMsg) {
  try {
    await fn();
    if (okMsg) toast(okMsg);
    return true;
  } catch (e) {
    console.error(e);
    toast(e?.message || 'Что-то пошло не так', { timeout: 5000 });
    return false;
  }
}

function accountSection(cleanups) {
  const statusEl = h('div', { class: 'set-sync-status' });
  const body = h('div', { class: 'stack' });
  let mode = null;   // 'off' | 'out' | 'in'
  let lastUserKey = '';

  const paintStatus = (st) => {
    const { cls, text } = statusText(st);
    statusEl.replaceChildren(
      h('span', { class: `sync-badge sync-badge--${cls} set-sync-status__badge`, 'aria-hidden': 'true' },
        ico(cls === 'synced' ? 'cloud-check' : cls === 'offline' ? 'cloud-off' : cls === 'syncing' ? 'sync' : 'cloud')),
      h('span', { class: 'set-sync-status__text' }, text));
  };

  const paintBody = (st) => {
    if (!st.configured) {
      body.replaceChildren(h('p', { class: 'small muted' },
        'Синхронизация между телефоном и компьютером включится, когда в файл js/firebase-config.js будут вставлены ключи Firebase (как это сделать — в README). Пока всё хранится только на этом устройстве — не забывайте про резервную копию.'));
    } else if (!st.user) {
      const email = h('input', { id: 'set_email', class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email', inputmode: 'email' });
      const msg = h('p', { class: 'small muted', 'aria-live': 'polite' });
      const sendBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: async () => {
        const v = email.value.trim();
        if (!v || !email.checkValidity()) { msg.textContent = 'Введите адрес почты.'; email.focus(); return; }
        sendBtn.disabled = true;
        const ok = await run(() => sync.sendEmailLink(v));
        sendBtn.disabled = false;
        if (ok) msg.textContent = `Письмо отправлено на ${v}. Откройте ссылку из письма на этом устройстве, чтобы войти.`;
      } }, ico('mail'), ' Войти по ссылке на email');
      body.replaceChildren(
        h('p', { class: 'small muted' }, 'Войдите, чтобы данные хранились в облаке и были одинаковыми на всех устройствах.'),
        h('button', { type: 'button', class: 'btn btn--primary btn--block', onclick: () => run(() => sync.signInGoogle()) },
          ico('google'), ' Войти через Google'),
        h('div', { class: 'divider', 'aria-hidden': 'true' }),
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'set_email' }, 'Или по ссылке на почту'), email),
        sendBtn,
        msg);
    } else {
      body.replaceChildren(
        h('div', { class: 'set-user' }, ico('mail'),
          h('div', null,
            st.user.name ? h('div', { class: 'set-user__name' }, st.user.name) : null,
            h('div', { class: 'small muted' }, st.user.email || 'Аккаунт'))),
        h('div', { class: 'grid-2' },
          h('button', { type: 'button', class: 'btn btn--primary', onclick: () => run(() => sync.syncNow(), 'Синхронизировано') },
            ico('sync'), ' Синхронизировать'),
          h('button', { type: 'button', class: 'btn btn--ghost', onclick: signOut }, ico('logout'), ' Выйти')));
    }
  };

  async function signOut() {
    const res = await formDialog({
      title: 'Выйти из аккаунта?',
      okText: 'Выйти',
      fields: [{ name: 'wipe', type: 'checkbox', label: 'Также удалить данные с этого устройства (в облаке они останутся)', value: false }],
    });
    if (!res) return;
    await run(() => sync.signOut({ wipe: !!res.wipe }), res.wipe ? 'Вы вышли, данные с устройства удалены' : 'Вы вышли из аккаунта');
  }

  const onStatus = (st) => {
    if (!statusEl.isConnected && mode !== null) return;
    paintStatus(st);
    const m = !st.configured ? 'off' : !st.user ? 'out' : 'in';
    const userKey = st.user ? `${st.user.uid}|${st.user.email}|${st.user.name}` : '';
    if (m !== mode || userKey !== lastUserKey) {
      mode = m; lastUserKey = userKey;
      paintBody(st);
    }
  };

  try {
    const off = sync.onStatus(onStatus);
    if (typeof off === 'function') cleanups.push(off);
  } catch (e) {
    console.error(e);
  }
  if (mode === null) onStatus({ configured: safeConfigured(), user: null, online: navigator.onLine, syncing: false, pending: 0, lastSyncAt: null, error: null });

  return section('Аккаунт и синхронизация', 'cloud',
    h('div', { class: 'card set-card stack' }, statusEl, body));
}

function safeConfigured() {
  try { return !!sync.isConfigured(); } catch { return false; }
}

// ---------- Резервная копия ----------
function backupSection() {
  return section('Резервная копия', 'download',
    h('div', { class: 'card set-card stack' },
      h('p', { class: 'small muted' }, 'Файл со всеми данными: отметками, журналом, итогами и настройками. Храните его где-нибудь в облаке или в почте.'),
      h('button', { type: 'button', class: 'btn btn--primary btn--block', onclick: exportBackup },
        ico('download'), ' Скачать резервную копию (JSON)'),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: importBackup },
        ico('upload'), ' Загрузить из файла'),
      h('div', { class: 'divider', 'aria-hidden': 'true' }),
      h('button', { type: 'button', class: 'btn btn--danger btn--block', onclick: resetEverything },
        ico('trash'), ' Очистить все данные')));
}

// ---------- О приложении ----------
function aboutSection() {
  return section('О приложении', 'info',
    h('div', { class: 'card set-card stack stack--sm' },
      h('p', { class: 'small' }, 'Трекер обучения — личный дневник навыков: план по неделям, ежедневные отметки, журнал и итоги.'),
      h('p', { class: 'small muted num' }, `Версия схемы данных: ${store.SCHEMA_VERSION} · ${store.APP_ID} · сегодня ${formatNumeric(todayISO())}`)));
}
