/* HTML صفحة تفاصيل العنصر (نقي: يأخذ عنصرًا مُطبَّعًا ويرجع نصًا). */
import { SHARE_PAGES_PREFIX, NO_LINK_MSG, categoryMeta } from '../config.js';
import { relatedMods, isRecent } from '../data/catalog.js';
import { esc } from '../lib/text.js';

const HOW_TO_INSTALL = {
  mcpack:  ['افتح الملف باستخدام لعبة ماينكرافت.', 'انتظر رسالة تأكيد الاستيراد.', 'افتح إعدادات العالم وفعّل الحزمة.', 'العب!'],
  mcaddon: ['افتح الملف باستخدام اللعبة.', 'انتظر الاستيراد.', 'فعّل الحزم من إعدادات العالم.'],
  mcworld: ['افتح الملف باللعبة.', 'ستجد العالم مضافاً لقائمتك.'],
  skin:    ['اختر السكن من إعدادات الشخصية بعد فتحه.'],
  shader:  ['فعّل الحزمة من الموارد، قد تتطلب جهازاً قوياً.'],
  version: ['ثبت التطبيق ووافق على التثبيت الخارجي.']
};
const CATEGORY_HOW = { Skins: 'skin', Shaders: 'shader', Versions: 'version' };

function howKey(n) {
  if (HOW_TO_INSTALL[n.type]) return n.type;
  if (n.type === 'apk') return 'version';
  return CATEGORY_HOW[n.category] || 'mcpack';
}

/* رابط المشاركة: صفحة ثابتة لو SHARE_PAGES_PREFIX مضبوط، وإلا رابط hash للتطبيق. */
function shareUrl(n) {
  if (SHARE_PAGES_PREFIX && n.slug) return location.origin + SHARE_PAGES_PREFIX + encodeURIComponent(n.slug) + '.html';
  return location.href.split('#')[0] + '#/i/' + encodeURIComponent(n.slug || n.id);
}

const arrowSvg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

export function detailHtml(n) {
  const c = categoryMeta(n.category);
  const imgs = Array.from(new Set([n.image].concat(n.images).filter(Boolean)));
  const fact = (k, v) => v ? `<div><dt>${k}</dt><dd dir="ltr">${esc(v)}</dd></div>` : '';
  const addedOn = n.createdAt
    ? new Date(n.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const facts = fact('إصدار اللعبة المسجل', n.mcVersion) + fact('الحجم', n.size)
    + fact('التحميلات', n.downloads > 0 ? n.downloads.toLocaleString('en') : '') + fact('أُضيف في', addedOn);
  const steps = HOW_TO_INSTALL[howKey(n)] || [];

  let h = '<article class="dp" style="--cat-color:' + c.color + '"><div class="dp-top"><div class="dp-media">';
  if (imgs.length) {
    h += `<div class="tt-img"><img src="${esc(imgs[0])}" alt="${esc(n.name)}" decoding="async">`
      + (imgs.length > 1
        ? `<button type="button" class="g-arrow g-prev" aria-label="الصورة السابقة" data-gal="-1">${arrowSvg('M9 6l6 6-6 6')}</button>`
          + `<button type="button" class="g-arrow g-next" aria-label="الصورة التالية" data-gal="1">${arrowSvg('M15 6l-6 6 6 6')}</button>`
        : '')
      + '</div>';
  }
  if (imgs.length > 1) h += '<div class="tt-th">' + imgs.map((u, i) => `<button type="button" class="tt-th-btn" data-gal="0" aria-label="عرض الصورة ${i + 1} من ${imgs.length}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('') + '</div>';
  h += `</div><div class="dp-info"><p class="dp-cat"><svg class="pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${c.icon}"/></svg>${esc(c.label)}</p><h2 class="d-title" id="dTitle">${esc(n.name)}</h2>`;
  if (isRecent(n)) h += '<span class="dp-new">جديد</span>';
  if (facts) h += `<dl class="dp-facts">${facts}</dl>`;
  h += `<button type="button" class="dp-copy" data-url="${esc(shareUrl(n))}">نسخ رابط الصفحة</button></div></div>`;
  if (n.tags.length) h += '<div class="tt-tags">' + n.tags.map(t => `<span>${esc(t)}</span>`).join('') + '</div>';
  if (n.description) h += `<section class="dp-sec"><h3>الوصف</h3><p class="d-desc">${esc(n.description)}</p></section>`;
  h += '<section class="dp-sec"><h3>متطلبات التشغيل</h3><ul class="dp-steps dp-req"><li>لعبة Minecraft Bedrock Edition</li>'
    + (n.mcVersion ? `<li>إصدار اللعبة المسجّل لهذا المحتوى: <span dir="ltr">${esc(n.mcVersion)}</span></li>` : '') + '</ul></section>';
  if (steps.length) h += '<section class="dp-sec"><h3>طريقة التثبيت</h3><ol class="dp-steps">' + steps.map(t => `<li>${esc(t)}</li>`).join('') + '</ol></section>';
  h += '<section class="dp-sec"><h3>المصدر</h3><p class="dp-box">HAIDER يعرض رابط التحميل فقط. الملف من مصدر خارجي وغير مرتبط بـ Mojang أو Microsoft.</p></section>';
  const related = relatedMods(n);
  if (related.length) {
    h += '<section class="dp-sec"><h3>محتوى ذو صلة</h3><div class="dp-rels">'
      + related.map(r => `<button type="button" class="dp-rel" data-open="${esc(r.id)}">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : ''}<span><b>${esc(r.name)}</b><small>${esc(c.label)}</small></span></button>`).join('')
      + '</div></section>';
  }
  h += '</article><div class="d-dl" style="--cat-color:' + c.color + '">';
  h += n.download
    ? `<a href="${esc(n.download)}" class="dl-btn dl-big" target="_blank" rel="noopener noreferrer">تحميل${n.size ? ' · <span dir="ltr">' + esc(n.size) + '</span>' : ''}</a>`
    : `<span class="dl-btn dl-big is-off" role="note">${NO_LINK_MSG}</span>`;
  return h + '</div>';
}
