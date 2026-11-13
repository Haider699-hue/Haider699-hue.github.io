/* نموذج العنصر: شكل واحد موحّد ومُنقّى لأي عنصر (محلي أو من القاعدة). دوال نقية بلا حالة ولا شبكة ولا DOM.
 *   normalize  ← أي كائن إلى الشكل المعتمد في الواجهة (ويحفظه على الأصل كي لا يُعاد حسابه)
 *   fromRow    ← صف جدول mods (snake_case) إلى شكل العنصر الخام (camelCase) الذي تخزّنه القائمة والذاكرة المحلية
 *   isUsableRow ← هل الصف صالح للعرض (له id)؟ */
import { MOD_TYPES, NEW_BADGE_WINDOW_MS } from '../config.js';
import { fold, hash32, slugBase, makeSlug } from '../lib/text.js';
import { safeUrl } from '../lib/url.js';

/* يحوّل أي عنصر (محلي أو من القاعدة) لشكل موحّد ومُنقّى، ويحفظه على العنصر الأصلي (_n) كي لا يُعاد حسابه. */
export function normalize(m) {
  if (m && m._n) return m._n;
  const src = (m && typeof m === 'object') ? m : {};
  const str = v => v == null ? '' : String(v).trim();
  const list = v => Array.isArray(v) ? v : [];
  const name = str(src.name) || 'بدون اسم';
  const download = safeUrl(src.download);
  const downloads = (src.downloads === '' || src.downloads == null || !isFinite(+src.downloads)) ? null : +src.downloads;
  const fallbackKey = hash32(name + '|' + download);
  const n = {
    id: str(src.id) || (slugBase(name) + '-' + fallbackKey),
    name, category: str(src.category), image: safeUrl(src.image), download,
    description: str(src.description), mcVersion: str(src.mcVersion), size: str(src.size), downloads,
    createdAt: isFinite(Date.parse(src.createdAt)) ? str(src.createdAt) : '',
    images: list(src.images).map(safeUrl).filter(Boolean),
    tags: list(src.tags).map(str).filter(Boolean),
    featured: src.featured === true || src.featured === 'true',
    type: MOD_TYPES.includes(src.type) ? src.type : '',
    slug: str(src.slug) || makeSlug(name, str(src.id) || fallbackKey)
  };
  n.ts = Date.parse(n.createdAt) || 0; /* مرة واحدة هنا بدل Date.parse داخل كل مقارنة ترتيب */
  n.s = fold(n.name + ' ' + n.tags.join(' ') + ' ' + n.description);
  try { Object.defineProperty(src, '_n', { value: n, enumerable: false }); } catch (e) { /* عنصر مجمّد: نُعيد الحساب كل مرة */ }
  return n;
}

export const isRecent = n => !!n.createdAt && Date.now() - Date.parse(n.createdAt) < NEW_BADGE_WINDOW_MS;

export const fromRow = m => ({
  id: m.id, slug: m.slug || '', name: m.name, category: m.category,
  image: m.image_url || '', download: m.download_url || '', description: m.description || '',
  mcVersion: m.mc_version || '', size: m.file_size || '', downloads: m.downloads ?? 0,
  featured: !!m.featured, createdAt: m.created_at || '', images: Array.isArray(m.images) ? m.images : [],
  updatedAt: m.updated_at || '' /* نصّ خام كما أتى (بدقة الميكروثانية): يُستعمل كما هو لكشف تعارض التعديل */
});

/* صف بلا id لا يمكن فتحه ولا تعديله: نتجاوزه ونسجّل بدل أن يكسر القائمة كلها. */
export const isUsableRow = r => !!r && typeof r === 'object' && r.id != null;
