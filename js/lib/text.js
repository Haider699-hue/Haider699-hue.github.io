/* أدوات النصوص: هروب HTML، توحيد النص العربي للبحث، الـslug، تنظيف قيم CSS. */
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

/* لقيمة داخل url('...') في خاصية style. */
export const cssUrl = u => String(u || '')
  .replace(/\\/g, '%5C').replace(/'/g, '%27').replace(/"/g, '%22')
  .replace(/[()\s]/g, c => encodeURIComponent(c));

/* توحيد للبحث: إزالة التشكيل والتطويل، وتوحيد الألف والياء والتاء المربوطة. */
export const fold = s => String(s == null ? '' : s).toLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

/* بصمة نصية قصيرة ثابتة (djb2) لتوليد معرّفات للعناصر المحلية. */
export function hash32(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const slugBase = name => String(name).toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function makeSlug(name, key) {
  const base = slugBase(name).replace(/-+$/, '');
  return (base || 'item') + '-' + String(key).replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
}
