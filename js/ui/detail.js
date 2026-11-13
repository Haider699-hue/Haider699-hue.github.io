/* صفحة التفاصيل: فتح/إغلاق، تكامل مع history، حبس التركيز، نسخ الرابط، عدّاد التحميل. */
import { SITE_TITLE, STORAGE } from '../config.js';
import { findMod, normalize, recordDownload } from '../data/catalog.js';
import { state } from '../state.js';
import { buildHash, itemHash } from '../routes.js';
import { byId, copyText } from '../lib/dom.js';
import { emit } from '../lib/bus.js';
import { log } from '../lib/log.js';
import { notifyError } from '../lib/notify.js';
import { activateModal } from '../lib/modal.js';
import { detailHtml } from './detail-view.js';

let overlay, sheet, body;
let detailOpen = false;
let pushed = false;      /* هل فتحناها بـpushState (فنرجع بـhistory.back عند الإغلاق)؟ */
let openHash = '';
let openerEl = null;     /* العنصر الذي نعيد إليه التركيز عند الإغلاق */
let releaseModal = null; /* تلغي عزل الخلفية وحبس Tab عند الإغلاق */

export const isDetailOpen = () => detailOpen;
export const getOpenHash = () => openHash;

const lockScroll = on => document.documentElement.classList.toggle('sheet-open', on);

/* mode: 'route' (من الرابط) | 'push' / 'click' (من المستخدم). يرجع false لو العنصر غير موجود. */
export function openDetail(id, mode, opener) {
  const mod = findMod(id);
  if (!mod) return false;
  /* نبني المحتوى أولًا: لو فشل (بيانات غير متوقعة) تبقى الواجهة كما هي بدل حالة نصف مفتوحة. */
  let n, html;
  try {
    n = normalize(mod);
    html = detailHtml(n);
  } catch (err) {
    log.error('detail', 'failed to build the detail page for "' + id + '"', err);
    notifyError('تعذّر عرض تفاصيل هذا العنصر.');
    return false;
  }
  openerEl = opener || document.activeElement;
  const wasOpen = detailOpen;
  body.innerHTML = html;
  state.detailId = n.id;
  overlay.hidden = false;
  detailOpen = true;
  overlay.scrollTop = 0;
  document.title = n.name + ' — HAIDER';
  try {
    const hash = itemHash(n);
    openHash = hash;
    if (mode === 'route') pushed = !!(history.state && history.state.zd);
    else if (location.hash !== hash) { history.pushState({ zd: 1 }, '', hash); pushed = true; }
    else pushed = !!(history.state && history.state.zd);
  } catch (e) { /* history غير متاح */ }
  lockScroll(true);
  if (!wasOpen) releaseModal = activateModal(overlay, { dialog: sheet, opener: null });
  requestAnimationFrame(() => {
    const close = sheet.querySelector('.sheet-close');
    if (close) close.focus({ preventScroll: true });
  });
  if (!wasOpen) emit('detail:opened');
  return true;
}

/* يغلق الواجهة فقط (بدون لمس history). */
export function closeDetailUi() {
  const closedId = state.detailId;
  detailOpen = false;
  if (releaseModal) { releaseModal({ restoreFocus: false }); releaseModal = null; }
  overlay.hidden = true;
  body.innerHTML = '';
  lockScroll(false);
  document.title = SITE_TITLE;
  state.detailId = '';
  /* القائمة قد تُعاد رسمها والنافذة مفتوحة (تحديث الكتالوج) فيصير الزر القديم خارج الصفحة: نرجع لزر بطاقة العنصر نفسه. */
  const card = closedId && document.querySelector('.mod-card[data-id="' + CSS.escape(closedId) + '"] .view-btn');
  const target = openerEl && openerEl.isConnected ? openerEl : card;
  openerEl = null;
  if (target && target.isConnected && typeof target.focus === 'function') {
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
  emit('detail:closed');
}

function closeDetail() {
  if (!detailOpen) return;
  if (pushed) { pushed = false; try { history.back(); return; } catch (e) { /* نكمل بالإغلاق المباشر */ } }
  try { history.replaceState(null, '', buildHash(state)); } catch (e) { /* history غير متاح */ }
  closeDetailUi();
}

const COPY_FEEDBACK_MS = 1800;
async function copyPageLink(btn) {
  const ok = await copyText(btn.getAttribute('data-url') || location.href);
  if (!ok) log.warn('detail', 'clipboard copy failed or is not permitted');
  if (!btn.dataset.label) btn.dataset.label = btn.textContent; /* نحفظ النص الأصلي مرة واحدة (يمنع تعلّقه عند الضغط المتكرر) */
  btn.textContent = ok ? 'تم النسخ ✓' : 'تعذّر النسخ';
  btn.setAttribute('aria-live', 'polite');
  setTimeout(() => { btn.textContent = btn.dataset.label; }, COPY_FEEDBACK_MS);
}

export function initDetail() {
  overlay = byId('detail');
  sheet = byId('sheetPanel');
  body = byId('detailBody');

  /* مستمع نقر واحد مفوّض لكل ما داخل الصفحة. */
  sheet.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('.sheet-close')) return closeDetail();
    const copyBtn = t.closest('.dp-copy');
    if (copyBtn) return copyPageLink(copyBtn);
    const related = t.closest('.dp-rel');
    if (related) return openDetail(related.getAttribute('data-open'), 'click');
    if (t.closest('a.dl-btn')) recordDownload(state.detailId, STORAGE.dlPrefix);
  });
  /* Escape يضغط زر الرجوع فعليًا ليمرّ بنفس مسار النقر (بما فيه صوت الرجوع). */
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const close = document.querySelector('#detail:not([hidden]) .sheet-close');
    if (close) close.click();
  });
}
