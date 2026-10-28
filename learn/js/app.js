// «Уроки»: точка входа. Общие с трекером хранилище, оформление и синхронизация.

import * as store from '../../js/store.js';
import * as sync from '../../js/sync.js';
import { h, ico } from '../../js/ui.js';
import { applyTheme } from '../../js/themes.js';
import { decor } from '../../js/decor.js';
import { lico } from './lic.js';
import { closeTermSheet } from './markup.js';

import * as pathView from './views/path.js';
import * as skillView from './views/skill.js';
import * as lessonView from './views/lesson.js';
import * as sessionView from './views/session.js';
import * as wordsView from './views/words.js';
import * as moreView from './views/more.js';
import * as glossaryView from './views/glossary.js';
import * as shopView from './views/shop.js';
import * as dialogsView from './views/dialogs.js';
import * as sheetsView from './views/sheets.js';
import * as guideView from './views/guide.js';

const ROUTES = {
  '': { view: pathView, title: 'Путь', tab: 'path' },
  skill: { view: skillView, title: 'Курс', tab: 'path' },
  lesson: { view: lessonView, title: 'Урок', tab: 'path' },
  session: { view: sessionView, title: 'Занятие', tab: 'session' },
  words: { view: wordsView, title: 'Слова', tab: 'words' },
  more: { view: moreView, title: 'Справочник', tab: 'more' },
  glossary: { view: glossaryView, title: 'Глоссарий', tab: 'more' },
  shop: { view: shopView, title: 'Что купить', tab: 'more' },
  dialogs: { view: dialogsView, title: 'Диалоги с ИИ', tab: 'more' },
  sheets: { view: sheetsView, title: 'Прописи', tab: 'more' },
  guide: { view: guideView, title: 'Как пользоваться трекером', tab: 'more' },
};

const TABS = [
  { id: 'path', href: '#/', label: 'Путь', icon: 'path' },
  { id: 'session', href: '#/session', label: 'Занятие', icon: 'clock' },
  { id: 'words', href: '#/words', label: 'Слова', icon: 'letters' },
  { id: 'more', href: '#/more', label: 'Справочник', icon: 'book' },
];

const main = document.getElementById('view');
const nav = document.getElementById('nav');
const decorEl = document.getElementById('decor');

let current = null; // { key, cleanup, token }
let renderToken = 0;

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  const name = ROUTES[parts[0] || ''] ? (parts[0] || '') : '';
  return { name, parts: name ? parts.slice(1) : [], params: Object.fromEntries(new URLSearchParams(query)), key: raw };
}

export function navigate(hash) {
  const target = hash.startsWith('#') ? hash : `#/${hash}`;
  if (location.hash === target) render();
  else location.hash = target;
}

function render({ keepScroll = false } = {}) {
  try { current?.cleanup?.(); } catch (e) { console.error(e); }
  closeTermSheet();
  const { name, parts, params, key } = parseHash();
  const route = ROUTES[name];
  const scroll = keepScroll && current?.key === key ? window.scrollY : 0;
  const token = ++renderToken;

  main.replaceChildren();
  const ctx = {
    name, parts, params, navigate,
    rerender: () => render({ keepScroll: true }),
    alive: () => token === renderToken,
    setTitle: (t) => { if (token === renderToken) document.title = `${t} · Уроки`; },
  };
  let cleanup = null;
  try {
    const res = route.view.render(main, ctx);
    if (typeof res === 'function') cleanup = res;
    else if (res && typeof res.then === 'function') {
      res.then((fn) => {
        if (typeof fn !== 'function') return;
        if (token === renderToken) current.cleanup = fn; else fn();
      }).catch((e) => { console.error(e); showError(); });
    }
  } catch (e) {
    console.error(e);
    showError();
  }
  current = { key, cleanup, token };
  document.title = `${route.title} · Уроки`;
  renderNav(route.tab);
  window.scrollTo(0, scroll);
  if (!keepScroll) main.focus({ preventScroll: true });
}

function showError() {
  main.replaceChildren(h('div', { class: 'empty' },
    h('p', { class: 'empty__title' }, 'Что-то пошло не так'),
    h('p', null, 'Попробуй обновить страницу.'),
    h('a', { class: 'btn btn--primary', href: '#/' }, 'На главную')));
}

function renderNav(active) {
  nav.replaceChildren(...TABS.map((t) => h('a', {
    href: t.href, class: `nav__item${t.id === active ? ' is-active' : ''}`,
    'aria-current': t.id === active ? 'page' : null,
  }, lico(t.icon, 'ico nav__ico'), h('span', { class: 'nav__label' }, t.label))));
}

function renderSyncBadge(status) {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  let cls = 'local', label = 'Только на этом устройстве';
  if (status.configured && status.user) {
    if (!status.online) { cls = 'offline'; label = 'Нет сети — прогресс сохранится и отправится позже'; }
    else if (status.pending > 0 || status.syncing) { cls = 'syncing'; label = 'Синхронизация…'; }
    else if (status.error) { cls = 'error'; label = 'Ошибка синхронизации: ' + status.error; }
    else { cls = 'synced'; label = 'Синхронизировано'; }
  } else if (status.configured) {
    cls = 'signed-out'; label = 'Вход не выполнен — прогресс только на этом устройстве';
  }
  el.className = `sync-badge sync-badge--${cls}`;
  el.title = label;
  el.setAttribute('aria-label', label);
  el.replaceChildren(ico(cls === 'synced' ? 'cloud-check' : cls === 'offline' ? 'cloud-off' : cls === 'syncing' ? 'sync' : 'cloud'));
}

function applyAppearance() {
  const s = store.settings();
  applyTheme(s.skin, s.mode);
  try { decorEl.innerHTML = decor('header', s.skin); } catch { decorEl.replaceChildren(); }
}

function isTyping() {
  const a = document.activeElement;
  return a && main.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
}

function init() {
  store.load();
  applyAppearance();
  let lastAppearance = `${store.settings().skin}|${store.settings().mode}`;

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAppearance);
  window.addEventListener('hashchange', () => render());

  store.subscribe((info) => {
    const s = store.settings();
    const k = `${s.skin}|${s.mode}`;
    if (k !== lastAppearance) { lastAppearance = k; applyAppearance(); }
    // свои правки экраны обновляют сами; данные из облака/импорт — перерисовка
    if (info.source !== 'local' && (!isTyping() || info.source === 'import')) render({ keepScroll: true });
  });

  // правки в соседней вкладке (например, в трекере)
  window.addEventListener('storage', (e) => {
    if (e.key !== 'lt:data:v1') return;
    store.load();
    const s = store.settings();
    const k = `${s.skin}|${s.mode}`;
    if (k !== lastAppearance) { lastAppearance = k; applyAppearance(); }
    if (!isTyping()) render({ keepScroll: true });
  });

  sync.onStatus(renderSyncBadge);
  sync.init().catch((e) => console.error('sync init', e));

  render();
}

init();

// Офлайн-режим: общий сервис-воркер трекера (лежит уровнем выше и обслуживает обе страницы).
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch((e) => console.warn('SW', e));
}
