/* انتقال فتح صفحة التفاصيل: ظهور متتابع للأقسام + صورة "تطير" من البطاقة إلى مكانها في الصفحة. */
import { byId, create, prefersReducedMotion } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { safe } from '../lib/log.js';

const FLY_MAX_AGE_MS = 900;   /* أقدم نقرة نعتبرها سبب هذا الفتح */
const FLY_IMAGE_WAIT_MS = 500;

export function initDetailTransition() {
  const overlay = byId('detail');
  if (!overlay) return;
  let origin = null;  /* مكان وصورة البطاقة التي نُقر عليها */

  /* نلتقط مكان صورة البطاقة قبل أن تفتح الصفحة (capture). */
  document.addEventListener('click', safe('detail-transition:origin', e => {
    const card = e.target.closest('.mod-card');
    if (!card || e.target.closest('.dl-btn:not(.view-btn),.adm-act')) return;
    const img = card.querySelector('.mod-thumb img');
    origin = img ? { rect: img.getBoundingClientRect(), src: img.currentSrc || img.src, at: Date.now() } : null;
  }), true);

  on('detail:closed', () => {
    const sheet = overlay.querySelector('.sheet');
    if (sheet) sheet.style.animation = '';
  });

  on('detail:opened', () => {
    const sheet = overlay.querySelector('.sheet');
    if (!sheet) return;
    const from = origin;
    origin = null;
    const reduced = prefersReducedMotion();
    if (!reduced) {
      overlay.querySelectorAll('.tt-tags,.d-desc,.d-dl').forEach((el, i) => {
        el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, delay: 140 + i * 38, easing: 'ease-out', fill: 'backwards' });
      });
    }
    const target = overlay.querySelector('.tt-img img');
    if (reduced || !from || !from.src || Date.now() - from.at > FLY_MAX_AGE_MS || !target) return;

    sheet.style.animation = 'none';
    sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    target.style.visibility = 'hidden';
    let flown = false;
    function fly() {
      if (flown) return;
      flown = true;
      const to = target.getBoundingClientRect();
      if (to.width < 8 || !document.contains(target)) { target.style.visibility = ''; return; }
      const ghost = create('img', 'zghost');
      ghost.alt = '';
      ghost.addEventListener('error', () => { ghost.remove(); target.style.visibility = ''; }, { once: true });
      ghost.src = from.src;
      ghost.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px`;
      document.body.appendChild(ghost);
      ghost.animate([
        { left: from.rect.left + 'px', top: from.rect.top + 'px', width: from.rect.width + 'px', height: from.rect.height + 'px', objectFit: 'cover' },
        { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px', objectFit: 'contain' }
      ], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => { target.style.visibility = ''; ghost.remove(); };
    }
    if (target.complete && target.naturalWidth) fly();
    else { target.addEventListener('load', fly, { once: true }); setTimeout(fly, FLY_IMAGE_WAIT_MS); }
  });
}
