// Галерея оформлений и переключатель светлой/тёмной темы.
// Используется в «Настройках» и на первом запуске.

import * as store from '../store.js';
import { h, ico } from '../ui.js';
import { SKINS, resolveMode } from '../themes.js';
import { decor } from '../decor.js';

function safeDecor(name, skin) {
  try { return decor(name, skin) || ''; } catch (e) { console.warn('decor', e); return ''; }
}

// Карточки оформлений: превью-орнамент, образцы цветов, название. Нажатие — применяет сразу.
export function skinGallery({ onPick, large = false } = {}) {
  const s = store.settings();
  const theme = resolveMode(s.mode);
  return h('div', { class: `set-skins${large ? ' set-skins--large' : ''}`, role: 'radiogroup', 'aria-label': 'Оформление' },
    SKINS.map((sk) => {
      const active = sk.id === s.skin;
      return h('button', {
        type: 'button',
        class: `set-skin${active ? ' is-active' : ''}`,
        role: 'radio',
        'aria-checked': String(active),
        'aria-label': `${sk.name}. ${sk.tagline || ''}`,
        onclick: () => {
          if (!active) store.setSettings({ skin: sk.id });
          onPick?.(sk);
        },
      },
      // data-skin/data-theme на превью: если темы заданы селекторами атрибутов, превью окрасится в свой скин.
      h('span', { class: 'set-skin__preview', 'data-skin': sk.id, 'data-theme': theme, 'aria-hidden': 'true' },
        h('span', { class: 'set-skin__decor', html: safeDecor('header', sk.id) })),
      h('span', { class: 'set-skin__swatches', 'aria-hidden': 'true' },
        (sk.swatches || []).map((c) => h('span', { class: 'set-skin__swatch', style: { background: c } }))),
      h('span', { class: 'set-skin__name' }, sk.name),
      sk.tagline && h('span', { class: 'set-skin__tagline small muted' }, sk.tagline),
      active && h('span', { class: 'set-skin__check' }, ico('check')));
    }));
}

export const MODES = [['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']];

export function modeSegmented() {
  const mode = store.settings().mode || 'auto';
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Светлая или тёмная тема' },
    MODES.map(([v, label]) => h('button', {
      type: 'button',
      class: `segmented__btn${mode === v ? ' is-active' : ''}`,
      role: 'radio',
      'aria-checked': String(mode === v),
      onclick: () => { if (mode !== v) store.setSettings({ mode: v }); },
    }, label)));
}

export { safeDecor };
