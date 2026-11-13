/* حالة الكتالوج وواجهته: القائمة المعروضة، البحث والترتيب، فهرس الفتح السريع، حالة التحميل، إعادة المحاولة،
 * والتحديث الموضعي بعد الإدارة. لا يلمس DOM؛ يُبلّغ الواجهة عبر الناقل (mods:changed / status:changed / load:failed).
 * التقسيم: model.js (شكل العنصر) · remote.js (طلبات Supabase) · cache.js (الذاكرة المحلية) · هذا الملف (الحالة والتنسيق). */
import { LOCAL_MODS } from '../local-mods.js';
import { FETCH_TRIES, FETCH_RETRY_BASE_MS } from '../config.js';
import { fold } from '../lib/text.js';
import { emit } from '../lib/bus.js';
import { log } from '../lib/log.js';
import { classifyError, isRetryable } from '../lib/errors.js';
import { retry } from '../lib/async.js';
import { session } from '../lib/storage.js';
import { getClient, restartSupabase } from './supabase.js';
import { readCatalogCache, writeCatalogCache } from './cache.js';
import { normalize, fromRow, isUsableRow } from './model.js';
import { fetchCatalogRows } from './remote.js';

/* واجهات كانت تُستورد من هنا: نعيد تصديرها كي لا تتغيّر مسارات الاستيراد في بقية الوحدات. */
export { normalize, isRecent } from './model.js';
export { getSelectColumns, supportsColumn, fetchRowById } from './remote.js';

let mods = [];
let remoteRows = []; /* صفوف Supabase بعد fromRow (بدون العناصر المحلية) — مصدر الذاكرة المحلية والتحديثات الموضعية */
let modsByKey = new Map(); /* id/slug → عنصر: فتح التفاصيل O(1) بدل مسح القائمة كلها */
let status = 'loading'; /* loading | ready | error (فشل الطلب) | offline (تعذّر تحميل الـSDK) */
let hasRemote = false;  /* هل وصلت بيانات من Supabase مرة على الأقل؟ (نحتفظ بها لو فشل تحديث لاحق) */

export const getMods = () => mods;
export const getStatus = () => status;

export function setStatus(next) {
  if (next === status) return;
  status = next;
  emit('status:changed', next);
}

/* يجعل المعرّفات المكررة فريدة مرة واحدة على كامل القائمة (ثابتة بين عمليات الرسم). */
function dedupeIds(list) {
  const seen = {};
  list.forEach(m => {
    const n = normalize(m);
    if (seen[n.id]) n.id += '-' + (++seen[n.id]); else seen[n.id] = 1;
  });
}

/* الـslug المكرر ← يفتح عنصرًا خطأ (الفهرس يعيد أول عنصر): نجعل الثاني فريدًا بلاحقة -2 ثابتة بترتيب القائمة. */
function dedupeSlugs(list) {
  const used = new Set();
  list.forEach(m => {
    const n = normalize(m);
    if (!n.slug) return;
    if (used.has(n.slug)) {
      let i = 2;
      while (used.has(n.slug + '-' + i)) i++;
      n.slug += '-' + i;
    }
    used.add(n.slug);
  });
}

/* أول عنصر (بترتيب القائمة) يطابق كل معرّف/slug — نفس نتيجة البحث الخطي القديم لكن بلا مسح. */
function indexMods(list) {
  const index = new Map();
  list.forEach(m => {
    const n = normalize(m);
    if (!index.has(n.id)) index.set(n.id, m);
    if (n.slug && !index.has(n.slug)) index.set(n.slug, m);
  });
  return index;
}

function setMods(list) {
  dedupeIds(list);
  dedupeSlugs(list);
  mods = list;
  modsByKey = indexMods(list);
}
setMods(LOCAL_MODS.slice());

/* مقارن واحد مُهيّأ مرة واحدة (localeCompare مع locale ينشئ مقارنًا جديدًا في كل استدعاء ← بطيء مع آلاف العناصر). */
let collator = null;
const compareNames = (a, b) => {
  if (!collator) { try { collator = new Intl.Collator('ar'); } catch (e) { collator = { compare: (x, y) => x.localeCompare(y) }; } }
  return collator.compare(a, b);
};

const SORTERS = {
  new:       (a, b) => normalize(b).ts - normalize(a).ts,
  old:       (a, b) => normalize(a).ts - normalize(b).ts,
  name:      (a, b) => compareNames(normalize(a).name, normalize(b).name),
  downloads: (a, b) => (normalize(b).downloads || 0) - (normalize(a).downloads || 0)
};

/* يرجع العناصر المطابقة للتصنيف والبحث بالترتيب المطلوب (sort فارغ = ترتيب القاعدة). */
export function queryMods({ cat, q, sort }) {
  const needle = fold(q).trim();
  const rows = mods.filter(m => {
    const n = normalize(m);
    return (cat === 'All' || n.category === cat) && (!needle || n.s.includes(needle));
  });
  if (SORTERS[sort]) rows.sort(SORTERS[sort]);
  return rows;
}

export const findMod = idOrSlug => modsByKey.get(idOrSlug);

/* أول limit عناصر من نفس التصنيف (بترتيب القائمة) — نتوقف فور اكتمال العدد بدل تطبيع القائمة كلها. */
export function relatedMods(n, limit = 4) {
  const out = [];
  for (let i = 0; i < mods.length && out.length < limit; i++) {
    const x = normalize(mods[i]);
    if (x.category === n.category && x.id !== n.id) out.push(x);
  }
  return out;
}

async function loadOnce() {
  const client = getClient();
  if (!client) {
    log.warn('catalog', 'Supabase client unavailable (SDK did not load)');
    if (!hasRemote) setStatus('offline');
    emit('load:failed', { kind: 'network', stale: hasRemote });
    return false;
  }
  try {
    const rows = await retry(() => fetchCatalogRows(client), {
      tries: FETCH_TRIES,
      baseMs: FETCH_RETRY_BASE_MS,
      shouldRetry: err => isRetryable(classifyError(err)),
      onRetry: (err, attempt) => log.warn('catalog', 'load failed, retrying (attempt ' + (attempt + 1) + ' of ' + FETCH_TRIES + ')', err)
    });
    const usable = rows.filter(isUsableRow);
    if (usable.length !== rows.length) log.warn('catalog', 'skipped ' + (rows.length - usable.length) + ' malformed row(s) without an id');
    remoteRows = usable.map(fromRow);
    setMods(LOCAL_MODS.concat(remoteRows));
    writeCatalogCache(remoteRows);
    hasRemote = true;
    setStatus('ready');
    emit('mods:changed');
    return true;
  } catch (err) {
    log.error('catalog', 'failed to load mods from Supabase', err);
    /* لو عندنا بيانات سابقة نبقيها معروضة ونكتفي بتنبيه؛ وإلا تظهر حالة الفشل. */
    if (!hasRemote) setStatus('error');
    else if (status === 'loading') setStatus('ready');
    emit('load:failed', { kind: classifyError(err), stale: hasRemote });
    emit('mods:changed');
    return false;
  }
}

/* يحمّل العناصر المنشورة (عند الإقلاع وبعد كل تعديل من لوحة الإدارة). يرجع true/false ولا يرمي أبدًا.
 * طلبان متزامنان يُدمجان؛ وطلب يصل أثناء تحميل جارٍ يُنفَّذ بعده مباشرة كي لا تضيع آخر البيانات. */
let inFlight = null, rerun = false;
export function reloadMods() {
  if (inFlight) { rerun = true; return inFlight; }
  inFlight = (async () => {
    let ok;
    do { rerun = false; ok = await loadOnce(); } while (rerun);
    return ok;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

/* زر "إعادة المحاولة": يعيد تحميل الـSDK لو لزم ثم البيانات، مع حالة تحميل ظاهرة. */
export async function retryLoad() {
  setStatus('loading');
  if (!getClient()) await restartSupabase();
  return reloadMods();
}

/* ===== تحديث موضعي بعد إضافة/تعديل/حذف من لوحة الإدارة =====
 * بدل إعادة جلب الكتالوج كله (آلاف الصفوف) بعد كل عملية، نطبّق الصف الذي أرجعه الخادم نفسه على القائمة المحلية
 * (فيظهر الأثر فورًا بالقيم النهائية: slug وcreated_at وupdated_at)، ثم تُحدَّث الذاكرة المحلية. */
function commitRemote(rows) {
  if (inFlight) rerun = true; /* تحميل جارٍ قد يصل بنسخة أقدم من هذا التعديل ← نُتبعه بتحميل جديد بدل أن يطمسه */
  remoteRows = rows;
  setMods(LOCAL_MODS.concat(remoteRows));
  writeCatalogCache(remoteRows);
  emit('mods:changed');
}

/* يضيف/يستبدل صفًا من الخادم (شكل الجدول). غير منشور أو بلا id ← يُزال. يرجع true لو تغيّرت القائمة. */
export function upsertRemoteRow(dbRow) {
  if (!isUsableRow(dbRow)) return false;
  if (dbRow.published === false) return removeRemoteRow(dbRow.id);
  const item = fromRow(dbRow), key = String(item.id);
  const at = remoteRows.findIndex(r => String(r.id) === key);
  const next = remoteRows.slice();
  if (at >= 0) next[at] = item; else next.unshift(item); /* الجديد أحدث ما في الخادم ← أول الصفوف البعيدة (بعد المحلية) */
  commitRemote(next);
  return true;
}

export function removeRemoteRow(id) {
  const key = String(id);
  const next = remoteRows.filter(r => String(r.id) !== key);
  if (next.length === remoteRows.length) return false;
  commitRemote(next);
  return true;
}

/* بعد احتساب تحميل ناجح: نزيد العدّاد المحلي كي لا يبقى الرقم المعروض/الترتيب متأخرًا عن الواقع حتى إعادة التحميل. */
function bumpLocalDownloads(id) {
  const raw = findMod(id);
  if (!raw || !Number.isFinite(raw.downloads)) return;
  raw.downloads += 1;
  normalize(raw).downloads = raw.downloads;
}

/* عدّاد التحميلات: مرة واحدة لكل عنصر في الجلسة. فشله غير حرج فلا يُزعج الزائر، لكنه يُسجَّل. */
export async function recordDownload(id, storageKeyPrefix) {
  const client = getClient();
  if (!client || !id) return;
  const key = storageKeyPrefix + id;
  if (session.get(key)) return;
  session.set(key, '1'); /* التخزين غير متاح ← نكمل بالعدّ في كل نقرة */
  try {
    const r = await client.rpc('increment_mod_download', { mod_id: id });
    if (r && r.error) throw r.error;
    bumpLocalDownloads(id);
  } catch (err) {
    session.remove(key); /* ليُحتسب في نقرة لاحقة */
    log.warn('catalog', 'download counter failed (non-critical)', err);
  }
}

/* ===== بدء التشغيل: رسم فوري من آخر نسخة ناجحة ===== */
/* آخر سطر في الوحدة عمدًا (يعتمد على fromRow/isUsableRow المعرّفتين أعلاه). تُعدّ النسخة المحلية "بيانات قديمة":
 * لو فشل أول تحميل تبقى معروضة مع تنبيه، ولو نجح تُستبدل بالنسخة الحية. */
(function hydrateFromCache() {
  const cached = readCatalogCache();
  if (!cached) return;
  remoteRows = cached.filter(isUsableRow);
  if (!remoteRows.length) return;
  setMods(LOCAL_MODS.concat(remoteRows));
  hasRemote = true;
  status = 'ready';
})();
