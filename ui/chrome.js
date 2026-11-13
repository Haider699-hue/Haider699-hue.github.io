/* عناصر الصفحة العامة: قائمة الهيدر، ظل الهيدر عند التمرير، زر العودة للأعلى. */
import { setCategory } from '../state.js';
import { byId, prefersReducedMotion } from '../lib/dom.js';
import { onScroll } from '../lib/scroll.js';

const SHADOW_AFTER_PX = 8;
const TO_TOP_AFTER_PX = 600;

export function initChrome() {
  document.addEventListener('click', e => {
    const link = e.target.closest('.hnav a');
    if (!link) return;
    e.preventDefault();
    const cat = link.getAttribute('data-nav');
    setCategory(cat);
    if (cat === 'All') window.scrollTo({ top: 0, behavior: 'smooth' });
    else {
      const zone = document.querySelector('.search-zone');
      if (zone) zone.scrollIntoView({ behavior: 'smooth' });
    }
  });

  const header = document.querySelector('header');
  if (header) onScroll(({ y }) => header.classList.toggle('is-scrolled', y > SHADOW_AFTER_PX), { immediate: true });

  const toTop = byId('toTop');
  if (toTop) {
    onScroll(({ y }) => toTop.classList.toggle('show', y > TO_TOP_AFTER_PX), { immediate: true });
    toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  }
}
