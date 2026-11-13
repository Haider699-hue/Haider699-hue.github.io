/* سلوك النوافذ المنبثقة (dialogs) الموحّد لإمكانية الوصول: عزل الخلفية (inert) + حبس Tab داخل النافذة + إعادة التركيز.
 * aria-modal وحده لا تحترمه كل قارئات الشاشة، وinert يمنع التركيز والقراءة والنقر على الخلفية في آنٍ واحد.
 * المتصفحات التي لا تدعم inert تبقى محمية بحبس Tab وaria-modal. تُستعمل من: detail · admin · youtube-gate. */

/* ما لا نعزله أبدًا: النوافذ نفسها، والإشعارات (منطقة حيّة يجب أن تبقى مقروءة)، وما لا يظهر أصلًا. */
const NEVER_INERT = new Set(['SCRIPT', 'NOSCRIPT', 'STYLE', 'SVG', 'LINK']);
const lockCounts = new Map(); /* عنصر ← عدد النوافذ المفتوحة التي طلبت عزله (نوافذ متداخلة لا تُلغي عزل بعضها) */

/* يعزل كل أبناء body عدا overlay (وفرع الإشعارات). يرجع دالة تلغي العزل. */
export function lockBackground(overlay) {
  const locked = [];
  for (const el of document.body.children) {
    if (el === overlay || el.contains(overlay) || NEVER_INERT.has(el.tagName.toUpperCase()) || el.id === 'toasts') continue;
    lockCounts.set(el, (lockCounts.get(el) || 0) + 1);
    el.inert = true;
    locked.push(el);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const el of locked) {
      const left = (lockCounts.get(el) || 1) - 1;
      if (left > 0) lockCounts.set(el, left);
      else { lockCounts.delete(el); el.inert = false; }
    }
  };
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const isShown = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

/* Tab/Shift+Tab يدور داخل container. يُربط على keydown. */
export function trapTab(container, e) {
  if (e.key !== 'Tab') return;
  const items = [...container.querySelectorAll(FOCUSABLE)].filter(isShown);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
}

/* يفعّل نافذة: يعزل الخلفية ويحبس Tab فيها ويركّز initialFocus. يرجع release() التي تلغي كل ذلك وتعيد التركيز
 * لعنصر opener (أو لما كان مركّزًا وقت الفتح) لو ما زال في الصفحة.
 *   overlay: عنصر الغطاء (ابن body المباشر) · dialog: العنصر الحامل لـrole=dialog (لحبس Tab) */
export function activateModal(overlay, { dialog = overlay, initialFocus = null, opener = document.activeElement } = {}) {
  const unlock = lockBackground(overlay);
  const onKey = e => trapTab(dialog, e);
  dialog.addEventListener('keydown', onKey);
  if (initialFocus) requestAnimationFrame(() => initialFocus.focus({ preventScroll: true }));
  return function release({ restoreFocus = true } = {}) {
    unlock();
    dialog.removeEventListener('keydown', onKey);
    if (restoreFocus && opener && opener.isConnected && typeof opener.focus === 'function') requestAnimationFrame(() => opener.focus({ preventScroll: true }));
  };
}
