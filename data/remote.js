/* طلبات Supabase لجدول mods: جلب الكتالوج المنشور (صفحات بالتوازي، ترتيب حتمي، تنقية التكرار)، وإدارة الأعمدة الاختيارية،
 * وقراءة صف واحد. لا يعرف شيئًا عن حالة الواجهة ولا الناقل: يرجع صفوفًا أو يرمي (التصنيف وإعادة المحاولة في catalog.js). */
import { SUPABASE_PAGE_SIZE, FETCH_CONCURRENCY, FETCH_TIMEOUT_MS, OPTIONAL_COLUMNS } from '../config.js';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { withTimeout, mapLimit } from '../lib/async.js';
import { getClient } from './supabase.js';

let optionalColumns = OPTIONAL_COLUMNS.slice(); /* الأعمدة الاختيارية المتاحة؛ تُحذف عمودًا بعد عمود لو غابت من القاعدة */

const REQUIRED_COLUMNS = 'id,slug,name,category,image_url,download_url,description,mc_version,file_size,downloads,featured,created_at,published';

/* قائمة الأعمدة الحالية (الإلزامية + الاختيارية المتاحة) — تستعملها لوحة الإدارة أيضًا لقراءة الصف بعد الحفظ. */
export const getSelectColumns = () => [REQUIRED_COLUMNS].concat(optionalColumns).join(',');
export const supportsColumn = name => optionalColumns.includes(name);

/* أي عمود اختياري ناقص؟ يرجع اسمه، أو '*' لو الخطأ "عمود ناقص" بلا تسمية (نحذف كل الاختياري)، أو null لو الخطأ لشيء آخر. */
function missingOptionalColumn(err) {
  if (!err) return null;
  const msg = String(err.message || '');
  const missing = err.code === '42703' || err.code === 'PGRST204' || /column .*(does not exist|not found)|could not find the .* column/i.test(msg);
  if (!missing) return null;
  return optionalColumns.find(c => msg.includes(c)) || (/images/i.test(msg) ? 'images' : '*');
}

/* صفحة واحدة من الطلب بمهلة؛ أي خطأ من Supabase يُرمى (لا يُترك داخل r.error).
 * withCount: نطلب العدد الكلي مع الصفحة الأولى فقط، لنجلب بقية الصفحات بالتوازي بدل واحدة بعد أخرى. */
function fetchPage(client, columns, from, withCount) {
  return withTimeout(signal => {
    /* ترتيب حتمي: created_at وحده ليس فريدًا (إضافات دفعية بنفس اللحظة)، فيتكرر/يضيع صف على حدود الصفحات.
     * الـid كفاصل ثانٍ يجعل ترتيب range ثابتًا، وnullsFirst:false يمنع ظهور صفوف بلا تاريخ في أول القائمة. */
    let query = client.from('mods').select(columns, withCount ? { count: 'exact' } : undefined).eq('published', true)
      .order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (typeof query.abortSignal === 'function') query = query.abortSignal(signal);
    return Promise.resolve(query).then(r => {
      if (r.error) throw r.error;
      if (!Array.isArray(r.data)) throw new AppError('server', 'unexpected response shape (data is not an array)');
      return { rows: r.data, count: Number.isFinite(r.count) ? r.count : null };
    });
  }, FETCH_TIMEOUT_MS, 'mods query');
}

/* يحذف الصفوف المكررة (نفس id) — قد تتكرر على حدود الصفحات لو أُضيف عنصر أثناء الجلب. الصفوف بلا id تمرّ (يتجاوزها isUsableRow). */
function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter(r => {
    if (!r || r.id == null) return true;
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

/* الصفحة الأولى تقول لنا العدد الكلي؛ لو أكثر من صفحة نجلب الباقي بالتوازي (حدّ FETCH_CONCURRENCY)،
 * ثم نكمل تتابعيًا لو آخر صفحة جاءت ممتلئة (عناصر أُضيفت أثناء الجلب). لو العدد غير معروف نرجع للجلب التتابعي كاملًا. */
/* سقف أمان لحلقة المتابعة (خادم يعيد صفحات ممتلئة بلا نهاية لا يجب أن يعلّق الموقع). */
const MAX_TAIL_PAGES = 1000;

async function fetchPublished(client, columns) {
  const first = await fetchPage(client, columns, 0, true);
  let all = first.rows;
  if (all.length < SUPABASE_PAGE_SIZE) return all;
  let from = SUPABASE_PAGE_SIZE, last = first.rows;
  if (first.count !== null && first.count > from) {
    const starts = [];
    for (let f = from; f < first.count; f += SUPABASE_PAGE_SIZE) starts.push(f);
    const pages = await mapLimit(starts, FETCH_CONCURRENCY, f => fetchPage(client, columns, f, false));
    pages.forEach(p => { all = all.concat(p.rows); });
    from = starts[starts.length - 1] + SUPABASE_PAGE_SIZE;
    last = pages[pages.length - 1].rows;
  }
  for (let guard = 0; last.length === SUPABASE_PAGE_SIZE && guard < MAX_TAIL_PAGES; guard++) {
    last = (await fetchPage(client, columns, from, false)).rows;
    all = all.concat(last);
    from += SUPABASE_PAGE_SIZE;
  }
  return dedupeRows(all);
}

/* أعمدة الطلب مع الرجوع لنسخة بلا العمود الاختياري الناقص فقط (لا أي خطأ آخر كالشبكة). كل محاولة تحذف عمودًا، فالحلقة منتهية. */
export async function fetchCatalogRows(client) {
  for (;;) {
    try {
      return await fetchPublished(client, getSelectColumns());
    } catch (err) {
      const missing = missingOptionalColumn(err);
      if (!missing || !optionalColumns.length) throw err;
      log.warn('catalog', 'optional column \"' + missing + '\" missing in database; continuing without it (run supabase/sql/03_data_migration.sql)', err);
      optionalColumns = missing === '*' ? [] : optionalColumns.filter(c => c !== missing);
    }
  }
}

/* قراءة صف واحد (بكل الأعمدة المتاحة) — لكشف سبب فشل تحديث (تعارض أم حذف) أو تحديث نسخة متقادمة. null لو غير موجود. */
export async function fetchRowById(id) {
  const client = getClient();
  if (!client) throw new AppError('network', 'client unavailable');
  const r = await withTimeout(() => Promise.resolve(client.from('mods').select(getSelectColumns()).eq('id', id).limit(1)), FETCH_TIMEOUT_MS, 'mods row query');
  if (r.error) throw r.error;
  return Array.isArray(r.data) && r.data[0] ? r.data[0] : null;
}
