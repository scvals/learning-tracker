// Чистые помощники синхронизации (без Firebase и DOM) — их проверяют тесты.

export const BATCH_LIMIT = 400;

// ---------- идентификаторы документов ----------

// Обратимое кодирование в безопасный для Firestore id: [A-Za-z0-9_.-] остаются,
// остальное (включая «~» и «/») — как ~HH по байтам UTF-8.
export function encodeId(id) {
  const s = String(id);
  let out = '';
  for (const ch of s) {
    if (/[A-Za-z0-9_.-]/.test(ch)) out += ch;
    else for (const b of new TextEncoder().encode(ch)) out += '~' + b.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

export function decodeId(enc) {
  const bytes = [];
  let out = '';
  const flush = () => { if (bytes.length) { out += new TextDecoder().decode(new Uint8Array(bytes)); bytes.length = 0; } };
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] === '~') { bytes.push(parseInt(enc.slice(i + 1, i + 3), 16)); i += 2; }
    else { flush(); out += enc[i]; }
  }
  flush();
  return out;
}

// col — из фиксированного списка (без «_»), поэтому разделитель «__» однозначен
// и id никогда не начинается с «__» (зарезервировано Firestore).
export function docIdFor(col, id) {
  return `${col}__${encodeId(id)}`;
}

export function parseDocId(docId) {
  const i = docId.indexOf('__');
  if (i < 0) return null;
  return { col: docId.slice(0, i), id: decodeId(docId.slice(i + 2)) };
}

// ---------- запись ⇄ документ ----------

// Firestore не хранит undefined, вложенные массивы, пустые ключи и ключи вида __x__.
// Такие записи кладём целиком строкой в поле _json.
function firestoreUnsafe(v, inArray = false) {
  if (Array.isArray(v)) return inArray || v.some((x) => firestoreUnsafe(x, true));
  if (v && typeof v === 'object') {
    return Object.entries(v).some(([k, x]) => k === '' || /^__.*__$/.test(k) || firestoreUnsafe(x, false));
  }
  return false;
}

export function toRemote(col, rec) {
  const clean = JSON.parse(JSON.stringify(rec)); // убираем undefined, функции, Date → строки
  const base = { col, id: String(clean.id), updatedAt: Number(clean.updatedAt) || 0 };
  if (clean.deleted) return { ...base, deleted: true };
  if (firestoreUnsafe(clean)) return { ...base, deleted: false, _json: JSON.stringify(clean) };
  return { ...clean, ...base };
}

// → { col, rec } или null, если документ испорчен.
export function fromRemote(data, collections) {
  if (!data || typeof data !== 'object') return null;
  const { col } = data;
  if (typeof col !== 'string' || (collections && !collections.includes(col))) return null;
  if (data.id === undefined || data.id === null) return null;
  let rec;
  if (typeof data._json === 'string') {
    try { rec = JSON.parse(data._json); } catch { return null; }
  } else {
    rec = { ...data };
    delete rec.col;
  }
  rec.id = data.id;
  rec.updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0;
  if (data.deleted) return { col, rec: { id: rec.id, deleted: true, updatedAt: rec.updatedAt } };
  return { col, rec };
}

// ---------- очередь отправки (outbox) ----------
// Outbox — объект { 'col/id': updatedAt }: какие записи изменены локально и ещё не подтверждены облаком.

export const outboxKey = (col, id) => `${col}/${id}`;

export function splitKey(key) {
  const i = key.indexOf('/');
  return { col: key.slice(0, i), id: key.slice(i + 1) };
}

export function outboxAdd(outbox, col, rec) {
  const k = outboxKey(col, rec.id);
  const t = rec.updatedAt ?? 0;
  if (!(k in outbox) || outbox[k] < t) outbox[k] = t;
  return outbox;
}

// Убрать подтверждённые записи. written — [{ key, updatedAt }]. Если запись успели
// изменить ещё раз (в outbox метка новее отправленной), она остаётся в очереди.
export function outboxAck(outbox, written) {
  for (const { key, updatedAt } of written) {
    if (key in outbox && outbox[key] <= updatedAt) delete outbox[key];
  }
  return outbox;
}

// Что отправлять. getLocal(col, id) → запись|null; remoteStamps — { 'col/id': updatedAt } из облака.
// → { send: [{ key, col, rec }], drop: [key] } (drop — уже не нужно отправлять).
export function planFlush(outbox, getLocal, remoteStamps) {
  const send = [], drop = [];
  for (const key of Object.keys(outbox)) {
    const { col, id } = splitKey(key);
    const rec = getLocal(col, id);
    if (!rec) { drop.push(key); continue; }
    const remote = remoteStamps[key];
    if (remote !== undefined && remote >= (rec.updatedAt ?? 0)) { drop.push(key); continue; }
    send.push({ key, col, rec });
  }
  return { send, drop };
}

// После первого чтения облака: какие локальные записи новее облачных или отсутствуют там.
// records — [{ col, rec }] (store.allRecords()).
export function planInitialPush(records, remoteStamps) {
  const out = [];
  for (const { col, rec } of records) {
    const key = outboxKey(col, rec.id);
    const remote = remoteStamps[key];
    if (remote === undefined || (rec.updatedAt ?? 0) > remote) out.push({ col, rec });
  }
  return out;
}

export function chunk(arr, n = BATCH_LIMIT) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ---------- понятные сообщения об ошибках ----------

export function errorMessage(err) {
  const code = String(err?.code || '').replace(/^(auth|firestore)\//, '');
  const host = typeof location !== 'undefined' ? location.hostname : 'адрес сайта';
  switch (code) {
    case 'unauthorized-domain':
      return `Домен ${host} не разрешён для входа. Добавьте его в Firebase: Authentication → Настройки → Разрешённые домены.`;
    case 'unauthorized-continue-uri':
    case 'invalid-continue-uri':
      return `Адрес ${host} не разрешён для ссылок входа. Добавьте его в Firebase: Authentication → Настройки → Разрешённые домены.`;
    case 'popup-blocked':
      return 'Браузер заблокировал окно входа. Разрешите всплывающие окна для этого сайта или попробуйте ещё раз.';
    case 'popup-closed-by-user':
    case 'cancelled-popup-request':
    case 'user-cancelled':
      return 'Вход отменён.';
    case 'network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Нет связи с сервером. Проверьте интернет — изменения сохранены и отправятся позже.';
    case 'operation-not-allowed':
      return 'Этот способ входа не включён в Firebase (Authentication → Способы входа).';
    case 'invalid-email':
    case 'missing-email':
      return 'Похоже, адрес почты введён с ошибкой.';
    case 'invalid-action-code':
    case 'expired-action-code':
      return 'Ссылка для входа устарела или уже использована. Запросите новую.';
    case 'user-disabled':
      return 'Этот аккаунт отключён.';
    case 'too-many-requests':
    case 'quota-exceeded':
    case 'resource-exhausted':
      return 'Превышен лимит бесплатного тарифа Firebase. Попробуйте позже (обычно — завтра).';
    case 'invalid-api-key':
    case 'api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Неверный apiKey в js/firebase-config.js.';
    case 'permission-denied':
    case 'unauthenticated':
      return 'Облако отказало в доступе. Проверьте правила Firestore (файл firestore.rules) и войдите заново.';
    case 'not-found':
    case 'failed-precondition':
      return 'База Firestore не найдена. Создайте её в консоли Firebase (Firestore Database → Создать).';
    case 'web-storage-unsupported':
    case 'operation-not-supported-in-this-environment':
      return 'Браузер не поддерживает вход (возможно, приватный режим или запрещены cookie).';
    case 'cdn':
      return 'Не удалось загрузить модуль облака (нет сети?). Данные сохраняются на устройстве.';
    default:
      return 'Ошибка синхронизации' + (code ? ` (${code})` : '') + '. Данные сохранены на устройстве.';
  }
}
