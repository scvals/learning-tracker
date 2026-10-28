// Иконки «Уроков»: дополняют набор трекера (../js/icons.js) тем, чего там нет
// (воспроизведение, звук, копирование, печать…). Тот же стиль: 24×24, линия currentColor.

import { ico } from '../../js/ui.js';

const P = {
  play: '<path d="M8 5.5c3.7 2 7.3 4.2 10.6 6.5-3.3 2.3-6.9 4.5-10.6 6.5z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  speaker: '<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M15.5 9c1 .9 1.5 1.9 1.5 3s-.5 2.1-1.5 3M18 6.5c1.7 1.5 2.6 3.4 2.6 5.5s-.9 4-2.6 5.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2c0-1-.8-1.7-1.7-1.7H6.2c-1 0-1.7.8-1.7 1.7v7.6c0 1 .8 1.7 1.7 1.7h2.3"/>',
  print: '<path d="M7 9V4.5h10V9"/><rect x="4" y="9" width="16" height="7.5" rx="2"/><path d="M7.5 14h9v5.5h-9z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6"/><path d="M15.4 15.4l4.6 4.6"/>',
  external: '<path d="M13.5 4.5h6v6M19.5 4.5l-8.5 8.5"/><path d="M17.5 14v4c0 .9-.7 1.6-1.6 1.6H6.1c-.9 0-1.6-.7-1.6-1.6V8.1c0-.9.7-1.6 1.6-1.6h4"/>',
  path: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 17c3.5-.5 5.5-2 4.5-4.5S12 8 16 7"/>',
  cards: '<rect x="3.5" y="7" width="12" height="13" rx="2"/><path d="M8.5 4.5h9.8c.9 0 1.7.8 1.7 1.7v10.3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.4"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  chat: '<path d="M5 5.5h14c.8 0 1.5.7 1.5 1.5v8.5c0 .8-.7 1.5-1.5 1.5h-8l-4.5 3.5V17H5c-.8 0-1.5-.7-1.5-1.5V7c0-.8.7-1.5 1.5-1.5z"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7v2.8"/>',
  bag: '<path d="M5 8.5h14l-1.2 11H6.2z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
  sheet: '<path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z"/><path d="M14 3.5V7h4M9 11h6M9 14.2h6M9 17.4h4"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9v.4"/><circle cx="12" cy="16.9" r=".5"/>',
  shuffle: '<path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M14 9.6C14.8 8 15.7 7 17 7h3"/><path d="M18 4.8L20.3 7 18 9.2M18 14.8l2.3 2.2-2.3 2.2"/>',
  eye: '<path d="M2.8 12c2.3-4 5.4-6 9.2-6s6.9 2 9.2 6c-2.3 4-5.4 6-9.2 6s-6.9-2-9.2-6z"/><circle cx="12" cy="12" r="2.8"/>',
};

export function licon(name) {
  const body = P[name];
  if (!body) return null;
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

// Иконка как элемент: сначала свои, иначе — из набора трекера.
export function lico(name, cls = 'ico') {
  const svg = licon(name);
  if (!svg) return ico(name, cls);
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = svg;
  return span;
}
