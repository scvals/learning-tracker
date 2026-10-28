// Резервная копия: скачать JSON, загрузить из файла, очистить всё.

import * as store from '../store.js';
import { toast, confirmDialog, downloadFile, pickFile } from '../ui.js';
import { todayISO, formatNumeric } from '../dates.js';

export function exportBackup() {
  const data = store.exportData();
  downloadFile(`tracker-backup-${todayISO()}.json`, JSON.stringify(data, null, 2));
  toast('Резервная копия скачана');
}

// Возвращает true, если данные заменены.
export async function importBackup() {
  const file = await pickFile();
  if (!file) return false;
  let obj;
  try {
    obj = JSON.parse(await file.text());
  } catch {
    toast('Не удалось прочитать файл: это не резервная копия (JSON).', { timeout: 5000 });
    return false;
  }
  const err = store.validateImport(obj);
  if (err) {
    toast(err, { timeout: 5000 });
    return false;
  }
  let when = '';
  if (typeof obj.exportedAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(obj.exportedAt)) {
    when = ` от ${formatNumeric(obj.exportedAt.slice(0, 10))}`;
  }
  const ok = await confirmDialog({
    title: 'Заменить текущие данные?',
    text: `Все данные трекера будут заменены копией${when}. Текущие отметки, журнал и итоги пропадут — если они нужны, сначала скачайте резервную копию.`,
    okText: 'Заменить',
    danger: true,
  });
  if (!ok) return false;
  try {
    store.importData(obj);
  } catch (e) {
    toast(e.message || 'Не удалось загрузить данные', { timeout: 5000 });
    return false;
  }
  toast('Данные загружены из резервной копии');
  return true;
}

export async function resetEverything() {
  const first = await confirmDialog({
    title: 'Очистить все данные?',
    text: 'Удалятся отметки, журнал, итоги, свои навыки и задания — трекер вернётся к исходному плану. Советуем сначала скачать резервную копию.',
    okText: 'Очистить',
    danger: true,
  });
  if (!first) return false;
  const second = await confirmDialog({
    title: 'Точно удалить всё?',
    text: 'Это действие нельзя отменить. Если включена синхронизация, данные удалятся и на других устройствах.',
    okText: 'Да, удалить всё',
    danger: true,
  });
  if (!second) return false;
  store.resetAll();
  toast('Все данные очищены');
  return true;
}
