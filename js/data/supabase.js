/* تحميل Supabase SDK وإنشاء العميل. العميل داخل الوحدة (لا متغير عام window.haiderSupabase).
 * ملاحظة أمنية: المفتاح العام هنا مقصود؛ الحماية الفعلية من سياسات RLS (انظر config.js).
 * الفشل (شبكة/حاجب إعلانات/مهلة) لا يرمي خطأ: يُحلّ الوعد بـnull، ويمكن إعادة المحاولة عبر restartSupabase(). */
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_SDK_SRC, SUPABASE_SDK_INTEGRITY, SUPABASE_SDK_TIMEOUT_MS } from '../config.js';
import { log } from '../lib/log.js';

let client = null;
let ready = null;
let pending = false;

export const getClient = () => client;

function createClient() {
  if (!(window.supabase && window.supabase.createClient)) {
    log.warn('supabase', 'SDK loaded but window.supabase.createClient is missing');
    return null;
  }
  try {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return client;
  } catch (err) {
    log.error('supabase', 'createClient failed', err);
    return null;
  }
}

function loadSdk() {
  pending = true;
  return new Promise(resolve => {
    if (window.supabase && window.supabase.createClient) { pending = false; resolve(createClient()); return; }
    const script = document.createElement('script');
    let settled = false, timer = 0;
    const finish = value => {
      if (settled) return;
      settled = true;
      pending = false;
      clearTimeout(timer);
      resolve(value);
    };
    const abandon = reason => {
      log.warn('supabase', reason);
      if (script.remove) script.remove(); /* حتى لا يتراكم وسم فاشل عند كل إعادة محاولة */
      finish(null);
    };
    script.src = SUPABASE_SDK_SRC;
    script.async = true;
    if (SUPABASE_SDK_INTEGRITY) { script.integrity = SUPABASE_SDK_INTEGRITY; script.crossOrigin = 'anonymous'; }
    script.onload = () => finish(createClient());
    script.onerror = () => abandon('SDK script failed to load (network, blocker or CSP)');
    timer = setTimeout(() => abandon('SDK script timed out after ' + SUPABASE_SDK_TIMEOUT_MS + 'ms'), SUPABASE_SDK_TIMEOUT_MS);
    document.head.appendChild(script);
  });
}

/* يبدأ تحميل الـSDK مرة واحدة. */
export function startSupabase() {
  if (!ready) ready = loadSdk();
  return ready;
}

/* يُحَلّ بالعميل عند الجاهزية، أو بـnull لو تعذّر تحميل الـSDK. */
export const whenSupabaseReady = () => ready || startSupabase();

/* إعادة محاولة بعد فشل سابق (زر "إعادة المحاولة" أو عودة الاتصال). لا يبدأ تحميلًا ثانيًا لو واحد جارٍ. */
export function restartSupabase() {
  if (client) return Promise.resolve(client);
  if (!pending) ready = null;
  return startSupabase();
}
