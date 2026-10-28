# Контракт между частями приложения (для разработчиков)

Веб-приложение без сборки: чистые HTML/CSS/JS (ES-модули), открывается с GitHub Pages.
Интерфейс только на русском. Главная ширина — телефон 360 px; на компьютере колонка ~720 px по центру.
Никаких npm-зависимостей в рантайме. Firebase грузится с `https://www.gstatic.com/firebasejs/10.12.2/...` только если настроен.

## Владение файлами

| Файл | Владелец | Статус |
|---|---|---|
| `index.html`, `js/app.js`, `js/store.js`, `js/dates.js`, `js/ui.js`, `js/defaults.js` | ядро | готово, менять только при необходимости (сообщить) |
| `css/base.css`, `css/themes.css`, `js/icons.js`, `js/themes.js`, `js/decor.js`, `icons/*` | дизайн | |
| `js/sync.js`, `js/firebase-config.js`, `js/streak.js`, `firestore.rules`, `tests/*` | данные | |
| `js/views/today.js`, `js/views/plan.js`, `js/views/summary.js` + `css/views/{today,plan,summary}.css` | экраны A | |
| `js/views/journal.js`, `js/views/settings.js`, `js/views/onboarding.js` (+ любые `js/views/settings-*.js`) + `css/views/{journal,settings}.css` | экраны B | |

Стили экранов (`css/views/*.css`) используют **только токены** из темы (`var(--…)`), без жёстких цветов,
и классы компонентов из `base.css`. Специфичные для экрана классы — с префиксом экрана (`.today-…`, `.plan-…`).

## Данные (`js/store.js`)

Коллекции (каждая запись: `id`, `updatedAt`, иногда `deleted`, `order`):

- `settings.main` — `{ startDate:'YYYY-MM-DD'|null, weeks:4, skin:'moss', mode:'auto'|'light'|'dark', onboarded:bool, finishedAt:'YYYY-MM-DD'|null }`
- `skills` — `{ id, name, icon, color:1..6, order, minimum:'один ряд вязания', hintOrder, checklistTitle, priority? }`
- `tasks` — `{ id, skillId, week, text, done, order }`
- `days` — id `${date}_${skillId}`: `{ date, skillId, done:bool, minutes:number|null, note:string }`
- `journal` — id `w${week}`: `{ week, values:{[metricId]:value}, checks:{[checklistItemId]:true}, notes:{[skillId]:text} }`
- `checklist` — `{ id, skillId, text, order }` (чек-листы журнала: приёмы / темы; редактируемые)
- `metrics` — `{ id, skillId, label, type:'number'|'scale'|'bool'|'select'|'percent', unit, options?, optional?, hint?, lowerIsBetter?, order }`
- `summaries` — `{ id, kind:'interim'|'final', createdAt:'YYYY-MM-DD', week, title, overall:text, notes:{[skillId]:text}, snapshot:{…} }`

API (импорт `import * as store from '../store.js'`):
`get(col,id)`, `list(col, filterFn)` (без удалённых, по order), `put(col, rec)` (создать/частично обновить, ставит updatedAt; без id — создаст id),
`patch(col,id,partial)`, `remove(col,id)`, `uid(prefix)`, `subscribe(fn)`,
`settings()`, `setSettings(partial)`, `skills()`, `skill(id)`, `planWeeks()`, `currentWeek(date?)` (1…weeks, 0 — до старта), `calendarWeek(date?)` (без ограничения),
`day(date, skillId)`, `setDay(date, skillId, partial)`, `doneDates(skillId)`,
`tasks(week, skillId?)`, `journal(week)` (всегда объект), `setJournal(week, part, key, value)` (part: values|checks|notes; пустое значение удаляет ключ),
`metrics(skillId?)`, `checklist(skillId?)`, `masteredWeek(itemId, week)` (первая неделя ≤ week, где пункт отмечен; отмеченное переносится), `previousValue(metricId, week)` → `{week, value}|null`,
`summaries()`, `exportData()`, `validateImport(obj)` → текст ошибки|null, `importData(obj)`, `resetAll()`, `wipeLocal()`.

Даты (`js/dates.js`): `todayISO, addDays, diffDays, weekOf, weekRange(week,start), daysOfWeek(week,start), formatLong ('среда, 28 октября'), formatShort ('28 окт'), formatNumeric, weekdayShort ('ср'), dayNum, plural(n, ['день','дня','дней'])`.

При удалении навыка — спрашивать подтверждение; задания/показатели/пункты навыка тоже удалять (`remove`).

## Экран (view) — интерфейс

```js
export function render(root, ctx) { /* root — пустой <main>; ctx = { params, navigate(name, params?), rerender() } */
  return () => {}; // необязательная очистка
}
```
- `app.js` перерисовывает экран при данных из облака/импорте. Локальные правки экран обновляет сам: либо точечно меняет DOM, либо зовёт `ctx.rerender()` (позиция прокрутки сохраняется). Текстовые поля сохранять по вводу с `debounce` **без** перерисовки (иначе пропадает фокус).
- Маршруты: `#/today`, `#/plan?week=2`, `#/journal?week=2`, `#/summary`, `#/settings`. При первом запуске (`!settings.onboarded || !startDate`) показывается `views/onboarding.js`.
- Все кнопки рабочие, области нажатия ≥ 44 px, у иконок-кнопок `aria-label`.

## Помощники интерфейса (`js/ui.js`)

`h(tag, attrs, ...children)` (onclick и т. п. — функции; `class`, `style`-объект, `html`, `dataset`),
`ico(name, cls='ico')`, `debounce(fn, ms)`, `toast(msg, {action, onAction})`,
`sheet({title, content, actions, onClose})` → `{close, el}` (нижняя панель на телефоне, диалог по центру на ПК),
`confirmDialog({title, text, okText, danger})` → Promise<bool>,
`formDialog({title, fields:[{name,label,type:'text'|'number'|'textarea'|'select'|'date'|'checkbox',value,options,required,hint,min,max}], okText})` → Promise<values|null>,
`actionMenu({title, items:[{label, icon, danger, onClick}]})`, `downloadFile(name, text)`, `pickFile()` → Promise<File|null>.

## Дизайн: токены и классы (`css/base.css` + `css/themes.css`)

На `<html>` ставятся `data-skin="moss|linen|botanic|nordic|sashiko"` и `data-theme="light|dark"` (`themes.js → applyTheme(skin, mode)`).

Токены (в каждой теме, светлой и тёмной):
`--bg, --bg-pattern (background-image), --surface, --surface-2, --ink, --ink-soft, --muted, --line, --accent, --accent-ink, --accent-soft, --ok, --warn, --danger, --skill-1 … --skill-6, --skill-1-soft … --skill-6-soft, --radius, --radius-sm, --shadow, --font-hand, --font-body`.
Шрифты: заголовки и крупные числа — рукописный `Caveat`, текст — `Nunito`.

Классы компонентов:
- Каркас: `.app .topbar .topbar__decor .topbar__row .topbar__brand .view .nav .nav__item(.is-active) .nav__ico .nav__label .sync-badge .sync-badge--{local|synced|syncing|offline|error|signed-out}`
- Текст: `.h1` (заголовок экрана, рукописный), `.h2`, `.h3`, `.muted`, `.small`, `.hand`, `.num` (табличные цифры), `.big-num` (крупное рукописное число)
- Раскладка: `.page-head` (`.page-head__title`, `.page-head__sub`, `.page-head__actions`), `.section`, `.section__title`, `.stack`, `.stack--sm`, `.row`, `.row--between`, `.row--wrap`, `.grid-2`, `.spacer`
- Карточки: `.card`, `.card--skill` + класс цвета навыка `.sk-1 … .sk-6` (задают `--skill`, `--skill-soft`), `.card__head`, `.card__title`, `.card__icon`, `.card__body`, `.card__foot`
- Кнопки: `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--danger`, `.btn--sm`, `.btn--block`, `.icon-btn`, `.icon-btn--sm`, `.chips`, `.chip(.is-active)`, `.fab`
- Формы: `.form .field .field--inline .field__label .field__hint .input .checkbox .switch`, `.check-toggle(.is-on)` (большая кнопка «Сделано»), `.stepper` (`.stepper__btn`, `.stepper__value`), `.segmented` (`.segmented__btn.is-active`), `.scale` (кнопки 1–5, `.scale__btn.is-active`)
- Списки: `.list`, `.list__item`, `.task(.is-done)` (`.task__check`, `.task__text`, `.task__actions`), `.check-item(.is-done .is-carried)`
- Прогресс: `.progress` > `.progress__bar` (style width %), `.progress--skill`; `.ring` (svg-кольцо, если нужно)
- Вкладки: `.tabs` (горизонтальная прокрутка) > `.tab(.is-active)`
- Прочее: `.badge`, `.badge--accent`, `.badge--ok`, `.pill`, `.empty` (пустое состояние с иллюстрацией), `.divider` (орнаментальный разделитель), `.hint-box`, `.delta`, `.delta--up`, `.delta--down`, `.delta--same`, `.menu .menu__item(.is-danger)`, `.sheet-backdrop(.is-open) .sheet .sheet__handle .sheet__head .sheet__title .sheet__body .sheet__actions`, `.toasts .toast(.is-shown) .toast__action`, `body.has-sheet`

Иконки (`js/icons.js` → `icon(name)` возвращает строку `<svg>` 24×24, stroke=currentColor; `SKILL_ICONS` — массив имён для выбора иконки навыка):
`sun list book chart gear check plus minus edit trash close more cloud cloud-check cloud-off sync flame calendar clock note chevron-left chevron-right chevron-down chevron-up download upload logout google mail arrow-up arrow-down star leaf flag info lock undo palette trophy drag sparkle`
и иконки навыков: `yarn letters pen brush music sport globe camera heart cook plant code`.

Оформление (`js/themes.js`): `SKINS = [{ id, name, tagline, swatches:[hex…] }]`, `applyTheme(skin, mode)`, `resolveMode(mode)`.
Украшения (`js/decor.js`): `decor(name, skin)` → строка SVG, цвета через `currentColor`/CSS-переменные (работает в тёмной теме).
Имена: `header` (полоса-орнамент в шапке), `divider`, `empty`, `celebrate` (завершение недели/плана), `onboarding` (большая иллюстрация), `corner` (уголок карточки).

## Синхронизация (`js/sync.js`)

`init()` → Promise; `onStatus(fn)` (зовётся сразу и при каждом изменении) со статусом
`{ configured:bool, user:{uid,email,name,photo}|null, online:bool, syncing:bool, pending:number, lastSyncAt:number|null, error:string|null }`;
`isConfigured()`, `signInGoogle()`, `sendEmailLink(email)`, `signOut({ wipe:bool })`, `syncNow()`.
Ключи — в `js/firebase-config.js` (`export const firebaseConfig = null` пока не настроено → режим «только на этом устройстве»).

## Серии (`js/streak.js`)

`computeStreak(doneDates: string[], today: string)` → `{ current, best, atRisk, doneToday }`.
Правило «не пропускать дважды»: один пропущенный день серию не обнуляет, но и не засчитывается (Пн ✓, Вт ✗, Ср ✓ → 2);
два пропуска подряд обнуляют. Сегодняшний день без отметки — ещё не пропуск. `atRisk` — вчера пропуск, сегодня ещё нет отметки (если не отметить сегодня — серия обнулится).
