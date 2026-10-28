// Небольшие помощники интерфейса: создание элементов, диалоги, всплывающие уведомления.

import { icon } from './icons.js';

// h('div', { class: 'card', onclick: fn }, 'текст', h('span'), [массив детей])
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Иконка как DOM-элемент: ico('check', 'ico ico--lg')
export function ico(name, cls = 'ico') {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = icon(name);
  return span;
}

export function debounce(fn, ms = 400) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => { clearTimeout(t); fn(...args); };
  return wrapped;
}

// ---------- уведомления ----------

export function toast(message, { action, onAction, timeout = 3000 } = {}) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const el = h('div', { class: 'toast' },
    h('span', null, message),
    action && h('button', { class: 'toast__action', type: 'button', onclick: () => { onAction?.(); close(); } }, action));
  host.append(el);
  requestAnimationFrame(() => el.classList.add('is-shown'));
  const timer = setTimeout(close, timeout);
  function close() {
    clearTimeout(timer);
    el.classList.remove('is-shown');
    setTimeout(() => el.remove(), 250);
  }
  return close;
}

// ---------- нижняя панель / диалог ----------

// Открывает панель с содержимым. Возвращает { close, el }.
export function sheet({ title, content, onClose, actions }) {
  const prevFocus = document.activeElement;
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: (e) => { if (e.target === backdrop) close(); } });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Окно' },
    h('div', { class: 'sheet__handle', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet__head' },
      h('h2', { class: 'sheet__title' }, title || ''),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Закрыть', onclick: () => close() }, ico('close'))),
    h('div', { class: 'sheet__body' }, content),
    actions && h('div', { class: 'sheet__actions' }, actions));
  backdrop.append(panel);
  document.body.append(backdrop);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => backdrop.classList.add('is-open'));
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  setTimeout(() => {
    const first = panel.querySelector('[autofocus], input, select, textarea');
    (first || panel.querySelector('button'))?.focus({ preventScroll: true });
  }, 60);
  let closed = false;
  function close(result) {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('is-open');
    setTimeout(() => {
      backdrop.remove();
      if (!document.querySelector('.sheet-backdrop')) document.body.classList.remove('has-sheet');
    }, 220);
    prevFocus?.focus?.({ preventScroll: true });
    onClose?.(result);
  }
  return { close, el: panel };
}

// Подтверждение. Возвращает Promise<boolean>.
export function confirmDialog({ title = 'Вы уверены?', text, okText = 'Да', cancelText = 'Отмена', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const s = sheet({
      title,
      content: text ? h('p', { class: 'muted' }, text) : null,
      onClose: () => resolve(result),
      actions: [
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => s.close() }, cancelText),
        h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'button', onclick: () => { result = true; s.close(); } }, okText),
      ],
    });
  });
}

// Форма в панели. fields: [{ name, label, type: 'text'|'number'|'textarea'|'select'|'date'|'checkbox', value, options, placeholder, required, min, max, hint }]
// Возвращает Promise<объект значений | null>.
export function formDialog({ title, fields, okText = 'Сохранить', cancelText = 'Отмена', extra }) {
  return new Promise((resolve) => {
    let result = null;
    const inputs = {};
    const form = h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); submit(); } },
      fields.map((f) => {
        const id = `f_${f.name}_${Math.random().toString(36).slice(2, 6)}`;
        let input;
        if (f.type === 'textarea') {
          input = h('textarea', { id, class: 'input', rows: f.rows || 3, placeholder: f.placeholder || '' });
          input.value = f.value ?? '';
        } else if (f.type === 'select') {
          input = h('select', { id, class: 'input' },
            f.options.map((o) => {
              const [val, lab] = Array.isArray(o) ? o : [o, o];
              return h('option', { value: val, selected: String(val) === String(f.value) }, lab);
            }));
        } else if (f.type === 'checkbox') {
          input = h('input', { id, type: 'checkbox', class: 'checkbox', checked: !!f.value });
          inputs[f.name] = input;
          return h('label', { class: 'field field--inline', for: id }, input, h('span', null, f.label));
        } else {
          input = h('input', { id, class: 'input', type: f.type || 'text', placeholder: f.placeholder || '',
            min: f.min, max: f.max, step: f.step, inputmode: f.type === 'number' ? 'decimal' : undefined });
          input.value = f.value ?? '';
        }
        if (f.required) input.required = true;
        if (f.autofocus) input.autofocus = true;
        inputs[f.name] = input;
        return h('div', { class: 'field' },
          h('label', { class: 'field__label', for: id }, f.label),
          input,
          f.hint && h('div', { class: 'field__hint' }, f.hint));
      }),
      extra || null,
      h('button', { type: 'submit', hidden: true }));
    const s = sheet({
      title,
      content: form,
      onClose: () => resolve(result),
      actions: [
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => s.close() }, cancelText),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: submit }, okText),
      ],
    });
    function submit() {
      if (!form.reportValidity()) return;
      result = {};
      for (const f of fields) {
        const el = inputs[f.name];
        if (f.type === 'checkbox') result[f.name] = el.checked;
        else if (f.type === 'number') result[f.name] = el.value === '' ? null : Number(el.value);
        else result[f.name] = el.value.trim();
      }
      s.close();
    }
  });
}

// Меню действий (например, «Изменить / Удалить»). items: [{ label, icon, danger, onClick }]
export function actionMenu({ title, items }) {
  const s = sheet({
    title,
    content: h('div', { class: 'menu' }, items.map((it) =>
      h('button', { class: `menu__item${it.danger ? ' is-danger' : ''}`, type: 'button',
        onclick: () => { s.close(); it.onClick(); } },
      it.icon && ico(it.icon), h('span', null, it.label)))),
  });
  return s;
}

// Скачать файл.
export function downloadFile(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Выбрать файл. Возвращает Promise<File|null>.
export function pickFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, style: { display: 'none' } });
    input.addEventListener('change', () => { resolve(input.files[0] || null); input.remove(); });
    input.addEventListener('cancel', () => { resolve(null); input.remove(); });
    document.body.append(input);
    input.click();
  });
}
