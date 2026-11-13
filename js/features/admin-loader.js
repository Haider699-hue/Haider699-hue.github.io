/* تحميل لوحة الإدارة عند الحاجة فقط: 99% من الزوار لا يحتاجونها، فلا يُنزَّل admin.js (≈14KB) ولا تُسجَّل مستمعاته
 * (pointerdown/keydown/touchstart العامة) إلا في إحدى حالتين:
 *   1) الرابط #admin (عند الفتح أو لاحقًا عبر hashchange).
 *   2) توجد جلسة Supabase محفوظة في المتصفح (أدمن سبق دخوله) ← تُستعاد فورًا ويظهر زر "+" كما كان.
 * ملاحظة أمنية: لا يتغيّر شيء في الحماية — الصلاحيات تُفرض في الخادم (RLS)، وهذا الملف يقرر فقط متى نُنزّل واجهة الإدارة. */
import { log } from '../lib/log.js';
import { notifyError } from '../lib/notify.js';
import { local } from '../lib/storage.js';

/* مفتاح جلسة supabase-js: sb-<project-ref>-auth-token (انظر auth.storageKey في توثيق Supabase). */
const SESSION_KEY = /^sb-.+-auth-token$/;

/* التخزين غير متاح ← keys() فارغة ← لا جلسة نستعيدها. */
const hasSavedSession = () => local.keys().some(key => SESSION_KEY.test(key || ''));

export function initAdminLoader() {
  let loading = null;

  /* الفشل (شبكة/ملف مفقود) يُبلَّغ للزائر ويسمح بمحاولة جديدة عند تكرار #admin. */
  function load() {
    if (!loading) {
      loading = import('./admin.js')
        .then(module => module.initAdmin())
        .catch(err => {
          loading = null;
          log.error('admin', 'failed to load the admin panel module', err);
          notifyError('تعذّر تحميل لوحة الإدارة. تحقق من الاتصال ثم أعد المحاولة.');
        });
    }
    return loading;
  }

  addEventListener('hashchange', () => { if (location.hash === '#admin') load(); });
  if (location.hash === '#admin' || hasSavedSession()) return load();
}
