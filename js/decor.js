// Украшения: decor(name, skin) → строка SVG.
// Имена: header, divider, empty, celebrate, onboarding, corner.
// Цвета — только через CSS-переменные темы (style="fill:var(--…)"), поэтому
// рисунки сами подстраиваются под светлую и тёмную тему.

let uidN = 0;
const uid = (p) => `${p}${++uidN}`;

// ---------- палитра (CSS-переменные) ----------
const A = 'var(--accent)';
const AS = 'var(--accent-soft)';
const S = (n) => `var(--skill-${n})`;
const SS = (n) => `var(--skill-${n}-soft)`;
const SURF = 'var(--surface)';
const BG = 'var(--bg)';
const LINE = 'var(--line)';
const MUTED = 'var(--muted)';
const WHITE = 'var(--cotton, var(--surface))';   // «белое»: хлопок, снег

const r1 = (n) => Math.round(n * 10) / 10;

function svg(vb, inner, { cls = '', w, h, par } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''}${par ? ` preserveAspectRatio="${par}"` : ''} class="decor ${cls}" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// Полоса во всю ширину из повторяющегося мотива.
function strip(unitW, unitH, motif) {
  const id = uid('dp');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" class="decor decor--header" aria-hidden="true" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs><pattern id="${id}" width="${unitW}" height="${unitH}" patternUnits="userSpaceOnUse">${motif}</pattern></defs><rect width="100%" height="${unitH}" style="fill:url(#${id})"/></svg>`;
}

const st = (c, w = 1.6, extra = '') => `style="stroke:${c};stroke-width:${w}${extra}"`;
const fl = (c, extra = '') => `style="fill:${c}${extra}"`;

// ---------- мотивы ----------
function leaf(x, y, l, a, c, w = 0.36, vein = false) {
  const d = `M0 0C${r1(l * .28)} ${r1(-l * w)} ${r1(l * .72)} ${r1(-l * w)} ${l} 0C${r1(l * .72)} ${r1(l * w)} ${r1(l * .28)} ${r1(l * w)} 0 0Z`;
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(a)})"><path d="${d}" ${fl(c)}/>${vein ? `<path d="M${r1(l * .12)} 0L${r1(l * .82)} 0" style="stroke:${SURF};stroke-width:.8;opacity:.55"/>` : ''}</g>`;
}

// Папоротник: стебель вдоль оси X группы, листочки уменьшаются к кончику.
function fern(x, y, len, a, c, n = 7, bend = 0.12) {
  let out = `<path d="M0 0Q${r1(len * .5)} ${r1(-len * bend)} ${len} 0" ${st(c, 1.4)}/>`;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6) / (n + 0.4);
    const px = len * t;
    const py = -len * bend * 4 * t * (1 - t) * 0.5;
    const l = len * 0.26 * (1 - t * 0.75);
    out += leaf(px, py, l, -58 + t * 12, c, 0.34) + leaf(px, py, l, 58 - t * 12, c, 0.34);
  }
  out += leaf(len, 0, len * .1, 0, c);
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(a)})">${out}</g>`;
}

// Клубок пряжи.
function yarn(cx, cy, r, c, { tail = null } = {}) {
  const k = r;
  const p = (dx, dy) => `${r1(cx + dx * k)} ${r1(cy + dy * k)}`;
  const lines = [
    `M${p(-.95, -.25)}Q${p(-.1, .55)} ${p(.75, -.65)}`,
    `M${p(-.8, .6)}Q${p(.05, .1)} ${p(.55, -.85)}`,
    `M${p(-.5, .88)}Q${p(.3, .35)} ${p(.97, .1)}`,
    `M${p(-.55, -.82)}Q${p(.2, -.1)} ${p(.2, .98)}`,
    `M${p(-.98, .15)}Q${p(-.2, -.25)} ${p(.1, -.99)}`,
  ];
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${fl(c)}/>`
    + `<g style="stroke:rgb(0 0 0 / .2);stroke-width:${r1(Math.max(1, r * .07))}">${lines.slice(0, 3).map((d) => `<path d="${d}"/>`).join('')}</g>`
    + `<g style="stroke:rgb(255 255 255 / .32);stroke-width:${r1(Math.max(1, r * .06))}">${lines.slice(3).map((d) => `<path d="${d}"/>`).join('')}</g>`
    + (tail ? `<path d="${tail}" ${st(c, Math.max(1.2, r * .07))}/>` : '');
}

// Вязаная петля (лицевая): «V» из двух наклонных овалов.
function knit(x, y, h, c, op = 1) {
  const rx = r1(h * .2), ry = r1(h * .48), dx = r1(h * .24);
  return `<g ${fl(c, `;opacity:${op}`)}><ellipse cx="${r1(x - dx)}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-30 ${r1(x - dx)} ${y})"/><ellipse cx="${r1(x + dx)}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(30 ${r1(x + dx)} ${y})"/></g>`;
}

// Спица.
function needle(x1, y1, x2, y2, c, w = 2.2) {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" ${st(c, w)}/><circle cx="${x1}" cy="${y1}" r="${r1(w * 1.3)}" ${fl(c)}/>`;
}

// Цветок из 5 лепестков.
function flower(cx, cy, r, c, center = 'var(--skill-5)', petals = 5) {
  let out = '';
  for (let i = 0; i < petals; i++) {
    const a = (360 / petals) * i;
    out += `<ellipse cx="0" cy="${r1(-r * .55)}" rx="${r1(r * .42)}" ry="${r1(r * .55)}" transform="rotate(${a})" ${fl(c, ';opacity:.92')}/>`;
  }
  return `<g transform="translate(${r1(cx)} ${r1(cy)})">${out}<circle r="${r1(r * .26)}" ${fl(center)}/></g>`;
}

// Роза: бутон-спираль.
function rose(cx, cy, r, c) {
  const k = (v) => r1(v * r);
  const dark = `style="stroke:rgb(0 0 0 / .2);stroke-width:${r1(Math.max(1, r * .11))}"`;
  return `<g transform="translate(${r1(cx)} ${r1(cy)})"><circle r="${r}" ${fl(c)}/>`
    + `<path d="M${k(-.62)} ${k(-.05)}A${k(.62)} ${k(.6)} 0 0 0 ${k(.62)} ${k(-.05)}" ${dark}/>`
    + `<path d="M${k(-.34)} ${k(-.12)}C${k(-.34)} ${k(-.5)} ${k(.3)} ${k(-.55)} ${k(.34)} ${k(-.15)}C${k(.3)} ${k(.12)} ${k(-.1)} ${k(.15)} ${k(-.1)} ${k(-.12)}" ${dark}/>`
    + `<path d="M${k(-.85)} ${k(.32)}Q0 ${k(1.05)} ${k(.85)} ${k(.32)}" style="stroke:rgb(255 255 255 / .28);stroke-width:${r1(Math.max(1, r * .1))}"/></g>`;
}

// Веточка лаванды.
function lavender(x, y, len, a, c, stem = 'var(--skill-2)') {
  let out = `<path d="M0 0Q${r1(len * .04)} ${r1(-len * .5)} 0 ${-len}" ${st(stem, 1.3)}/>`;
  for (let i = 0; i < 6; i++) {
    const t = 0.5 + i * 0.09;
    const s = 1 - i * 0.1;
    out += `<ellipse cx="${r1(-len * .045)}" cy="${r1(-len * t)}" rx="${r1(len * .035 * s)}" ry="${r1(len * .06 * s)}" transform="rotate(-25 ${r1(-len * .045)} ${r1(-len * t)})" ${fl(c)}/>`
      + `<ellipse cx="${r1(len * .045)}" cy="${r1(-len * (t + .03))}" rx="${r1(len * .035 * s)}" ry="${r1(len * .06 * s)}" transform="rotate(25 ${r1(len * .045)} ${r1(-len * (t + .03))})" ${fl(c, ';opacity:.8')}/>`;
  }
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${a})">${out}</g>`;
}

// Коробочка хлопка.
function cotton(cx, cy, r, sepal = 'var(--skill-5)') {
  const puff = (dx, dy, rr) => `<circle cx="${r1(cx + dx * r)}" cy="${r1(cy + dy * r)}" r="${r1(rr * r)}" style="fill:${WHITE};stroke:${LINE};stroke-width:1.2"/>`;
  return `<path d="M${r1(cx - r * .9)} ${r1(cy + r * .55)}L${r1(cx - r * .2)} ${r1(cy + r * .25)}L${r1(cx)} ${r1(cy + r * 1.05)}L${r1(cx + r * .2)} ${r1(cy + r * .25)}L${r1(cx + r * .9)} ${r1(cy + r * .55)}" ${st(sepal, Math.max(1.2, r * .14))}/>`
    + puff(-.45, .1, .5) + puff(.45, .1, .5) + puff(0, -.3, .55) + puff(0, .2, .45);
}

// Норвежская звезда (селбуроза) — 8 ромбов-лепестков.
function star8(cx, cy, r, c, hole = SURF) {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += `<path d="M${r1(r * .16)} 0L${r1(r * .58)} ${r1(-r * .2)}L${r} 0L${r1(r * .58)} ${r1(r * .2)}Z" transform="rotate(${i * 45 + 22.5})" ${fl(c)}/>`;
  }
  return `<g transform="translate(${r1(cx)} ${r1(cy)})">${out}<rect x="${r1(-r * .1)}" y="${r1(-r * .1)}" width="${r1(r * .2)}" height="${r1(r * .2)}" transform="rotate(45)" ${fl(c)}/><circle r="${r1(r * .05)}" ${fl(hole)}/></g>`;
}

// Маленький крестик «вошка» (как в узоре свитера).
const lice = (x, y, s, c) => `<path d="M${x - s} ${y}h${2 * s}M${x} ${y - s}v${2 * s}" ${st(c, s * .9)}/>`;

// Зигзаг.
function zigzag(x, y, w, h, step, c, sw = 1.8) {
  let d = `M${x} ${y + h}`;
  for (let i = 0; i < w / step; i++) d += `l${step / 2} ${-h}l${step / 2} ${h}`;
  return `<path d="${d}" ${st(c, sw)}/>`;
}

// Сэйгайха — «волны» из дуг, прошитые пунктиром.
function waves(cx, cy, r, c, rings = 3, dash = '3 2.6', sw = 1.4) {
  let out = '';
  for (let i = 0; i < rings; i++) {
    const rr = r * (1 - i / rings);
    out += `<path d="M${r1(cx - rr)} ${cy}A${r1(rr)} ${r1(rr)} 0 0 1 ${r1(cx + rr)} ${cy}" ${st(c, sw, `;stroke-dasharray:${dash}`)}/>`;
  }
  return out;
}
// Ряд сэйгайха с перекрытием (фон закрывает нижний ряд).
function seigaiha(x0, y0, cols, rows, r, c, fill = SURF) {
  let out = '';
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i <= cols; i++) {
      const cx = x0 + i * 2 * r + (row % 2 ? r : 0);
      const cy = y0 + row * r * .5;
      out += `<path d="M${r1(cx - r)} ${r1(cy)}A${r} ${r} 0 0 1 ${r1(cx + r)} ${r1(cy)}Z" ${fl(fill)}/><g style="opacity:.55">${waves(cx, cy, r, c, 3, '2.6 2.4', 1.1)}</g>`;
    }
  }
  return out;
}

// Асаноха — звезда из стежков.
function asanoha(cx, cy, r, c) {
  let out = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const b = a + Math.PI / 3;
    const x = cx + r * Math.cos(a); const y = cy + r * Math.sin(a);
    const x2 = cx + r * Math.cos(b); const y2 = cy + r * Math.sin(b);
    out += `<path d="M${r1(cx)} ${r1(cy)}L${r1(x)} ${r1(y)}L${r1(x2)} ${r1(y2)}" ${st(c, 1.3, ';stroke-dasharray:2.4 2')}/>`;
  }
  return out;
}

// Россыпь маленьких искорок/конфетти.
function sparkles(points, c) {
  return points.map(([x, y, s]) =>
    `<path d="M${x} ${y - s}C${r1(x + s * .15)} ${r1(y - s * .15)} ${r1(x + s * .15)} ${r1(y - s * .15)} ${x + s} ${y}C${r1(x + s * .15)} ${r1(y + s * .15)} ${r1(x + s * .15)} ${r1(y + s * .15)} ${x} ${y + s}C${r1(x - s * .15)} ${r1(y + s * .15)} ${r1(x - s * .15)} ${r1(y + s * .15)} ${x - s} ${y}C${r1(x - s * .15)} ${r1(y - s * .15)} ${r1(x - s * .15)} ${r1(y - s * .15)} ${x} ${y - s}Z" ${fl(c)}/>`).join('');
}

// ==========================================================================
//  Скины
// ==========================================================================

const MOSS = {
  header: () => strip(64, 26,
    `<path d="M0 16C16 10 16 10 32 16S48 22 64 16" ${st(A, 1.3, ';opacity:.7')}/>`
    + leaf(10, 14, 9, -125, A, .36) + leaf(18, 12.4, 8, -55, S(2), .36)
    + leaf(42, 18.5, 9, 120, A, .36) + leaf(52, 18.2, 7.5, 55, S(2), .36)
    + `<circle cx="32" cy="16" r="1.6" ${fl(S(4), ';opacity:.75')}/><circle cx="29" cy="12.5" r="1.1" ${fl(S(4), ';opacity:.55')}/>`),
  divider: () => svg('0 0 220 22',
    `<path d="M10 12C40 9 70 13 92 11.5M128 11.5C150 13 180 9 210 12" ${st(LINE, 1.4)}/>`
    + leaf(110, 13, 15, -150, A, .36, true) + leaf(110, 13, 15, -30, S(2), .36, true) + leaf(110, 13, 9, -90, A, .36)
    + `<circle cx="96" cy="11.5" r="1.6" ${fl(S(2))}/><circle cx="124" cy="11.5" r="1.6" ${fl(S(2))}/>`, { cls: 'decor--divider' }),
  empty: () => svg('0 0 160 120',
    `<ellipse cx="80" cy="104" rx="62" ry="9" ${fl(AS)}/>`
    + `<path d="M58 100c-6-14-2-24 6-28h32c8 4 12 14 6 28z" ${fl(S(4), ';opacity:.85')}/>`
    + `<path d="M60 76h40" ${st('rgb(0 0 0 / .18)', 2)}/>`
    + fern(80, 74, 52, -96, A, 7) + fern(76, 76, 42, -136, S(1), 6) + fern(84, 76, 42, -44, S(2), 6)
    + leaf(124, 44, 10, 30, S(2), .38) + leaf(34, 58, 8, 160, A, .38), { cls: 'decor--empty' }),
  celebrate: () => {
    let wreath = '';
    for (let i = 0; i < 18; i++) {
      const a = -200 + i * (220 / 17);
      const rad = (a * Math.PI) / 180;
      const x = 100 + 54 * Math.cos(rad); const y = 82 + 54 * Math.sin(rad);
      wreath += leaf(x, y, 15, a + 90 + (i % 2 ? 28 : -28), i % 3 === 1 ? S(2) : A, .36, true);
    }
    const left = 'M100 136C80 136 46 120 46 82';
    return svg('0 0 200 160',
      `<circle cx="100" cy="82" r="40" ${fl(AS)}/>`
      + `<path d="${left}A54 54 0 0 1 82 31" ${st(A, 1.6)}/><path d="M100 136C120 136 154 120 154 82A54 54 0 0 0 118 31" ${st(A, 1.6)}/>`
      + wreath
      + star8(100, 82, 24, S(2), AS)
      + `<path d="M84 138l16-6 16 6-6 12-10-6-10 6z" ${fl(S(4))}/>`
      + sparkles([[30, 30, 6], [172, 36, 5], [160, 128, 4]], S(2)), { cls: 'decor--celebrate' });
  },
  onboarding: () => {
    const id = uid('mc');
    return svg('0 0 280 200',
    `<defs><clipPath id="${id}"><path d="M14 182V110C14 50 70 8 140 8s126 42 126 102v72q0 18-18 18H32q-18 0-18-18z"/></clipPath></defs>`
    + `<path d="M14 182V110C14 50 70 8 140 8s126 42 126 102v72q0 18-18 18H32q-18 0-18-18z" ${fl(SS(1), ';opacity:.45')}/>`
    + `<g clip-path="url(#${id})">`
    + `<circle cx="204" cy="58" r="26" ${fl(S(2), ';opacity:.35')}/>`
    + `<path d="M0 132C50 106 96 112 140 124S230 128 280 104V200H0z" ${fl(AS)}/>`
    + `<path d="M0 156C60 136 120 146 170 154S250 152 280 140V200H0z" ${fl(S(1), ';opacity:.35')}/>`
    + `<path d="M150 200C140 182 168 170 186 158S206 140 198 128" ${st(SS(2), 9)}/><path d="M150 200C140 182 168 170 186 158S206 140 198 128" ${st(S(2), 1.4, ';stroke-dasharray:3 6;opacity:.7')}/>`
    + fern(40, 152, 58, -100, A, 8) + fern(34, 154, 44, -130, S(1), 6) + fern(48, 154, 44, -68, S(2), 6)
    + fern(246, 128, 40, -95, A, 6) + fern(240, 130, 30, -128, S(2), 5)
    + yarn(108, 160, 15, S(4), { tail: 'M121 168c10 6 22 4 30-2' })
    + needle(92, 134, 120, 172, S(3), 2) + needle(126, 132, 98, 174, S(3), 2)
    + leaf(222, 40, 10, 20, A, .38) + leaf(70, 54, 9, 150, S(2), .38) + leaf(150, 32, 7, 70, A, .38)
    + '</g>', { cls: 'decor--onboarding' });
  },
  corner: () => svg('0 0 60 60',
    fern(60, 0, 46, 135, A, 6) + leaf(48, 26, 8, 120, S(2), .38), { cls: 'decor--corner' }),
};

const LINEN = {
  header: () => strip(48, 26,
    knit(6, 9, 9, A) + knit(18, 9, 9, A) + knit(30, 9, 9, S(3)) + knit(42, 9, 9, A)
    + knit(0, 19, 9, S(2), .55) + knit(12, 19, 9, S(2), .55) + knit(24, 19, 9, S(2), .55) + knit(36, 19, 9, S(2), .55) + knit(48, 19, 9, S(2), .55)),
  divider: () => {
    let vs = '';
    for (let x = 16; x <= 204; x += 11) {
      if (x > 90 && x < 130) continue;
      const fade = 1 - Math.abs(x - 110) / 120;
      vs += knit(x, 11, 8, A, r1(.25 + fade * .6));
    }
    return svg('0 0 220 22', vs + yarn(110, 11, 8.5, S(1)), { cls: 'decor--divider' });
  },
  empty: () => svg('0 0 160 120',
    `<ellipse cx="80" cy="106" rx="56" ry="8" ${fl(AS)}/>`
    + `<path d="M104 92c16 8 30 2 34-8s-6-18-14-12 2 18 16 14" ${st(S(1), 1.8)}/>`
    + needle(46, 30, 104, 100, S(3), 2.6) + needle(116, 28, 58, 102, S(3), 2.6)
    + yarn(78, 76, 28, S(1))
    + sparkles([[30, 52, 4], [130, 40, 3.5]], S(3)), { cls: 'decor--empty' }),
  celebrate: () => svg('0 0 200 160',
    `<ellipse cx="100" cy="146" rx="70" ry="8" ${fl(AS)}/>`
    + yarn(64, 112, 26, S(2)) + yarn(136, 116, 22, S(3))
    + yarn(100, 82, 38, S(1), { tail: 'M60 92C40 104 30 130 52 140' })
    + `<path d="M100 72c-4-8-16-6-15 3 1 6 9 11 15 16 6-5 14-10 15-16 1-9-11-11-15-3z" ${fl(SURF, ';opacity:.92')}/>`
    + sparkles([[28, 36, 6], [172, 30, 7], [158, 70, 4], [44, 76, 3.5]], S(3)), { cls: 'decor--celebrate' }),
  onboarding: () => {
    let weave = '';
    for (let y = 132; y <= 186; y += 9) weave += `<path d="M58 ${y}h164" ${st('rgb(0 0 0 / .14)', 1.4, ';stroke-dasharray:6 4')}/>`;
    return svg('0 0 280 200',
      `<ellipse cx="140" cy="190" rx="118" ry="9" ${fl(AS)}/>`
      + needle(176, 30, 136, 132, S(3), 2.6) + needle(204, 40, 150, 134, S(3), 2.6)
      + yarn(96, 108, 30, S(2)) + yarn(150, 100, 34, S(1)) + yarn(204, 112, 26, S(3))
      + `<path d="M52 124h176l-14 64H66z" ${fl(S(4), ';opacity:.85')}/>` + weave
      + `<path d="M48 124h184" ${st(S(4), 6)}/>`
      + `<path d="M228 150c18 6 30-6 22-18s-24 0-12 12" ${st(S(1), 1.8)}/>`
      + sparkles([[44, 48, 6], [236, 46, 5], [110, 34, 4]], S(3)), { cls: 'decor--onboarding' });
  },
  corner: () => svg('0 0 60 60',
    `<path d="M60 4C46 6 40 14 40 22" ${st(S(1), 1.6)}/>` + yarn(38, 30, 10, S(1))
    + needle(24, 18, 52, 46, S(3), 1.8), { cls: 'decor--corner' }),
};

const BOTANIC = {
  header: () => strip(96, 26,
    `<path d="M0 19C24 16 30 21 48 19S78 16 96 19" ${st(S(2), 1.1, ';opacity:.6')}/>`
    + flower(20, 12, 8, S(1), S(5))
    + lavender(52, 20, 18, 8, S(3))
    + leaf(72, 18, 9, -140, S(2), .4) + leaf(74, 19, 9, -40, S(2), .4)
    + `<circle cx="88" cy="14" r="1.4" ${fl(S(1), ';opacity:.6')}/><circle cx="36" cy="10" r="1.1" ${fl(S(3), ';opacity:.6')}/>`),
  divider: () => svg('0 0 220 22',
    `<path d="M14 12h76M130 12h76" ${st(LINE, 1.3)}/>`
    + leaf(100, 13, 12, 200, S(2), .4) + leaf(120, 13, 12, -20, S(2), .4)
    + flower(110, 11, 9, S(1), S(5)), { cls: 'decor--divider' }),
  empty: () => svg('0 0 160 120',
    `<ellipse cx="80" cy="108" rx="60" ry="8" ${fl(SS(1))}/>`
    + `<path d="M80 108C78 80 74 60 62 38M78 84c10-8 22-14 34-30M76 66C68 58 58 56 48 58" ${st(S(2), 1.8)}/>`
    + leaf(78, 84, 18, 30, S(2), .38, true) + leaf(72, 60, 14, 210, S(2), .38, true)
    + cotton(62, 32, 13) + cotton(114, 48, 11) + cotton(46, 56, 9), { cls: 'decor--empty' }),
  celebrate: () => svg('0 0 200 160',
    `<ellipse cx="100" cy="150" rx="56" ry="6" ${fl(SS(1))}/>`
    + `<path d="M100 146C98 120 96 100 80 70M100 146c0-30 4-50 22-80M100 146c0-34-2-60 0-96M100 146c-4-26-14-40-34-50M100 146c4-26 16-40 36-48" ${st(S(2), 1.7)}/>`
    + leaf(84, 108, 16, 200, S(2), .38, true) + leaf(116, 104, 16, -20, S(2), .38, true)
    + lavender(66, 98, 46, -28, S(3)) + lavender(136, 100, 46, 28, S(3))
    + rose(100, 46, 15, S(1)) + rose(78, 68, 11, S(1)) + rose(124, 64, 12, S(1))
    + cotton(64, 94, 8) + cotton(136, 96, 8)
    + `<path d="M88 124c8 6 16 6 24 0l-2 10c-6 3-14 3-20 0z" ${fl(S(4))}/><path d="M96 132l-8 14M104 132l8 14" ${st(S(4), 2.4)}/>`, { cls: 'decor--celebrate' }),
  onboarding: () => svg('0 0 280 200',
    `<rect x="40" y="18" width="200" height="172" rx="10" transform="rotate(-2 140 104)" ${fl(SURF)} ${st(LINE, 1.2)}/>`
    + `<circle cx="196" cy="70" r="40" ${fl(SS(1), ';opacity:.8')}/><circle cx="92" cy="128" r="36" ${fl(SS(2), ';opacity:.8')}/>`
    + `<path d="M140 176C136 140 128 110 106 74M140 176c2-36 10-62 34-92M140 176c-2-40 0-70 4-110" ${st(S(2), 1.8)}/>`
    + leaf(132, 132, 22, 210, S(2), .38, true) + leaf(148, 126, 22, -30, S(2), .38, true) + leaf(142, 100, 16, 240, S(2), .38, true)
    + rose(144, 60, 18, S(1)) + lavender(100, 104, 54, -36, S(3)) + cotton(176, 82, 14) + cotton(106, 76, 10)
    + `<path d="M120 176h40" ${st(S(5), 5)}/>`
    + `<path d="M62 40h44M62 48h28" ${st(LINE, 1.6)}/>`, { cls: 'decor--onboarding' }),
  corner: () => svg('0 0 60 60',
    `<path d="M60 0C48 10 40 18 34 30" ${st(S(2), 1.4)}/>` + leaf(46, 12, 12, 160, S(2), .4) + leaf(40, 22, 10, 60, S(2), .4)
    + rose(32, 32, 8, S(1)), { cls: 'decor--corner' }),
};

const NORDIC = {
  header: () => strip(32, 26,
    zigzag(0, 1.5, 32, 3.5, 8, S(2), 1.5)
    + star8(8, 13, 6.8, A, BG) + lice(24, 13, 2, S(2))
    + zigzag(0, 21, 32, 3.5, 8, S(2), 1.5)),
  divider: () => {
    let d = '';
    for (let x = 14; x <= 206; x += 10) if (x < 92 || x > 128) d += `<rect x="${x - 1.6}" y="9.4" width="3.2" height="3.2" transform="rotate(45 ${x} 11)" ${fl(x % 20 === 4 ? S(2) : A, ';opacity:.7')}/>`;
    return svg('0 0 220 22', d + star8(110, 11, 10, A), { cls: 'decor--divider' });
  },
  empty: () => svg('0 0 160 120',
    `<ellipse cx="80" cy="110" rx="52" ry="6" ${fl(AS)}/>`
    + `<path d="M58 104V56c0-20 10-34 26-34s26 14 26 32v50z" ${fl(A)}/>`
    + `<path d="M58 64c-12-4-20 2-20 12s8 16 20 14" ${fl(A)}/>`
    + `<rect x="54" y="92" width="60" height="16" rx="4" ${fl(S(2))}/>`
    + zigzag(56, 96, 56, 4, 8, SURF, 1.6)
    + star8(84, 60, 13, SURF, A)
    + `<path d="M64 38h40" ${st(SURF, 1.6, ';stroke-dasharray:2 4')}/>`
    + sparkles([[132, 30, 5], [26, 40, 4], [138, 74, 3.5]], S(4)), { cls: 'decor--empty' }),
  celebrate: () => {
    let ring = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      ring += lice(r1(100 + 58 * Math.cos(a)), r1(80 + 58 * Math.sin(a)), 3, i % 2 ? S(2) : A);
    }
    return svg('0 0 200 160',
      `<circle cx="100" cy="80" r="46" ${fl(AS)}/>` + ring
      + star8(100, 80, 40, A, AS) + star8(100, 80, 13, S(2), A)
      + star8(30, 30, 9, S(4)) + star8(172, 128, 8, S(4)) + star8(170, 30, 6, S(2)), { cls: 'decor--celebrate' });
  },
  onboarding: () => {
    const pine = (x, y, s, c) => `<path d="M${x} ${y - s * 3}L${x + s} ${y - s * 1.8}H${x + s * .5}L${x + s * 1.5} ${y - s * .6}H${x + s * .8}L${x + s * 1.9} ${y + s * .6}H${x - s * 1.9}L${x - s * .8} ${y - s * .6}H${x - s * 1.5}L${x - s * .5} ${y - s * 1.8}H${x - s}Z" ${fl(c)}/><path d="M${x} ${y + s * .6}v${s * .7}" ${st(c, s * .5)}/>`;
    const id = uid('nc');
    const arch = 'M14 182V110C14 50 70 8 140 8s126 42 126 102v72q0 18-18 18H32q-18 0-18-18z';
    return svg('0 0 280 200',
      `<defs><clipPath id="${id}"><path d="${arch}"/></clipPath></defs>`
      + `<path d="${arch}" ${fl(AS, ';opacity:.45')}/><g clip-path="url(#${id})">`
      + `<path d="M0 150L56 92l34 30 50-60 54 56 30-26 56 58V200H0z" ${fl(AS)}/>`
      + `<path d="M118 88l22-26 22 24-10-4-12 8-10-8z" ${fl(WHITE)}/>`
      + `<path d="M0 168c46-12 94-14 140-8s96 6 140-6V200H0z" ${fl(WHITE)} ${st(LINE, 1.2)}/>`
      + pine(44, 160, 9, S(3)) + pine(66, 166, 6, S(3)) + pine(226, 158, 10, S(3)) + pine(250, 166, 7, S(3))
      + star8(140, 34, 18, A) + star8(64, 40, 8, S(2)) + star8(216, 52, 9, S(2))
      + lice(100, 26, 3, S(4)) + lice(182, 22, 3, S(4)) + lice(250, 30, 2.5, S(4)) + lice(26, 70, 2.5, S(4))
      + zigzag(84, 182, 112, 5, 8, S(2), 1.6) + '</g>', { cls: 'decor--onboarding' });
  },
  corner: () => svg('0 0 60 60',
    star8(60, 0, 30, A) + lice(24, 10, 2.4, S(2)) + lice(50, 36, 2.4, S(2)), { cls: 'decor--corner' }),
};

const SASHIKO = {
  header: () => strip(28, 26, `<g style="opacity:.6">${waves(14, 23, 12, A, 2, '3 2.6', 1.3)}</g>` + `<path d="M0 23.5h28" ${st(A, 1.2, ';stroke-dasharray:3 2.6;opacity:.35')}/>`),
  divider: () => svg('0 0 220 22',
    `<path d="M14 11h80M126 11h80" ${st(A, 1.6, ';stroke-dasharray:5 4;opacity:.7')}/>`
    + `<path d="M110 4v5M110 13v5M103 11h5M112 11h5" ${st(S(2), 2)}/>`, { cls: 'decor--divider' }),
  empty: () => {
    const id = uid('sc');
    return svg('0 0 160 120',
      `<defs><clipPath id="${id}"><circle cx="80" cy="58" r="40"/></clipPath></defs>`
      + `<circle cx="80" cy="58" r="40" ${fl(AS)}/>`
      + `<g clip-path="url(#${id})">${seigaiha(32, 74, 4, 4, 12, A, AS)}</g>`
      + `<circle cx="80" cy="58" r="40" ${st(A, 1.4, ';stroke-dasharray:4 3')}/>`
      + `<path d="M118 102L148 72" ${st(MUTED, 1.8)}/><path d="M146 74c-10 20-40 34-70 30" ${st(S(2), 1.4)}/>`
      + `<path d="M24 106h40" ${st(A, 1.6, ';stroke-dasharray:5 4;opacity:.6')}/>`, { cls: 'decor--empty' });
  },
  celebrate: () => {
    const id = uid('sc');
    return svg('0 0 200 160',
      `<defs><clipPath id="${id}"><rect x="10" y="10" width="180" height="140" rx="16"/></clipPath></defs>`
      + `<rect x="10" y="10" width="180" height="140" rx="16" ${fl(AS, ';opacity:.6')}/>`
      + `<circle cx="100" cy="74" r="34" ${fl(S(2))}/>`
      + `<g clip-path="url(#${id})">${seigaiha(-6, 110, 7, 4, 16, A, SURF)}</g>`
      + asanoha(36, 40, 14, A) + asanoha(164, 40, 12, A)
      + `<rect x="10" y="10" width="180" height="140" rx="16" ${st(A, 1.4, ';stroke-dasharray:5 4;opacity:.6')}/>`, { cls: 'decor--celebrate' });
  },
  onboarding: () => {
    const id = uid('sc');
    return svg('0 0 280 200',
      `<defs><clipPath id="${id}"><rect x="14" y="8" width="252" height="192" rx="22"/></clipPath></defs>`
      + `<rect x="14" y="8" width="252" height="192" rx="22" ${fl(AS, ';opacity:.4')}/>`
      + `<circle cx="196" cy="62" r="30" ${fl(S(2))}/>`
      + `<path d="M40 142L110 58c6-7 14-7 20 0l70 84z" ${fl(AS)}/>`
      + `<path d="M92 80l18-22c6-7 14-7 20 0l18 22-12 6-8-8-10 10-10-10-8 8z" ${fl(WHITE)}/>`
      + `<path d="M40 142L110 58c6-7 14-7 20 0l70 84" ${st(A, 1.4, ';stroke-dasharray:5 4')}/>`
      + `<g clip-path="url(#${id})">${seigaiha(-8, 160, 8, 5, 20, A, SURF)}</g>`
      + asanoha(56, 50, 16, A)
      + `<path d="M222 108h40M230 116h32" ${st(A, 1.6, ';stroke-dasharray:5 4;opacity:.5')}/>`, { cls: 'decor--onboarding' });
  },
  corner: () => svg('0 0 60 60',
    [30, 21, 12].map((r) => `<path d="M${60 - r} 0A${r} ${r} 0 0 0 60 ${r}" ${st(A, 1.3, ';stroke-dasharray:3 2.4;opacity:.8')}/>`).join('')
    + asanoha(22, 40, 9, S(2)), { cls: 'decor--corner' }),
};

const SKIN_DECOR = { moss: MOSS, linen: LINEN, botanic: BOTANIC, nordic: NORDIC, sashiko: SASHIKO };

export const DECOR_NAMES = ['header', 'divider', 'empty', 'celebrate', 'onboarding', 'corner'];

export function decor(name, skin = 'moss') {
  const set = SKIN_DECOR[skin] || MOSS;
  const fn = set[name] || MOSS[name];
  return fn ? fn() : '';
}
