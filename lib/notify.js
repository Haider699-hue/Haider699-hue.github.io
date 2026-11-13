/* إشعارات (toast) قصيرة للمستخدم: خطأ / نجاح / معلومة. تظهر في #toasts وتُقرأ بقارئات الشاشة
 * (role=alert للأخطاء، role=status لغيرها). نفس الرسالة لا تتكرر خلال DEDUPE_MS، وأقصى MAX_VISIBLE معًا. */
import { byId, create } from './dom.js';

const MAX_VISIBLE = 3;
const DEDUPE_MS = 4000;
const DURATION_MS = { error: 7000, success: 4000, info: 4000 };
const recent = new Map();

export function notify(text, { type = 'info', ms } = {}) {
  const host = byId('toasts');
  if (!host || !text) return null;
  const now = Date.now();
  if (now - (recent.get(text) || 0) < DEDUPE_MS) return null;
  recent.set(text, now);
  while (host.children.length >= MAX_VISIBLE) host.firstElementChild.remove();

  const toast = create('div', 'toast toast-' + type);
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const message = create('span', 'toast-msg');
  message.textContent = text;
  const close = create('button', 'toast-x');
  close.type = 'button';
  close.setAttribute('aria-label', 'إغلاق الإشعار');
  close.textContent = '×';
  toast.append(message, close);
  host.appendChild(toast);

  const dismiss = () => { clearTimeout(timer); toast.remove(); };
  const timer = setTimeout(dismiss, ms || DURATION_MS[type] || DURATION_MS.info);
  close.addEventListener('click', dismiss);
  return toast;
}

export const notifyError = text => notify(text, { type: 'error' });
export const notifySuccess = text => notify(text, { type: 'success' });
