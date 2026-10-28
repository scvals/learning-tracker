// Экран «Итоги»: статистика по навыкам, календарь активности, динамика показателей,
// промежуточные и итоговые отчёты, продление плана.

import * as store from '../store.js';
import { h, ico, toast, sheet, confirmDialog, formDialog } from '../ui.js';
import { todayISO, weekOf, weekRange, daysOfWeek, formatLong, formatShort, formatNumeric, weekdayShort, dayNum, plural } from '../dates.js';
import { computeStreak } from '../streak.js';
import { decor } from '../decor.js';

const DAYS = ['день', 'дня', 'дней'];
const WEEKS = ['неделя', 'недели', 'недель'];
const CHART_TYPES = new Set(['number', 'scale', 'percent']);

export function render(root, ctx) {
  const today = todayISO();
  const s = store.settings();
  const weeks = store.planWeeks();
  const start = s.startDate;
  const cur = store.currentWeek();
  const calW = store.calendarWeek();

  const range = start ? [weekRange(1, start)[0], weekRange(weeks, start)[1]] : null;
  const subText = !start ? 'Дата начала не задана'
    : calW === 0 ? 'План ещё не начался'
      : calW > weeks ? `План из ${weeks} ${plural(weeks, ['недели', 'недель', 'недель'])} пройден`
        : `Неделя ${cur} из ${weeks}`;

  root.append(h('div', { class: 'summary stack' },
    h('div', { class: 'page-head' },
      h('h1', { class: 'h1 page-head__title' }, 'Итоги'),
      h('div', { class: 'page-head__sub' }, subText, range && ` · ${formatShort(range[0])} – ${formatShort(range[1])}`)),
    s.finishedAt && h('div', { class: 'card summary-finished' },
      h('div', { class: 'summary-finished__art', 'aria-hidden': 'true', html: safeDecor('celebrate', s.skin) }),
      h('p', { class: 'hand summary-finished__text' }, `План завершён ${formatNumeric(s.finishedAt)}`),
      h('p', { class: 'small muted' }, 'Можно продлить план и продолжить — история сохранится.')),
    actionsSection(),
    overviewSection(),
    start && heatmapSection(),
    savedSection()));

  // ---------- действия ----------

  function actionsSection() {
    return h('section', { class: 'section summary-actions' },
      h('h2', { class: 'section__title' }, 'Подвести итог'),
      h('div', { class: 'grid-2' },
        h('button', { class: 'btn', type: 'button', onclick: () => createSummary('interim') }, ico('note'), h('span', null, 'Промежуточный итог')),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => createSummary('final') }, ico('trophy'), h('span', null, 'Итоговый отчёт'))),
      h('div', { class: 'card summary-extend' },
        h('div', { class: 'summary-extend__text' },
          h('strong', null, 'Продлить план'),
          h('span', { class: 'small muted' }, `Сейчас ${weeks} ${plural(weeks, WEEKS)}. Новые недели появятся в «Плане».`)),
        h('div', { class: 'chips' },
          [1, 2, 4].map((n) => h('button', { class: 'chip', type: 'button', 'aria-label': `Продлить на ${n} ${plural(n, WEEKS)}`, onclick: () => extend(n) },
            `+${n} ${plural(n, ['нед.', 'нед.', 'нед.'])}`)))));
  }

  async function extend(n) {
    const total = weeks + n;
    const ok = await confirmDialog({
      title: 'Продлить план?',
      text: `План станет ${total} ${plural(total, ['неделя', 'недели', 'недель'])}: добавятся недели ${weeks + 1}${n > 1 ? `–${total}` : ''}.${s.finishedAt ? ' Отметка «план завершён» снимется.' : ''}`,
      okText: 'Продлить',
    });
    if (!ok) return;
    store.setSettings({ weeks: total, finishedAt: null });
    toast(`План продлён до ${total} ${plural(total, ['недели', 'недель', 'недель'])}`, {
      action: 'Отменить', timeout: 5000, onAction: () => store.setSettings({ weeks, finishedAt: s.finishedAt ?? null }),
    });
  }

  // ---------- обзор по навыкам ----------

  function overviewSection() {
    const skills = store.skills();
    return h('section', { class: 'section stack' },
      h('h2', { class: 'section__title' }, 'По навыкам'),
      skills.length ? skills.map(skillOverview) : h('p', { class: 'empty muted' }, 'Нет навыков.'));
  }

  function skillOverview(skill) {
    const st = skillStats(skill);
    const perWeekMax = 7;
    return h('article', { class: `card card--skill sk-${skill.color} summary-skill`, 'aria-label': skill.name },
      h('div', { class: 'card__head' },
        h('span', { class: 'card__icon' }, ico(skill.icon || 'star')),
        h('h3', { class: 'card__title' }, skill.name)),
      h('div', { class: 'card__body stack' },
        h('div', { class: 'summary-stats' },
          stat(st.days, plural(st.days, ['день занятий', 'дня занятий', 'дней занятий'])),
          stat(st.minutes, plural(st.minutes, ['минута', 'минуты', 'минут'])),
          stat(st.current, `серия · лучшая ${st.best}`, 'flame'),
          stat(st.tasksTotal ? `${st.tasksPct}%` : '—', st.tasksTotal ? `заданий (${st.tasksDone} из ${st.tasksTotal})` : 'заданий нет')),
        st.checkTotal > 0 && h('div', { class: 'summary-check' },
          h('div', { class: 'row row--between small' },
            h('span', null, skill.checklistTitle || 'Чек-лист'),
            h('span', { class: 'num' }, `освоено ${st.mastered} из ${st.checkTotal}`)),
          h('div', { class: 'progress progress--skill' }, h('div', { class: 'progress__bar', style: { width: `${Math.round(st.mastered / st.checkTotal * 100)}%` } }))),
        h('div', { class: 'summary-weeks' },
          h('div', { class: 'small muted' }, 'Дней по неделям'),
          h('div', { class: 'summary-weeks__bars' },
            st.perWeek.map((n, i) => h('div', { class: `summary-weeks__col${i + 1 === calW ? ' is-current' : ''}`, title: `Неделя ${i + 1}: ${n} ${plural(n, DAYS)}` },
              h('span', { class: 'summary-weeks__val num small' }, n),
              h('span', { class: 'summary-weeks__track' }, h('span', { class: 'summary-weeks__bar', style: { height: `${Math.round(n / perWeekMax * 100)}%` } })),
              h('span', { class: 'summary-weeks__lbl small muted' }, `Н${i + 1}`))))),
        metricsBlock(skill)));
  }

  function stat(value, label, icon) {
    return h('div', { class: 'summary-stat' },
      h('span', { class: 'big-num summary-stat__val' }, icon && ico(icon, 'ico ico--sm'), String(value)),
      h('span', { class: 'small muted summary-stat__lbl' }, label));
  }

  function metricsBlock(skill) {
    const ms = store.metrics(skill.id);
    if (!ms.length) return null;
    return h('div', { class: 'summary-metrics stack stack--sm' },
      h('div', { class: 'small muted' }, 'Показатели'),
      ms.map((m) => {
        const series = Array.from({ length: weeks }, (_, i) => {
          const v = store.journal(i + 1).values?.[m.id];
          return v === undefined || v === null || v === '' ? null : v;
        });
        const lastIdx = series.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop();
        const last = lastIdx === undefined ? null : series[lastIdx];
        const chartable = CHART_TYPES.has(m.type) && series.some((v) => v !== null && Number.isFinite(Number(v)));
        return h('div', { class: 'summary-metric' },
          h('div', { class: 'summary-metric__head' },
            h('span', { class: 'summary-metric__label' }, m.label),
            h('span', { class: 'summary-metric__value num' },
              last === null ? h('span', { class: 'muted' }, 'нет данных') : formatValue(m, last),
              lastIdx !== undefined && h('span', { class: 'small muted' }, ` · нед. ${lastIdx + 1}`))),
          chartable && sparkline(series.map((v) => (v === null ? null : Number(v))), m),
          chartable && trendNote(series, m));
      }));
  }

  function trendNote(series, m) {
    const vals = series.map((v, i) => [i, v]).filter(([, v]) => v !== null).map(([i, v]) => [i, Number(v)]);
    if (vals.length < 2) return null;
    const [fi, first] = vals[0];
    const [li, last] = vals[vals.length - 1];
    const diff = last - first;
    const better = m.lowerIsBetter ? diff < 0 : diff > 0;
    const cls = diff === 0 ? 'delta--same' : better ? 'delta--up' : 'delta--down';
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
    return h('div', { class: 'small muted' },
      h('span', { class: `delta ${cls}` }, `${sign}${fmtNum(Math.abs(diff))}${m.unit ? ' ' + m.unit : ''}`),
      ` с недели ${fi + 1} по ${li + 1}${m.lowerIsBetter ? ' (меньше — лучше)' : ''}`);
  }

  // ---------- календарь ----------

  function heatmapSection() {
    const skills = store.skills();
    const n = skills.length || 1;
    const first = daysOfWeek(1, start);
    return h('section', { class: 'section' },
      h('h2', { class: 'section__title' }, 'Календарь занятий'),
      h('div', { class: 'card summary-heat' },
        h('div', { class: 'summary-heat__grid', role: 'grid', 'aria-label': 'Календарь занятий' },
          h('div', { class: 'summary-heat__row summary-heat__row--head', role: 'row' },
            h('span', { class: 'summary-heat__wk' }),
            first.map((d) => h('span', { class: 'summary-heat__wd small muted', role: 'columnheader' }, weekdayShort(d)))),
          Array.from({ length: weeks }, (_, i) => i + 1).map((w) =>
            h('div', { class: `summary-heat__row${w === calW ? ' is-current' : ''}`, role: 'row' },
              h('span', { class: 'summary-heat__wk small muted' }, `Н${w}`),
              daysOfWeek(w, start).map((d) => {
                const future = d > today;
                const done = skills.filter((sk) => store.day(d, sk.id)?.done).length;
                const level = done === 0 ? 0 : Math.max(1, Math.round((done / n) * 4));
                return h('button', {
                  class: `summary-heat__cell lvl-${level}${d === today ? ' is-today' : ''}${future ? ' is-future' : ''}`,
                  type: 'button', role: 'gridcell',
                  'aria-label': `${formatLong(d)}: ${future ? 'ещё впереди' : `${done} из ${skills.length}`}`,
                  title: `${formatShort(d)}: ${done} из ${skills.length}`,
                  onclick: () => dayDetails(d),
                }, h('span', { class: 'summary-heat__num' }, dayNum(d)));
              })))),
        h('div', { class: 'summary-heat__legend small muted', 'aria-hidden': 'true' },
          h('span', null, 'меньше'),
          [0, 1, 2, 3, 4].map((l) => h('span', { class: `summary-heat__cell summary-heat__swatch lvl-${l}` })),
          h('span', null, 'больше'))));
  }

  function dayDetails(d) {
    const skills = store.skills();
    const future = d > today;
    const rows = skills.map((sk) => {
      const r = store.day(d, sk.id) || {};
      return h('li', { class: `list__item summary-dayrow sk-${sk.color}${r.done ? ' is-done' : ''}` },
        h('span', { class: 'summary-dayrow__icon' }, ico(r.done ? 'check' : sk.icon || 'star')),
        h('div', { class: 'summary-dayrow__text' },
          h('strong', null, sk.name),
          h('span', { class: 'small muted' }, r.done ? `занимался${r.minutes ? ` · ${r.minutes} мин` : ''}` : r.minutes ? `${r.minutes} мин, без отметки` : 'не отмечено'),
          r.note && h('span', { class: 'small summary-dayrow__note' }, r.note)));
    });
    const w = weekOf(d, start);
    const sh = sheet({
      title: `${formatLong(d)}${w ? ` · неделя ${w}` : ''}`,
      content: future ? h('p', { class: 'muted' }, 'Этот день ещё впереди.') : h('ul', { class: 'list' }, rows),
      actions: future ? null : [
        h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => { sh.close(); ctx.navigate('today', d === today ? undefined : { date: d }); } },
          ico('sun'), h('span', null, d === today ? 'Открыть «Сегодня»' : 'Открыть этот день')),
      ],
    });
  }

  // ---------- отчёты ----------

  function snapshot() {
    const out = { week: cur, calendarWeek: calW, weeks, startDate: start, date: today, skills: {} };
    for (const sk of store.skills()) {
      const st = skillStats(sk);
      out.skills[sk.id] = {
        name: sk.name, color: sk.color, icon: sk.icon,
        days: st.days, minutes: st.minutes, current: st.current, best: st.best,
        tasksDone: st.tasksDone, tasksTotal: st.tasksTotal, mastered: st.mastered, checkTotal: st.checkTotal,
        perWeek: st.perWeek,
        metrics: store.metrics(sk.id).map((m) => ({ label: m.label, value: latestValue(m), text: latestValue(m) === null ? null : formatValue(m, latestValue(m)) })),
      };
    }
    return out;
  }

  function statLine(st) {
    const bits = [`${st.days} ${plural(st.days, DAYS)}`, `${st.minutes} мин`];
    if (st.tasksTotal) bits.push(`заданий ${st.tasksDone}/${st.tasksTotal}`);
    if (st.checkTotal) bits.push(`освоено ${st.mastered}/${st.checkTotal}`);
    return bits.join(' · ');
  }

  async function summaryForm(kind, rec) {
    const skills = store.skills();
    const noteSkills = rec ? [...skills, ...Object.keys(rec.notes || {}).filter((id) => !store.skill(id)).map((id) => ({ id, name: rec.snapshot?.skills?.[id]?.name || 'Навык' }))] : skills;
    const fields = [
      { name: 'title', label: 'Название', type: 'text', required: true,
        value: rec?.title ?? (kind === 'final' ? 'Итоговый отчёт' : `Итог недели ${Math.max(cur, 1)}`) },
      { name: 'overall', label: kind === 'final' ? 'Общий итог плана' : 'Как идут дела в целом', type: 'textarea', rows: 4,
        value: rec?.overall ?? '', placeholder: kind === 'final' ? 'Чему научились, что дальше…' : 'Что получается, что мешает, что поменять…' },
      ...noteSkills.map((sk, i) => ({
        name: `n${i}`, label: sk.name, type: 'textarea', rows: 2, value: rec?.notes?.[sk.id] ?? '',
        hint: store.skill(sk.id) ? statLine(skillStats(sk)) : undefined,
        placeholder: 'Заметка по навыку',
      })),
    ];
    const v = await formDialog({
      title: rec ? 'Изменить итог' : kind === 'final' ? 'Итоговый отчёт' : 'Промежуточный итог',
      fields,
      okText: rec ? 'Сохранить' : kind === 'final' ? 'Завершить план' : 'Сохранить итог',
    });
    if (!v) return null;
    const notes = {};
    noteSkills.forEach((sk, i) => { if (v[`n${i}`]) notes[sk.id] = v[`n${i}`]; });
    return { title: v.title, overall: v.overall, notes };
  }

  async function createSummary(kind) {
    const data = await summaryForm(kind);
    if (!data) return;
    store.put('summaries', { kind, createdAt: today, week: cur, ...data, snapshot: snapshot() });
    if (kind === 'final') {
      store.setSettings({ finishedAt: today }); // перерисует экран
      celebrate();
    } else {
      toast('Промежуточный итог сохранён');
      ctx.rerender();
    }
  }

  function celebrate() {
    const sh = sheet({
      title: 'План завершён!',
      content: h('div', { class: 'summary-celebrate' },
        h('div', { class: 'summary-celebrate__art', 'aria-hidden': 'true', html: safeDecor('celebrate', s.skin) }),
        h('p', { class: 'hand summary-celebrate__text' }, 'Вы прошли весь путь. Отчёт сохранён.'),
        h('p', { class: 'small muted' }, 'Если хочется продолжать — план можно продлить в любой момент.')),
      actions: [h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: () => sh.close() }, 'Ура!')],
    });
  }

  function savedSection() {
    const list = store.summaries();
    return h('section', { class: 'section stack' },
      h('h2', { class: 'section__title' }, 'Сохранённые итоги'),
      list.length
        ? list.map((r) => h('button', { class: `card summary-saved${r.kind === 'final' ? ' is-final' : ''}`, type: 'button', onclick: () => openSummary(r) },
          h('div', { class: 'row row--between' },
            h('span', { class: `badge${r.kind === 'final' ? ' badge--accent' : ''}` }, r.kind === 'final' ? 'Итоговый' : 'Промежуточный'),
            h('span', { class: 'small muted' }, `${r.createdAt ? formatNumeric(r.createdAt) : ''}${r.week ? ` · нед. ${r.week}` : ''}`)),
          h('strong', { class: 'summary-saved__title' }, r.title || 'Без названия'),
          r.overall && h('span', { class: 'small muted summary-saved__excerpt' }, r.overall)))
        : h('div', { class: 'empty' },
          h('p', { class: 'muted' }, 'Пока нет сохранённых итогов. Промежуточный итог удобно делать в конце каждой недели.')));
  }

  function openSummary(r) {
    const snap = r.snapshot?.skills || {};
    const ids = [...new Set([...Object.keys(snap), ...Object.keys(r.notes || {})])];
    const content = h('div', { class: 'stack summary-read' },
      h('p', { class: 'small muted' },
        `${r.kind === 'final' ? 'Итоговый отчёт' : 'Промежуточный итог'} · ${r.createdAt ? formatLong(r.createdAt) : ''}${r.week ? ` · неделя ${r.week}` : ''}`),
      r.overall ? h('p', { class: 'summary-read__overall' }, r.overall) : h('p', { class: 'muted' }, 'Общий текст не заполнен.'),
      ids.map((id) => {
        const sn = snap[id];
        const sk = store.skill(id);
        const color = sk?.color ?? sn?.color ?? 1;
        return h('div', { class: `card card--skill sk-${color} summary-read__skill` },
          h('div', { class: 'card__head' },
            h('span', { class: 'card__icon' }, ico(sk?.icon || sn?.icon || 'star')),
            h('h3', { class: 'card__title' }, sk?.name || sn?.name || 'Навык')),
          h('div', { class: 'card__body stack stack--sm' },
            sn && h('div', { class: 'small muted' }, statLine({ days: sn.days, minutes: sn.minutes, tasksDone: sn.tasksDone, tasksTotal: sn.tasksTotal, mastered: sn.mastered, checkTotal: sn.checkTotal }),
              sn.best ? ` · лучшая серия ${sn.best}` : ''),
            sn?.metrics?.some((m) => m.text) && h('div', { class: 'small' },
              sn.metrics.filter((m) => m.text).map((m) => h('div', null, `${m.label}: `, h('span', { class: 'num' }, m.text)))),
            r.notes?.[id] && h('p', null, r.notes[id])));
      }));
    const sh = sheet({
      title: r.title || 'Итог',
      content,
      actions: [
        h('button', { class: 'btn btn--ghost btn--danger', type: 'button', onclick: async () => {
          const ok = await confirmDialog({ title: 'Удалить итог?', text: `«${r.title || 'Итог'}» будет удалён.`, okText: 'Удалить', danger: true });
          if (!ok) return;
          sh.close();
          store.remove('summaries', r.id);
          toast('Итог удалён');
          ctx.rerender();
        } }, ico('trash'), h('span', null, 'Удалить')),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => {
          sh.close();
          const data = await summaryForm(r.kind, r);
          if (!data) return;
          store.patch('summaries', r.id, data);
          toast('Итог сохранён');
          ctx.rerender();
        } }, ico('edit'), h('span', null, 'Изменить')),
      ],
    });
  }

  // ---------- расчёты ----------

  function skillStats(skill) {
    const dates = store.doneDates(skill.id);
    const streak = computeStreak(dates, today);
    const minutes = store.list('days', (d) => d.skillId === skill.id).reduce((sum, d) => sum + (Number(d.minutes) || 0), 0);
    const perWeek = Array.from({ length: weeks }, () => 0);
    if (start) for (const d of dates) { const w = weekOf(d, start); if (w >= 1 && w <= weeks) perWeek[w - 1]++; }
    const tasks = store.list('tasks', (t) => t.skillId === skill.id && t.week >= 1 && t.week <= weeks);
    const tasksDone = tasks.filter((t) => t.done).length;
    const items = store.checklist(skill.id);
    const mastered = items.filter((it) => store.masteredWeek(it.id) !== null).length;
    return {
      days: dates.length, minutes, current: streak.current, best: streak.best, perWeek,
      tasksDone, tasksTotal: tasks.length, tasksPct: tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0,
      mastered, checkTotal: items.length,
    };
  }

  function latestValue(m) {
    for (let w = weeks; w >= 1; w--) {
      const v = store.journal(w).values?.[m.id];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }
}

// ---------- вне render ----------

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ',');
}

function formatValue(m, v) {
  if (m.type === 'bool') return v === true || v === 'true' || v === 1 ? 'да' : 'нет';
  if (m.type === 'select') return String(v);
  if (m.type === 'scale') return `${fmtNum(Number(v))} из 5`;
  if (m.type === 'percent') return `${fmtNum(Number(v))}%`;
  const n = Number(v);
  return `${Number.isFinite(n) ? fmtNum(n) : v}${m.unit ? ' ' + m.unit : ''}`;
}

// Маленький график по неделям: линия + точки, пропуски — разрывы.
function sparkline(series, m) {
  const W = 300, H = 56, PX = 8, PY = 8;
  const nums = series.filter((v) => v !== null);
  let min = Math.min(...nums), max = Math.max(...nums);
  if (m.type === 'scale') { min = Math.min(min, 1); max = Math.max(max, 5); }
  if (m.type === 'percent') { min = Math.min(min, 0); max = Math.max(max, 100); }
  if (min === max) { min -= 1; max += 1; }
  const n = series.length;
  const x = (i) => (n === 1 ? W / 2 : PX + (i * (W - 2 * PX)) / (n - 1));
  const y = (v) => H - PY - ((v - min) / (max - min)) * (H - 2 * PY);
  const segs = [];
  let curSeg = [];
  series.forEach((v, i) => {
    if (v === null) { if (curSeg.length) segs.push(curSeg); curSeg = []; } else curSeg.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  });
  if (curSeg.length) segs.push(curSeg);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'summary-spark');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${m.label} по неделям: ${series.map((v, i) => `неделя ${i + 1} — ${v === null ? 'нет' : fmtNum(v)}`).join(', ')}`);
  const add = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); svg.append(el); return el; };
  add('line', { x1: PX, x2: W - PX, y1: H - PY, y2: H - PY, class: 'summary-spark__base', 'vector-effect': 'non-scaling-stroke' });
  const allPts = series.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
  if (segs.length > 1) add('polyline', { points: allPts.join(' '), class: 'summary-spark__gap', 'vector-effect': 'non-scaling-stroke' });
  for (const seg of segs) {
    if (seg.length > 1) add('polyline', { points: seg.join(' '), class: 'summary-spark__line', 'vector-effect': 'non-scaling-stroke' });
  }
  const wrap = document.createElement('div');
  wrap.className = 'summary-spark-wrap';
  const plot = document.createElement('div');
  plot.className = 'summary-spark__plot';
  plot.append(svg);
  wrap.append(plot);
  series.forEach((v, i) => {
    if (v === null) return;
    const dot = document.createElement('span');
    dot.className = 'summary-spark__dot';
    dot.style.left = `${(x(i) / W) * 100}%`;
    dot.style.top = `${(y(v) / H) * 100}%`;
    dot.title = `Неделя ${i + 1}: ${formatValue(m, v)}`;
    plot.append(dot);
  });
  const axis = document.createElement('div');
  axis.className = 'summary-spark__axis small muted';
  axis.innerHTML = series.map((_, i) => `<span style="left:${(x(i) / W) * 100}%">${i + 1}</span>`).join('');
  wrap.append(axis);
  return wrap;
}

function safeDecor(name, skin) {
  try { return decor(name, skin) || ''; } catch { return ''; }
}
