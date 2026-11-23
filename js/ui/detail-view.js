/* HTML صفحة تفاصيل العنصر (نقي: يأخذ عنصرًا مُطبَّعًا ويرجع نصًا): مسار التنقل، المعرض، الحقائق، التثبيت، ذو الصلة، زر التحميل؛
 * وصفحة «العنصر غير موجود». */
import { SHARE_PAGES_PREFIX, NO_LINK_MSG, MOD_TYPES, categoryMeta, categoryStyle } from '../config.js';
import { relatedMods, isRecent } from '../data/catalog.js';
import { esc } from '../lib/text.js';
import { placeholderHtml } from './list-view.js';

const HOW_TO_INSTALL = {
  mcpack:  ['افتح الملف باستخدام لعبة ماينكرافت.', 'انتظر رسالة تأكيد الاستيراد.', 'افتح إعدادات العالم وفعّل الحزمة.', 'العب!'],
  mcaddon: ['افتح الملف باستخدام اللعبة.', 'انتظر الاستيراد.', 'فعّل الحزم من إعدادات العالم.'],
  mcworld: ['افتح الملف باللعبة.', 'ستجد العالم مضافاً لقائمتك.'],
  skin:    ['اختر السكن من إعدادات الشخصية بعد فتحه.'],
  shader:  ['فعّل الحزمة من الموارد، قد تتطلب جهازاً قوياً.'],
  version: ['ثبت التطبيق ووافق على التثبيت الخارجي.']
};
const CATEGORY_HOW = { Skins: 'skin', Shaders: 'shader', Versions: 'version' };
const FILE_TYPES = MOD_TYPES.filter(t => t !== 'other');

/* نوع الملف: الحقل type لو معرّف، وإلا الامتداد الظاهر في رابط التحميل (.mcpack/.mcaddon/.mcworld/.apk). غير معروف ← '' (لا نخمّن). */
export function fileType(n) {
  if (FILE_TYPES.includes(n.type)) return n.type;
  const m = /\.(mcpack|mcaddon|mcworld|apk)(?=$|[/?#&])/i.exec(n.download || '');
  return m ? m[1].toLowerCase() : '';
}

function howKey(n) {
  const t = fileType(n);
  if (HOW_TO_INSTALL[t]) return t;
  if (t === 'apk') return 'version';
  return CATEGORY_HOW[n.category] || 'mcpack';
}

/* رابط المشاركة: صفحة ثابتة لو SHARE_PAGES_PREFIX مضبوط، وإلا رابط hash للتطبيق. */
export function shareUrl(n) {
  if (SHARE_PAGES_PREFIX && n.slug) return location.origin + SHARE_PAGES_PREFIX + encodeURIComponent(n.slug) + '.html';
  return location.href.split('#')[0] + '#/i/' + encodeURIComponent(n.slug || n.id);
}

export const arrowSvg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const zoomSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>';

/* مسار التنقل: الرئيسية › القسم › العنصر. الأخير نص بلا رابط (aria-current). */
function crumbsHtml(n, c) {
  const sec = c.route ? `<li><a href="#/c/${esc(c.route)}">${esc(c.label)}</a></li>` : '';
  return `<nav class="dp-crumbs" aria-label="مسار التنقل"><ol><li><a href="#/">الرئيسية</a></li>${sec}<li><span aria-current="page">${esc(n.name)}</span></li></ol></nav>`;
}

export function detailHtml(n) {
  const c = categoryMeta(n.category);
  const imgs = Array.from(new Set([n.image].concat(n.images).filter(Boolean)));
  /* الأرقام/الأحجام/الإصدارات سلسلة LTR معزولة (bdi) داخل خلية RTL فتبقى محاذاتها مع العنوان؛ التاريخ نص عربي فيبقى RTL. */
  const fact = (k, v, ltr = true) => v ? `<div><dt>${k}</dt><dd>${ltr ? `<bdi dir="ltr">${esc(v)}</bdi>` : esc(v)}</dd></div>` : '';
  const addedOn = n.createdAt
    ? new Date(n.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const facts = fact('إصدار اللعبة المسجل', n.mcVersion) + fact('الحجم', n.size)
    + fact('التحميلات', n.downloads > 0 ? n.downloads.toLocaleString('en') : '') + fact('أُضيف في', addedOn, false);
  const steps = HOW_TO_INSTALL[howKey(n)] || [];
  const type = fileType(n);

  let h = '<article class="dp" style="' + categoryStyle(c) + '">' + crumbsHtml(n, c) + '<div class="dp-top"><div class="dp-media">';
  if (imgs.length) {
    h += `<div class="tt-img"><img src="${esc(imgs[0])}" alt="${esc(n.name)}" decoding="async">`
      + (imgs.length > 1
        ? `<button type="button" class="g-arrow g-prev" aria-label="الصورة السابقة" data-gal="-1">${arrowSvg('M9 6l6 6-6 6')}</button>`
          + `<button type="button" class="g-arrow g-next" aria-label="الصورة التالية" data-gal="1">${arrowSvg('M15 6l-6 6 6 6')}</button>`
          + `<span class="g-count" role="status" dir="ltr">1 / ${imgs.length}</span>`
        : '')
      + `<button type="button" class="tt-zoom" aria-label="تكبير الصورة" data-zoom>${zoomSvg}</button></div>`;
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
    /* نفس بديل الصورة المستخدم في بطاقات القائمة (أيقونة القسم) لو العنصر بلا صورة أو فشلت صورته (image-fallback.js). */
    h += '<section class="dp-sec"><h3>محتوى ذو صلة</h3><div class="dp-rels">'
      + related.map(r => { const rc = categoryMeta(r.category); return `<button type="button" class="dp-rel" data-open="${esc(r.id)}" data-cat="${esc(r.category)}">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : placeholderHtml(rc)}<span><b>${esc(r.name)}</b><small>${esc(rc.label)}</small></span></button>`; }).join('')
      + '</div></section>';
  }
  h += '</article><div class="d-dl" style="' + categoryStyle(c) + '">';
  /* زر واحد ثابت: النوع والحجم داخله، وتنبيه الرابط الخارجي تحته مربوط به (aria-describedby). */
  h += n.download
    ? `<a href="${esc(n.download)}" class="dl-btn dl-big" target="_blank" rel="noopener noreferrer" aria-describedby="dlNote">تحميل${type ? ' <span dir="ltr">.' + type + '</span>' : ''}${n.size ? ' · <span dir="ltr">' + esc(n.size) + '</span>' : ''}</a>`
      + '<p class="dl-note" id="dlNote">الملف على موقع خارجي ويفتح في نافذة جديدة.</p>'
    : `<span class="dl-btn dl-big is-off" role="note">${NO_LINK_MSG}</span>`;
  return h + '</div>';
}

/* رابط قديم أو عنصر محذوف: صفحة بسبب واضحة وطريق للخروج (زر «رجوع» في الشريط العلوي دايمًا موجود). */
export function notFoundHtml() {
  return '<article class="dp dp-missing"><div class="empty-state"><div class="empty-icon"><svg class="pix empty-pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#i-empty"/></svg></div>'
    + '<h2 class="empty-title" id="dTitle">العنصر غير موجود</h2>'
    + '<p class="empty-sub">الرابط قديم أو تم حذف العنصر. يمكنك العودة وتصفّح كل العناصر.</p>'
    + '<a class="more-btn empty-reset" href="#/">عرض كل العناصر</a></div></article>';
}
