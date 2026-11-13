/* HAIDER boot — يعمل متزامنًا في <head> قبل أول رسم. */
(function () {
  'use strict';

  /* 0) Clickjacking defence-in-depth. The real protection is the frame-ancestors header
   *    (see _headers); a <meta> CSP cannot carry frame-ancestors, so on hosts without
   *    custom headers (e.g. GitHub Pages) this script is the fallback. */
  if (window.top !== window.self) {
    /* Hide first: browsers often block a framed page from navigating the top window without a user gesture. */
    document.documentElement.style.display = 'none';
    try { window.top.location.replace(window.self.location.href); } catch (e) {}
    return;
  }

  /* 1) تطبيق الثيم المحفوظ قبل الرسم (يمنع وميض الثيم الافتراضي).
   *    الثيم الافتراضي "end" بلا data-th. القائمة الكاملة وألوانها في js/features/theme.js. */
  var THEMES = ['nether', 'emerald'];
  var saved;
  try { saved = localStorage.getItem('zth'); } catch (e) {}
  if (THEMES.indexOf(saved) > -1) document.documentElement.setAttribute('data-th', saved);

  /* 2) مراقب الإقلاع: لو لم تعمل الوحدات (متصفح لا يدعم ES modules، ملف مفقود، خطأ صياغة، شبكة ميتة)
   *    فلا يبقى الزائر أمام "جاري التحميل…" للأبد. app.js يعرّف window.HAIDER في آخره، وغيابه = فشل الإقلاع. */
  var BOOT_TIMEOUT_MS = 20000;
  var bootFailed = function () {
    if (window.HAIDER) return;
    var empty = document.getElementById('emptyState');
    if (!empty) return;
    document.documentElement.classList.remove('bb-loading');
    var set = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
    set('emptyTitle', 'تعذّر تشغيل الموقع');
    set('emptySub', 'حدثت مشكلة أثناء تحميل ملفات الموقع. تحقق من اتصالك بالإنترنت ثم أعد تحميل الصفحة.');
    set('emptyReset', 'إعادة تحميل الصفحة');
    var button = document.getElementById('emptyReset');
    if (button) { button.hidden = false; button.disabled = false; button.onclick = function () { location.reload(); }; }
    empty.hidden = false;
    if (window.console) console.error('[HAIDER] boot failed: the application modules did not start (window.HAIDER is missing).');
  };
  var watchBoot = function () {
    if (!('noModule' in HTMLScriptElement.prototype)) { bootFailed(); return; } /* متصفح بلا ES modules */
    setTimeout(bootFailed, BOOT_TIMEOUT_MS);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchBoot);
  else watchBoot();

  /* 3) تحميل الخطوط دون حجب العرض (بديل onload المضمّن الذي يمنعه الـCSP) */
  var link = document.querySelector('link[data-async-css]');
  if (!link) return;
  var show = function () { link.media = 'all'; };
  if (link.sheet) show(); else link.addEventListener('load', show);
})();
