// Загрузка материалов уроков (learn/content/*.js) через динамический import.
// Любой файл может ещё не существовать — тогда функции возвращают null / пустые списки,
// а экраны показывают «скоро появится».

import * as store from '../../js/store.js';

export const SKILL_IDS = ['knit', 'eng', 'left'];

const FALLBACK = {
  knit: { id: 'knit', name: 'Вязание', icon: 'yarn', color: 1 },
  eng: { id: 'eng', name: 'Английский', icon: 'letters', color: 2 },
  left: { id: 'left', name: 'Письмо левой рукой', icon: 'pen', color: 3 },
};

// Навык: имя, иконка и цвет — из трекера (если навык там есть), иначе стандартные.
export function skillInfo(id) {
  const s = store.skill(id);
  const f = FALLBACK[id] || { id, name: id, icon: 'star', color: 1 };
  return { ...f, ...(s ? { name: s.name || f.name, icon: s.icon || f.icon, color: s.color || f.color } : {}) };
}

const cache = new Map();

function load(file) {
  if (!cache.has(file)) {
    cache.set(file, import(`../content/${file}`).catch((e) => {
      console.warn(`Уроки: материал ${file} пока недоступен`, e?.message || e);
      return null;
    }));
  }
  return cache.get(file);
}

const arr = (v) => (Array.isArray(v) ? v : []);

function normCourse(c, id) {
  if (!c || typeof c !== 'object') return null;
  const lessons = arr(c.lessons).filter((l) => l && l.id).map((l) => ({
    ...l,
    skillId: id,
    week: Number(l.week) || 1,
    taskIds: arr(l.taskIds),
    need: arr(l.need),
    steps: arr(l.steps).filter(Boolean),
    mistakes: arr(l.mistakes).filter(Boolean),
    check: arr(l.check),
    videos: arr(l.videos),
    quiz: arr(l.quiz).filter((q) => q && arr(q.options).length),
    terms: arr(l.terms),
  }));
  return { ...c, skillId: id, weeks: arr(c.weeks), lessons, sessions: c.sessions || {} };
}

export async function course(id) {
  const m = await load(`${id}.js`);
  return normCourse(m?.default, id);
}

export async function courses() {
  const list = await Promise.all(SKILL_IDS.map((id) => course(id)));
  return Object.fromEntries(SKILL_IDS.map((id, i) => [id, list[i]]));
}

export async function findLesson(lessonId) {
  const skillId = String(lessonId).split('-')[0];
  const ids = SKILL_IDS.includes(skillId) ? [skillId, ...SKILL_IDS.filter((s) => s !== skillId)] : SKILL_IDS;
  for (const id of ids) {
    const c = await course(id);
    const idx = c ? c.lessons.findIndex((l) => l.id === lessonId) : -1;
    if (idx >= 0) return { course: c, lesson: c.lessons[idx], index: idx };
  }
  return null;
}

// Картинки всех навыков одним словарём.
let artPromise = null;
export function allArt() {
  if (!artPromise) {
    artPromise = Promise.all(SKILL_IDS.map((id) => load(`${id}-art.js`)))
      .then((mods) => Object.assign({}, ...mods.map((m) => (m?.default && typeof m.default === 'object' ? m.default : {}))));
  }
  return artPromise;
}

let glossPromise = null;
export function glossary() {
  if (!glossPromise) {
    glossPromise = Promise.all(SKILL_IDS.map((id) => load(`glossary-${id}.js`)))
      .then((mods) => mods.flatMap((m, i) => arr(m?.default).filter((t) => t && t.id && t.term)
        .map((t) => ({ ...t, skillId: t.skillId || SKILL_IDS[i] }))));
  }
  return glossPromise;
}

export async function term(id) {
  return (await glossary()).find((t) => t.id === id) || null;
}

export async function words() {
  const m = await load('eng-words.js');
  return arr(m?.default).filter((w) => w && Array.isArray(w.groups));
}

export async function dialogs() {
  const m = await load('eng-dialogs.js');
  return arr(m?.default).filter((d) => d && d.title);
}

export async function worksheets() {
  const m = await load('left-worksheets.js');
  if (!m) return null;
  return {
    sheets: arr(m.sheets),
    renderSheet: typeof m.renderSheet === 'function' ? m.renderSheet : null,
    stageCriteria: arr(m.stageCriteria),
  };
}

export async function shopping() {
  const m = await load('knit-extra.js');
  return m?.shopping || null;
}

export async function guide() {
  const m = await load('guide.js');
  return m?.default || null;
}
