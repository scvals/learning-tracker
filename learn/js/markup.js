// Безопасная разметка текстов уроков. Поддерживается только:
//   **жирный**, [[term-id]] / [[term-id|текст]] — термин глоссария, {{en:word}} — слово с озвучкой.
// Всё остальное выводится как обычный текст (никакого innerHTML из материалов).

import { h, sheet } from '../../js/ui.js';
import * as content from './content.js';
import { speakBtn } from './speech.js';
import { artEl } from './art.js';

const RE = /\*\*(.+?)\*\*|\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]|\{\{en:([^}]+?)\}\}/g;

function inline(text, out) {
  const s = String(text ?? '');
  let last = 0;
  RE.lastIndex = 0;
  let m;
  const parts = [];
  while ((m = RE.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1] !== undefined) {
      const b = h('strong');
      inline(m[1], b);
      parts.push(b);
    } else if (m[2] !== undefined) {
      parts.push(termLink(m[2].trim(), m[3] !== undefined ? m[3] : null));
    } else if (m[4] !== undefined) {
      parts.push(enWord(m[4].trim()));
    }
    last = RE.lastIndex;
  }
  if (last < s.length) parts.push(s.slice(last));
  for (const p of parts) {
    if (typeof p === 'string') appendLines(out, p);
    else out.append(p);
  }
  return out;
}

function appendLines(out, str) {
  const lines = str.split('\n');
  lines.forEach((ln, i) => {
    if (i > 0) out.append(h('br'));
    if (ln) out.append(document.createTextNode(ln));
  });
}

function termLink(id, label) {
  const btn = h('button', { class: 'ln-term', type: 'button', dataset: { term: id },
    onclick: (e) => { e.preventDefault(); e.stopPropagation(); openTerm(id); } }, label || '…');
  if (!label) {
    content.term(id).then((t) => { btn.textContent = t ? t.term : id.replace(/-/g, ' '); });
  }
  return btn;
}

function enWord(word) {
  const sp = speakBtn(word);
  return h('span', { class: 'ln-en', lang: 'en' }, h('span', { class: 'ln-en__w' }, word), sp);
}

// Строка → набор узлов внутри <span> (для заголовков, пунктов списков).
export function md(text, tag = 'span', attrs = null) {
  return inline(text, h(tag, attrs));
}

// Многоабзацный текст → <div> с <p>.
export function mdBlock(text, cls = 'ln-text') {
  const div = h('div', { class: cls });
  String(text ?? '').split(/\n{2,}/).filter((p) => p.trim()).forEach((p) => div.append(inline(p.trim(), h('p'))));
  return div;
}

// Простой текст без разметки (для подписей, title, поиска).
export function plain(text) {
  return String(text ?? '').replace(RE, (_, b, id, lab, en) => b ?? lab ?? (id ? id.replace(/-/g, ' ') : en));
}

// ---------- карточка термина ----------

let openSheet = null;

export async function openTerm(id) {
  const t = await content.term(id);
  openSheet?.close();
  const body = h('div', { class: 'stack ln-term-sheet' });
  if (!t) {
    body.append(h('p', { class: 'muted' }, 'Этот термин скоро появится в глоссарии.'));
  } else {
    const pic = t.img ? await artEl(t.img, 'ln-term-sheet__art') : null;
    if (pic) body.append(pic);
    if (t.short) body.append(mdBlock(t.short, 'ln-text ln-term-sheet__short'));
    if (t.more) body.append(mdBlock(t.more, 'ln-text small'));
  }
  const s = sheet({
    title: t ? t.term : 'Термин',
    content: body,
    onClose: () => { if (openSheet === s) openSheet = null; },
    actions: t ? [h('a', { class: 'btn btn--ghost', href: `#/glossary/${encodeURIComponent(id)}`, onclick: () => s.close() }, 'Весь глоссарий')] : null,
  });
  openSheet = s;
  return s;
}

export function closeTermSheet() { openSheet?.close(); }
