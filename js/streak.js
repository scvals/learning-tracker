// Серии по правилу «не пропускать дважды».
// Один пропущенный день серию не обнуляет, но и не засчитывается (Пн ✓, Вт ✗, Ср ✓ → 2).
// Два пропуска подряд обнуляют. Сегодняшний день без отметки — ещё не пропуск.

import { addDays } from './dates.js';

// doneDates — даты 'YYYY-MM-DD' с отметкой (любой порядок, дубли допустимы); today — 'YYYY-MM-DD'.
// → { current, best, atRisk, doneToday }
export function computeStreak(doneDates, today) {
  const set = new Set((doneDates || []).filter((d) => typeof d === 'string' && d <= today));
  const doneToday = set.has(today);
  if (!set.size) return { current: 0, best: 0, atRisk: false, doneToday: false };

  const sorted = [...set].sort();
  const first = sorted[0];

  // Текущая серия: идём назад от сегодня (или от вчера, если сегодня ещё не отмечено).
  let current = 0;
  let misses = 0;
  for (let d = doneToday ? today : addDays(today, -1); d >= first; d = addDays(d, -1)) {
    if (set.has(d)) { current++; misses = 0; }
    else if (++misses >= 2) break;
  }

  // Лучшая серия: проход вперёд по всей истории по тому же правилу.
  let best = 0;
  let run = 0;
  misses = 0;
  const last = sorted[sorted.length - 1];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (set.has(d)) { run++; misses = 0; if (run > best) best = run; }
    else if (++misses >= 2) run = 0;
  }

  const atRisk = current > 0 && !doneToday && !set.has(addDays(today, -1));
  return { current, best: Math.max(best, current), atRisk, doneToday };
}
