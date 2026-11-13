/* وسوم الصفحة التي تُضاف ديناميكيًا: أيقونة التبويب، canonical، وJSON-LD. */
import { create } from '../lib/dom.js';

export function initPageMeta() {
  /* أيقونة التبويب = صورة الهيدر. */
  let icon = document.querySelector('link[rel=icon]');
  if (!icon) { icon = create('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
  const brand = document.querySelector('.brand-mark');
  if (brand) icon.href = brand.src;

  if (!/^https?:/.test(location.protocol)) return;

  if (!document.querySelector('link[rel=canonical]')) {
    const canonical = create('link');
    canonical.rel = 'canonical';
    canonical.href = location.origin + location.pathname;
    document.head.appendChild(canonical);
  }
  const description = document.querySelector('meta[name=description]');
  if (description && !document.querySelector('script[type="application/ld+json"]')) {
    const ld = create('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'HAIDER',
      url: location.origin + location.pathname, inLanguage: 'ar', description: description.content
    });
    document.head.appendChild(ld);
  }
}
