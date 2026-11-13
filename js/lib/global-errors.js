/* شبكة أمان أخيرة: أي خطأ غير ملتقط أو Promise مرفوض بلا معالج يُسجَّل، ويرى الزائر رسالة هادئة
 * (مرة كل THROTTLE_MS وبحد أقصى MAX_TOASTS في الجلسة) بدل أن يفشل كل شيء بصمت. */
import { log } from './log.js';
import { classifyError, messageFor } from './errors.js';
import { notifyError } from './notify.js';

const THROTTLE_MS = 30000;
const MAX_TOASTS = 3;
const IGNORED = /ResizeObserver loop/i;
let lastToast = 0, shown = 0;

function tellUser(err) {
  const now = Date.now();
  if (shown >= MAX_TOASTS || now - lastToast < THROTTLE_MS) return;
  lastToast = now;
  shown++;
  const kind = classifyError(err);
  notifyError(kind === 'unknown' ? 'حدث خطأ غير متوقع. إن استمرت المشكلة فأعد تحميل الصفحة.' : messageFor(kind));
}

export function installGlobalErrorHandlers() {
  addEventListener('error', event => {
    if (IGNORED.test(event.message || '')) return;
    if (!event.error && /^script error\.?$/i.test(event.message || '')) {
      log.warn('window', 'cross-origin script error (details hidden by the browser)');
      return;
    }
    log.error('window', event.message || 'uncaught error', event.error);
    tellUser(event.error);
  });
  addEventListener('unhandledrejection', event => {
    event.preventDefault(); /* نسجّله بأنفسنا، فلا حاجة لتكرار "Uncaught (in promise)" */
    log.error('promise', 'unhandled promise rejection', event.reason);
    tellUser(event.reason);
  });
}
