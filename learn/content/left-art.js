// Иллюстрации-схемы для навыка «Письмо левой рукой». Цвета — только через currentColor и CSS-переменные.
import { wordShape, element, glyph } from './left-worksheets.js';

const svg = (body, h = 160) =>
  `<svg viewBox="0 0 240 ${h}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SK = 'style="stroke:var(--skill)"';
const MU = 'style="stroke:var(--muted)"';
const t = (x, y, s, { size = 10, anchor = 'middle', color = 'currentColor' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" stroke="none" style="fill:${color}">${s}</text>`;
const tm = (x, y, s, o = {}) => t(x, y, s, { color: 'var(--muted)', ...o });
const tk = (x, y, s, o = {}) => t(x, y, s, { color: 'var(--skill)', ...o });
const r2 = (n) => Math.round(n * 10) / 10;

// «капсула» с контуром (палец, ручка)
const capsule = (x1, y1, x2, y2, w) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w - 4}" style="stroke:var(--surface)"/>`;
const ok = (x, y) => `<circle cx="${x}" cy="${y}" r="9" ${SK}/><path d="M${x - 4},${y} l3,3 l6,-6" ${SK}/>`;
const no = (x, y) => `<circle cx="${x}" cy="${y}" r="9" ${MU}/><path d="M${x - 3.5},${y - 3.5} l7,7 M${x + 3.5},${y - 3.5} l-7,7" ${MU}/>`;
const arrowHead = (x, y, ang, s = 6, st = '') => {
  const a = (ang * Math.PI) / 180, b1 = a + 2.6, b2 = a - 2.6;
  return `<path d="M${r2(x + s * Math.cos(b1))},${r2(y + s * Math.sin(b1))} L${x},${y} L${r2(x + s * Math.cos(b2))},${r2(y + s * Math.sin(b2))}" ${st}/>`;
};

// ручка: от верхнего конца (x1,y1) к острию (x2,y2)
function pen(x1, y1, x2, y2, w = 9) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const bx = x2 - ux * 12, by = y2 - uy * 12, px = -uy * (w / 2 - 1), py = ux * (w / 2 - 1);
  return capsule(x1, y1, r2(bx), r2(by), w)
    + `<path d="M${r2(bx + px)},${r2(by + py)} L${x2},${y2} L${r2(bx - px)},${r2(by - py)} Z" style="fill:var(--surface)"/>`
    + `<circle cx="${x2}" cy="${y2}" r="1.5" fill="currentColor" stroke="none"/>`;
}

// простая кисть сверху: ладонь + пальцы
function hand(cx, cy, s = 1, { fist = false, spread = 1 } = {}) {
  const P = (x, y) => `${r2(cx + x * s)},${r2(cy + y * s)}`;
  let out = `<rect x="${r2(cx - 14 * s)}" y="${r2(cy - 10 * s)}" width="${r2(28 * s)}" height="${r2(26 * s)}" rx="${r2(9 * s)}" style="fill:var(--surface)"/>`;
  if (fist) {
    out += `<path d="M${P(-12, -9)} Q${P(0, -16)} ${P(12, -9)}"/><path d="M${P(-6, -12)} L${P(-6, -7)} M${P(0, -13)} L${P(0, -8)} M${P(6, -12)} L${P(6, -7)}"/>`;
    out += capsule(+P(-14, 4).split(',')[0], +P(-14, 4).split(',')[1], +P(-4, -2).split(',')[0], +P(-4, -2).split(',')[1], 8 * s);
    return out;
  }
  const f = [[-10, -10, -14 * spread, -32], [-3, -10, -4 * spread, -38], [4, -10, 5 * spread, -36], [10, -9, 14 * spread, -28]];
  for (const [x1, y1, x2, y2] of f) {
    const [a, b] = P(x1, y1).split(',').map(Number), [c, d] = P(x2, y2).split(',').map(Number);
    out += capsule(a, b, c, d, 9 * s);
  }
  const [a, b] = P(-13, 4).split(',').map(Number), [c, d] = P(-28 * spread, -6).split(',').map(Number);
  out += capsule(a, b, c, d, 9 * s);
  out += `<rect x="${r2(cx - 12 * s)}" y="${r2(cy - 8 * s)}" width="${r2(24 * s)}" height="${r2(22 * s)}" rx="${r2(8 * s)}" stroke="none" style="fill:var(--surface)"/>`;
  return out;
}

// строки, написанные «волной» (имитация текста)
function scribble(x, y, w, { amp = 4, step = 6, color = '' } = {}) {
  let d = `M${x},${y}`;
  for (let i = 0; x + (i + 1) * step <= x + w; i++) {
    const cx = x + i * step + step / 2, ex = x + (i + 1) * step;
    d += ` Q${cx},${y - amp * (i % 2 ? 0.4 : 1.6)} ${ex},${y}`;
  }
  return `<path d="${d}" stroke-width="1.5" ${color}/>`;
}

function shaped(inner, x, base, sc, st = '', sw = 2) {
  return `<g transform="translate(${x},${base}) skewX(-25) scale(${sc})" stroke-width="${r2(sw / sc)}" ${st}>${inner}</g>`;
}

/* ------------------------------------------------------------------ */

const grip = svg(
  `<path d="M6,150 C20,120 40,104 70,100 C88,98 100,104 112,112 C122,120 124,134 116,146 C108,156 60,158 6,158" style="fill:var(--surface)" ${MU}/>`
  + `<ellipse cx="131" cy="100" rx="10" ry="6" transform="rotate(47 131 100)" style="fill:var(--surface)" ${MU}/>`
  + pen(44, 18, 156, 140, 10)
  + `<ellipse cx="110" cy="106" rx="11" ry="7" transform="rotate(47 110 106)" style="fill:var(--surface)"/>`
  + `<ellipse cx="108" cy="88" rx="16" ry="7" transform="rotate(47 108 88)" style="fill:var(--surface)"/>`
  + tk(96, 124, '1', { size: 11 }) + tk(94, 80, '2', { size: 11 }) + tk(142, 90, '3', { size: 11 })
  + `<path d="M136,118 L160,96 M158,142 L182,120" stroke-width="1" ${SK}/><path d="M158,98 L180,118" ${SK}/>`
  + arrowHead(158, 98, 222, 5, SK) + arrowHead(180, 118, 43, 5, SK)
  + tk(188, 98, '2–3 см', { size: 11, anchor: 'start' })
  + tm(128, 30, 'ручка смотрит', { size: 9, anchor: 'start' }) + tm(128, 41, 'к левому плечу', { size: 9, anchor: 'start' })
  + `<path d="M124,38 Q96,30 72,40" stroke-width="1.2" ${MU}/>` + arrowHead(72, 40, 160, 5, MU),
);

function sheetRect(cx, cy, ang, st) {
  let lines = '';
  for (let i = 0; i < 6; i++) lines += `<line x1="-22" y1="${-24 + i * 9}" x2="22" y2="${-24 + i * 9}" stroke-width="1.2" ${MU}/>`;
  return `<g transform="translate(${cx},${cy}) rotate(${ang})"><rect x="-30" y="-38" width="60" height="76" rx="2" style="fill:var(--surface)" ${st}/>${lines}<path d="M-30,-38 L30,-38" stroke-width="3" ${st}/></g>`;
}
const body = (cx) => `<path d="M${cx - 38},160 Q${cx - 34},134 ${cx},132 Q${cx + 34},134 ${cx + 38},160" ${MU}/><circle cx="${cx}" cy="148" r="11" ${MU}/>`;
const paperAngle = svg(
  `<line x1="120" y1="8" x2="120" y2="152" stroke-width="1" stroke-dasharray="3 4" ${MU}/>`
  + body(60) + sheetRect(48, 66, 30, SK)
  + tk(8, 14, 'левша', { size: 11, anchor: 'start' }) + tk(98, 130, '30–40°', { size: 9 })
  + body(180) + sheetRect(192, 66, -30, MU)
  + tm(232, 14, 'правша', { size: 11, anchor: 'end' }),
);

const handBelow = svg(
  `<line x1="8" y1="62" x2="112" y2="62" ${MU}/>` + scribble(12, 60, 60, { color: '' })
  + `<ellipse cx="50" cy="112" rx="30" ry="20" style="fill:var(--surface)"/>` + pen(56, 104, 76, 61, 7)
  + capsule(46, 100, 64, 88, 9)
  + ok(100, 120) + tk(60, 150, 'кисть ниже строки', { size: 10 })
  + `<line x1="120" y1="8" x2="120" y2="152" stroke-width="1" stroke-dasharray="3 4" ${MU}/>`
  + `<g ${MU}><line x1="128" y1="92" x2="232" y2="92"/>` + scribble(132, 90, 60) + `</g>`
  + `<path d="M140,158 Q140,70 168,40" stroke-width="12"/><path d="M140,158 Q140,70 168,40" stroke-width="8" style="stroke:var(--surface)"/>`
  + `<ellipse cx="180" cy="40" rx="24" ry="15" style="fill:var(--surface)" ${MU}/>` + `<g ${MU}>${pen(186, 52, 196, 90, 7)}</g>`
  + no(220, 30) + tm(184, 150, 'крючком — нет', { size: 10 }),
);

const light = svg(
  `<rect x="20" y="14" width="200" height="132" rx="6" ${MU}/>`
  + `<g transform="translate(96,80) rotate(30)"><rect x="-30" y="-40" width="60" height="80" rx="2" style="fill:var(--surface)"/>`
  + `<line x1="-22" y1="-26" x2="18" y2="-26" stroke-width="1.2" ${MU}/><line x1="-22" y1="-16" x2="10" y2="-16" stroke-width="1.2" ${MU}/></g>`
  + `<ellipse cx="62" cy="116" rx="20" ry="13" stroke="none" style="fill:var(--muted);opacity:.25"/>`
  + `<ellipse cx="70" cy="110" rx="18" ry="12" style="fill:var(--surface)"/>` + pen(64, 120, 92, 82, 6)
  + `<circle cx="198" cy="36" r="10" ${SK}/><path d="M198,46 L198,60 M190,62 L206,62" ${SK}/>`
  + `<path d="M182,44 L140,62 M186,52 L146,78 M180,36 L136,46" stroke-width="1.5" stroke-dasharray="4 4" ${SK}/>`
  + tk(198, 80, 'лампа', { size: 9 }) + tk(198, 91, 'справа', { size: 9 })
  + tm(50, 140, 'тень уходит влево', { size: 9 }),
);

const posture = svg(
  `<line x1="10" y1="150" x2="230" y2="150" ${MU}/>`
  + `<path d="M120,96 L222,96 M210,96 L210,150" ${MU}/>`                       // стол
  + `<path d="M40,104 L40,150 M40,104 L82,104 L82,150 M40,104 L40,60" ${MU}/>` // стул
  + `<circle cx="62" cy="32" r="12"/>`
  + `<path d="M58,46 L54,102 L96,104 L98,148 L112,148"/>`                    // спина, бедро, голень, стопа
  + `<path d="M58,56 L84,86 L132,92"/>`                                        // плечо–локоть–кисть
  + `<path d="M128,94 L150,86" stroke-width="2.5" ${SK}/>`
  + `<path d="M74,36 L134,90" stroke-width="1.2" stroke-dasharray="3 3" ${SK}/>`
  + tk(122, 52, '30–35 см', { size: 10 })
  + tm(26, 30, 'спина', { size: 9 }) + tm(26, 41, 'прямо', { size: 9 })
  + tm(136, 140, 'стопы на полу', { size: 9 })
  + tm(178, 116, 'локоть на столе', { size: 9 }),
);

const circArrow = (cx, cy, r, st = SK) =>
  `<path d="M${cx + r},${cy} A${r},${r} 0 1,1 ${cx},${cy - r}" ${st}/>` + arrowHead(cx, cy - r, 0, 5, st);
const warmupFingers = svg(
  [0, 1, 2, 3].map((i) => `<rect x="${4 + i * 59}" y="6" width="54" height="120" rx="8" stroke-width="1" ${MU}/>`).join('')
  + hand(31, 50, 0.8) + hand(31, 100, 0.8, { fist: true }) + `<path d="M31,64 L31,80" ${SK}/>` + arrowHead(31, 80, 90, 5, SK) + arrowHead(31, 64, -90, 5, SK)
  + hand(94, 76, 0.75) + `<circle cx="80" cy="47" r="4.5" ${SK}/>` + `<path d="M76,92 Q66,66 78,52" stroke-width="1.2" stroke-dasharray="2 3" ${SK}/>`
  + hand(149, 78, 0.65) + circArrow(149, 70, 22)
  + hand(208, 78, 0.65) + `<path d="M190,44 l-4,-4 M188,56 l-5,0 M226,44 l4,-4 M228,56 l5,0" ${SK}/>`
  + tm(31, 142, 'кулак', { size: 9 }) + tm(90, 142, 'колечки', { size: 9 }) + tm(149, 142, 'кисть', { size: 9 }) + tm(208, 142, 'встряхни', { size: 9 })
  + t(31, 156, '10 раз', { size: 8 }) + t(90, 156, '×3', { size: 8 }) + t(149, 156, '5+5', { size: 8 }) + t(208, 156, '10 сек', { size: 8 }),
);

const warmupAir = svg(
  `<path d="M120,80 C150,30 210,30 210,80 C210,130 150,130 120,80 C90,30 30,30 30,80 C30,130 90,130 120,80" stroke-width="2.5" stroke-dasharray="6 5" ${SK}/>`
  + arrowHead(166, 42, 0, 7, SK) + arrowHead(74, 118, 180, 7, SK)
  + hand(210, 80, 0.7) + `<g transform="rotate(-20 210 80)">${pen(212, 40, 212, 70, 6)}</g>`
  + tm(120, 152, 'большая восьмёрка всей рукой — от плеча', { size: 10 }),
);

const ELS = ['stick', 'stick-hook', 'hook-top', 'oval', 'half-oval', 'loop-down', 'loop-up'];
const elementsArt = (() => {
  const base = 92, sc = 3.2;
  let out = `<line x1="6" y1="${base - 36}" x2="234" y2="${base - 36}" ${MU}/><line x1="6" y1="${base}" x2="234" y2="${base}" ${MU}/>`
    + `<line x1="6" y1="${base - 54}" x2="234" y2="${base - 54}" stroke-width="1" stroke-dasharray="3 3" ${MU}/><line x1="6" y1="${base + 30}" x2="234" y2="${base + 30}" stroke-width="1" stroke-dasharray="3 3" ${MU}/>`;
  let x = 22;
  ELS.forEach((id, i) => {
    const e = element(id);
    out += shaped(`<path d="${e.d}"/>`, x, base, sc, i % 2 ? SK : '', 2.4);
    out += t(r2(x + (e.w * sc) / 2 - 6), 150, String(i + 1), { size: 11 });
    x += e.w * sc + 13;
  });
  return svg(out);
})();

const joinsArt = (() => {
  const w = wordShape('лиса');
  const sc = 4.2, base = 108, x = (240 - w.width * sc) / 2 - 16;
  const inner = w.svg.replace(/class="join"/g, 'style="stroke:var(--skill)" stroke-width="1"');
  return svg(
    `<line x1="6" y1="${base - 42}" x2="234" y2="${base - 42}" ${MU}/><line x1="6" y1="${base}" x2="234" y2="${base}" ${MU}/>`
    + shaped(inner, r2(x), base, sc, '', 2.6)
    + tk(120, 146, 'цветом — соединения: веди без отрыва', { size: 10 }),
  );
})();

const hatchingArt = (() => {
  let out = '';
  const pat = [
    (x, y) => [0, 1, 2, 3, 4, 5, 6].map((i) => `M${x + 8 + i * 9},${y + 6} L${x + 8 + i * 9},${y + 58}`).join(' '),
    (x, y) => [0, 1, 2, 3, 4, 5].map((i) => `M${x + 6},${y + 8 + i * 9} L${x + 66},${y + 8 + i * 9}`).join(' '),
    (x, y) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const k = 6 + i * 11; const a = Math.min(k, 60), b = Math.max(0, k - 60); return `M${x + 4 + b * 1.1},${y + 2 + a} L${x + 4 + a * 1.1},${y + 2 + b}`; }).join(' '),
    (x, y) => [0, 1, 2, 3, 4, 5].map((i) => `M${x + 6},${y + 8 + i * 9} L${x + 66},${y + 8 + i * 9} M${x + 10 + i * 10},${y + 4} L${x + 10 + i * 10},${y + 60}`).join(' '),
    (x, y) => [0, 1, 2, 3, 4].map((i) => `M${x + 6},${y + 10 + i * 11} q7.5,-6 15,0 t15,0 t15,0 t15,0`).join(' '),
    (x, y) => [0, 1, 2, 3, 4].map((i) => `M${x + 6},${y + 12 + i * 10} l7.5,-6 l7.5,6 l7.5,-6 l7.5,6 l7.5,-6 l7.5,6 l7.5,-6 l7.5,6`).join(' '),
  ];
  pat.forEach((fn, i) => {
    const x = 6 + (i % 3) * 78, y = 8 + Math.floor(i / 3) * 74;
    out += `<defs><clipPath id="lh${i}"><rect x="${x}" y="${y}" width="72" height="64" rx="4"/></clipPath></defs>`;
    out += `<g clip-path="url(#lh${i})"><path d="${fn(x, y)}" stroke-width="1.6" ${i % 2 ? SK : ''}/></g><rect x="${x}" y="${y}" width="72" height="64" rx="4" ${MU}/>`;
  });
  return svg(out);
})();

function spiral(cx, cy, rMax, turns, dir = 1) {
  const pts = [];
  for (let i = 0; i <= turns * 36; i++) {
    const a = (i / 36) * 2 * Math.PI, r = (rMax * i) / (turns * 36);
    pts.push(`${r2(cx + r * Math.cos(a))},${r2(cy + dir * r * Math.sin(a))}`);
  }
  return 'M' + pts.join(' L');
}
const spiralsArt = svg(
  `<circle cx="44" cy="58" r="32"/><circle cx="44" cy="26" r="3" fill="currentColor" stroke="none"/>`
  + `<path d="M28,30 A30,30 0 0,0 14,52" ${SK}/>` + arrowHead(14, 52, 100, 6, SK)
  + `<path d="${spiral(126, 58, 34, 3, -1)}" ${SK}/>`
  + `<circle cx="200" cy="58" r="32"/><circle cx="200" cy="58" r="20"/><circle cx="200" cy="58" r="8"/>`
  + tm(44, 106, 'круг', { size: 9 }) + tm(126, 106, 'спираль', { size: 9 }) + tm(200, 106, 'кольца', { size: 9 })
  + (() => { let o = ''; for (let i = 0; i < 9; i++) o += shaped(`<path d="${element('oval').d}"/>`, 22 + i * 22, 148, 2.2, i % 2 ? SK : '', 1.8); return o; })(),
);

const slantArt = (() => {
  const top = 50, base = 90;
  let out = `<line x1="6" y1="${top - 22}" x2="234" y2="${top - 22}" stroke-width="1" stroke-dasharray="3 3" ${MU}/>`
    + `<line x1="6" y1="${top}" x2="234" y2="${top}"/><line x1="6" y1="${base}" x2="234" y2="${base}"/>`
    + `<line x1="6" y1="${base + 22}" x2="234" y2="${base + 22}" stroke-width="1" stroke-dasharray="3 3" ${MU}/>`;
  const dx = 84 / Math.tan((65 * Math.PI) / 180);
  for (let x = 0; x < 240; x += 34) out += `<line x1="${r2(x)}" y1="${base + 22}" x2="${r2(x + dx)}" y2="${top - 22}" stroke-width="1" ${MU}/>`;
  out += shaped(`<path d="${glyph('и').d}"/>`, 112, base, 4, SK, 3);
  const cx = r2(170 + 22 / Math.tan((65 * Math.PI) / 180));
  out += `<path d="M${cx + 26},${base} A26,26 0 0,0 ${r2(cx + 26 * Math.cos(-65 * Math.PI / 180))},${r2(base + 26 * Math.sin(-65 * Math.PI / 180))}" stroke-width="2.5" ${SK}/>`;
  out += tk(r2(cx + 40), base - 8, '65°', { size: 11 });
  out += `<path d="M24,${top + 2} L24,${base - 2}" stroke-width="1.2"/>` + arrowHead(24, top + 2, -90, 4) + arrowHead(24, base - 2, 90, 4);
  out += t(30, 74, 'рабочая строка', { size: 9, anchor: 'start' });
  out += tm(8, top - 26, 'вспомогательная линия', { size: 9, anchor: 'start' });
  out += tm(232, 150, 'наклонные — для наклона букв', { size: 9, anchor: 'end' });
  return svg(out);
})();

function dotsAndDone(pts, order, label) {
  let out = `<line x1="120" y1="8" x2="120" y2="140" stroke-width="1" stroke-dasharray="3 4" ${MU}/>`;
  pts.forEach(([x, y], i) => {
    out += `<circle cx="${x}" cy="${y}" r="3.5" fill="currentColor" stroke="none"/>`;
    out += tk(x + (x < 60 ? -10 : 10), y + (y < 70 ? -6 : 14), String(order.indexOf(i) + 1), { size: 11 });
  });
  const d = 'M' + order.map((i) => `${pts[i][0] + 120},${pts[i][1]}`).join(' L');
  out += `<path d="${d}" stroke-width="2.5"/>`;
  for (let k = 0; k < order.length - 1; k++) {
    const [a, b] = [pts[order[k]], pts[order[k + 1]]];
    const mx = (a[0] + b[0]) / 2 + 120, my = (a[1] + b[1]) / 2;
    out += arrowHead(r2(mx), r2(my), (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, 7, SK);
  }
  out += tm(60, 154, 'точки', { size: 10 }) + tm(180, 154, label, { size: 10 });
  return svg(out);
}
const square = dotsAndDone([[24, 28], [96, 28], [96, 100], [24, 100]], [0, 1, 2, 3, 0], 'веди по стрелкам');
const triangle = dotsAndDone([[60, 22], [100, 108], [20, 108]], [0, 1, 2, 0], 'сверху, по стрелкам');
const starPts = [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [r2(60 + 46 * Math.cos(a)), r2(70 + 46 * Math.sin(a))]; });
const star = dotsAndDone(starPts, [0, 2, 4, 1, 3, 0], 'через одну точку');

const grafArt = (() => {
  let out = '';
  for (let x = 10; x <= 230; x += 12) out += `<line x1="${x}" y1="30" x2="${x}" y2="150" stroke-width="0.6" ${MU}/>`;
  for (let y = 30; y <= 150; y += 12) out += `<line x1="10" y1="${y}" x2="226" y2="${y}" stroke-width="0.6" ${MU}/>`;
  let x = 70, y = 126, d = `M${x},${y}`;
  const steps = [[0, -1], [1, 0], [0, -1], [1, 0], [0, -1], [1, 0], [0, -1], [1, 0], [0, -1], [1, 0], [0, 5], [-5, 0]];
  for (const [a, b] of steps) { x += a * 12; y += b * 12; d += ` L${x},${y}`; }
  out += `<path d="${d}" stroke-width="2.5" ${SK}/><circle cx="70" cy="126" r="4" fill="currentColor" stroke="none"/>`;
  out += t(10, 18, '1↑ 1→ 1↑ 1→ 1↑ 1→ 1↑ 1→ 1↑ 1→ 5↓ 5←', { size: 11, anchor: 'start' });
  out += tm(56, 142, 'старт', { size: 9 });
  return svg(out);
})();

const timer = svg(
  `<rect x="20" y="20" width="62" height="120" rx="10" style="fill:var(--surface)"/><line x1="44" y1="30" x2="58" y2="30"/>`
  + t(51, 80, '00:47', { size: 16 }) + `<circle cx="51" cy="110" r="10" ${SK}/><path d="M48,105 L55,110 L48,115 Z" stroke="none" style="fill:var(--skill)"/>`
  + `<rect x="104" y="30" width="122" height="96" rx="3" style="fill:var(--surface)" ${MU}/>`
  + `<line x1="112" y1="62" x2="218" y2="62" stroke-width="1" ${MU}/><line x1="112" y1="90" x2="218" y2="90" stroke-width="1" ${MU}/>`
  + scribble(114, 60, 100) + scribble(114, 88, 60)
  + `<circle cx="114" cy="60" r="3" ${SK}/><circle cx="176" cy="88" r="3" ${SK}/>`
  + tk(114, 48, 'старт', { size: 9 }) + tk(186, 108, 'стоп', { size: 9 })
  + tm(120, 154, 'один и тот же текст, обычный аккуратный темп', { size: 9 }),
);

const legibility = (() => {
  let out = '';
  for (let k = 1; k <= 5; k++) {
    const y = 10 + k * 28, noise = (5 - k) * 1.5;
    out += t(14, y + 2, String(k), { size: 13 });
    out += `<line x1="30" y1="${y + 4}" x2="232" y2="${y + 4}" stroke-width="0.8" ${MU}/>`;
    let d = `M34,${y}`;
    for (let i = 0; i < 16; i++) {
      const j = Math.sin(i * 2.7 + k) * noise, h = 10 + Math.cos(i * 1.9 + k) * noise * 1.4;
      d += ` q${r2(4 + j * 0.3)},${r2(-h)} ${r2(6 + j * 0.2)},${r2(j * 0.6)}`;
      if (i % 4 === 3) d += ` m${r2(10 - noise)},${r2(-j * 0.6)}`;
    }
    out += `<path d="${d}" stroke-width="1.6" ${k >= 4 ? SK : ''}/>`;
  }
  return svg(out);
})();

const copyDrawing = svg(
  `<line x1="80" y1="12" x2="80" y2="140" stroke-width="1" stroke-dasharray="3 4" ${MU}/><line x1="160" y1="12" x2="160" y2="140" stroke-width="1" stroke-dasharray="3 4" ${MU}/>`
  + `<rect x="18" y="50" width="44" height="56" rx="4"/>`
  + `<path d="M98,50 L102,106 Q120,114 138,106 L142,50" /><ellipse cx="120" cy="50" rx="22" ry="7" ${SK}/><path d="M142,62 C158,62 158,92 140,94" ${SK}/>`
  + `<path d="M178,50 L182,106 Q200,114 218,106 L222,50"/><ellipse cx="200" cy="50" rx="22" ry="7"/><path d="M222,62 C238,62 238,92 220,94"/>`
  + `<path d="M192,38 q-6,-8 0,-14 t0,-14 M206,38 q-6,-8 0,-14 t0,-14" ${SK}/><path d="M186,84 L214,84" stroke-width="1.5" ${MU}/>`
  + tm(40, 132, '1. форма', { size: 10 }) + tm(120, 132, '2. детали', { size: 10 }) + tm(200, 132, '3. мелочи', { size: 10 }),
);

export default {
  'left-grip': grip,
  'left-paper-angle': paperAngle,
  'left-hand-below': handBelow,
  'left-light': light,
  'left-posture': posture,
  'left-warmup-fingers': warmupFingers,
  'left-warmup-air': warmupAir,
  'left-elements': elementsArt,
  'left-joins': joinsArt,
  'left-hatching': hatchingArt,
  'left-spirals': spiralsArt,
  'left-slant-ruling': slantArt,
  'left-square': square,
  'left-triangle': triangle,
  'left-star': star,
  'left-graf': grafArt,
  'left-timer': timer,
  'left-legibility': legibility,
  'left-copy-drawing': copyDrawing,
};
