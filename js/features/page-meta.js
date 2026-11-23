/* وسوم الصفحة: canonical وJSON-LD للموقع (تُضاف عند الإقلاع)، ووسوم العنصر المفتوح (العنوان، الوصف، og/twitter، JSON-LD للعنصر) التي تُضبط عند فتح التفاصيل وتُعاد لقيمها الأصلية عند الإغلاق.
 * الأيقونات (favicon وapple-touch-icon) وسوم og/twitter الأصلية ثابتة في index.html.
 * canonical وog:url يبقيان على جذر الدومين عمدًا: روابط التطبيق من نوع #/i/<slug> والزواحف تُسقط الـfragment، فلا تُعدّ صفحات مستقلة. */
import { SITE_TITLE, categoryMeta } from '../config.js';
import { create } from '../lib/dom.js';

const DESC_MAX = 155;
const IMAGE_SIZE_META = 'meta[property="og:image:type"],meta[property="og:image:width"],meta[property="og:image:height"]';
const saved = new Map();   /* عنصر meta ← قيمته الأصلية (تُحفظ عند أول تعديل) */
let removed = [];          /* وسوم أبعاد الصورة التي أُزيلت لأن صورة العنصر بأبعاد مختلفة */

function setContent(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (!saved.has(el)) saved.set(el, el.getAttribute('content'));
  el.setAttribute('content', value);
}

const clip = text => {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > DESC_MAX ? flat.slice(0, DESC_MAX - 1).trimEnd() + '…' : flat;
};

function absoluteUrl(url) {
  if (!url) return ''; /* new URL('') يرجع رابط الصفحة نفسها، لا «بلا صورة» */
  try { return new URL(url, location.href).href; } catch (e) { return ''; }
}

function setJsonLd(data) {
  let ld = document.getElementById('ld-item');
  if (!data) { if (ld) ld.remove(); return; }
  if (!ld) {
    ld = create('script');
    ld.type = 'application/ld+json';
    ld.id = 'ld-item';
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify(data);
}

/* n: عنصر مُطبَّع · url: رابط مشاركة العنصر. لا نخترع بيانات: الحقول الفارغة تُحذف من JSON-LD. */
export function setItemMeta(n, url) {
  resetMeta(); /* التنقل بين عنصرين (ذو صلة) لا يترك صورة/وصف الأول على الثاني */
  const c = categoryMeta(n.category);
  const title = n.name + ' — HAIDER';
  const description = clip(n.description) || `حمّل ${n.name} (${c.noun} ماينكرافت بيدروك) تحميلًا مباشرًا من HAIDER.`;
  document.title = title;
  setContent('meta[name="description"]', description);
  setContent('meta[property="og:title"]', title);
  setContent('meta[property="og:description"]', description);
  setContent('meta[name="twitter:title"]', title);
  setContent('meta[name="twitter:description"]', description);
  setContent('meta[name="robots"]', 'index,follow,max-image-preview:large');
  const image = absoluteUrl(n.image || n.images[0] || '');
  if (image) {
    setContent('meta[property="og:image"]', image);
    setContent('meta[name="twitter:image"]', image);
    setContent('meta[property="og:image:alt"]', n.name);
    setContent('meta[name="twitter:image:alt"]', n.name);
    /* الأبعاد المعلنة (1200×630) تخص صورة الموقع لا صورة العنصر: نزيلها مؤقتًا بدل أن تكذب. */
    if (!removed.length) { removed = [...document.querySelectorAll(IMAGE_SIZE_META)]; removed.forEach(el => el.remove()); }
  }
  const ld = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: n.name, description, inLanguage: 'ar', genre: c.label, url,
    isPartOf: { '@type': 'WebSite', name: 'HAIDER', url: location.origin + location.pathname } };
  if (image) ld.image = image;
  if (n.createdAt) ld.datePublished = n.createdAt;
  setJsonLd(ld);
}

/* رابط قديم: صفحة بلا قيمة للفهرسة. */
export function setNotFoundMeta() {
  resetMeta();
  document.title = 'العنصر غير موجود — HAIDER';
  setContent('meta[name="robots"]', 'noindex,follow');
  setJsonLd(null);
}

/* يعيد وسوم الموقع الأصلية. */
export function resetMeta() {
  saved.forEach((value, el) => { if (value === null) el.removeAttribute('content'); else el.setAttribute('content', value); });
  saved.clear();
  removed.forEach(el => document.head.appendChild(el));
  removed = [];
  setJsonLd(null);
  document.title = SITE_TITLE;
}

export function initPageMeta() {
  if (!/^https?:/.test(location.protocol)) return;

  if (!document.querySelector('link[rel=canonical]')) {
    const canonical = create('link');
    canonical.rel = 'canonical';
    canonical.href = location.origin + location.pathname;
    document.head.appendChild(canonical);
  }
  const description = document.querySelector('meta[name=description]');
  /* رابط مباشر لعنصر قد يفتح التفاصيل قبل هذه الدالة: وصف الموقع الأصلي هو المحفوظ، ووسم JSON-LD للعنصر لا يُحسب وسم الموقع. */
  if (description && !document.querySelector('script[type="application/ld+json"]:not(#ld-item)')) {
    const ld = create('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'HAIDER',
      url: location.origin + location.pathname, inLanguage: 'ar', description: saved.has(description) ? saved.get(description) : description.content
    });
    document.head.appendChild(ld);
  }
}
