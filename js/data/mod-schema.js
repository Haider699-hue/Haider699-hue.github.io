/* قواعد بيانات العنصر قبل الحفظ + كشف التكرار. نقية (بلا DOM ولا شبكة) فتُختبر وحدها وتُستعمل من لوحة الإدارة.
 * الحدود نفسها مفروضة في قاعدة البيانات عبر قيود CHECK (supabase/sql/03_data_migration.sql): هذا الفحص لرسائل واضحة
 * قبل الإرسال، وقاعدة البيانات هي الحاجز الحقيقي. */
import { CATEGORIES } from '../config.js';
import { httpsUrl } from '../lib/url.js';
import { fold } from '../lib/text.js';

const isCategory = cat => Object.prototype.hasOwnProperty.call(CATEGORIES, cat);
/* مسافات متتالية/أسطر داخل الاسم والإصدار والحجم ← مسافة واحدة (الوصف يحتفظ بأسطره). */
const oneLine = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

/* input: { name, category, download, version, size, description, images[] } (نصوص خام من النموذج)
 * يرجع { ok:true, fields } (جاهزة للإرسال لجدول mods) أو { ok:false, error, field } برسالة عربية واحدة، و field = الحقل المعيب
 * (name · category · download · images · version · size · description) ليركّز عليه النموذج ويعلّمه لقارئ الشاشة. */
export function validateModInput(input, limits) {
  const name = oneLine(input.name), ver = oneLine(input.version), size = oneLine(input.size);
  const desc = String(input.description == null ? '' : input.description).replace(/\r\n?/g, '\n').trim();
  const dlRaw = String(input.download == null ? '' : input.download).trim();
  const imagesRaw = (input.images || []).map(u => String(u == null ? '' : u).trim()).filter(Boolean);

  if (!name) return { ok: false, error: 'اكتب اسم العنصر', field: 'name' };
  if (!isCategory(input.category)) return { ok: false, error: 'النوع غير صحيح', field: 'category' };
  const tooLong = [['name', name, limits.name], ['version', ver, limits.ver], ['size', size, limits.size], ['description', desc, limits.desc]].find(([, v, max]) => v.length > max);
  if (tooLong) return { ok: false, error: 'أحد الحقول أطول من الحد المسموح', field: tooLong[0] };
  if (imagesRaw.length > limits.images) return { ok: false, error: 'الحد الأقصى ' + limits.images + ' صورة', field: 'images' };
  const download = dlRaw ? httpsUrl(dlRaw, limits.url) : '';
  const images = imagesRaw.map(u => httpsUrl(u, limits.url));
  if (download === null || images.some(u => u === null)) {
    return { ok: false, error: 'الروابط لازم تبدأ بـ https:// وتكون صحيحة (من غير يوزر أو باسورد جواها)', field: download === null ? 'download' : 'images' };
  }
  /* نفس الصورة مكررة في القائمة لا معنى لها ← نحذف التكرار مع حفظ الترتيب (الأولى هي الغلاف). */
  const uniqueImages = [...new Set(images)];
  return {
    ok: true,
    fields: {
      name, category: input.category,
      image_url: uniqueImages[0] || null, download_url: download || '',
      description: desc || null, mc_version: ver || null, file_size: size || null,
      images: uniqueImages.slice(1)
    }
  };
}

/* أول عنصر مكرر لـ fields بين items (عناصر محلية الشكل: name/category/download/id): نفس رابط التحميل (غير الفارغ)
 * أو نفس الاسم (بعد التوحيد للبحث) في نفس التصنيف. excludeId = العنصر الجاري تعديله. يرجع { item, by } أو null. */
export function findDuplicate(fields, items, excludeId) {
  const key = fold(fields.name).replace(/\s+/g, ' ').trim();
  const url = fields.download_url || '';
  for (const m of items) {
    if (!m || (excludeId != null && String(m.id) === String(excludeId))) continue;
    if (url && m.download === url) return { item: m, by: 'download' };
    if (m.category === fields.category && fold(m.name).replace(/\s+/g, ' ').trim() === key) return { item: m, by: 'name' };
  }
  return null;
}
