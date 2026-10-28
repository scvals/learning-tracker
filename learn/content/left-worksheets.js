// Листы для печати (A4, мм) и критерии перехода по этапам — навык «Письмо левой рукой».
// renderSheet(id, opts) → строка SVG (viewBox '0 0 210 297', width/height в мм). Только чёрный и серый.
// opts: { hand: 'left' | 'right' (по умолчанию 'left'), size: 'school' | 'large' }

const SLANT = 65;                               // наклон письма, градусов от горизонтали
const TAN = Math.tan((SLANT * Math.PI) / 180);
const SKEW = -(90 - SLANT);                     // skewX для букв: −25°

const L = 12, R = 198, TOP = 18, BOTTOM = 286;  // поля печати
const INK = '#111', DARK = '#444', GREY = '#777', LIGHT = '#9a9a9a', FAINT = '#bdbdbd';

/* ---------- Контрольный текст и шкала разборчивости ---------- */

export const controlText = 'Съешь же ещё этих мягких французских булок, да выпей же чаю.';

export const legibilityScale = [
  { score: 1, label: 'Не читается', text: 'Даже тебе не прочитать половину слов.' },
  { score: 2, label: 'С трудом', text: 'Сам читаешь, но с усилием; чужой человек не разберёт.' },
  { score: 3, label: 'Читается', text: 'Читается, но 2–4 буквы спорные, строка «пляшет» по высоте.' },
  { score: 4, label: 'Хорошо', text: 'Другой человек читает с первого раза, спорных букв 0–1, высота почти ровная.' },
  { score: 5, label: 'Как правой', text: 'Ровные высота и наклон, все буквы однозначны — не хуже правой руки.' },
];

/* ---------- Критерии перехода между этапами ----------
   stage — этап, НА который переходишь; from — этап, с которого. Показатели берутся из журнала трекера:
   «Разборчивость» (1–5) и «Время на контрольный текст» (сек). «×П» — во сколько раз дольше правой руки. */
export const stageCriteria = [
  {
    stage: 'Прописи', from: null,
    criteria: [
      'Старт курса: начинаешь с прописей элементов и букв.',
      'Перед стартом один раз запиши контрольный текст правой рукой и левой (контрольный образец №0).',
    ],
  },
  {
    stage: 'Соединения и слова', from: 'Прописи',
    criteria: [
      'Сделано не меньше 5 занятий по прописям.',
      'Элементы и буквы держатся в рабочей строке: из 10 подряд не больше 2 вылезают за линии.',
      'Разборчивость отдельных букв — 3 или выше два занятия подряд.',
      'Рука не болит ни во время, ни после занятия.',
    ],
  },
  {
    stage: 'Косая линейка', from: 'Соединения и слова',
    criteria: [
      'Слова из прописей пишешь без обводки, по образцу.',
      'Разборчивость 4 два занятия подряд.',
      'Контрольный текст — не дольше 4×П (например, правая 25 сек → левая до 100 сек).',
    ],
  },
  {
    stage: 'Обычная линейка', from: 'Косая линейка',
    criteria: [
      'Наклон ровный: на строке почти все буквы параллельны наклонным линиям.',
      'Разборчивость 4 два занятия подряд.',
      'Контрольный текст — не дольше 3×П.',
    ],
  },
  {
    stage: 'Клетка', from: 'Обычная линейка',
    criteria: [
      'На обычной линейке высота букв ровная без вспомогательных линий.',
      'Разборчивость 4 два занятия подряд (и диктант без «съеденных» букв).',
      'Контрольный текст — не дольше 2,5×П.',
    ],
  },
  {
    stage: 'Письмо на скорость', from: 'Клетка',
    criteria: [
      'В клетке пишешь ровно, держа размер «полторы-две клетки».',
      'Разборчивость 4 или 5 три занятия подряд.',
      'Контрольный текст — не дольше 2×П. Дальше цель — 1,5×П без потери разборчивости.',
    ],
  },
];

/* ---------- Буквы и элементы: простые штрихи ----------
   Единицы: высота рабочей строки = 10, базовая линия y=0, вверх — отрицательные y. Рисуется прямо, наклон даёт skewX. */
const G = {
  'о': { w: 8, d: 'M6.6,-8.6 C5.8,-9.6 4.9,-10 4,-10 C-1.3,-10 -1.3,0 4,0 C9.3,0 9.3,-9.6 5,-10' },
  'а': { w: 8.6, d: 'M6.6,-8.6 C5.8,-9.6 4.8,-10 3.8,-10 C-1.2,-10 -1.2,0 3.8,0 C5.6,0 6.6,-1.6 7,-4 M7,-10 L7,-1.6 Q7,0 8.6,0' },
  'и': { w: 7.6, d: 'M0,-10 L0,-2 Q0,0 2,0 Q4.2,0 5,-3 L6,-10 L6,-1.6 Q6,0 7.6,0' },
  'ш': { w: 9.6, d: 'M0,-10 L0,-2 Q0,0 2,0 Q4,0 4,-2 L4,-10 M4,-2 Q4,0 6,0 Q8,0 8,-2 L8,-10 L8,-1.6 Q8,0 9.6,0' },
  'л': { w: 6.6, d: 'M0,-0.4 Q1.8,0.4 2.6,-3.6 Q3.4,-10 5,-10 L5,-1.6 Q5,0 6.6,0' },
  'с': { w: 7, d: 'M6.4,-8.4 C5.6,-9.6 4.7,-10 3.8,-10 C-1.2,-10 -1.2,0 3.8,0 C5.4,0 6.4,-0.8 7,-1.8' },
  'е': { w: 7, d: 'M0.6,-4 C4,-4 6.4,-5.2 6.4,-7.4 C6.4,-9.2 5.2,-10 3.8,-10 C-1.2,-10 -1.2,0 3.8,0 C5.4,0 6.4,-0.8 7,-1.8' },
  'у': { w: 7.6, d: 'M0,-10 L0,-2 Q0,0 2,0 Q4.2,0 5,-3 L6,-10 L6,5 Q6,8 3.8,8 Q2,8 2.4,6.2 Q3.6,3.6 7.6,2' },
  'п': { w: 6.2, d: 'M0,0 L0,-8 Q0,-10 2.3,-10 Q4.6,-10 4.6,-8 L4.6,-1.6 Q4.6,0 6.2,0' },
  'т': { w: 9.6, d: 'M0,0 L0,-8 Q0,-10 2,-10 Q4,-10 4,-8 L4,0 M4,-8 Q4,-10 6,-10 Q8,-10 8,-8 L8,-1.6 Q8,0 9.6,0' },
  'р': { w: 7.6, d: 'M0,-8.6 Q0.8,-10 1.8,-10 L1.8,8 M1.8,-6.6 C2.6,-9.4 3.8,-10 4.8,-10 C8.4,-10 8.4,0 4.6,0 C3.2,0 2.2,-1 1.8,-2.6', out: [7.4, -5] },
  'н': { w: 6.6, d: 'M0,-10 L0,0 M0,-5 L5,-5 M5,-10 L5,-1.6 Q5,0 6.6,0' },
};
export const letters = Object.keys(G);

const E = {
  stick: { w: 0, d: 'M0,-10 L0,0', name: 'палочка' },
  'stick-hook': { w: 4, d: 'M0,-10 L0,-2 Q0,0 2,0 Q3.4,0 4,-1.6', name: 'палочка с закруглением' },
  'hook-top': { w: 4, d: 'M0,-7.6 Q0.6,-10 2.2,-10 Q4,-10 4,-8 L4,0', name: 'крючок сверху' },
  oval: { w: 6, d: 'M3,-10 C-1,-10 -1,0 3,0 C7,0 7,-10 3,-10', name: 'овал' },
  'half-oval': { w: 7, d: G['с'].d, name: 'полуовал' },
  'loop-down': { w: 3, d: 'M0,-10 L0,5 Q0,8 -2,8 Q-3.6,8 -2.6,5.8 Q-1,3 3,1.6', name: 'нижняя петля' },
  'loop-up': { w: 4.4, d: 'M0,-1 Q3.2,-5 4,-11 Q4.4,-15 2.8,-15 Q1.4,-15 1.6,-11 L2,0', name: 'верхняя петля' },
  wave: { w: 8, d: 'M0,-5 Q2,-15 4,-5 Q6,5 8,-5', name: 'волна' },
};
export const elements = Object.keys(E);

function ends(g) {
  const n = g.d.match(/-?\d*\.?\d+/g).map(Number);
  return { a: g.in || [n[0], n[1]], b: g.out || [n[n.length - 2], n[n.length - 1]] };
}

/** Слово из штриховых букв с соединениями. Возвращает { svg, width } в единицах букв (высота строки 10). */
export function wordShape(word, { gap = 1.6, space = 7, joins = true } = {}) {
  let x = 0, prev = null, parts = '';
  for (const ch of word.toLowerCase()) {
    const g = G[ch];
    if (!g) { x += space; prev = null; continue; }
    const e = ends(g);
    if (prev && joins) {
      const ax = prev[0], ay = prev[1], bx = x + e.a[0], by = e.a[1];
      const k = Math.max(1, (bx - ax) * 0.5);
      parts += `<path class="join" d="M${f(ax)},${f(ay)} C${f(ax + k)},${f(ay)} ${f(bx - k * 0.6)},${f(by)} ${f(bx)},${f(by)}"/>`;
    }
    parts += `<path transform="translate(${f(x)},0)" d="${g.d}"/>`;
    prev = [x + e.b[0], e.b[1]];
    x += g.w + gap;
  }
  return { svg: parts, width: Math.max(0, x - gap) };
}

export function glyph(ch) { return G[ch] || null; }
export function element(id) { return E[id] || null; }

const f = (n) => (Math.round(n * 100) / 100).toString();

/* ---------- Каркас страницы ---------- */

function page(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm" font-family="'PT Sans', Arial, sans-serif">`
    + `<rect width="210" height="297" fill="#fff"/>`
    + `<text x="${L}" y="11" font-size="3.6" fill="${DARK}">Имя ______________________   Дата ____________</text>`
    + `<text x="${R}" y="11" font-size="3.4" fill="${GREY}" text-anchor="end">${esc(title)}</text>`
    + body
    + `<text x="105" y="292" font-size="2.6" fill="${LIGHT}" text-anchor="middle">Уроки · письмо левой рукой · лист печатать в масштабе 100%</text>`
    + `</svg>`;
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function line(x1, y1, x2, y2, stroke, w, dash) {
  return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

function label(x, y, text, size = 2.8, fill = GREY, anchor = 'start') {
  return `<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(text)}</text>`;
}

const SIZES = {
  school: { work: 4, gap: 7, slantStep: 12 },   // как в школьной тетради: рабочая строка 4 мм
  large: { work: 6, gap: 9, slantStep: 15 },    // увеличенная — для первых недель
};

/** Косая линейка: рабочие строки, вспомогательная линия посередине междустрочья, наклонные 65°. */
function kosaya(size, top = TOP + 2, bottom = BOTTOM, slant = true) {
  const s = SIZES[size] || SIZES.school;
  let out = '', y = top, rows = [];
  out += line(L, y, R, y, LIGHT, 0.18);
  y += s.gap / 2;
  while (y + s.work + s.gap / 2 <= bottom) {
    out += line(L, y, R, y, DARK, 0.28) + line(L, y + s.work, R, y + s.work, DARK, 0.28);
    rows.push(y + s.work);
    out += line(L, y + s.work + s.gap / 2, R, y + s.work + s.gap / 2, LIGHT, 0.18);
    y += s.work + s.gap;
  }
  const yEnd = rows[rows.length - 1] + s.gap / 2;
  if (slant) {
    const H = yEnd - top, dx = H / TAN;
    out += `<clipPath id="kc"><rect x="${L}" y="${top}" width="${R - L}" height="${f(H)}"/></clipPath><g clip-path="url(#kc)">`;
    for (let x = L - dx; x < R; x += s.slantStep) out += line(x, yEnd, x + dx, top, FAINT, 0.16);
    out += '</g>';
  }
  return { svg: out, rows, s };
}

function shapeG(x, base, s, inner, { dashed = false, sample = false } = {}) {
  const sw = sample ? 0.5 : 0.42;
  const color = sample ? INK : GREY;
  const dash = dashed ? ` stroke-dasharray="${f(0.9 / s)} ${f(0.6 / s)}"` : '';
  return `<g transform="translate(${f(x)},${f(base)}) skewX(${SKEW}) scale(${f(s)})" fill="none" stroke="${color}" stroke-width="${f(sw / s)}" stroke-linecap="round" stroke-linejoin="round"${dash}>${inner}</g>`;
}

/** Строки прописей: образец + пунктир для обводки (+ пустое место). Левша: образец справа, чтобы рука его не закрывала. */
function traceRow(base, s, unit, { traces = 99, hand = 'left', gapUnits = 5 }) {
  const sc = s.work / 10;
  const step = (unit.w + gapUnits) * sc;
  const sampleX = hand === 'left' ? R - 4 - unit.w * sc : L + 4;
  let out = shapeG(sampleX, base, sc, unit.svg, { sample: true });
  let x = hand === 'left' ? L + 4 : L + 4 + step + 3;
  const limit = hand === 'left' ? sampleX - step - 2 : R - 4 - unit.w * sc;
  let n = 0;
  while (x <= limit && n < traces) { out += shapeG(x, base, sc, unit.svg, { dashed: true }); x += step; n++; }
  return out;
}

function unitOf(item) {
  if (E[item]) return { w: E[item].w, svg: `<path d="${E[item].d}"/>` };
  const w = wordShape(item);
  return { w: w.width, svg: w.svg };
}

function propisi(title, items, opts) {
  const size = opts.size || 'large';
  const hand = opts.hand || 'left';
  const k = kosaya(size);
  let body = k.svg;
  const rows = k.rows;
  let r = 0;
  for (const it of items) {
    const unit = unitOf(it.v);
    const gapUnits = it.word ? 7 : 5;
    if (r < rows.length) body += traceRow(rows[r++], k.s, unit, { hand, gapUnits });
    if (r < rows.length) body += traceRow(rows[r++], k.s, unit, { hand, gapUnits, traces: it.word ? 1 : 2 });
  }
  return page(title, body);
}

/* ---------- Отдельные листы ---------- */

function sheetRuled(kind, opts) {
  const size = opts.size || 'school';
  if (kind === 'kosaya') return page('Косая линейка', kosaya(size).svg);
  if (kind === 'uzkaya') {
    // узкая линейка: две линии рабочей строки, без вспомогательных и наклонных
    const work = size === 'large' ? 6 : 5, pitch = size === 'large' ? 15 : 12;
    let out = '';
    for (let y = TOP + 6; y + work <= BOTTOM; y += pitch) out += line(L, y, R, y, DARK, 0.25) + line(L, y + work, R, y + work, DARK, 0.25);
    return page('Узкая линейка', out);
  }
  if (kind === 'obychnaya') {
    const pitch = size === 'large' ? 10 : 8;
    let out = '';
    for (let y = TOP + 6; y <= BOTTOM; y += pitch) out += line(L, y, R, y, DARK, 0.25);
    return page('Обычная линейка', out);
  }
  if (kind === 'kletka') return page('Клетка 5 мм', grid(L, TOP + 2, R, BOTTOM, 5));
  return '';
}

function grid(x1, y1, x2, y2, c) {
  let out = '';
  const nx = Math.floor((x2 - x1) / c), ny = Math.floor((y2 - y1) / c);
  for (let i = 0; i <= nx; i++) out += line(x1 + i * c, y1, x1 + i * c, y1 + ny * c, FAINT, 0.15);
  for (let j = 0; j <= ny; j++) out += line(x1, y1 + j * c, x1 + nx * c, y1 + j * c, FAINT, 0.15);
  return out;
}

const dashed = (d, w = 0.45) => `<path d="${d}" fill="none" stroke="${GREY}" stroke-width="${w}" stroke-dasharray="1.4 1.1" stroke-linecap="round"/>`;
const solid = (d, w = 0.5, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x, y, r = 0.8, c = INK) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${c}"/>`;

function band(y, h) { return line(L, y, R, y, FAINT, 0.2) + line(L, y + h, R, y + h, FAINT, 0.2); }

function sheetLines() {
  let b = '', y = 22;
  const mid = 105;
  const sec = (t) => { b += label(L, y, t, 3, DARK); y += 3; };
  // 1. вертикальные штрихи
  sec('1. Вертикальные штрихи сверху вниз — обведи левую половину, продолжи самостоятельно');
  for (let r = 0; r < 2; r++) {
    b += band(y, 12);
    for (let x = L + 3; x < R - 2; x += 4) if (x < mid) b += dashed(`M${f(x)},${f(y)} L${f(x)},${f(y + 12)}`);
    y += 17;
  }
  // 2. горизонтальные
  sec('2. Горизонтальные линии слева направо, от точки до точки');
  for (let r = 0; r < 5; r++) {
    b += dot(L + 3, y + 2) + dot(R - 3, y + 2);
    if (r < 3) b += dashed(`M${L + 3},${f(y + 2)} L${R - 3},${f(y + 2)}`);
    y += 6;
  }
  y += 4;
  // 3. штриховка квадратов
  sec('3. Штриховка: вертикальная, наклонная, сетка — затем то же в пустых квадратах');
  const sq = 26, sx = (R - L - 6 * sq) / 5;
  const patterns = [
    (x, yy) => { let d = ''; for (let i = 3; i < sq; i += 3) d += `M${f(x + i)},${f(yy)} L${f(x + i)},${f(yy + sq)} `; return d; },
    (x, yy) => { let d = ''; for (let i = 3; i < 2 * sq; i += 3.5) { const a = Math.min(i, sq), bb = Math.max(0, i - sq); d += `M${f(x + bb)},${f(yy + a)} L${f(x + a)},${f(yy + bb)} `; } return d; },
    (x, yy) => patterns[0](x, yy) + (() => { let d = ''; for (let i = 3; i < sq; i += 3) d += `M${f(x)},${f(yy + i)} L${f(x + sq)},${f(yy + i)} `; return d; })(),
  ];
  for (let i = 0; i < 6; i++) {
    const x = L + i * (sq + sx);
    b += `<rect x="${f(x)}" y="${f(y)}" width="${sq}" height="${sq}" fill="none" stroke="${DARK}" stroke-width="0.35"/>`;
    if (i < 3) b += dashed(patterns[i](x, y), 0.35);
  }
  y += sq + 9;
  // 4. зигзаг, волна, петли
  const rowsDef = [
    ['4. Зигзаг', (x0, yy, x1) => { let d = `M${x0},${f(yy + 10)}`; let up = true; for (let x = x0 + 4; x <= x1; x += 4) { d += ` L${f(x)},${f(up ? yy : yy + 10)}`; up = !up; } return d; }],
    ['5. Волна', (x0, yy, x1) => { let d = `M${x0},${f(yy + 5)}`; let up = true; for (let x = x0; x + 8 <= x1; x += 8) { d += ` Q${f(x + 4)},${f(up ? yy - 3 : yy + 13)} ${f(x + 8)},${f(yy + 5)}`; up = !up; } return d; }],
    ['6. Петли-«пружинка» без отрыва', (x0, yy, x1) => { let d = `M${x0},${f(yy + 10)}`; for (let x = x0; x + 6 <= x1; x += 6) d += ` C${f(x + 9)},${f(yy + 6)} ${f(x + 5)},${f(yy - 1)} ${f(x + 3)},${f(yy + 2)} C${f(x + 1)},${f(yy + 5)} ${f(x + 4)},${f(yy + 10)} ${f(x + 6)},${f(yy + 10)}`; return d; }],
  ];
  for (const [t, fn] of rowsDef) {
    sec(`${t} — обведи, потом самостоятельно`);
    b += band(y, 10);
    b += dashed(fn(L + 3, y, R - 3));
    y += 14;
    b += band(y, 10);
    b += dashed(fn(L + 3, y, L + 40));
    y += 16;
  }
  // 7. штриховка по контуру
  sec('7. Заштрихуй фигуры, не выходя за контур: круг — вертикально, треугольник — наклонно, лист — дугами');
  const cy = y + 20;
  b += solid(circlePath(L + 28, cy, 17), 0.4, DARK);
  b += solid(`M${L + 70},${cy + 17} L${L + 90},${cy - 17} L${L + 110},${cy + 17} Z`, 0.4, DARK);
  b += solid(`M${L + 130},${cy + 15} C${L + 135},${cy - 15} ${L + 165},${cy - 20} ${L + 182},${cy - 17} C${L + 178},${cy} ${L + 160},${cy + 18} ${L + 130},${cy + 15} Z M${L + 130},${cy + 15} L${L + 172},${cy - 10}`, 0.4, DARK);
  return page('Линии и штриховка', b);
}

function circlePath(cx, cy, r) { return `M${f(cx + r)},${f(cy)} A${r},${r} 0 1,1 ${f(cx - r)},${f(cy)} A${r},${r} 0 1,1 ${f(cx + r)},${f(cy)}`; }

function spiralPath(cx, cy, rMax, turns, dir = 1) {
  const pts = [], n = turns * 48;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * turns * 2 * Math.PI;
    const r = (rMax * i) / n;
    pts.push(`${f(cx + r * Math.cos(t))},${f(cy + dir * r * Math.sin(t))}`);
  }
  return 'M' + pts.join(' L');
}

function sheetSpirals() {
  let b = '', y = 22;
  const sec = (t) => { b += label(L, y, t, 3, DARK); y += 4; };
  sec('1. Круги: начинай сверху, веди против часовой стрелки. 4 обведи, 4 нарисуй вокруг точки');
  for (let i = 0; i < 8; i++) {
    const cx = L + 12 + i * 23.5, cy = y + 11;
    b += i < 4 ? dashed(circlePath(cx, cy, 9)) : dot(cx, cy, 0.6, GREY);
  }
  y += 28;
  sec('2. Кольца: три круга один в другом');
  for (let i = 0; i < 4; i++) {
    const cx = L + 22 + i * 46, cy = y + 19;
    if (i < 2) b += dashed(circlePath(cx, cy, 18)) + dashed(circlePath(cx, cy, 12)) + dashed(circlePath(cx, cy, 6));
    else b += dot(cx, cy, 0.6, GREY);
  }
  y += 44;
  sec('3. Спирали от центра наружу — в одну и в другую сторону');
  for (let i = 0; i < 4; i++) {
    const cx = L + 22 + i * 46, cy = y + 19;
    b += i < 2 ? dashed(spiralPath(cx, cy, 18, 4, i === 0 ? 1 : -1)) : dot(cx, cy, 0.6, GREY);
  }
  y += 44;
  sec('4. Цепочка овалов с наклоном');
  b += band(y, 12);
  for (let x = L + 6, i = 0; x < R - 8; x += 9, i++) {
    const g = `<g transform="translate(${f(x)},${f(y + 12)}) skewX(${SKEW}) scale(1.2)"><path d="M3,-10 C-1,-10 -1,0 3,0 C7,0 7,-10 3,-10" fill="none" stroke="${GREY}" stroke-width="0.4" stroke-dasharray="1.1 0.9"/></g>`;
    if (i < 10) b += g;
  }
  y += 20;
  sec('5. Большая спираль — обведи, справа нарисуй такую же');
  b += dashed(spiralPath(L + 45, y + 42, 40, 6)) + dot(R - 45, y + 42, 0.8, GREY);
  return page('Круги и спирали', b);
}

function starPts(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}

function sheetShapes() {
  let b = '';
  const colW = (R - L) / 3;
  b += label(L, 22, 'Слева — обведи пунктир, в середине — соедини точки, справа — нарисуй самостоятельно.', 3, DARK);
  b += label(L + colW / 2, 30, 'обведи', 2.8, GREY, 'middle') + label(L + colW * 1.5, 30, 'по точкам', 2.8, GREY, 'middle') + label(L + colW * 2.5, 30, 'самостоятельно', 2.8, GREY, 'middle');
  const shapes = [
    { name: 'Квадрат 40 мм', pts: (cx, cy) => [[cx - 20, cy - 20], [cx + 20, cy - 20], [cx + 20, cy + 20], [cx - 20, cy + 20]], order: [0, 1, 2, 3, 0] },
    { name: 'Треугольник', pts: (cx, cy) => [[cx, cy - 22], [cx + 24, cy + 19], [cx - 24, cy + 19]], order: [0, 1, 2, 0] },
    { name: 'Звезда: через одну вершину', pts: (cx, cy) => starPts(cx, cy + 2, 24), order: [0, 2, 4, 1, 3, 0] },
  ];
  shapes.forEach((sh, row) => {
    const cy = 64 + row * 80;
    b += label(L, cy - 30, `${row + 1}. ${sh.name}`, 3, DARK);
    for (let c = 0; c < 3; c++) {
      const cx = L + colW * (c + 0.5);
      const p = sh.pts(cx, cy);
      if (c === 0) b += dashed('M' + sh.order.map((i) => `${f(p[i][0])},${f(p[i][1])}`).join(' L'), 0.5) + dot(p[0][0], p[0][1], 0.9);
      if (c === 1) p.forEach(([x, y], i) => { b += dot(x, y, 0.9) + label(x + 2, y - 1.5, String(sh.order.indexOf(i) + 1), 2.6); });
      if (c === 2) b += `<rect x="${f(cx - 30)}" y="${f(cy - 28)}" width="60" height="58" fill="none" stroke="${FAINT}" stroke-width="0.25" stroke-dasharray="2 2"/>`;
    }
  });
  return page('Фигуры для обводки', b);
}

function sheetGraf() {
  let b = grid(L, TOP + 2, R, BOTTOM, 5);
  // 4 зоны (2×2), точки старта на узлах сетки
  const starts = [[L + 30, TOP + 2 + 60], [L + 130, TOP + 2 + 60], [L + 40, TOP + 2 + 190], [L + 125, TOP + 2 + 190]];
  starts.forEach(([x, y], i) => { b += dot(x, y, 1.1) + label(x - 6, y + 1.2, String(i + 1), 3.2, INK); });
  b += line(105, TOP + 2, 105, BOTTOM, GREY, 0.2, '2 2') + line(L, 152, R, 152, GREY, 0.2, '2 2');
  return page('Графический диктант', b);
}

function sheetControl(opts) {
  const size = opts.size || 'school';
  let b = label(L, 24, 'Контрольный текст — пиши в своём обычном аккуратном темпе, засеки время:', 3, DARK);
  b += `<text x="${L}" y="33" font-size="5" fill="${INK}" font-family="Georgia, 'Times New Roman', serif" font-style="italic">${esc(controlText)}</text>`;
  const pitch = size === 'large' ? 12 : 10;
  const blocks = ['Левая рука — попытка 1', 'Левая рука — попытка 2', 'Правая рука (один раз, для сравнения)'];
  let y = 46;
  for (const t of blocks) {
    b += label(L, y, t, 3, DARK) + label(R, y, 'время ______ сек    разборчивость ___ / 5', 3, DARK, 'end');
    y += 4;
    for (let i = 0; i < 4; i++) { y += pitch; b += line(L, y, R, y, DARK, 0.25); }
    y += 14;
  }
  b += label(L, y, 'Как оценить разборчивость (1–5): прочитай вслух завтра или дай прочитать другому, не говоря текст.', 2.8, DARK);
  legibilityScale.forEach((s, i) => { b += label(L, y + 6 + i * 5, `${s.score} — ${s.label}: ${s.text}`, 2.8, GREY); });
  y += 36;
  b += label(L, y, 'Запиши в трекер: Журнал → неделя → «Письмо левой рукой»: этап, время (сек), разборчивость. Время правой — в заметку.', 2.8, DARK);
  return page('Контрольный образец', b);
}

/* ---------- Список листов ---------- */

export const sheets = [
  { id: 'elements', week: 1, kind: 'propisi', title: 'Прописи элементов', desc: 'Палочки, крючки, овалы, петли, волна: строка с пунктиром для обводки и самостоятельная строка. Увеличенная косая линейка. Образец — у правого края, чтобы левая рука его не закрывала.' },
  { id: 'letters-1', week: 1, kind: 'propisi', title: 'Прописи букв: о а и ш л с', desc: 'Шесть строчных букв и слова из них (оса, лиса, сила, шила). Пунктир для обводки, затем самостоятельно.' },
  { id: 'letters-2', week: 1, kind: 'propisi', title: 'Прописи букв: е у п т р н', desc: 'Ещё шесть строчных букв и слова из всех двенадцати (утро, репа, нота, лето, тренер).' },
  { id: 'control', week: 1, kind: 'control', title: 'Контрольный образец', desc: 'Контрольный текст, места для двух попыток левой и одной правой рукой, поля для времени и разборчивости, шкала оценки. Печатай к образцу №0 и №1.' },
  { id: 'words', week: 2, kind: 'propisi', title: 'Соединения и слова', desc: 'Слоги и слова с соединениями букв пунктиром: обведи, затем напиши по образцу.' },
  { id: 'lines', week: 2, kind: 'drill', title: 'Линии и штриховка', desc: 'Вертикальные и горизонтальные штрихи, штриховка квадратов, зигзаг, волна, пружинка.' },
  { id: 'spirals', week: 2, kind: 'drill', title: 'Круги и спирали', desc: 'Круги, кольца, спирали в обе стороны, цепочка овалов и большая спираль.' },
  { id: 'kosaya', week: 3, kind: 'ruling', title: 'Косая линейка', desc: 'Как школьная тетрадь: рабочая строка 4 мм, вспомогательная линия между строками, наклонные под 65°. Есть крупный вариант (6 мм).' },
  { id: 'shapes', week: 3, kind: 'shapes', title: 'Фигуры для обводки', desc: 'Квадрат, треугольник, звезда: обвести пунктир, соединить точки, нарисовать самому.' },
  { id: 'uzkaya', week: 3, kind: 'ruling', title: 'Узкая линейка', desc: 'Только две линии рабочей строки, без наклонных — переход от косой линейки к обычной.' },
  { id: 'obychnaya', week: 4, kind: 'ruling', title: 'Обычная линейка', desc: 'Одна линия, шаг 8 мм (крупный вариант — 10 мм). Для диктантов и контрольного текста.' },
  { id: 'kletka', week: 4, kind: 'grid', title: 'Клетка 5 мм', desc: 'Тетрадная клетка 5 мм: письмо в клетке и графические диктанты.' },
  { id: 'graf', week: 4, kind: 'grid', title: 'Графический диктант', desc: 'Клетка 5 мм, четыре зоны с пронумерованными точками старта — для диктантов №1–4 из урока.' },
];

export function renderSheet(id, opts = {}) {
  switch (id) {
    case 'elements':
      return propisi('Прописи элементов', ['stick', 'stick-hook', 'hook-top', 'oval', 'half-oval', 'loop-down', 'loop-up', 'wave'].map((v) => ({ v })), opts);
    case 'letters-1':
      return propisi('Прописи букв: о а и ш л с', [...'оаишлс'].map((v) => ({ v })).concat(['оса лиса', 'сила шила'].map((v) => ({ v, word: true }))), opts);
    case 'letters-2':
      return propisi('Прописи букв: е у п т р н', [...'еуптрн'].map((v) => ({ v })).concat(['утро репа', 'нота лето'].map((v) => ({ v, word: true }))), opts);
    case 'words':
      return propisi('Соединения и слова', ['ла ли ло', 'на ни но', 'лиса оса', 'утро репа', 'тина пена', 'шина рот', 'нос сон', 'лето тренер'].map((v) => ({ v, word: true })), opts);
    case 'lines': return sheetLines(opts);
    case 'spirals': return sheetSpirals(opts);
    case 'shapes': return sheetShapes(opts);
    case 'graf': return sheetGraf(opts);
    case 'control': return sheetControl(opts);
    case 'kosaya': case 'uzkaya': case 'obychnaya': case 'kletka':
      return sheetRuled(id, opts);
    default: return '';
  }
}
