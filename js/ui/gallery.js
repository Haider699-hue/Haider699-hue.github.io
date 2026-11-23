/* معرض الصور في صفحة التفاصيل: الأسهم، الصور المصغّرة، العدّاد (2 / 5)، لوحة المفاتيح، السحب باللمس (pointer events)،
 * التحميل المسبق للصورة التالية، والتكبير (lightbox) بتركيز محبوس وإغلاق بـEsc والزر × والنقر على الخلفية. */
import { isDetailOpen } from './detail.js';
import { arrowSvg } from './detail-view.js';
import { activateModal } from '../lib/modal.js';
import { create } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { safe } from '../lib/log.js';

const SWIPE_MIN_PX = 50;
const SWIPE_AXIS_RATIO = 1.2; /* السحب الأفقي لازم يغلب الرأسي بهذه النسبة وإلا هو تمرير للصفحة */

const currentGallery = () => document.querySelector('#detail .dp');
const parts = gallery => ({
  thumbs: [...gallery.querySelectorAll('.tt-th img')],
  main: gallery.querySelector('.tt-img img'),
  count: gallery.querySelector('.g-count')
});

function preload(src) {
  if (!src) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
}
/* الصورة التالية (والسابقة) في الذاكرة المؤقتة قبل أن يضغط الزائر. */
function preloadAround(thumbs, index) {
  if (thumbs.length < 2) return;
  preload(thumbs[(index + 1) % thumbs.length].getAttribute('src'));
  preload(thumbs[(index - 1 + thumbs.length) % thumbs.length].getAttribute('src'));
}

/* step: ±1 للتنقل، أو 0 مع thumb لاختيار صورة مصغّرة بعينها. */
function changeImage(gallery, step, thumb) {
  const { thumbs, main, count } = parts(gallery);
  if (!main || !thumbs.length) return;
  let current = thumbs.findIndex(t => t.classList.contains('on'));
  if (current < 0) current = Math.max(0, thumbs.findIndex(t => t.src === main.src));
  const index = step === 0 ? thumbs.indexOf(thumb) : (current + step + thumbs.length) % thumbs.length;
  if (index < 0) return;
  thumbs.forEach((t, k) => t.classList.toggle('on', k === index));
  main.src = thumbs[index].src;
  if (count) count.textContent = (index + 1) + ' / ' + thumbs.length;
  preloadAround(thumbs, index);
  try { thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) { /* متصفح قديم */ }
}

/* ===== Lightbox ===== */
let lightbox = null;
let releaseLightbox = null;
const lightboxOpen = () => !!lightbox && !lightbox.hidden;

function buildLightbox() {
  lightbox = create('div', 'lightbox');
  lightbox.id = 'lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'عرض الصورة مكبّرة');
  lightbox.innerHTML = '<button type="button" class="lb-close" aria-label="إغلاق" data-lb-close>×</button>'
    + `<button type="button" class="lb-arrow lb-prev" aria-label="الصورة السابقة" data-lb="-1">${arrowSvg('M9 6l6 6-6 6')}</button>`
    + `<button type="button" class="lb-arrow lb-next" aria-label="الصورة التالية" data-lb="1">${arrowSvg('M15 6l-6 6 6 6')}</button>`
    + '<div class="lb-stage"><img class="lb-img" alt=""><span class="lb-count" role="status" dir="ltr"></span></div>';
  document.body.appendChild(lightbox);
}

/* يعرض الصورة الرئيسية الحالية للمعرض (المصدر الوحيد للحقيقة) ويخفي الأسهم والعدّاد لو الصورة وحيدة. */
function renderLightbox() {
  const gallery = currentGallery();
  const { thumbs, main } = gallery ? parts(gallery) : {};
  if (!main) return closeLightbox();
  const img = lightbox.querySelector('.lb-img');
  img.src = main.src;
  img.alt = main.alt || '';
  const multi = thumbs.length > 1;
  const index = Math.max(0, thumbs.findIndex(t => t.src === main.src));
  lightbox.querySelectorAll('.lb-arrow,.lb-count').forEach(el => { el.hidden = !multi; });
  lightbox.querySelector('.lb-count').textContent = (index + 1) + ' / ' + thumbs.length;
}

function openLightbox(opener) {
  if (!lightbox) buildLightbox();
  if (lightboxOpen()) return;
  lightbox.hidden = false;
  renderLightbox();
  if (lightbox.hidden) return;
  releaseLightbox = activateModal(lightbox, { dialog: lightbox, initialFocus: lightbox.querySelector('.lb-close'), opener });
}

function closeLightbox({ restoreFocus = true } = {}) {
  if (!lightboxOpen()) return;
  lightbox.hidden = true;
  if (releaseLightbox) { releaseLightbox({ restoreFocus }); releaseLightbox = null; }
}

function stepLightbox(step) {
  const gallery = currentGallery();
  if (!gallery) return;
  changeImage(gallery, step);
  renderLightbox();
}

/* سحب أفقي بلمس/قلم على عنصر السحب (المعرض أو مسرح الـlightbox): يرجع الاتجاه ±1 أو 0. */
function swipeStep(start, e) {
  const dx = e.clientX - start.x, dy = e.clientY - start.y;
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO) return 0;
  return dx < 0 ? 1 : -1; /* RTL: السحب لليسار = التالي */
}

export function initGallery() {
  /* RTL: السهم الأيسر = التالي. الـlightbox المفتوح يأخذ المفاتيح كلها (Esc يغلقه هو وحده ولا يصل لإغلاق صفحة التفاصيل). */
  document.addEventListener('keydown', safe('gallery:keys', e => {
    if (lightboxOpen()) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeLightbox(); }
      else if (e.key === 'ArrowLeft') stepLightbox(1);
      else if (e.key === 'ArrowRight') stepLightbox(-1);
      return;
    }
    if (!isDetailOpen()) return;
    const gallery = currentGallery();
    if (!gallery) return;
    if (e.key === 'ArrowLeft') changeImage(gallery, 1);
    else if (e.key === 'ArrowRight') changeImage(gallery, -1);
  }));

  let start = null;
  document.addEventListener('pointerdown', safe('gallery:pointerdown', e => {
    const zone = e.pointerType !== 'mouse' && e.target.closest && e.target.closest('#detail .tt-img, .lb-stage');
    start = zone && !e.target.closest('button') ? { x: e.clientX, y: e.clientY, lightbox: !!zone.closest('.lightbox') } : null;
  }), { passive: true });
  document.addEventListener('pointerup', safe('gallery:pointerup', e => {
    if (!start) return;
    const step = swipeStep(start, e), inLightbox = start.lightbox;
    start = null;
    if (!step) return;
    if (inLightbox) stepLightbox(step);
    else { const gallery = currentGallery(); if (gallery) changeImage(gallery, step); }
  }), { passive: true });
  document.addEventListener('pointercancel', () => { start = null; }, { passive: true });

  /* أزرار الأسهم والصور المصغّرة (data-gal)، التكبير (data-zoom أو النقر على الصورة)، وعناصر الـlightbox: مستمع نقر واحد (capture). */
  document.addEventListener('click', safe('gallery:click', e => {
    const t = e.target;
    if (!t.closest) return;
    if (t.closest('.lightbox')) {
      const lb = t.closest('[data-lb]');
      if (lb) stepLightbox(+lb.getAttribute('data-lb'));
      else if (t.closest('[data-lb-close]') || !t.closest('.lb-img, .lb-count')) closeLightbox();
      return;
    }
    const zoom = t.closest('[data-zoom]') || (t.matches('#detail .tt-img img') && t.closest('.tt-img').querySelector('[data-zoom]'));
    if (zoom) { openLightbox(zoom); return; }
    const control = t.closest('[data-gal]');
    if (!control) return;
    const step = +control.getAttribute('data-gal');
    if (step !== 0) e.stopPropagation();
    const gallery = control.closest('.dp');
    if (gallery) changeImage(gallery, step, control.querySelector('img'));
  }), true);

  on('detail:closed', () => closeLightbox({ restoreFocus: false }));
  on('detail:rendered', () => {
    const gallery = currentGallery();
    if (!gallery) return;
    const { thumbs } = parts(gallery);
    preloadAround(thumbs, 0);
  });
}
