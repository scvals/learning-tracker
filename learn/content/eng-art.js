// Иллюстрации-схемы для курса английского. Цвета только через CSS-переменные и currentColor.

const svg = (vb, body, label) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" fill="none" stroke-linecap="round" stroke-linejoin="round" font-family="inherit">${body}</svg>`;

// небольшие помощники для текста
const t = (x, y, s, size = 12, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" style="fill:var(--ink)" stroke="none" ${extra}>${s}</text>`;
const tm = (x, y, s, size = 10, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" style="fill:var(--muted)" stroke="none" ${extra}>${s}</text>`;
const ts = (x, y, s, size = 13, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" text-anchor="middle" style="fill:var(--skill)" stroke="none" ${extra}>${s}</text>`;
const arrowHead = (x, y, dir, color = 'var(--ink)') => {
  // dir: r | l | u | d
  const p = { r: [[-7, -4], [0, 0], [-7, 4]], l: [[7, -4], [0, 0], [7, 4]], u: [[-4, 7], [0, 0], [4, 7]], d: [[-4, -7], [0, 0], [4, -7]] }[dir];
  return `<path d="M${x + p[0][0]} ${y + p[0][1]} L${x} ${y} L${x + p[2][0]} ${y + p[2][1]}" style="stroke:${color}" stroke-width="2"/>`;
};

// кот-иконка (голова с ушками), cx, cy — центр головы
const catHead = (cx, cy, r = 11, color = 'var(--ink)') =>
  `<g style="stroke:${color}" stroke-width="2">
    <path d="M${cx - r} ${cy + 2} L${cx - r + 1} ${cy - r - 4} L${cx - r / 3} ${cy - r + 2} L${cx + r / 3} ${cy - r + 2} L${cx + r - 1} ${cy - r - 4} L${cx + r} ${cy + 2} Q${cx + r} ${cy + r} ${cx} ${cy + r} Q${cx - r} ${cy + r} ${cx - r} ${cy + 2} Z" style="fill:var(--surface);stroke:${color}"/>
    <circle cx="${cx - r / 2.6}" cy="${cy}" r="1.3" fill="currentColor" stroke="none"/>
    <circle cx="${cx + r / 2.6}" cy="${cy}" r="1.3" fill="currentColor" stroke="none"/>
    <path d="M${cx - 2} ${cy + 4} L${cx} ${cy + 5.5} L${cx + 2} ${cy + 4}" stroke-width="1.4"/>
  </g>`;

const art = {};

// 1. Звук th: язык между зубами (вид сбоку)
art['eng-th-tongue'] = svg('0 0 240 160', `
  <path d="M20 40 Q90 30 150 44 Q166 47 172 52" stroke="currentColor" stroke-width="2.5"/>
  <path d="M172 52 Q192 56 194 66 Q193 74 178 75" stroke="currentColor" stroke-width="2.5" style="fill:var(--surface);stroke:var(--ink)"/>
  <path d="M164 56 L176 56 L174 77 Q170 80 166 77 Z" stroke-width="2" style="fill:var(--surface);stroke:var(--ink)"/>
  <path d="M30 136 Q100 132 150 120 Q164 116 170 112" stroke="currentColor" stroke-width="2.5"/>
  <path d="M170 112 Q192 112 194 102 Q193 94 178 93" stroke-width="2.5" style="fill:var(--surface);stroke:var(--ink)"/>
  <path d="M162 111 L174 111 L172 92 Q168 89 164 92 Z" stroke-width="2" style="fill:var(--surface);stroke:var(--ink)"/>
  <path d="M40 120 Q70 84 120 80 Q160 78 186 82 Q200 85 186 89 Q160 93 140 100 Q100 112 60 124 Z" style="fill:var(--skill);stroke:var(--skill)" fill-opacity=".85" stroke-width="2"/>
  <path d="M204 72 L228 66 M206 84 L232 84 M204 96 L228 102" style="stroke:var(--muted)" stroke-width="2" stroke-dasharray="3 4"/>
  ${tm(214, 58, 'воздух')}
  <text x="100" y="104" font-size="12" font-weight="700" text-anchor="middle" style="fill:var(--surface)" stroke="none">язык</text>
  ${tm(150, 26, 'верхние зубы')}
  ${tm(130, 152, 'нижние зубы')}
  ${ts(40, 24, 'th', 18)}
  ${tm(78, 22, 'θ / ð')}
`, 'Звук th: кончик языка между зубами, воздух проходит наружу');

// 2. Линия времени: Present Simple против Past Simple
art['eng-timeline'] = svg('0 0 240 160', `
  <line x1="12" y1="82" x2="226" y2="82" stroke="currentColor" stroke-width="2.5"/>
  ${arrowHead(228, 82, 'r', 'currentColor')}
  <line x1="150" y1="68" x2="150" y2="96" style="stroke:var(--accent)" stroke-width="3"/>
  ${t(150, 112, 'сейчас', 11, 'font-weight="700"')}
  <circle cx="74" cy="82" r="7" style="fill:var(--skill);stroke:var(--skill)"/>
  ${t(74, 112, 'вчера', 11)}
  <path d="M74 72 L74 50" style="stroke:var(--skill)" stroke-width="2"/>
  ${ts(74, 26, 'Past Simple', 12)}
  ${t(74, 42, 'I worked yesterday.', 11)}
  <g style="fill:var(--accent)" stroke="none">
    <rect x="26" y="126" width="9" height="9" rx="2"/><rect x="58" y="126" width="9" height="9" rx="2"/><rect x="90" y="126" width="9" height="9" rx="2"/>
    <rect x="122" y="126" width="9" height="9" rx="2"/><rect x="154" y="126" width="9" height="9" rx="2"/><rect x="186" y="126" width="9" height="9" rx="2"/>
  </g>
  ${t(120, 152, 'Present Simple: I work every day.', 11)}
  ${tm(190, 26, 'обычно, всегда,')}
  ${tm(190, 38, 'каждый день')}
  <path d="M190 44 L190 120" style="stroke:var(--muted)" stroke-width="1.2" stroke-dasharray="2 4"/>
`, 'Линия времени: одно событие вчера — Past Simple; повторяется каждый день — Present Simple');

// 3. Циферблат: seven o'clock
const clockFace = (cx, cy, r) => {
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180, big = i % 5 === 0;
    const r1 = r - (big ? 10 : 5);
    ticks += `<line x1="${(cx + r1 * Math.sin(a)).toFixed(1)}" y1="${(cy - r1 * Math.cos(a)).toFixed(1)}" x2="${(cx + r * Math.sin(a)).toFixed(1)}" y2="${(cy - r * Math.cos(a)).toFixed(1)}" stroke="currentColor" stroke-width="${big ? 2.2 : 1}"/>`;
  }
  let nums = '';
  for (let h = 1; h <= 12; h++) {
    const a = (h * 30 * Math.PI) / 180, rr = r - 22;
    nums += t((cx + rr * Math.sin(a)).toFixed(1), (cy - rr * Math.cos(a) + 4.5).toFixed(1), h, 13);
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="currentColor" stroke-width="3" style="fill:var(--surface);stroke:var(--ink)"/>${ticks}${nums}`;
};
const hand = (cx, cy, len, deg, w, color) => {
  const a = (deg * Math.PI) / 180;
  return `<line x1="${cx}" y1="${cy}" x2="${(cx + len * Math.sin(a)).toFixed(1)}" y2="${(cy - len * Math.cos(a)).toFixed(1)}" style="stroke:${color}" stroke-width="${w}"/>`;
};
art['eng-clock-oclock'] = svg('0 0 240 240', `
  ${clockFace(120, 112, 92)}
  ${hand(120, 112, 48, 210, 6, 'var(--skill)')}
  ${hand(120, 112, 74, 0, 3.5, 'var(--ink)')}
  <circle cx="120" cy="112" r="5" fill="currentColor"/>
  ${ts(120, 228, "It's seven o'clock.", 15)}
`, "Часы показывают ровно семь: It's seven o'clock");

// 4. Циферблат: past (правая половина) и to (левая половина)
art['eng-clock-past-to'] = svg('0 0 240 240', `
  <path d="M120 120 L120 30 A90 90 0 0 1 120 210 Z" style="fill:var(--skill)" fill-opacity=".16" stroke="none"/>
  <path d="M120 120 L120 210 A90 90 0 0 1 120 30 Z" style="fill:var(--accent)" fill-opacity=".10" stroke="none"/>
  <circle cx="120" cy="120" r="90" stroke-width="3" style="stroke:var(--ink)"/>
  <line x1="120" y1="30" x2="120" y2="210" style="stroke:var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>
  ${ts(166, 112, 'past', 20)}
  ${tm(166, 128, '«после»', 11)}
  ${t(74, 112, 'to', 20, 'font-weight="700"')}
  ${tm(74, 128, '«без»', 11)}
  ${t(120, 22, "o'clock · 12", 11, 'font-weight="700"')}
  ${t(120, 230, 'half · 6', 11, 'font-weight="700"')}
  ${t(198, 124, '3', 11, 'font-weight="700"')}
  ${tm(196, 138, 'quarter', 9)}
  ${t(42, 124, '9', 11, 'font-weight="700"')}
  ${tm(44, 138, 'quarter', 9)}
  <path d="M148 52 A74 74 0 0 1 190 92" style="stroke:var(--skill)" stroke-width="2.5"/>
  ${arrowHead(190, 92, 'd', 'var(--skill)')}
  <path d="M50 94 A74 74 0 0 1 90 50" style="stroke:var(--ink)" stroke-width="2.5"/>
  <path d="M83 48 L90 50 L86 57" style="stroke:var(--ink)" stroke-width="2"/>
  ${tm(158, 176, 'ten past six', 9)}${t(158, 190, '6:10', 11, 'font-weight="700"')}
  ${tm(82, 176, 'ten to six', 9)}${t(82, 190, '5:50', 11, 'font-weight="700"')}
`, 'Циферблат: правая половина — past (после), левая — to (без)');

// 5. Сцена для there is / there are
art['eng-there-is'] = svg('0 0 240 160', `
  <line x1="8" y1="138" x2="232" y2="138" stroke="currentColor" stroke-width="2.5"/>
  <rect x="20" y="22" width="52" height="48" rx="3" stroke-width="2.5" style="stroke:var(--ink);fill:var(--surface)"/>
  <path d="M46 22 V70 M20 46 H72" stroke="currentColor" stroke-width="2"/>
  <rect x="150" y="22" width="48" height="34" rx="2" stroke-width="2" style="stroke:var(--ink)"/>
  <path d="M154 52 L168 36 L178 46 L184 40 L194 52" style="stroke:var(--skill)" stroke-width="2"/>
  <circle cx="186" cy="30" r="3" style="fill:var(--skill)" stroke="none"/>
  <path d="M108 92 H210" stroke="currentColor" stroke-width="4"/>
  <path d="M116 94 V138 M202 94 V138" stroke="currentColor" stroke-width="3"/>
  <rect x="128" y="76" width="14" height="15" rx="2" style="fill:var(--skill);stroke:var(--skill)" stroke-width="2"/>
  <path d="M142 80 Q149 83 142 88" style="stroke:var(--skill)" stroke-width="2"/>
  <circle cx="176" cy="85" r="6" style="fill:var(--accent)" stroke="none"/>
  <circle cx="188" cy="85" r="6" style="fill:var(--accent)" stroke="none"/>
  <path d="M30 138 V84 M30 108 H62 M62 108 V138" stroke="currentColor" stroke-width="2.5"/>
  <path d="M30 84 Q30 80 34 80" stroke="currentColor" stroke-width="2.5"/>
  <path d="M74 138 V84 M74 108 H100 M100 108 V138" stroke="currentColor" stroke-width="2.5"/>
  <g style="stroke:var(--ink)" stroke-width="2">
    <ellipse cx="152" cy="128" rx="18" ry="9" style="fill:var(--surface);stroke:var(--ink)"/>
    <path d="M134 128 Q124 124 126 114" />
  </g>
  ${catHead(174, 120, 9)}
`, 'Комната: окно, картина, стол с чашкой и двумя яблоками, два стула, кот под столом');

// 6. Колесо вопросительных слов
art['eng-question-wheel'] = (() => {
  const items = [['What', 'что'], ['Where', 'где'], ['When', 'когда'], ['Who', 'кто'], ['Why', 'почему'], ['How', 'как']];
  let body = `<circle cx="120" cy="120" r="104" stroke-width="2.5" style="stroke:var(--ink);fill:var(--surface)"/>`;
  items.forEach((_, i) => {
    const a = ((i * 60 + 30) * Math.PI) / 180;
    body += `<line x1="${(120 + 34 * Math.sin(a)).toFixed(1)}" y1="${(120 - 34 * Math.cos(a)).toFixed(1)}" x2="${(120 + 104 * Math.sin(a)).toFixed(1)}" y2="${(120 - 104 * Math.cos(a)).toFixed(1)}" style="stroke:var(--muted)" stroke-width="1.5"/>`;
  });
  items.forEach(([en, ru], i) => {
    const a = ((i * 60) * Math.PI) / 180;
    const x = 120 + 70 * Math.sin(a), y = 120 - 70 * Math.cos(a);
    body += ts(x.toFixed(1), (y + 1).toFixed(1), en, 15) + tm(x.toFixed(1), (y + 16).toFixed(1), ru, 11);
  });
  body += `<circle cx="120" cy="120" r="34" style="fill:var(--skill);stroke:var(--skill)"/>`;
  body += `<text x="120" y="133" font-size="38" font-weight="700" text-anchor="middle" style="fill:var(--surface)" stroke="none">?</text>`;
  return svg('0 0 240 240', body, 'Колесо вопросительных слов: what, where, when, who, why, how');
})();

// 7. Shadowing: цикл слушай — пауза — повтори — сравни
art['eng-shadowing'] = (() => {
  const box = (x, y, n, label) => `<rect x="${x}" y="${y}" width="86" height="46" rx="10" stroke-width="2" style="stroke:var(--ink);fill:var(--surface)"/>
    <circle cx="${x + 15}" cy="${y + 23}" r="9" style="fill:var(--skill)" stroke="none"/>
    <text x="${x + 15}" y="${y + 27}" font-size="11" font-weight="700" text-anchor="middle" style="fill:var(--surface)" stroke="none">${n}</text>
    <text x="${x + 54}" y="${y + 27.5}" font-size="12" text-anchor="middle" style="fill:var(--ink)" stroke="none">${label}</text>`;
  return svg('0 0 240 160', `
    ${box(10, 12, 1, 'Слушай')}
    ${box(144, 12, 2, 'Пауза')}
    ${box(144, 102, 3, 'Повтори')}
    ${box(10, 102, 4, 'Сравни')}
    <path d="M100 35 H138" style="stroke:var(--skill)" stroke-width="2.5"/>${arrowHead(140, 35, 'r', 'var(--skill)')}
    <path d="M187 62 V94" style="stroke:var(--skill)" stroke-width="2.5"/>${arrowHead(187, 96, 'd', 'var(--skill)')}
    <path d="M140 125 H102" style="stroke:var(--skill)" stroke-width="2.5"/>${arrowHead(100, 125, 'l', 'var(--skill)')}
    <path d="M53 98 V66" style="stroke:var(--skill)" stroke-width="2.5"/>${arrowHead(53, 64, 'u', 'var(--skill)')}
    ${t(120, 78, '1 фраза', 12, 'font-weight="700"')}
    ${tm(120, 92, '× 3–5 раз', 11)}
  `, 'Shadowing: слушай фразу, поставь паузу, повтори вслух, сравни, и так 3–5 раз');
})();

// 8. Карточка Anki: вопрос — ответ — оценка
art['eng-anki-flow'] = svg('0 0 240 160', `
  <rect x="8" y="30" width="62" height="80" rx="8" stroke-width="2" style="stroke:var(--ink);fill:var(--surface)"/>
  ${tm(39, 46, 'вопрос', 9)}
  ${ts(39, 76, 'cat', 16)}
  ${tm(39, 98, 'кэт', 10)}
  <path d="M74 70 H90" stroke="currentColor" stroke-width="2"/>${arrowHead(92, 70, 'r')}
  <rect x="96" y="30" width="62" height="80" rx="8" stroke-width="2" style="stroke:var(--ink);fill:var(--surface)"/>
  ${tm(127, 46, 'ответ', 9)}
  ${t(127, 76, 'кошка', 14, 'font-weight="700"')}
  <path d="M162 70 H172" stroke="currentColor" stroke-width="2"/>${arrowHead(174, 70, 'r')}
  <g stroke-width="1.8">
    <rect x="178" y="14" width="56" height="26" rx="6" style="stroke:var(--muted)"/>
    <rect x="178" y="46" width="56" height="26" rx="6" style="stroke:var(--muted)"/>
    <rect x="178" y="78" width="56" height="26" rx="6" style="stroke:var(--skill);fill:var(--skill)" fill-opacity=".18"/>
    <rect x="178" y="110" width="56" height="26" rx="6" style="stroke:var(--muted)"/>
  </g>
  ${t(206, 26, 'Снова', 10)}${tm(206, 36, '&lt;10 мин', 8)}
  ${t(206, 58, 'Трудно', 10)}${tm(206, 68, 'чуть позже', 8)}
  ${t(206, 90, 'Хорошо', 10, 'font-weight="700"')}${tm(206, 100, '1 день', 8)}
  ${t(206, 122, 'Легко', 10)}${tm(206, 132, '3–4 дня', 8)}
  ${tm(84, 132, 'сначала вспомни,', 10)}
  ${tm(84, 145, 'потом открой ответ', 10)}
`, 'Карточка Anki: видишь слово, вспоминаешь, открываешь ответ и честно оцениваешь');

// 9. Глагол to be: am / is / are
art['eng-to-be'] = (() => {
  const row = (y, who, form, ru) => `
    <rect x="10" y="${y}" width="104" height="36" rx="18" stroke-width="2" style="stroke:var(--ink);fill:var(--surface)"/>
    ${t(62, y + 23, who, 14)}
    <path d="M120 ${y + 18} H146" stroke="currentColor" stroke-width="2"/>${arrowHead(148, y + 18, 'r')}
    <rect x="154" y="${y}" width="74" height="36" rx="18" style="fill:var(--skill);stroke:var(--skill)" stroke-width="2"/>
    <text x="191" y="${y + 24}" font-size="17" font-weight="700" text-anchor="middle" style="fill:var(--surface)" stroke="none">${form}</text>
    ${tm(62, y + 47, ru, 9)}`;
  return svg('0 0 240 160', row(4, 'I', 'am', 'я') + row(56, 'he · she · it', 'is', 'он · она · оно') + row(108, 'you · we · they', 'are', 'ты/вы · мы · они'), 'Глагол to be: I am; he, she, it is; you, we, they are');
})();

// 10. Present Simple: -s у he/she/it
art['eng-third-s'] = svg('0 0 240 160', `
  <rect x="8" y="14" width="224" height="52" rx="12" stroke-width="2" style="stroke:var(--muted)"/>
  ${tm(120, 32, 'I · you · we · they', 12)}
  ${t(120, 56, 'I work.   They live.', 17)}
  <rect x="8" y="80" width="224" height="66" rx="12" stroke-width="2.5" style="stroke:var(--skill)"/>
  ${tm(120, 98, 'he · she · it', 12)}
  <text x="120" y="126" font-size="17" text-anchor="middle" style="fill:var(--ink)" stroke="none">She work<tspan font-weight="700" style="fill:var(--skill)">s</tspan>.   He live<tspan font-weight="700" style="fill:var(--skill)">s</tspan>.</text>
  ${tm(120, 141, '+ s на конце глагола', 10)}
`, 'Present Simple: с he, she, it к глаголу добавляется s: She works');

// 11. Артикли a и the
art['eng-articles'] = svg('0 0 240 160', `
  <line x1="120" y1="12" x2="120" y2="148" style="stroke:var(--muted)" stroke-width="1.5" stroke-dasharray="3 5"/>
  ${catHead(30, 52, 11, 'var(--muted)')}
  ${catHead(62, 40, 11, 'var(--ink)')}
  ${catHead(94, 56, 11, 'var(--muted)')}
  ${catHead(46, 86, 11, 'var(--muted)')}
  ${catHead(80, 90, 11, 'var(--muted)')}
  ${ts(60, 128, 'a cat', 17)}
  ${tm(60, 144, 'какой-то, один из', 10)}
  ${catHead(180, 66, 18, 'var(--skill)')}
  <path d="M208 30 L194 44" style="stroke:var(--skill)" stroke-width="2.5"/>
  <path d="M194 37 L194 44 L201 44" style="stroke:var(--skill)" stroke-width="2.5"/>
  ${ts(180, 128, 'the cat', 17)}
  ${tm(180, 144, 'тот самый, известный', 10)}
`, 'Артикли: a cat — какая-то кошка из многих; the cat — та самая кошка');

// 12. Окончание -ed: три способа прочитать
art['eng-ed-sounds'] = (() => {
  const col = (x, snd, ru, w1, w2, hl) => `
    <rect x="${x}" y="10" width="70" height="140" rx="10" stroke-width="2" style="stroke:${hl ? 'var(--skill)' : 'var(--ink)'};fill:var(--surface)"/>
    ${ts(x + 35, 36, snd, 18)}
    ${tm(x + 35, 52, ru, 9)}
    <line x1="${x + 10}" y1="62" x2="${x + 60}" y2="62" style="stroke:var(--muted)" stroke-width="1"/>
    ${t(x + 35, 86, w1, 13)}
    ${t(x + 35, 108, w2, 13)}`;
  return svg('0 0 240 160', `
    ${col(6, '[t]', 'после глухих', 'worked', 'watched')}
    ${col(85, '[d]', 'после звонких', 'played', 'lived', true)}
    ${col(164, '[ɪd]', 'после t, d', 'wanted', 'visited')}
    ${tm(41, 136, 'уёкт', 10)}${tm(120, 136, 'плэйд', 10)}${tm(199, 136, 'уа́нтид', 10)}
  `, 'Окончание -ed читается как т, д или ид');
})();

// 13. Контрольное видео: оценка % понятого
art['eng-video-percent'] = (() => {
  let seg = '';
  for (let i = 0; i < 10; i++) {
    const x = 16 + i * 21, ok = [0, 1, 2, 4, 5, 7, 8].includes(i);
    seg += `<rect x="${x}" y="112" width="17" height="20" rx="3" stroke-width="1.8" style="stroke:${ok ? 'var(--skill)' : 'var(--muted)'};fill:${ok ? 'var(--skill)' : 'none'}" fill-opacity="${ok ? '.85' : '0'}"/>`;
  }
  return svg('0 0 240 160', `
    <rect x="50" y="8" width="140" height="84" rx="10" stroke-width="2.5" style="stroke:var(--ink);fill:var(--surface)"/>
    <path d="M110 34 L136 50 L110 66 Z" style="fill:var(--skill);stroke:var(--skill)" stroke-width="2"/>
    <line x1="62" y1="82" x2="178" y2="82" style="stroke:var(--muted)" stroke-width="2"/>
    <line x1="62" y1="82" x2="120" y2="82" style="stroke:var(--skill)" stroke-width="3"/>
    ${seg}
    ${tm(120, 106, '10 кусочков по 30 секунд', 10)}
    ${ts(120, 152, 'понятна суть 7 из 10 → 70%', 12)}
  `, 'Контрольное видео делится на 10 кусочков; сколько понятно — столько десятков процентов');
})();

// 14. Запись себя на телефон: 1 минута
art['eng-record-phone'] = svg('0 0 240 160', `
  <rect x="84" y="8" width="72" height="144" rx="12" stroke-width="2.5" style="stroke:var(--ink);fill:var(--surface)"/>
  <line x1="110" y1="18" x2="130" y2="18" stroke="currentColor" stroke-width="2.5"/>
  ${t(120, 54, '0:58', 18, 'font-weight="700"')}
  <path d="M96 76 v8 M102 70 v20 M108 74 v12 M114 66 v28 M120 72 v16 M126 68 v24 M132 74 v12 M138 70 v20 M144 76 v8" style="stroke:var(--skill)" stroke-width="2.5"/>
  <circle cx="120" cy="124" r="15" style="fill:var(--skill);stroke:var(--skill)"/>
  <rect x="115" y="113" width="10" height="15" rx="5" style="fill:var(--surface)" stroke="none"/>
  <path d="M112 123 Q112 132 120 132 Q128 132 128 123 M120 132 V136" style="stroke:var(--surface)" stroke-width="1.8"/>
  <path d="M60 50 Q48 80 60 110 M44 40 Q28 80 44 120" style="stroke:var(--muted)" stroke-width="2"/>
  <path d="M180 50 Q192 80 180 110 M196 40 Q212 80 196 120" style="stroke:var(--muted)" stroke-width="2"/>
`, 'Телефон записывает голос: диктофон, около одной минуты');

// 15. Разговор с ИИ: чат и голос
art['eng-ai-chat'] = svg('0 0 240 160', `
  <path d="M14 14 H150 Q158 14 158 22 V48 Q158 56 150 56 H34 L22 66 L24 56 H22 Q14 56 14 48 V22 Q14 14 22 14 Z" stroke-width="2" style="stroke:var(--ink);fill:var(--surface)"/>
  ${tm(28, 29, 'ИИ', 10, 'text-anchor="start"')}
  <text x="24" y="46" font-size="12" style="fill:var(--ink)" stroke="none">Where do you live?</text>
  <path d="M90 74 H218 Q226 74 226 82 V106 Q226 114 218 114 H216 L218 124 L206 114 H98 Q90 114 90 106 V82 Q90 74 98 74 Z" style="fill:var(--skill);stroke:var(--skill)" fill-opacity=".18" stroke-width="2"/>
  ${tm(212, 88, 'ты', 10, 'text-anchor="end"')}
  <text x="102" y="105" font-size="12" style="fill:var(--ink)" stroke="none">I live in Kazan.</text>
  <circle cx="42" cy="124" r="18" style="fill:var(--skill);stroke:var(--skill)"/>
  <rect x="37" y="112" width="10" height="16" rx="5" style="fill:var(--surface)" stroke="none"/>
  <path d="M33 123 Q33 133 42 133 Q51 133 51 123 M42 133 V137" style="stroke:var(--surface)" stroke-width="1.8"/>
  ${tm(42, 154, 'голосом', 10)}
`, 'Разговор с ИИ: вопрос, твой ответ, можно голосом');

// 16. Числа -teen и -ty: куда падает ударение
art['eng-teen-ty'] = svg('0 0 240 160', `
  <rect x="8" y="16" width="108" height="128" rx="12" stroke-width="2" style="stroke:var(--skill)"/>
  <rect x="124" y="16" width="108" height="128" rx="12" stroke-width="2" style="stroke:var(--ink)"/>
  ${t(62, 44, '13', 22, 'font-weight="700"')}
  <text x="62" y="72" font-size="15" text-anchor="middle" style="fill:var(--ink)" stroke="none">thir<tspan font-weight="700" style="fill:var(--skill)">TEEN</tspan></text>
  ${tm(62, 92, 'сёти́ин', 11)}
  ${tm(62, 116, 'ударение в конце,', 10)}
  ${tm(62, 129, 'долгое «ии», ясное n', 10)}
  ${t(178, 44, '30', 22, 'font-weight="700"')}
  <text x="178" y="72" font-size="15" text-anchor="middle" style="fill:var(--ink)" stroke="none"><tspan font-weight="700" style="fill:var(--skill)">THIR</tspan>ty</text>
  ${tm(178, 92, 'сё́ти', 11)}
  ${tm(178, 116, 'ударение в начале,', 10)}
  ${tm(178, 129, 'короткое «и»', 10)}
`, 'Thirteen и thirty различаются ударением');

export default art;
