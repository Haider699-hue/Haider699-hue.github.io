/* HAIDER boot — يعمل متزامنًا في <head> قبل أول رسم. */
(function () {
  'use strict';
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  /* 0) Clickjacking defence-in-depth. The real protection is the frame-ancestors header
   *    (see _headers); a <meta> CSP cannot carry frame-ancestors, so on hosts without
   *    custom headers (e.g. GitHub Pages) this script is the fallback. */
  if (window.top !== window.self) {
    /* Hide first: browsers often block a framed page from navigating the top window without a user gesture. */
    document.documentElement.style.display = 'none';
    try { window.top.location.replace(window.self.location.href); } catch (e) {}
    return;
  }

  /* 1) تطبيق الثيم المحفوظ قبل الرسم (يمنع وميض الثيم الافتراضي) */
  var THEMES = { nether: ['#7c3aed', '#c084fc'], emerald: ['#a855f7', '#d8b4fe'] };
  var saved;
  try { saved = localStorage.getItem('zth'); } catch (e) {}
  if (saved && has(THEMES, saved)) {
    document.documentElement.setAttribute('data-th', saved);
    window.zTh = THEMES[saved];
  }

  /* 2) تحميل الخطوط دون حجب العرض (بديل onload المضمّن الذي يمنعه الـCSP) */
  var link = document.querySelector('link[data-async-css]');
  if (!link) return;
  var show = function () { link.media = 'all'; };
  if (link.sheet) show(); else link.addEventListener('load', show);
})();
