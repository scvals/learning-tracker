// Синхронизация через Firebase (Auth + Firestore, бесплатный тариф).
//
// Источник правды — локальное хранилище (store.js). Облако — копия поверх него:
//  • каждая локальная правка попадает в собственную очередь (outbox, localStorage)
//    и отправляется пачками, когда есть вход и сеть; запись остаётся в очереди до подтверждения;
//  • при входе читаем всё из облака, сливаем по правилу «последнее изменение побеждает»
//    (updatedAt каждой записи), затем отправляем то, что на устройстве новее;
//  • дальше слушаем изменения в реальном времени (onSnapshot).
// Firebase загружается с CDN только если заполнен js/firebase-config.js.
// Ни одна функция модуля не бросает исключений наружу: ошибки попадают в status.error.

import * as store from './store.js';
import { firebaseConfig } from './firebase-config.js';
import {
  docIdFor, toRemote, fromRemote, outboxKey, outboxAdd, outboxAck,
  planFlush, planInitialPush, chunk, errorMessage, BATCH_LIMIT,
} from './sync-core.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const LS_OUTBOX = 'lt:sync:outbox';
const LS_EMAIL = 'lt:sync:email';
const LS_USER = 'lt:sync:user';
const LS_LAST = 'lt:sync:lastSyncAt';
const RETRY_MS = 30000;
const FLUSH_DELAY_MS = 1200;
const LOAD_TIMEOUT_MS = 20000;

// ---------- маленькие помощники ----------

const hasWindow = typeof window !== 'undefined';
const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function lsSet(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { console.warn('sync: localStorage', e); }
}

function withTimeout(promise, ms, code = 'deadline-exceeded') {
  let t;
  return Promise.race([
    promise,
    new Promise((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error(code), { code })), ms); }),
  ]).finally(() => clearTimeout(t));
}

function isStandalone() {
  try {
    return (hasWindow && window.matchMedia?.('(display-mode: standalone)').matches) || navigator.standalone === true;
  } catch { return false; }
}

// ---------- состояние ----------

const configured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

let outbox = configured ? (lsGet(LS_OUTBOX, {}) || {}) : {};
let outboxSaveQueued = false;

const status = {
  configured,
  user: configured ? lsGet(LS_USER) : null, // последний известный пользователь — пока Firebase не загрузился
  online: isOnline(),
  syncing: false,
  pending: Object.keys(outbox).length,
  lastSyncAt: configured ? lsGet(LS_LAST) : null,
  error: null,
};
const statusListeners = new Set();

function setStatus(partial) {
  Object.assign(status, partial, { pending: Object.keys(outbox).length });
  const snapshot = { ...status, user: status.user ? { ...status.user } : null };
  for (const fn of statusListeners) {
    try { fn(snapshot); } catch (e) { console.error(e); }
  }
}

function fail(err, extra = {}) {
  const msg = typeof err === 'string' ? err : errorMessage(err);
  if (err && typeof err !== 'string') console.warn('sync:', err);
  setStatus({ error: msg, syncing: false, ...extra });
  return msg;
}

// Ошибка для действий пользователя (вход, письмо, выход): промис отклоняется
// с понятным русским сообщением — экран показывает его во всплывающей подсказке.
function userError(e) {
  if (e instanceof Error && e.userFacing) return e;
  const err = new Error(typeof e === 'string' ? e : errorMessage(e));
  err.code = e?.code || null;
  err.cancelled = /popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(err.code || '');
  err.userFacing = true;
  if (e && typeof e !== 'string' && !err.cancelled) console.warn('sync:', e);
  return err;
}

async function requireFirebase() {
  const f = await boot();
  if (!f) throw userError({ code: 'cdn' });
  return f;
}

function saveOutbox() {
  if (outboxSaveQueued) return;
  outboxSaveQueued = true;
  queueMicrotask(() => {
    outboxSaveQueued = false;
    lsSet(LS_OUTBOX, outbox);
  });
}

// Firebase
let fb = null;            // { A, F, app, auth, db }
let loading = null;       // Promise<fb>
let uid = null;           // пользователь, для которого запущен слушатель
let unlisten = null;
let reconciled = false;   // первое чтение облака с сервера выполнено
let remoteStamps = {};    // 'col/id' → updatedAt в облаке
let flushing = null;      // Promise текущей отправки
let flushAgain = false;
let flushTimer = null;
let retryTimer = null;

// ---------- публичное API ----------

export function isConfigured() {
  return configured;
}

// fn(status) — сразу и при каждом изменении. Возвращает функцию отписки.
export function onStatus(fn) {
  statusListeners.add(fn);
  try { fn({ ...status }); } catch (e) { console.error(e); }
  return () => statusListeners.delete(fn);
}

export function getStatus() {
  return { ...status };
}

let initPromise = null;
export function init() {
  if (!initPromise) initPromise = doInit().catch((e) => { fail(e); });
  return initPromise;
}

async function doInit() {
  if (!configured) {
    setStatus({});
    return;
  }

  store.onLocalChange((col, rec) => {
    try {
      outboxAdd(outbox, col, rec);
      saveOutbox();
      setStatus({});
      scheduleFlush();
    } catch (e) { console.error('sync: outbox', e); }
  });

  if (hasWindow) {
    window.addEventListener('online', () => { setStatus({ online: true }); syncInBackground(); });
    window.addEventListener('offline', () => setStatus({ online: false, syncing: false }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncInBackground();
      else if (Object.keys(outbox).length) flush(); // успеть отправить перед сворачиванием
    });
  }

  setStatus({ online: isOnline() });
  await boot();
}

// Загрузить Firebase и подписаться на вход. Повторяется при появлении сети, если не удалось.
async function boot() {
  if (fb) return fb;
  if (!loading) {
    loading = (async () => {
      const [appMod, A, F] = await withTimeout(Promise.all([
        import(SDK + 'firebase-app.js'),
        import(SDK + 'firebase-auth.js'),
        import(SDK + 'firebase-firestore.js'),
      ]), LOAD_TIMEOUT_MS, 'cdn');
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
      const auth = A.getAuth(app);
      try { auth.languageCode = 'ru'; } catch { /* ignore */ }
      const db = F.getFirestore(app); // кэш в памяти: офлайн-хранилище — наш store
      fb = { A, F, app, auth, db };

      await completeEmailLinkIfAny();
      A.getRedirectResult(auth).catch((e) => {
        if (!/cancel|closed/.test(e?.code || '')) fail(e);
      });
      A.onAuthStateChanged(auth, handleUser, (e) => fail(e));
      return fb;
    })().catch((e) => {
      loading = null; // разрешить повторную попытку
      fb = null;
      if (!e?.code) e = Object.assign(e || new Error('cdn'), { code: 'cdn' });
      fail(e);
      return null;
    });
  }
  return loading;
}

// Вход через Google. → Promise<{ ok: true, redirect?: true }>; при ошибке — reject(Error с русским
// текстом; e.cancelled = true, если человек просто закрыл окно входа).
export async function signInGoogle() {
  try {
    const { A, auth } = await requireFirebase();
    const provider = new A.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    if (isStandalone()) {
      await A.signInWithRedirect(auth, provider);
      return { ok: true, redirect: true };
    }
    try {
      await A.signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e) {
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        await A.signInWithRedirect(auth, provider);
        return { ok: true, redirect: true };
      }
      throw e;
    }
  } catch (e) {
    throw userError(e);
  }
}

// Отправить ссылку для входа на почту. → Promise<{ ok: true }>; при ошибке — reject(Error).
export async function sendEmailLink(email) {
  try {
    email = String(email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw { code: 'auth/invalid-email' };
    const f = await requireFirebase();
    await f.A.sendSignInLinkToEmail(f.auth, email, { url: pageUrl(), handleCodeInApp: true });
    lsSet(LS_EMAIL, email);
    return { ok: true };
  } catch (e) {
    throw userError(e);
  }
}

// Выйти. wipe: true — стереть данные на этом устройстве (останутся в облаке).
export async function signOut({ wipe = false } = {}) {
  try {
    // Успеть отправить несохранённое (если есть сеть) — не дольше 5 секунд.
    if (fb && uid && Object.keys(outbox).length && isOnline()) {
      await withTimeout(flush(), 5000).catch(() => {});
    }
    stopListening();
    if (fb) await fb.A.signOut(fb.auth).catch((e) => console.warn('sync: signOut', e));
    outbox = {};
    lsSet(LS_OUTBOX, null);
    lsSet(LS_USER, null);
    lsSet(LS_LAST, null);
    if (wipe) store.wipeLocal();
    setStatus({ user: null, syncing: false, error: null, lastSyncAt: null });
    return { ok: true };
  } catch (e) {
    throw userError(e);
  }
}

// Кнопка «Синхронизировать»: отправить очередь, переподключиться к облаку.
// → Promise<status>; reject(Error), если нет сети, входа или облако ответило ошибкой.
export async function syncNow() {
  if (!configured) throw userError('Синхронизация не настроена — данные хранятся только на этом устройстве.');
  if (!isOnline()) throw userError('Нет сети. Изменения сохранены и отправятся, когда появится интернет.');
  await requireFirebase();
  if (!uid) throw userError('Сначала войдите в аккаунт.');
  setStatus({ error: null });
  try {
    await withTimeout(syncInBackground(), 20000);
  } catch {
    throw userError('Облако долго не отвечает. Изменения сохранены и отправятся автоматически.');
  }
  if (!unlisten && retryTimer) throw userError(status.error || 'Не удалось подключиться к облаку.');
  if (status.error) throw userError(status.error);
  return getStatus();
}

// То же для событий online / visibilitychange / повторов — без исключений.
async function syncInBackground() {
  if (!configured) return;
  try {
    setStatus({ online: isOnline() });
    if (!isOnline()) return;
    const f = await boot();
    if (!f || !uid) return;
    if (!unlisten) startListening(uid);
    await flush();
  } catch (e) { fail(e); }
}

// ---------- вход по ссылке из письма ----------

function pageUrl() {
  const u = new URL(location.href);
  for (const p of ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl', 'tenantId']) u.searchParams.delete(p);
  u.hash = '';
  return u.toString();
}

function cleanUrl() {
  try {
    const u = new URL(location.href);
    for (const p of ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl', 'tenantId']) u.searchParams.delete(p);
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch { /* ignore */ }
}

async function completeEmailLinkIfAny() {
  const { A, auth } = fb;
  if (!hasWindow || !A.isSignInWithEmailLink(auth, location.href)) return;
  let email = lsGet(LS_EMAIL);
  if (!email) {
    email = window.prompt('Чтобы завершить вход, введите адрес почты, на который пришла ссылка:') || '';
    email = email.trim();
    if (!email) { fail('Вход не завершён: не указан адрес почты. Откройте ссылку из письма ещё раз.'); return; }
  }
  try {
    await A.signInWithEmailLink(auth, email, location.href);
    lsSet(LS_EMAIL, null);
    cleanUrl();
  } catch (e) {
    fail(e);
    // При сбое сети ссылку оставляем — можно обновить страницу и повторить.
    if (e?.code !== 'auth/network-request-failed') cleanUrl();
  }
}

// ---------- пользователь и слушатель облака ----------

function handleUser(u) {
  if (!u) {
    stopListening();
    lsSet(LS_USER, null);
    setStatus({ user: null, syncing: false });
    return;
  }
  const user = { uid: u.uid, email: u.email || null, name: u.displayName || null, photo: u.photoURL || null };
  lsSet(LS_USER, user);
  setStatus({ user });
  if (uid !== u.uid || !unlisten) startListening(u.uid);
}

function stopListening() {
  try { unlisten?.(); } catch { /* ignore */ }
  unlisten = null;
  uid = null;
  reconciled = false;
  remoteStamps = {};
  clearTimeout(retryTimer);
  retryTimer = null;
}

function recordsRef(forUid) {
  return fb.F.collection(fb.db, 'users', forUid, 'records');
}

function startListening(forUid) {
  stopListening();
  uid = forUid;
  setStatus({ syncing: true });
  try {
    unlisten = fb.F.onSnapshot(
      recordsRef(forUid),
      { includeMetadataChanges: true },
      (snap) => { try { onSnapshot(forUid, snap); } catch (e) { fail(e); } },
      (err) => {
        unlisten = null;
        reconciled = false;
        fail(err);
        scheduleRetry();
      },
    );
  } catch (e) {
    unlisten = null;
    fail(e);
    scheduleRetry();
  }
}

function onSnapshot(forUid, snap) {
  if (forUid !== uid) return;
  const items = [];
  for (const ch of snap.docChanges()) {
    if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) continue; // свои неотправленные записи
    const parsed = fromRemote(ch.doc.data(), store.COLLECTIONS);
    if (!parsed) continue;
    const key = outboxKey(parsed.col, parsed.rec.id);
    remoteStamps[key] = parsed.rec.updatedAt;
    items.push(parsed);
  }
  if (items.length) store.applyRemoteBatch(items);

  if (snap.metadata.fromCache) return; // данные ещё не с сервера — не делаем выводов

  const patch = { syncing: false, error: null, lastSyncAt: Date.now() };
  if (!reconciled) {
    // Первое чтение с сервера: полная карта облачных меток и отправка всего, что новее у нас.
    reconciled = true;
    for (const doc of snap.docs) {
      if (doc.metadata.hasPendingWrites) continue;
      const parsed = fromRemote(doc.data(), store.COLLECTIONS);
      if (parsed) remoteStamps[outboxKey(parsed.col, parsed.rec.id)] = parsed.rec.updatedAt;
    }
    for (const { col, rec } of planInitialPush(store.allRecords(), remoteStamps)) outboxAdd(outbox, col, rec);
    saveOutbox();
  }
  lsSet(LS_LAST, patch.lastSyncAt);
  setStatus(patch);
  if (Object.keys(outbox).length) flush();
}

// ---------- отправка очереди ----------

function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => { retryTimer = null; syncInBackground(); }, RETRY_MS);
}

function flush() {
  if (flushing) { flushAgain = true; return flushing; }
  if (!fb || !uid || !reconciled || !isOnline()) return Promise.resolve();
  flushing = doFlush().catch((e) => { fail(e); scheduleRetry(); }).finally(() => {
    flushing = null;
    if (flushAgain) { flushAgain = false; flush(); }
  });
  return flushing;
}

async function doFlush() {
  const forUid = uid;
  const { F, db } = fb;
  const { send, drop } = planFlush(outbox, store.rawGet, remoteStamps);
  for (const key of drop) delete outbox[key];
  if (drop.length) saveOutbox();
  if (!send.length) { setStatus({}); return; }

  setStatus({ syncing: true });
  for (const part of chunk(send, BATCH_LIMIT)) {
    const batch = F.writeBatch(db);
    for (const { col, rec } of part) {
      batch.set(F.doc(db, 'users', forUid, 'records', docIdFor(col, rec.id)), toRemote(col, rec));
    }
    await batch.commit(); // офлайн — ждёт сети; запись остаётся в outbox до подтверждения
    if (forUid !== uid) return; // за время отправки сменился пользователь
    const written = part.map(({ key, rec }) => ({ key, updatedAt: rec.updatedAt ?? 0 }));
    for (const { key, updatedAt } of written) {
      if (!(remoteStamps[key] >= updatedAt)) remoteStamps[key] = updatedAt;
    }
    outboxAck(outbox, written);
    saveOutbox();
    setStatus({});
  }
  const now = Date.now();
  lsSet(LS_LAST, now);
  setStatus({ syncing: false, error: null, lastSyncAt: now });
}
