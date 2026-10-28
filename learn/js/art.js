// Картинки-схемы из learn/content/<skill>-art.js. SVG проходит простую очистку
// (без <script>, обработчиков on* и внешних ссылок), цвета берутся из темы.

import { h } from '../../js/ui.js';
import * as content from './content.js';

export function cleanSvg(str) {
  try {
    // HTML-парсер внутри <template>: скрипты не выполняются, SVG получает нужное пространство имён
    const tpl = document.createElement('template');
    tpl.innerHTML = String(str);
    const svg = tpl.content.querySelector('svg');
    if (!svg) return null;
    svg.querySelectorAll('script, foreignObject, iframe').forEach((n) => n.remove());
    for (const el of [svg, ...svg.querySelectorAll('*')]) {
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on')) el.removeAttribute(a.name);
        else if ((n === 'href' || n === 'xlink:href') && !a.value.startsWith('#')) el.removeAttribute(a.name);
      }
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    if (!svg.getAttribute('aria-label')) svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    return document.adoptNode(svg);
  } catch {
    return null;
  }
}

export async function artEl(id, cls = 'ln-art') {
  if (!id) return null;
  const all = await content.allArt();
  const svg = all[id] ? cleanSvg(all[id]) : null;
  if (!svg) return null;
  return h('figure', { class: cls }, svg);
}
