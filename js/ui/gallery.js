/* معرض الصور في صفحة التفاصيل: الأسهم، الصور المصغّرة، لوحة المفاتيح، والسحب باللمس. */
import { isDetailOpen } from './detail.js';
import { safe } from '../lib/log.js';

const SWIPE_MIN_PX = 50;

/* step: ±1 للتنقل، أو 0 مع thumb لاختيار صورة مصغّرة بعينها. */
function changeImage(gallery, step, thumb) {
  const thumbs = [...gallery.querySelectorAll('.tt-th img')];
  const main = gallery.querySelector('.tt-img img');
  if (!main || !thumbs.length) return;
  let current = thumbs.findIndex(t => t.classList.contains('on'));
  if (current < 0) current = Math.max(0, thumbs.findIndex(t => t.src === main.src));
  const index = step === 0 ? thumbs.indexOf(thumb) : (current + step + thumbs.length) % thumbs.length;
  if (index < 0) return;
  thumbs.forEach((t, k) => t.classList.toggle('on', k === index));
  main.src = thumbs[index].src;
  try { thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) { /* متصفح قديم */ }
}

const currentGallery = () => document.querySelector('#detail .dp');

export function initGallery() {
  /* RTL: السهم الأيسر = التالي. */
  document.addEventListener('keydown', safe('gallery:keys', e => {
    if (!isDetailOpen()) return;
    const gallery = currentGallery();
    if (!gallery) return;
    if (e.key === 'ArrowLeft') changeImage(gallery, 1);
    else if (e.key === 'ArrowRight') changeImage(gallery, -1);
  }));

  let startX = null;
  document.addEventListener('touchstart', safe('gallery:touchstart', e => {
    const inGallery = e.target.closest && e.target.closest('#detail .tt-img');
    startX = inGallery && e.touches[0] ? e.touches[0].clientX : null;
  }), { passive: true });
  document.addEventListener('touchend', safe('gallery:touchend', e => {
    if (startX === null || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    const gallery = currentGallery();
    if (gallery) changeImage(gallery, dx < 0 ? 1 : -1);
  }), { passive: true });

  /* أزرار الأسهم والصور المصغّرة (data-gal) — بديل onclick المضمّن الذي يمنعه الـCSP. */
  document.addEventListener('click', safe('gallery:click', e => {
    const control = e.target.closest && e.target.closest('[data-gal]');
    if (!control) return;
    const step = +control.getAttribute('data-gal');
    if (step !== 0) e.stopPropagation();
    const gallery = control.closest('.dp');
    if (gallery) changeImage(gallery, step, control.querySelector('img'));
  }), true);
}
