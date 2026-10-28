// Связь «задание трекера → урок». Используется трекером (js/views/plan.js) для ссылки «Как сделать».
// Материалы курсов грузятся лениво; если файла курса ещё нет — для его заданий уроков нет.

const FILES = ['knit', 'eng', 'left'];
let mapPromise = null;

export function lessonMap() {
  if (!mapPromise) {
    mapPromise = Promise.all(FILES.map((f) => import(new URL(`../content/${f}.js`, import.meta.url).href).catch(() => null)))
      .then((mods) => {
        const map = new Map();
        for (const m of mods) {
          for (const l of m?.default?.lessons || []) {
            for (const t of Array.isArray(l?.taskIds) ? l.taskIds : []) if (!map.has(t)) map.set(t, l.id);
          }
        }
        return map;
      });
  }
  return mapPromise;
}

// id урока для задания или null.
export async function lessonForTask(taskId) {
  return (await lessonMap()).get(taskId) || null;
}

// Ссылка на урок относительно корня трекера.
export const lessonHref = (lessonId) => `learn/#/lesson/${encodeURIComponent(lessonId)}`;
