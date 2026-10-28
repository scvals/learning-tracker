// Точка входа: загрузка данных, тема, навигация между экранами.

import * as store from './store.js';
import * as sync from './sync.js';
import { h, ico } from './ui.js';
import { applyTheme } from './themes.js';
import { decor } from './decor.js';

import * as today from './views/today.js';
import * as plan from './views/plan.js';
import * as journal from './views/journal.js';
import * as summary from './views/summary.js';
import * as settingsView from './views/settings.js';
import * as onboarding from './views/onboarding.js';

const ROUTES = {
  today: { view: today, title: 'Сегодня', icon: 'sun' },
  plan: { view: plan, title: 'План', icon: 'list' },
  journal: { view: journal, title: 'Журнал', icon: 'book' },
  summary: { view: summary, title: 'Итоги', icon: 'chart' },
  settings: { view: settingsView, title: 'Настройки', icon: 'gear' },
};

const main = document.getElementById('view');
const nav = document.getElementById('nav');
const decorEl = document.getElementById('decor');

let current = null;   // { name, cleanup }

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, query = ''] = raw.split('?');
  return { name: ROUTES[name] ? name : 'today', params: Object.fromEntries(new URLSearchParams(query)) };
}

export function navigate(name, params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  const target = `#/${name}${q}`;
  if (location.hash === target) render();
  else location.hash = target;
}

function render() {
  current?.cleanup?.();
  const s = store.settings();
  const needsOnboarding = !s.onboarded || !s.startDate;
  document.body.classList.toggle('is-onboarding', needsOnboarding);

  const { name, params } = parseHash();
  const route = needsOnboarding ? { view: onboarding, title: 'Добро пожаловать' } : ROUTES[name];
  const scroll = current?.name === name ? window.scrollY : 0;

  main.replaceChildren();
  const ctx = {
    params,
    navigate,
    rerender: () => render(),
  };
  const cleanup = route.view.render(main, ctx);
  current = { name: needsOnboarding ? 'onboarding' : name, cleanup };
  document.title = `${route.title} · Трекер обучения`;
  renderNav(needsOnboarding ? null : name);
  window.scrollTo(0, scroll);
}

function renderNav(active) {
  nav.replaceChildren(...Object.entries(ROUTES).map(([name, r]) =>
    h('a', { href: `#/${name}`, class: `nav__item${name === active ? ' is-active' : ''}`,
      'aria-current': name === active ? 'page' : null },
    ico(r.icon, 'ico nav__ico'), h('span', { class: 'nav__label' }, r.title))));
}

function renderDecor() {
  decorEl.innerHTML = decor('header', store.settings().skin);
}

function renderSyncBadge(status) {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  let cls = 'local', label = 'Только на этом устройстве';
  if (status.configured && status.user) {
    if (!status.online) { cls = 'offline'; label = 'Нет сети — изменения сохранятся и отправятся позже'; }
    else if (status.pending > 0 || status.syncing) { cls = 'syncing'; label = 'Синхронизация…'; }
    else if (status.error) { cls = 'error'; label = 'Ошибка синхронизации: ' + status.error; }
    else { cls = 'synced'; label = 'Синхронизировано'; }
  } else if (status.configured) {
    cls = 'signed-out'; label = 'Вход не выполнен — данные только на этом устройстве';
  }
  el.className = `sync-badge sync-badge--${cls}`;
  el.title = label;
  el.setAttribute('aria-label', label);
  el.replaceChildren(ico(cls === 'synced' ? 'cloud-check' : cls === 'offline' ? 'cloud-off' : cls === 'syncing' ? 'sync' : 'cloud'));
}

function applyAppearance() {
  const s = store.settings();
  applyTheme(s.skin, s.mode);
  renderDecor();
}

function init() {
  store.load();
  applyAppearance();

  document.getElementById('sync-badge')?.addEventListener('click', () => navigate('settings'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAppearance);
  window.addEventListener('hashchange', render);

  let lastAppearance = '';
  store.subscribe((info) => {
    const s = store.settings();
    const key = `${s.skin}|${s.mode}`;
    if (key !== lastAppearance) { lastAppearance = key; applyAppearance(); }
    // Локальные правки экран обновляет сам (чтобы не сбивать фокус в полях ввода);
    // данные из облака и импорт — перерисовывают экран целиком.
    if (info.source !== 'local' || info.col === 'settings') {
      const active = document.activeElement;
      const typing = active && main.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
      if (!typing || info.source === 'import') render();
    }
  });
  lastAppearance = `${store.settings().skin}|${store.settings().mode}`;

  sync.onStatus(renderSyncBadge);
  sync.init().catch((e) => console.error('sync init', e));

  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW', e));
  }
}

init();
