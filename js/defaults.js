// Исходные данные плана (из ТЗ). Используются при первом запуске и при «сбросе к исходному плану».

export const DEFAULT_WEEKS = 4;

export const DEFAULT_SKILLS = [
  { id: 'knit', name: 'Вязание', icon: 'yarn', color: 1, order: 1, priority: true,
    minimum: 'один ряд вязания', hintOrder: 3, checklistTitle: 'Освоенные приёмы' },
  { id: 'eng', name: 'Английский', icon: 'letters', color: 2, order: 2,
    minimum: '5 минут Anki', hintOrder: 1, checklistTitle: 'Освоенные темы' },
  { id: 'left', name: 'Письмо левой рукой', icon: 'pen', color: 3, order: 3,
    minimum: 'одна строчка левой рукой', hintOrder: 2, checklistTitle: 'Освоенные элементы' },
];

const TASKS = {
  knit: [
    ['Купить пряжу, спицы и мелочи', 'Набор петель (многократно)', 'Лицевые петли', 'Кромка', 'Закрытие петель', 'Образец платочной вязки 20×30 рядов'],
    ['Спущенная петля, распускание, подсчёт', 'Изнаночная петля', 'Чулочная гладь', 'Резинка 1×1 и 2×2', 'Образец плотности из белой пряжи, стирка, расчёт', 'Набрать петли шарфа'],
    ['Связать примерно половину шарфа', 'Присоединить новый клубок'],
    ['Закончить шарф', 'Закрыть петли', 'Спрятать концы', 'ВТО', 'Образец по простой схеме'],
  ],
  left: [
    ['Постановка листа и хвата', 'Разминка', 'Прописи с упором на аккуратность', 'Контрольный образец №0'],
    ['Соединения букв и слова', 'Линии, штриховка, круги, спирали', 'Переписывание наполовину на английском'],
    ['Косая линейка (если критерии выполнены)', 'Квадрат, треугольник, звезда', 'Копирование простых рисунков'],
    ['Обычная линейка', 'Письмо под диктовку', 'Графические диктанты', 'Контрольный образец №1'],
  ],
  eng: [
    ['Алфавит и правила чтения', 'to be', 'Местоимения', '~100 частых слов', '10 мин медленного видео в день'],
    ['Present Simple', 'Числа и время', '+100 слов', 'Первые диалоги в чате'],
    ['there is/are, can, have, вопросительные слова', '+100 слов', 'Голосовые разговоры', 'Shadowing 5 мин'],
    ['Past Simple и 20 неправильных глаголов', '+100 слов', 'Рассказ о вчерашнем дне', 'Первая минутная запись себя'],
  ],
};

export function defaultTasks() {
  const out = [];
  for (const [skillId, weeks] of Object.entries(TASKS)) {
    weeks.forEach((items, wi) => items.forEach((text, i) => out.push({
      id: `t_${skillId}_${wi + 1}_${i + 1}`, skillId, week: wi + 1, text, done: false, order: i + 1,
    })));
  }
  return out;
}

const CHECKLISTS = {
  knit: ['Скользящая петля', 'Набор петель', 'Лицевая петля', 'Кромочные петли', 'Закрытие петель', 'Подсчёт петель',
    'Поднятие спущенной петли', 'Распускание', 'Изнаночная петля', 'Чулочная гладь', 'Резинка 1×1', 'Резинка 2×2',
    'Образец плотности', 'Присоединение клубка', 'Прятание концов', 'ВТО (стирка и сушка)', 'Чтение схемы'],
  eng: ['Алфавит и правила чтения', 'to be', 'Местоимения', 'Present Simple', 'Числа и время', 'there is/are', 'can', 'have',
    'Вопросительные слова', 'Past Simple (was/were)', 'Правильные глаголы', '20 частых неправильных глаголов'],
  left: [],
};

export function defaultChecklist() {
  const out = [];
  for (const [skillId, items] of Object.entries(CHECKLISTS)) {
    items.forEach((text, i) => out.push({ id: `c_${skillId}_${i + 1}`, skillId, text, order: i + 1 }));
  }
  return out;
}

export const LEFT_STAGES = ['Прописи', 'Соединения и слова', 'Косая линейка', 'Обычная линейка', 'Клетка', 'Письмо на скорость'];

// Показатели недельного журнала. type: number | scale (1–5) | bool | select | percent
export function defaultMetrics() {
  return [
    { id: 'm_knit_scarf', skillId: 'knit', label: 'Длина шарфа', type: 'number', unit: 'см', order: 1 },
    { id: 'm_knit_errors', skillId: 'knit', label: 'Ошибок исправлено самостоятельно', type: 'number', unit: '', order: 2 },
    { id: 'm_left_stage', skillId: 'left', label: 'Текущий этап', type: 'select', options: LEFT_STAGES, order: 1 },
    { id: 'm_left_time', skillId: 'left', label: 'Время на контрольный текст', type: 'number', unit: 'сек', order: 2, lowerIsBetter: true },
    { id: 'm_left_legibility', skillId: 'left', label: 'Разборчивость', type: 'scale', unit: '', order: 3 },
    { id: 'm_eng_anki', skillId: 'eng', label: 'Слов в Anki всего', type: 'number', unit: '', order: 1 },
    { id: 'm_eng_video', skillId: 'eng', label: 'Понял в контрольном видео', type: 'percent', unit: '%', order: 2,
      optional: true, hint: 'Необязательно, раз в 2 недели' },
    { id: 'm_eng_story', skillId: 'eng', label: 'Записал минутный рассказ', type: 'bool', order: 3 },
  ];
}

export function defaultSettings() {
  return {
    id: 'main',
    startDate: null,        // 'YYYY-MM-DD'; null → показать первый запуск
    weeks: DEFAULT_WEEKS,   // длина плана в неделях (можно продлевать)
    skin: 'moss',           // оформление
    mode: 'auto',           // auto | light | dark
    onboarded: false,
    finishedAt: null,       // дата завершения плана (итоговый отчёт)
  };
}
