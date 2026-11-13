/* HAIDER — الإعدادات الثابتة (لا منطق هنا). أي رقم أو نص "سحري" يوضع هنا مرة واحدة. */

/* المفتاح العام (publishable) مقصود وجوده هنا — الحماية الفعلية من سياسات RLS في Supabase. */
export const SUPABASE_URL = 'https://lpnpyekzadlzazehaxqo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Dm9yExHFUUA6y8WcAa4T7g_i_Z4z1fJ';
export const SUPABASE_SDK_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4';
/* Subresource Integrity اختياري لـ SUPABASE_SDK_SRC (انظر SECURITY_SETUP.md). اتركه فارغًا لتخطّيه.
 * الأفضل: استضافة الملف محليًا وتغيير SUPABASE_SDK_SRC إليه. */
export const SUPABASE_SDK_INTEGRITY = '';
export const SUPABASE_PAGE_SIZE = 1000;
/* عدد صفحات الكتالوج التي تُجلب بالتوازي بعد الصفحة الأولى (لو كان العدد الكلي معروفًا). */
export const FETCH_CONCURRENCY = 4;
/* معالجة الأخطاء: مهلة كل طلب، وعدد المحاولات (الأولى + إعادات) للأخطاء المؤقتة، وتأخير أول إعادة (يتضاعف). */
export const SUPABASE_SDK_TIMEOUT_MS = 10000;
export const FETCH_TIMEOUT_MS = 12000;
export const FETCH_TRIES = 3;
export const FETCH_RETRY_BASE_MS = 800;

/* أعمدة جدول mods الاختيارية: لو غابت من قاعدة قديمة يُعاد الطلب بدونها ويُتذكَّر ذلك (الإدارة تتعطّل ميزتها فقط).
 * updated_at ← حماية تعارض التعديل (supabase/sql/03_data_migration.sql) · images ← صور المعرض الإضافية. */
export const OPTIONAL_COLUMNS = ['updated_at', 'images'];

/* ذاكرة الكتالوج المحلية (stale-while-revalidate): تُرسم القائمة فورًا من آخر نسخة ناجحة ثم تُحدَّث من الخادم،
 * وتبقى متاحة لو فشل الاتصال. ارفع version عند تغيير شكل الصف المحفوظ كي تُهمَل النسخ القديمة. */
export const CATALOG_CACHE = { version: 1, maxAgeMs: 7 * 24 * 60 * 60 * 1000, maxChars: 1500000 };

export const YOUTUBE_URL = 'https://www.youtube.com/@Haider-f6c1j';
export const SITE_TITLE = 'HAIDER — إضافات ماينكرافت بيدروك';
/* بعد رفع صفحات build-pages.mjs اكتب هنا '/m/' لتصبح روابط المشاركة صفحات ثابتة. */
export const SHARE_PAGES_PREFIX = '';
export const NO_LINK_MSG = 'الرابط غير متاح حاليًا';

export const PAGE_SIZE = 24;
export const SEARCH_DEBOUNCE_MS = 200;
export const EAGER_CARDS = 4;
export const NEW_BADGE_WINDOW_MS = 6048e5; /* أسبوع */
export const LOAD_TIMEOUT_MS = 7000;
export const DEFAULT_SORT = 'downloads';

export const MOD_TYPES = ['mcpack', 'mcaddon', 'mcworld', 'apk', 'other'];

/* التصنيفات. المفتاح = قيمة category في قاعدة البيانات. kind = كلاس نوع البطاقة في CSS. */
export const CATEGORIES = {
  Addons:   { label: 'مودات',             color: 'var(--emerald)',  icon: 'i-addons',   route: 'addons',   kind: 'k-addon'  },
  Versions: { label: 'إصدارات ماينكرافت', color: 'var(--diamond)',  icon: 'i-versions', route: 'versions', kind: 'k-ver'    },
  Skins:    { label: 'السكنات',           color: 'var(--gold)',     icon: 'i-skins',    route: 'skins',    kind: 'k-skin'   },
  Shaders:  { label: 'الشادرات',          color: 'var(--amethyst)', icon: 'i-shaders',  route: 'shaders',  kind: 'k-shader' }
};
/* ترتيب ظهور الأقسام في عرض "الكل". */
export const GROUP_ORDER = ['Addons', 'Skins', 'Shaders', 'Versions'];
/* مسار الرابط (#/c/<route>) → قيمة التصنيف. */
export const ROUTE_TO_CATEGORY = Object.fromEntries(
  [['all', 'All'], ...Object.entries(CATEGORIES).map(([cat, meta]) => [meta.route, cat])]
);

/* بيانات عرض تصنيف حتى لو كان غير معروف (قيمة قديمة في قاعدة البيانات مثلًا). */
export function categoryMeta(cat, fallbackColor = '#fff') {
  return CATEGORIES[cat] || { label: cat, color: fallbackColor, icon: 'i-all', route: '', kind: 'k-addon' };
}

/* لوحة الإدارة. الحدود تقابلها قيود CHECK في SQL. */
export const ADMIN = {
  /* اكتب إيميل حساب الأدمن مرة واحدة هنا وساعتها تُطلب كلمة المرور فقط. */
  email: '',
  idleMs: 30 * 60 * 1000,   /* خروج تلقائي بعد 30 دقيقة بلا نشاط */
  maxFails: 5,              /* محاولات الدخول قبل القفل المؤقت (Supabase Auth يحدّ أيضًا من جهة الخادم) */
  lockMs: 60 * 1000,
  limits: { name: 150, ver: 40, size: 40, desc: 5000, url: 2048, images: 20 }
};

/* مفاتيح التخزين المحلي. */
export const STORAGE = { theme: 'zth', mute: 'bb-mute', ytGate: 'ytGateDone', dlPrefix: 'dl:', catalog: 'bb-catalog' };
