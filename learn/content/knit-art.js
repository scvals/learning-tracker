// Иллюстрации-схемы для курса вязания. Каждое значение — строка SVG.
// Цвета только через CSS-переменные темы: --skill (нить), --ink (контуры), --muted (подписи, руки),
// --surface (заливка, «зазор» на пересечениях нитей), --accent (стрелки движения).
// Строки собираются маленькими помощниками ниже, чтобы рисунки были компактными и единообразными.

const Y = 'var(--skill)';
const INK = 'var(--ink)';
const MU = 'var(--muted)';
const SF = 'var(--surface)';
const AC = 'var(--accent)';

const r1 = (n) => Math.round(n * 10) / 10;

function svg(w, h, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label}">${body}</svg>`;
}

// Нить: сначала «зазор» цветом фона, потом сама нить — так видно, что одна нить проходит поверх другой.
function yarn(d, w = 5, gap = true) {
  return (gap ? `<path d="${d}" style="stroke:${SF}" stroke-width="${w + 3.5}"/>` : '') +
    `<path d="${d}" style="stroke:${Y}" stroke-width="${w}"/>`;
}

// Спица от (x1,y1) — тупой конец с шишечкой — к острию (x2,y2).
function needle(x1, y1, x2, y2, w = 8, knob = true) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, h = w / 2, tl = w * 2;
  const bx = x2 - ux * tl, by = y2 - uy * tl;
  const p = [
    [x1 + nx * h, y1 + ny * h], [bx + nx * h, by + ny * h], [x2, y2],
    [bx - nx * h, by - ny * h], [x1 - nx * h, y1 - ny * h],
  ].map(([a, b]) => `${r1(a)},${r1(b)}`).join(' ');
  return `<polygon points="${p}" style="fill:${SF};stroke:${INK}" stroke-width="1.6"/>` +
    `<line x1="${r1(x1 + ux * 4)}" y1="${r1(y1 + uy * 4)}" x2="${r1(bx)}" y2="${r1(by)}" style="stroke:${MU}" stroke-width="1" opacity=".45"/>` +
    (knob ? `<circle cx="${x1}" cy="${y1}" r="${w * 0.85}" style="fill:${MU};stroke:${INK}" stroke-width="1.4"/>` : '');
}

// Стрелка по квадратичной кривой.
function arrow(x1, y1, cx, cy, x2, y2, { dash = false, w = 2, color = AC } = {}) {
  const dx = x2 - cx, dy = y2 - cy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, s = 7;
  const a = [x2 - ux * s - uy * s * 0.6, y2 - uy * s + ux * s * 0.6];
  const b = [x2 - ux * s + uy * s * 0.6, y2 - uy * s - ux * s * 0.6];
  return `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2 - ux * 3} ${y2 - uy * 3}" style="stroke:${color}" stroke-width="${w}"${dash ? ' stroke-dasharray="4 3"' : ''}/>` +
    `<polygon points="${r1(x2)},${r1(y2)} ${r1(a[0])},${r1(a[1])} ${r1(b[0])},${r1(b[1])}" style="fill:${color}"/>`;
}

function t(x, y, s, { size = 10, anchor = 'middle', color = MU, weight = 600 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" style="fill:${color}">${s}</text>`;
}

// Номер шага в кружке.
function num(x, y, n) {
  return `<circle cx="${x}" cy="${y}" r="8" style="fill:${AC}"/>` +
    `<text x="${x}" y="${y + 3.5}" font-size="10" font-weight="800" text-anchor="middle" style="fill:${SF}">${n}</text>`;
}

// Лицевая петля полотна — «галочка» V.
function v(x, y, s = 12, w = 4) {
  const h = s * 1.05;
  return yarn(`M${r1(x - s * 0.45)} ${y}Q${r1(x - s * 0.3)} ${r1(y + h * 0.75)} ${x} ${r1(y + h)}`, w, false) +
    yarn(`M${r1(x + s * 0.45)} ${y}Q${r1(x + s * 0.3)} ${r1(y + h * 0.75)} ${x} ${r1(y + h)}`, w, false);
}
// Изнаночная петля полотна — «бугорок».
function bump(x, y, s = 12, w = 4) {
  return yarn(`M${r1(x - s * 0.5)} ${r1(y + 2)}Q${x} ${r1(y - s * 0.45)} ${r1(x + s * 0.5)} ${r1(y + 2)}`, w, false);
}
// Полотно лицевой глади: cols×rows галочек.
function vgrid(x0, y0, cols, rows, s = 12, w = 4) {
  let o = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) o += v(x0 + c * s, y0 + r * s * 0.95, s, w);
  return o;
}
// Платочная вязка: рядами чередуются бугорки (рубчики) и узкие просветы галочек.
function garter(x0, y0, cols, ridges, s = 12, w = 4) {
  let o = '';
  for (let r = 0; r < ridges; r++) {
    const y = y0 + r * s * 0.85;
    for (let c = 0; c < cols; c++) o += bump(x0 + c * s + (r % 2 ? s / 2 : 0), y, s, w);
  }
  return o;
}

// Петля, надетая на горизонтальную спицу (вид спереди). Возвращает заднюю часть и переднюю стенку отдельно,
// чтобы между ними можно было нарисовать спицу.
function loop(x, y, w = 14, h = 16, sw = 4.5) {
  const l = x - w / 2, rr = x + w / 2;
  return {
    back: yarn(`M${l} ${y + h}L${l} ${y - 3}A${w / 2} ${w / 2} 0 0 1 ${rr} ${y - 3}L${rr} ${y + h}`, sw),
    front: yarn(`M${rr} ${y - 5}L${rr} ${y + h}`, sw),
  };
}

// Простая схематичная ладонь/палец: «капсула».
function finger(x1, y1, x2, y2, r = 8) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${MU}" stroke-width="${r * 2 + 3}"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${SF}" stroke-width="${r * 2}"/>`;
}

function panel(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" style="stroke:${MU}" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>`;
}

// ---------- сцена «две спицы» для лицевой и изнаночной ----------
// Левая спица горизонтальная, на ней 4 петли; под петлями — кусочек полотна.
function leftNeedleScene(withFront = true) {
  const xs = [34, 56, 78, 100, 122];
  const y = 64;
  let back = '', front = '';
  xs.forEach((x) => { const L = loop(x, y); back += L.back; front += L.front; });
  let fabric = '';
  for (let r = 0; r < 3; r++) xs.forEach((x) => { fabric += v(x, 80 + r * 15, 14, 4.5); });
  return { back, front: withFront ? front : '', fabric, needle: needle(6, y, 150, y, 8) };
}

// ---------- рисунки ----------
const art = {};

art['knit-yarn-what'] = svg(240, 160, 'Из чего состоит пряжа', (() => {
  // волокна → скрученные сложения → нить
  let o = '';
  for (let i = 0; i < 7; i++) o += `<path d="M${14 + i * 2} ${40 + i * 6}q14 -8 26 0t26 0" style="stroke:${Y}" stroke-width="1.2" opacity=".85"/>`;
  o += t(40, 108, 'волокна');
  o += arrow(78, 64, 86, 60, 96, 64, { w: 1.6 });
  // сложения
  for (let k = 0; k < 2; k++) o += yarn(`M104 ${56 + k * 12}C120 ${46 + k * 12} 132 ${66 + k * 12} 150 ${56 + k * 12}`, 4);
  o += t(127, 108, 'сложения');
  o += arrow(156, 64, 162, 60, 170, 64, { w: 1.6 });
  // скрученная нить
  o += `<path d="M178 30L178 98" style="stroke:${Y}" stroke-width="16"/>`;
  for (let i = 0; i < 6; i++) o += `<path d="M171 ${34 + i * 11}L185 ${42 + i * 11}" style="stroke:${SF}" stroke-width="2"/>`;
  o += t(204, 108, 'нить');
  o += t(120, 134, 'волокна скручивают в сложения,', { size: 9, weight: 500 }) + t(120, 146, 'сложения — в нить', { size: 9, weight: 500 });
  return o;
})());

art['knit-yarn-weights'] = svg(240, 160, 'Толщина пряжи', (() => {
  let o = '';
  const rows = [[2, 'тонкая', '400 м / 100 г'], [5, 'средняя', '200–250 м / 100 г'], [10, 'толстая', '100 м / 100 г']];
  rows.forEach(([w, a, b], i) => {
    const y = 38 + i * 42;
    o += `<path d="M14 ${y}c24 -6 48 6 66 0s40 -6 56 0" style="stroke:${Y}" stroke-width="${w}"/>`;
    o += t(146, y - 4, a, { anchor: 'start', size: 10, color: i === 1 ? INK : MU, weight: i === 1 ? 800 : 600 });
    o += t(146, y + 9, b, { anchor: 'start', size: 8.5, weight: 500 });
    if (i === 1) o += t(146, y + 20, '← для шарфа', { anchor: 'start', size: 8.5, color: AC, weight: 800 });
  });
  o += t(120, 154, 'больше метров в 100 г → тоньше нить', { size: 9 });
  return o;
})());

art['knit-skein-label'] = svg(240, 160, 'Моток пряжи и этикетка', (() => {
  let o = '';
  o += `<ellipse cx="120" cy="80" rx="104" ry="58" style="fill:${SF};stroke:${Y}" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) o += `<path d="M${30 + i * 21} ${30 + (i % 2) * 6}Q${44 + i * 21} 80 ${28 + i * 21} ${128 - (i % 2) * 6}" style="stroke:${Y}" stroke-width="2" opacity=".55"/>`;
  o += `<rect x="66" y="22" width="108" height="116" rx="6" style="fill:${SF};stroke:${INK}" stroke-width="1.6"/>`;
  o += t(120, 40, '50% шерсть', { size: 10, color: INK });
  o += t(120, 52, '50% акрил', { size: 10, color: INK });
  o += `<line x1="74" y1="59" x2="166" y2="59" style="stroke:${MU}" stroke-width="1"/>`;
  o += t(120, 75, '100 г / 225 м', { size: 12, color: INK, weight: 800 });
  // спицы
  o += `<line x1="84" y1="92" x2="104" y2="84" style="stroke:${INK}" stroke-width="2"/><line x1="84" y1="84" x2="104" y2="92" style="stroke:${INK}" stroke-width="2"/>`;
  o += t(110, 92, '4–5 мм', { size: 10, anchor: 'start', color: INK });
  // символы ухода: таз 30°, не отбеливать, горизонтальная сушка
  o += `<path d="M76 106l3 12h16l3 -12" style="stroke:${INK}" stroke-width="1.4"/><path d="M76 108q5 -3 11 0t11 0" style="stroke:${INK}" stroke-width="1"/>`;
  o += t(87, 116, '30', { size: 6.5, color: INK });
  o += `<path d="M110 118l9 -14l9 14z" style="stroke:${INK}" stroke-width="1.4"/><path d="M110 104l18 14M128 104l-18 14" style="stroke:${INK}" stroke-width="1.2"/>`;
  o += `<rect x="140" y="104" width="18" height="14" style="stroke:${INK}" stroke-width="1.4"/><line x1="144" y1="111" x2="154" y2="111" style="stroke:${INK}" stroke-width="1.4"/>`;
  o += t(120, 132, 'партия № 1234', { size: 8, weight: 500 });
  return o;
})());

art['knit-needles'] = svg(240, 160, 'Прямые и круговые спицы', (() => {
  let o = '';
  o += needle(20, 30, 200, 30, 8) + needle(20, 52, 200, 52, 8);
  o += t(210, 45, '4,5', { size: 12, anchor: 'start', color: INK, weight: 800 });
  o += t(110, 72, 'прямые спицы, пара', { size: 9 });
  // круговые
  o += `<path d="M70 130C70 150 170 150 170 130" style="stroke:${MU}" stroke-width="2.5"/>`;
  o += needle(70, 132, 70, 88, 6, false) + needle(170, 132, 170, 88, 6, false);
  o += t(120, 112, 'круговые:', { size: 9 }) + t(120, 124, 'кончики на леске', { size: 9 });
  return o;
})());

art['knit-tools'] = svg(240, 160, 'Мелочи для вязания', (() => {
  let o = '';
  // игла с большим ушком
  o += `<path d="M16 30L100 30" style="stroke:${INK}" stroke-width="5"/><path d="M100 30l6 0" style="stroke:${INK}" stroke-width="2.4"/><ellipse cx="25" cy="30" rx="6" ry="1.4" style="fill:${SF}"/>`;
  o += t(58, 46, 'игла с ушком', { size: 9 });
  // крючок
  o += `<path d="M130 30L210 30" style="stroke:${INK}" stroke-width="4"/><path d="M212 30q4 0 4 -4" style="stroke:${INK}" stroke-width="2.5"/>`;
  o += t(172, 46, 'крючок 4 мм', { size: 9 });
  // ножницы
  o += `<circle cx="30" cy="92" r="9" style="stroke:${INK}" stroke-width="2"/><circle cx="30" cy="118" r="9" style="stroke:${INK}" stroke-width="2"/>`;
  o += `<path d="M38 96L84 116M38 114L84 94" style="stroke:${INK}" stroke-width="2.4"/>`;
  o += t(54, 142, 'ножницы', { size: 9 });
  // сантиметр
  o += `<rect x="104" y="96" width="70" height="14" rx="2" style="fill:${SF};stroke:${INK}" stroke-width="1.4"/>`;
  for (let i = 0; i <= 10; i++) o += `<line x1="${108 + i * 6.2}" y1="96" x2="${108 + i * 6.2}" y2="${i % 5 ? 101 : 104}" style="stroke:${INK}" stroke-width="1"/>`;
  o += `<circle cx="118" cy="118" r="10" style="stroke:${INK}" stroke-width="1.4"/>`;
  o += t(140, 142, 'сантиметр', { size: 9 });
  // маркеры
  [196, 212].forEach((x, i) => { o += `<path d="M${x} 92a6 6 0 1 0 0.1 0" style="stroke:${i ? Y : AC}" stroke-width="3"/>`; });
  o += t(206, 124, 'маркеры', { size: 9 });
  o += t(206, 136, '(по желанию)', { size: 8, weight: 500 });
  return o;
})());

art['knit-slipknot'] = svg(240, 160, 'Скользящая петля в три шага', (() => {
  let o = panel(4, 8, 74, 144) + panel(83, 8, 74, 144) + panel(162, 8, 74, 144);
  // 1 — кольцо: хвост сверху вниз пересекает рабочую нить
  o += yarn('M18 132C20 100 66 92 60 60C56 34 18 36 22 62C26 86 50 100 52 132', 4.5);
  o += t(41, 146, 'сделай кольцо', { size: 8 });
  o += num(18, 22, 1);
  // 2 — вытянуть петельку сквозь кольцо
  o += yarn('M100 132C102 104 140 98 136 72C132 52 102 52 104 74C106 92 128 102 130 132', 4.5);
  o += yarn('M118 84C112 60 112 40 120 30C128 40 126 60 122 84', 4);
  o += arrow(132, 52, 140, 40, 130, 28, { w: 1.6 });
  o += num(97, 22, 2) + t(120, 146, 'вытяни петельку', { size: 8 });
  // 3 — петля на спице, затянуть
  o += yarn('M198 70L198 58A8 8 0 0 1 214 58L214 70', 4.5);
  o += needle(166, 58, 232, 58, 7, false);
  o += yarn('M213.6 54L214 70', 4.5);
  o += yarn('M198 70Q200 78 206 78Q212 78 214 70', 4.5);
  o += yarn('M204 80Q196 110 186 132', 4.5) + yarn('M208 80Q216 110 222 132', 4.5);
  o += arrow(180, 112, 176, 124, 182, 136, { w: 1.4 }) + arrow(226, 112, 230, 124, 226, 136, { w: 1.4 });
  o += t(199, 146, 'затяни на спице', { size: 8 });
  o += num(176, 22, 3);
  return o;
})());

art['knit-hold-continental'] = svg(240, 160, 'Как держать нить европейским способом', (() => {
  let o = '';
  // ладонь левой руки, вид с тыльной стороны, пальцы вверх
  o += `<path d="M58 150C52 120 56 100 66 92L170 92C182 100 186 124 180 150Z" style="fill:${SF};stroke:${MU}" stroke-width="2"/>`;
  const fx = [78, 108, 138, 166];
  const tops = [24, 16, 22, 42];
  fx.forEach((x, i) => { o += finger(x, 96, x, tops[i], 10); });
  o += finger(60, 112, 30, 88, 10); // большой палец
  // нить: из клубка (справа внизу) → обмотать мизинец → под безымянным и средним → поверх указательного → к спицам
  o += yarn('M232 150C214 130 182 120 176 78', 4.5);
  o += yarn('M176 78C170 66 156 66 156 78C156 90 168 92 172 84', 4.5);
  o += `<path d="M172 84C150 70 128 60 92 50" style="stroke:${Y}" stroke-width="4.5" stroke-dasharray="5 4" opacity=".75"/>`;
  o += yarn('M92 50C84 48 72 44 70 34', 4.5);
  o += yarn('M70 34C68 26 76 20 84 24', 4.5);
  o += yarn('M84 24C100 30 120 12 150 6', 4.5, false);
  o += t(206, 52, 'мизинец:', { size: 8.5 }) + t(206, 62, '1 виток', { size: 8.5 });
  o += t(122, 112, 'под средним', { size: 8.5 }) + t(122, 122, 'и безымянным', { size: 8.5 });
  o += t(46, 16, 'поверх', { size: 8.5 }) + t(46, 26, 'указат.', { size: 8.5 });
  o += t(186, 18, 'к спицам', { size: 8.5 });
  return o;
})());

art['knit-caston-1'] = svg(240, 160, 'Набор петель: положение «рогатка»', (() => {
  let o = '';
  // кулак левой руки и два пальца «рогаткой»: большой и указательный
  o += finger(104, 142, 66, 92, 10);   // большой
  o += finger(136, 140, 172, 86, 9);   // указательный
  o += `<ellipse cx="120" cy="156" rx="44" ry="22" style="fill:${SF};stroke:${MU}" stroke-width="2"/>`;
  // спица (2 спицы вместе) в правой руке, острие влево
  const L = loop(120, 36, 12, 8);
  o += L.back + needle(226, 36, 60, 36, 8) + L.front;
  // хвост: от спицы к большому пальцу, вокруг него снаружи и в кулак
  o += yarn('M114 44C100 60 82 76 74 86', 4.5);
  o += yarn('M74 86C66 74 50 76 52 90C54 102 70 104 92 136', 4.5);
  // нить от клубка: от спицы через указательный палец и в кулак
  o += yarn('M126 44C140 60 158 74 166 80', 4.5);
  o += yarn('M166 80C172 70 188 72 186 86C184 100 166 112 150 136', 4.5);
  o += t(36, 70, 'хвост', { size: 9 });
  o += t(206, 104, 'от клубка', { size: 9 });
  o += t(150, 20, 'спица (две вместе)', { size: 9 });
  o += t(40, 120, 'большой', { size: 8 }) + t(210, 80, 'указат.', { size: 8 });
  return o;
})());

art['knit-caston-2'] = svg(240, 160, 'Набор петель: движение спицы', (() => {
  let o = '';
  // крупно: петля на большом пальце (слева) и нить на указательном (справа), спица идёт по стрелкам
  o += finger(40, 150, 40, 70, 12);
  o += finger(200, 150, 200, 70, 12);
  o += yarn('M120 20C100 40 70 56 58 72', 4.5);           // от спицы к пальцу — передняя нить
  o += yarn('M58 72C54 58 26 58 24 72C22 86 40 96 56 112', 4.5);
  o += yarn('M120 20C140 40 170 56 186 64', 4.5);
  o += yarn('M186 64C200 52 220 58 214 74C210 90 196 104 184 118', 4.5);
  o += `<circle cx="120" cy="20" r="5" style="fill:${MU}"/>`;
  // траектория кончика спицы
  o += num(84, 112, 1) + arrow(96, 108, 76, 98, 68, 76);
  o += num(150, 104, 2) + arrow(80, 66, 150, 36, 190, 58);
  o += num(118, 140, 3) + arrow(178, 72, 110, 110, 74, 90, { dash: true });
  o += t(28, 156, 'большой', { size: 8.5 });
  o += t(212, 156, 'указательный', { size: 8.5 });
  return o;
})());

art['knit-caston-3'] = svg(240, 160, 'Набранные петли на спице', (() => {
  let o = '', back = '', front = '';
  const xs = [40, 60, 80, 100, 120, 140, 160];
  xs.forEach((x) => { const L = loop(x, 54, 13, 20); back += L.back; front += L.front; });
  let base = '';
  for (let i = 0; i < xs.length; i++) base += yarn(`M${xs[i] - 6.5} 74Q${xs[i]} 86 ${xs[i] + 6.5} 74`, 4.5);
  o += base + back + needle(214, 54, 18, 54, 8) + front;
  o += yarn('M33.5 74C26 86 22 104 26 130', 4.5);
  o += yarn('M166.5 74C176 90 196 104 214 128', 4.5);
  o += t(30, 146, 'хвост 15 см', { size: 9 });
  o += t(206, 146, 'к клубку', { size: 9 });
  o += t(118, 104, 'петли скользят по спице', { size: 9 });
  o += t(118, 116, 'внизу — ровная «косичка»', { size: 9 });
  return o;
})());

// Лицевая петля
art['knit-knit-1'] = svg(240, 160, 'Лицевая: введи спицу', (() => {
  const s = leftNeedleScene();
  let o = '';
  // рабочая нить за работой: из правой части наверх-влево к пальцу
  o += yarn('M196 112C176 70 150 40 120 30C96 22 70 22 52 14', 4);
  o += needle(218, 150, 108, 56, 7); // правая спица — сзади левой
  o += s.fabric + s.back + s.needle + s.front;
  o += arrow(176, 104, 150, 106, 136, 88);
  o += t(52, 10, 'нить за работой', { size: 8.5, anchor: 'start' });
  o += t(128, 142, 'в петлю слева направо,', { size: 8.5 }) + t(128, 153, 'кончик — за левую спицу', { size: 8.5 });
  return o;
})());

art['knit-knit-2'] = svg(240, 160, 'Лицевая: захвати нить', (() => {
  const s = leftNeedleScene();
  let o = '';
  o += needle(218, 150, 108, 56, 7);
  o += s.fabric + s.back + s.needle + s.front;
  // нить ложится на кончик правой спицы
  o += yarn('M200 120C176 96 140 66 118 54C110 50 100 40 84 22C76 14 62 12 52 10', 4);
  o += arrow(102, 40, 112, 34, 122, 46);
  o += t(166, 24, 'подцепи нить кончиком', { size: 8.5 });
  o += t(166, 35, 'сверху-сзади, как крючком', { size: 8.5 });
  return o;
})());

art['knit-knit-3'] = svg(240, 160, 'Лицевая: вытяни и сбрось', (() => {
  const xs = [34, 56, 78, 100];
  let back = '', front = '', fabric = '';
  xs.forEach((x) => { const L = loop(x, 64); back += L.back; front += L.front; });
  for (let r = 0; r < 3; r++) [...xs, 122].forEach((x) => { fabric += v(x, 80 + r * 15, 14, 4.5); });
  let o = '';
  // новая петля на правой спице
  o += yarn('M128 84C126 70 140 58 150 62C160 68 154 84 144 92', 4.5);
  o += needle(228, 120, 120, 66, 7);
  o += yarn('M150 62C156 66 158 72 156 80', 4.5);
  o += yarn('M144 92C170 104 190 96 210 70C220 56 224 40 214 20', 4);
  o += fabric + back + needle(6, 64, 140, 64, 8) + front;
  // старая петля соскальзывает
  o += arrow(126, 54, 140, 46, 150, 54, { dash: true });
  o += t(150, 152, 'новая петля — на правой спице', { size: 8.5 });
  o += t(150, 36, 'старую сбрось', { size: 8.5 });
  return o;
})());

art['knit-purl-1'] = svg(240, 160, 'Изнаночная: нить перед работой, введи спицу', (() => {
  const s = leftNeedleScene();
  let o = '';
  o += s.fabric + s.back + s.needle;
  o += needle(226, 128, 106, 64, 7); // правая спица — перед левой
  o += s.front;
  o += yarn('M200 116C190 104 170 96 150 98C120 100 100 80 70 40C60 26 54 18 46 12', 4); // нить перед работой
  o += arrow(170, 82, 152, 76, 136, 76);
  o += t(56, 10, 'нить перед работой', { size: 8.5, anchor: 'start' });
  o += t(128, 142, 'в петлю справа налево,', { size: 8.5 }) + t(128, 153, 'перед левой спицей', { size: 8.5 });
  return o;
})());

art['knit-purl-2'] = svg(240, 160, 'Изнаночная: обвей нить и вытяни назад', (() => {
  const s = leftNeedleScene();
  let o = '';
  o += s.fabric + s.back + s.needle;
  o += needle(226, 128, 106, 64, 7);
  o += s.front;
  // нить обвивает правую спицу сверху вниз (против часовой)
  o += yarn('M42 12C70 30 108 54 126 64C134 70 134 82 126 86C118 90 110 92 108 104', 4);
  o += arrow(146, 56, 156, 70, 146, 84);
  o += arrow(120, 120, 110, 112, 104, 96, { dash: true });
  o += t(186, 54, 'сверху вниз', { size: 8.5 }) + t(186, 65, 'спереди спицы', { size: 8.5 });
  o += t(126, 152, 'потом выведи спицу назад сквозь петлю', { size: 8.5 });
  return o;
})());

art['knit-stitch-anatomy'] = svg(240, 160, 'Как правильно сидит петля на спице', (() => {
  let o = '';
  const L = loop(120, 60, 46, 54, 7);
  o += L.back + needle(16, 60, 220, 60, 12) + L.front;
  o += arrow(184, 110, 166, 100, 148, 94, { w: 1.6 });
  o += t(180, 124, 'передняя (правая)', { size: 9 }) + t(180, 135, 'стенка — перед спицей', { size: 9 });
  o += arrow(50, 110, 70, 102, 92, 96, { w: 1.6 });
  o += t(50, 122, 'задняя стенка', { size: 9 }) + t(50, 133, 'за спицей', { size: 9 });
  o += t(120, 24, 'правильная посадка', { size: 10, color: INK, weight: 800 });
  return o;
})());

art['knit-edge'] = svg(240, 160, 'Кромка «цепочкой»', (() => {
  let o = '';
  o += garter(52, 22, 11, 13, 12, 4);
  // цепочки по краям: одно звено = 2 ряда
  for (let i = 0; i < 7; i++) {
    const y = 18 + i * 20;
    o += yarn(`M40 ${y}C30 ${y + 6} 30 ${y + 14} 40 ${y + 20}C50 ${y + 14} 50 ${y + 6} 40 ${y}`, 4);
    o += yarn(`M190 ${y}C180 ${y + 6} 180 ${y + 14} 190 ${y + 20}C200 ${y + 14} 200 ${y + 6} 190 ${y}`, 4);
  }
  o += `<rect x="200" y="58" width="34" height="40" rx="6" style="fill:${SF};stroke:${AC}" stroke-width="1.4"/>`;
  o += t(217, 72, '1 звено', { size: 7.5, color: INK }) + t(217, 82, '=', { size: 7.5, color: INK }) + t(217, 92, '2 ряда', { size: 7.5, color: INK });
    o += t(116, 156, 'ровный край без «ушек»', { size: 8.5 });
  return o;
})());

art['knit-bindoff'] = svg(240, 160, 'Закрытие петель', (() => {
  let o = '';
  // правая спица с двумя петлями, левая спица протягивает первую через вторую
  const A = loop(150, 70, 14, 16), B = loop(176, 70, 14, 16);
  o += A.back + B.back + needle(226, 70, 132, 70, 7, false) + A.front + B.front;
  // закрытые петли — цепочка вдоль верха
  for (let i = 0; i < 5; i++) o += yarn(`M${22 + i * 22} 76C${30 + i * 22} 66 ${40 + i * 22} 66 ${46 + i * 22} 76C${40 + i * 22} 86 ${30 + i * 22} 86 ${22 + i * 22} 76`, 4);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) o += v(34 + c * 22, 92 + r * 15, 14, 4.5);
  o += needle(30, 22, 146, 58, 6, false);
  o += arrow(140, 50, 160, 26, 186, 50);
  o += t(166, 16, 'первую — через вторую', { size: 8.5 });
  o += t(62, 150, 'готовый край', { size: 8.5 });
  return o;
})());

art['knit-garter'] = svg(240, 160, 'Платочная вязка', (() => {
  let o = garter(24, 20, 17, 15, 12, 4);
  o += `<rect x="196" y="30" width="38" height="40" rx="6" style="fill:${SF};stroke:${AC}" stroke-width="1.4"/>`;
  o += t(215, 46, '1 рубчик', { size: 7.5, color: INK }) + t(215, 58, '= 2 ряда', { size: 7.5, color: INK });
  return o;
})());

art['knit-stockinette'] = svg(240, 160, 'Чулочная гладь: лицо и изнанка', (() => {
  let o = vgrid(18, 18, 8, 11, 12, 3.4);
  o += garter(132, 22, 8, 13, 12, 4);
  o += t(58, 154, 'лицо: «косички»', { size: 9 });
  o += t(176, 154, 'изнанка: бугорки', { size: 9 });
  return o;
})());

art['knit-rib'] = svg(240, 160, 'Резинка 1×1 и 2×2', (() => {
  let o = '';
  const col = (x, kind, rows) => { let s = ''; for (let r = 0; r < rows; r++) s += kind === 'v' ? v(x, 20 + r * 11.4, 12, 4) : bump(x, 24 + r * 11.4, 9, 3.4); return s; };
  ['v', 'p', 'v', 'p', 'v', 'p', 'v'].forEach((k, i) => { o += col(18 + i * 13, k, 11); });
  ['v', 'v', 'p', 'p', 'v', 'v', 'p', 'p'].forEach((k, i) => { o += col(132 + i * 13, k, 11); });
  o += t(57, 154, '1×1', { size: 11, color: INK, weight: 800 });
  o += t(178, 154, '2×2', { size: 11, color: INK, weight: 800 });
  return o;
})());

art['knit-curl'] = svg(240, 160, 'Почему чулочная гладь закручивается', (() => {
  let o = '';
  // гладь: края скручены трубочкой
  o += `<path d="M24 40L104 40L104 128L24 128Z" style="fill:${SF};stroke:${Y}" stroke-width="2"/>`;
  o += `<ellipse cx="26" cy="84" rx="8" ry="44" style="fill:${SF};stroke:${Y}" stroke-width="3"/><ellipse cx="102" cy="84" rx="8" ry="44" style="fill:${SF};stroke:${Y}" stroke-width="3"/>`;
  o += `<ellipse cx="64" cy="128" rx="38" ry="7" style="fill:${SF};stroke:${Y}" stroke-width="3"/>`;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) o += v(44 + c * 13, 50 + r * 12, 10, 3);
  o += t(64, 152, 'гладь сворачивается', { size: 9 });
  // платочная — лежит ровно
  o += `<rect x="132" y="40" width="88" height="88" rx="3" style="fill:${SF};stroke:${Y}" stroke-width="2"/>`;
  o += garter(140, 50, 7, 9, 12, 3.4);
  o += t(176, 152, 'платочная — ровная', { size: 9 });
  o += t(120, 22, 'лицевые и изнаночные тянут по-разному', { size: 9 });
  return o;
})());

art['knit-dropped'] = svg(240, 160, 'Поднять спущенную петлю крючком', (() => {
  let o = '';
  for (let r = 0; r < 8; r++) [40, 64, 112, 136, 160].forEach((x) => { o += v(x, 20 + r * 15, 20, 5); });
  // «лесенка» на месте спущенной петли
  for (let r = 0; r < 5; r++) o += yarn(`M76 ${30 + r * 15}Q88 ${26 + r * 15} 100 ${30 + r * 15}`, 3.5);
  // поднятые петли внизу
  o += v(88, 95, 20, 5) + v(88, 110, 20, 5) + v(88, 125, 20, 5);
  // крючок
  o += `<path d="M88 102L118 6" style="stroke:${SF}" stroke-width="9"/><path d="M88 102L118 6" style="stroke:${INK}" stroke-width="5"/>`;
  o += `<path d="M88 102q-2 6 4 6" style="stroke:${INK}" stroke-width="3"/>`;
  o += arrow(204, 120, 214, 80, 204, 40);
  o += t(206, 140, 'по одной', { size: 8.5 }) + t(206, 151, 'ступеньке', { size: 8.5 });
  return o;
})());

art['knit-unravel'] = svg(240, 160, 'Распускание поштучно', (() => {
  let o = '';
  // правая спица с петлями, левая спица подхватывает петлю ряда ниже
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) o += v(40 + c * 22, 90 + r * 15, 14, 4.5);
  const xs = [128, 150, 172];
  let back = '', front = '';
  xs.forEach((x) => { const L = loop(x, 74); back += L.back; front += L.front; });
  o += back + needle(228, 74, 114, 74, 7, false) + front;
  // левая спица входит в петлю ряда ниже под первой петлёй правой спицы
  const L2 = loop(106, 74); o += L2.back;
  o += needle(10, 60, 112, 80, 7);
  o += L2.front;
  // вытянутая (распущенная) нить — волнистая
  o += yarn('M113 64C120 50 104 44 112 34C120 24 104 18 112 8', 3.5);
  o += arrow(80, 30, 94, 18, 108, 20, { w: 1.6 });
  o += t(56, 40, 'потяни нить', { size: 8.5 });
  o += t(120, 150, 'спица — в петлю ряда ниже', { size: 8.5 });
  return o;
})());

art['knit-count'] = svg(240, 160, 'Как считать петли и ряды', (() => {
  let o = '';
  const xs = [24, 44, 64, 84, 104];
  let back = '', front = '';
  xs.forEach((x) => { const L = loop(x, 40, 12, 18); back += L.back; front += L.front; });
  o += back + needle(4, 40, 124, 40, 7, false) + front;
  xs.forEach((x, i) => { o += t(x, 22, String(i + 1), { size: 10, color: INK, weight: 800 }); });
  o += t(64, 80, 'считай петли на спице', { size: 8.5 });
  // ряды в платочной
  o += garter(142, 20, 7, 10, 12, 4);
  for (let i = 0; i < 5; i++) o += t(232, 26 + i * 20.4, String(i + 1), { size: 8, color: INK });
  o += t(186, 132, '5 рубчиков = 10 рядов', { size: 8.5 });
  o += t(64, 120, 'пальцем по петлям,', { size: 8.5 }) + t(64, 131, 'вслух, пары по 2', { size: 8.5 });
  return o;
})());

art['knit-gauge'] = svg(240, 160, 'Измерение образца плотности', (() => {
  let o = '';
  o += `<rect x="14" y="10" width="212" height="102" rx="4" style="fill:${SF};stroke:${Y}" stroke-width="2"/>`;
  o += garter(24, 18, 17, 11, 12, 3.6);
  // линейка: 16 px = 1 см, 0…12 см
  o += `<rect x="18" y="118" width="204" height="22" rx="3" style="fill:${SF};stroke:${INK}" stroke-width="1.4"/>`;
  for (let i = 0; i <= 24; i++) o += `<line x1="${24 + i * 8}" y1="118" x2="${24 + i * 8}" y2="${i % 2 ? 122 : (i % 10 ? 126 : 129)}" style="stroke:${INK}" stroke-width="1"/>`;
  [0, 5, 10].forEach((n) => { o += t(24 + n * 16, 137, String(n), { size: 7, color: INK }); });
  [40, 200].forEach((x) => { o += `<line x1="${x}" y1="20" x2="${x}" y2="118" style="stroke:${AC}" stroke-width="2.2"/><circle cx="${x}" cy="18" r="4" style="fill:${AC}"/>`; });
  o += arrow(48, 64, 120, 54, 192, 64, { w: 1.6 });
  o += `<rect x="98" y="36" width="44" height="16" rx="4" style="fill:${SF}"/>` + t(120, 48, '10 см', { size: 11, color: INK, weight: 800 });
  o += t(120, 155, 'меряй в середине, после стирки', { size: 8.5 });
  return o;
})());

art['knit-join'] = svg(240, 160, 'Присоединение нового клубка у края', (() => {
  let o = '';
  o += `<rect x="40" y="20" width="150" height="120" rx="2" style="fill:${SF};stroke:${MU}" stroke-width="1" stroke-dasharray="3 3"/>`;
  o += garter(48, 30, 12, 12, 12, 3.6);
  // старый конец и новая нить выходят у правого края
  o += yarn('M190 40C206 50 210 70 206 96', 4);
  o += yarn('M190 52C220 50 230 30 226 12', 4.5);
  o += yarn('M196 46C214 62 222 84 222 104', 4);
  o += `<circle cx="214" cy="78" r="5" style="stroke:${AC}" stroke-width="1.6"/>`;
  o += t(214, 124, 'хвосты', { size: 8.5 }) + t(214, 134, 'по 15 см', { size: 8.5 });
  o += t(206, 10, 'новый клубок', { size: 8.5 });
  o += t(116, 154, 'новый ряд — новой нитью', { size: 8.5 });
  return o;
})());

art['knit-weave'] = svg(240, 160, 'Прятание концов иглой', (() => {
  let o = '';
  o += garter(20, 20, 13, 13, 12, 4);
  // нить, вплетённая вдоль рубчика и обратно
  o += yarn('M30 112C60 106 90 106 120 104', 3, false);
  o += yarn('M120 104C126 100 126 96 120 94C100 94 92 96 84 94', 3, false);
  // игла
  o += `<path d="M84 94L40 90" style="stroke:${SF}" stroke-width="7"/><path d="M84 94L40 90" style="stroke:${INK}" stroke-width="3"/>`;
  o += `<ellipse cx="80" cy="93.6" rx="3.5" ry="1.4" style="fill:${SF}"/>`;
  o += arrow(196, 60, 214, 80, 196, 100);
  o += t(204, 120, '5–7 см', { size: 9, color: INK });
  o += t(204, 132, 'и 2 см назад', { size: 9, color: INK });
  o += t(110, 154, 'по изнанке, за бугорки, не насквозь', { size: 8.5 });
  return o;
})());

art['knit-blocking'] = svg(240, 160, 'ВТО: замочить, отжать в полотенце, сушить плашмя', (() => {
  let o = panel(4, 8, 74, 144) + panel(83, 8, 74, 144) + panel(162, 8, 74, 144);
  // таз
  o += `<path d="M14 70L22 118L60 118L68 70Z" style="fill:${SF};stroke:${INK}" stroke-width="1.6"/>`;
  o += `<path d="M18 82q6 -4 12 0t12 0t12 0t12 0" style="stroke:${MU}" stroke-width="1.4"/>`;
  o += yarn('M28 100c6 -6 14 6 20 0s10 -4 12 0', 4);
  o += t(41, 60, '30 °C', { size: 10, color: INK, weight: 800 });
  o += t(41, 136, '15–20 мин', { size: 8.5 });
  o += num(18, 22, 1);
  // рулон из полотенца
  o += `<rect x="92" y="74" width="56" height="34" rx="16" style="fill:${SF};stroke:${MU}" stroke-width="2"/>`;
  o += `<path d="M106 91a8 8 0 1 1 8 8a14 14 0 1 1 14 -14" style="stroke:${Y}" stroke-width="3"/>`;
  o += t(120, 136, 'не выкручивай', { size: 8.5 });
  o += num(97, 22, 2);
  // сушка плашмя
  o += `<rect x="168" y="56" width="62" height="70" rx="3" style="fill:${SF};stroke:${MU}" stroke-width="1.4"/>`;
  o += `<rect x="186" y="62" width="26" height="58" rx="2" style="stroke:${Y}" stroke-width="3"/>`;
  for (let i = 0; i < 6; i++) o += `<line x1="190" y1="${70 + i * 9}" x2="208" y2="${70 + i * 9}" style="stroke:${Y}" stroke-width="1.5"/>`;
  o += t(199, 136, 'плашмя, 1–2 дня', { size: 8.5 });
  o += num(176, 22, 3);
  return o;
})());

art['knit-chart'] = svg(240, 240, 'Простая схема: шахматка 8×8', (() => {
  let o = '';
  const x0 = 56, y0 = 12, c = 18;
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
    const row = 8 - r; // ряд снизу вверх
    const purl = ((row <= 4) ? k >= 4 : k < 4);
    o += `<rect x="${x0 + k * c}" y="${y0 + r * c}" width="${c}" height="${c}" style="fill:${SF};stroke:${MU}" stroke-width="1"/>`;
    if (purl) o += `<circle cx="${x0 + k * c + c / 2}" cy="${y0 + r * c + c / 2}" r="3.2" style="fill:${INK}"/>`;
    if (row % 2) o += k === 0 ? t(x0 + 8 * c + 10, y0 + r * c + 13, String(row), { size: 9, color: INK }) : '';
    else o += k === 0 ? t(x0 - 10, y0 + r * c + 13, String(row), { size: 9, color: INK }) : '';
  }
  o += `<rect x="${x0}" y="${y0}" width="${8 * c}" height="${8 * c}" style="stroke:${INK}" stroke-width="2"/>`;
  // направления
  o += arrow(x0 + 8 * c - 4, y0 + 8 * c + 12, x0 + 4 * c, y0 + 8 * c + 12, x0 + 4, y0 + 8 * c + 12, { w: 1.6 });
  o += t(120, y0 + 8 * c + 26, 'нечётные (лицо) — справа налево', { size: 8.5 }) + t(120, y0 + 8 * c + 37, 'чётные (изнанка) — слева направо', { size: 8.5 });
  // легенда
  const ly = 204;
  o += `<rect x="14" y="${ly}" width="14" height="14" style="fill:${SF};stroke:${MU}" stroke-width="1"/>`;
  o += t(32, ly + 11, 'лицевая на лице', { size: 9, anchor: 'start', color: INK });
  o += `<rect x="122" y="${ly}" width="14" height="14" style="fill:${SF};stroke:${MU}" stroke-width="1"/><circle cx="129" cy="${ly + 7}" r="3" style="fill:${INK}"/>`;
  o += t(140, ly + 11, 'изнаночная на лице', { size: 9, anchor: 'start', color: INK });
  o += t(120, 234, 'читай снизу вверх, ряд 1 — нижний', { size: 8.5 });
  return o;
})());

art['knit-scarf-plan'] = svg(240, 160, 'План шарфа по неделям', (() => {
  let o = '';
  const x0 = 20, x1 = 220, len = x1 - x0;
  o += `<rect x="${x0}" y="56" width="${len}" height="28" rx="4" style="fill:${SF};stroke:${MU}" stroke-width="1.4" stroke-dasharray="4 3"/>`;
  o += `<rect x="${x0}" y="56" width="${len * 0.5}" height="28" rx="4" style="fill:${Y}" opacity=".35"/>`;
  o += `<rect x="${x0}" y="56" width="${len * 0.06}" height="28" rx="4" style="fill:${Y}" opacity=".9"/>`;
  for (let i = 0; i < 20; i++) o += `<line x1="${x0 + 4 + i * 10}" y1="60" x2="${x0 + 4 + i * 10}" y2="80" style="stroke:${Y}" stroke-width="1" opacity=".5"/>`;
  const marks = [[0.06, 'нед. 2', '~10 см'], [0.5, 'нед. 3', '~80 см'], [1, 'нед. 4', '160 см']];
  marks.forEach(([p, a, b]) => {
    const x = x0 + len * p;
    o += `<line x1="${x}" y1="48" x2="${x}" y2="92" style="stroke:${AC}" stroke-width="2"/>`;
    o += t(Math.min(x, 214), 40, a, { size: 9, color: INK, weight: 800 });
    o += t(Math.min(x, 214), 106, b, { size: 9 });
  });
  o += t(120, 134, 'темп ≈ 12 см в день (≈ 45 рядов)', { size: 10, color: INK, weight: 700 });
  o += t(120, 150, 'ширина 18–20 см', { size: 9 });
  return o;
})());

art['knit-measure'] = svg(240, 160, 'Как мерить длину шарфа', (() => {
  let o = '';
  o += `<rect x="6" y="40" width="228" height="86" rx="6" style="fill:${SF};stroke:${MU}" stroke-width="1"/>`;
  o += `<rect x="20" y="54" width="150" height="40" style="stroke:${Y}" stroke-width="2.5"/>`;
  for (let i = 0; i < 14; i++) o += `<line x1="${26 + i * 10.6}" y1="58" x2="${26 + i * 10.6}" y2="90" style="stroke:${Y}" stroke-width="1.2" opacity=".6"/>`;
  o += needle(150, 46, 196, 102, 6) + needle(196, 46, 150, 102, 6, false);
  o += `<rect x="20" y="102" width="150" height="14" rx="2" style="fill:${SF};stroke:${INK}" stroke-width="1.4"/>`;
  for (let i = 0; i <= 30; i++) o += `<line x1="${20 + i * 5}" y1="102" x2="${20 + i * 5}" y2="${i % 10 ? 106 : 110}" style="stroke:${INK}" stroke-width="1"/>`;
  o += t(95, 30, 'от наборного края до спицы', { size: 9, color: INK });
  o += t(120, 146, 'на столе, не растягивая', { size: 9 });
  return o;
})());

export default art;
