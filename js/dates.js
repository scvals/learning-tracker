// Работа с датами. Все даты — строки 'YYYY-MM-DD' в местном времени.

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // полдень — защита от перехода на летнее время
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// b − a в днях
export function diffDays(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000);
}

// Номер недели плана (1, 2, …) для даты; 0 — если дата раньше старта.
export function weekOf(iso, startISO) {
  if (!startISO) return 0;
  const d = diffDays(startISO, iso);
  return d < 0 ? 0 : Math.floor(d / 7) + 1;
}

// Первый и последний день недели плана.
export function weekRange(week, startISO) {
  const from = addDays(startISO, (week - 1) * 7);
  return [from, addDays(from, 6)];
}

export function daysOfWeek(week, startISO) {
  const [from] = weekRange(week, startISO);
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// «среда, 28 октября»
export function formatLong(iso) {
  const d = fromISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

// «28 окт»
export function formatShort(iso) {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// «28.10.2026»
export function formatNumeric(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function weekdayShort(iso) {
  return WEEKDAYS_SHORT[fromISO(iso).getDay()];
}

export function dayNum(iso) {
  return fromISO(iso).getDate();
}

// Склонение: plural(5, ['день','дня','дней']) → 'дней'
export function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
