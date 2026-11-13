/* ذاكرة الكتالوج المحلية: آخر نسخة ناجحة من صفوف Supabase (بعد fromRow) في localStorage.
 * الغرض: رسم فوري عند الزيارة التالية + بقاء القائمة متاحة لو فشل الاتصال.
 * قواعد السلامة: نسخة (version) وعمر أقصى · تحقق من الشكل عند القراءة (تالف ← يُحذف) · سقف حجم ·
 * فشل التخزين (ممتلئ/ممنوع/وضع خاص) لا يرمي أبدًا. البيانات المحفوظة عامة فقط (صفوف منشورة). */
import { CATALOG_CACHE, STORAGE } from '../config.js';
import { log } from '../lib/log.js';
import { local } from '../lib/storage.js';

/* يرجع مصفوفة الصفوف المحفوظة، أو null لو لا توجد نسخة صالحة. */
export function readCatalogCache(now = Date.now()) {
  const raw = local.get(STORAGE.catalog);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const valid = data && data.v === CATALOG_CACHE.version && Number.isFinite(data.savedAt)
      && Array.isArray(data.rows) && now - data.savedAt < CATALOG_CACHE.maxAgeMs && now >= data.savedAt - 6e4;
    if (!valid) { clearCatalogCache(); return null; }
    const rows = data.rows.filter(r => r && typeof r === 'object' && r.id != null);
    return rows.length ? rows : null;
  } catch (err) {
    log.warn('cache', 'discarded a corrupt catalog cache', err);
    clearCatalogCache();
    return null;
  }
}

/* يحفظ الصفوف. يرجع true لو حُفظت. أكبر من السقف أو فشل التخزين ← يحذف القديم (لا نترك نسخة متقادمة) ويرجع false. */
export function writeCatalogCache(rows, now = Date.now()) {
  const text = JSON.stringify({ v: CATALOG_CACHE.version, savedAt: now, rows });
  if (text.length > CATALOG_CACHE.maxChars) { log.debug('cache', 'catalog too large to cache (' + text.length + ' chars); skipped'); clearCatalogCache(); return false; }
  if (local.set(STORAGE.catalog, text)) return true;
  log.debug('cache', 'could not write the catalog cache (storage full or blocked)');
  clearCatalogCache();
  return false;
}

const clearCatalogCache = () => { local.remove(STORAGE.catalog); };
