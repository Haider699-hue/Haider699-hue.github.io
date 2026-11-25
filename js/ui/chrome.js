/* عناصر الصفحة العامة: شريط التصنيفات (chips) وروابط «عرض الكل»، ظل الهيدر عند التمرير، زر العودة للأعلى. */
import { setCategory } from '../state.js';
import { byId, prefersReducedMotion } from '../lib/dom.js';
import { onScroll } from '../lib/scroll.js';

const SHADOW_AFTER_PX = 8;
const TO_TOP_AFTER_PX = 600;

export function initChrome() {
  document.addEventListener('click', e => {
    const link = e.target.closest('.cat-tile, .category-all');
    if (!link) return;
    e.preventDefault();
    const cat = link.getAttribute('data-nav');
    setCategory(cat);
    if (cat === 'All' && !link.classList.contains('cat-tile')) window.scrollTo({ top: 0, behavior: 'smooth' });
    else {
      const feed = byId('feed');
      if (feed) feed.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
