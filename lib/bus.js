/* ناقل أحداث صغير: بديل MutationObserver والمتغيرات العامة للتواصل بين الوحدات.
 * الأحداث المستخدمة:
 *   filters:changed {history}   تغيّر التصنيف/البحث/الترتيب (history: 'push' | 'replace' | 'none')
 *   mods:changed                تغيّرت بيانات العناصر (بعد التحميل/إعادة التحميل)
 *   status:changed              تغيّرت حالة التحميل (loading | ready | error | offline)
 *   load:failed {kind, stale}   فشل تحميل/تحديث العناصر (kind: انظر lib/errors.js · stale: توجد بيانات قديمة معروضة)
 *   list:rendered {count}       اكتمل رسم/إضافة بطاقات في القائمة
 *   detail:opened / detail:closed   فُتحت/أُغلقت صفحة التفاصيل
 *   dimension:changed           تغيّر "البُعد" البصري (الجسيمات)
 *   theme:changed               تغيّر الثيم */
import { log } from './log.js';

const target = new EventTarget();

/* كل مستمع معزول: فشل أحدهم يُسجَّل بسياقه ولا يمنع بقية المستمعين. */
export function on(type, handler) {
  target.addEventListener(type, e => {
    try {
      const result = handler(e.detail);
      if (result && typeof result.catch === 'function') result.catch(err => log.error('bus', 'async handler for "' + type + '" failed', err));
    } catch (err) {
      log.error('bus', 'handler for "' + type + '" failed', err);
    }
  });
}
export function emit(type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}
