/* رسم قائمة البطاقات: عرض مجمّع حسب التصنيف (عند "الكل") أو قائمة مُرقّمة بزر "المزيد".
 * الأداء: لا نرسم أبدًا أكثر من PAGE_SIZE بطاقة دفعة واحدة (لكل قسم في العرض المجمّع)؛ الباقي بزر "المزيد"،
 * فيبقى عدد عناصر DOM وزمن الرسم ثابتين تقريبًا مهما كبر الكتالوج (مئات أو آلاف العناصر). */
import { GROUP_ORDER, PAGE_SIZE, EAGER_CARDS, categoryMeta } from '../config.js';
import { normalize, isRecent } from '../data/catalog.js';
import { esc, cssUrl } from '../lib/text.js';
import { byId } from '../lib/dom.js';
import { emit } from '../lib/bus.js';
import { log } from '../lib/log.js';

let view = [];   /* العناصر المطابقة حاليًا */
let shown = 0;   /* كم منها ظهر في القائمة المُرقّمة */
let groups = []; /* العرض المجمّع: [{ cat, meta, items, shown }] */

const ICON_USE = icon => `<svg class="pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${icon}"/></svg>`;

/* بديل الصورة (يُستخدم عند غيابها أو فشل تحميلها — انظر image-fallback.js). */
export const placeholderHtml = c => `<div class="ph" aria-hidden="true" style="--ph-c:${c.color}"><svg viewBox="0 0 16 16"><use href="#${c.icon}"/></svg></div>`;

function cardHtml(m, i) {  /* i: ترتيب البطاقة في الصفحة كلها (للتحميل المبكر لأول بطاقات فقط) */
  const n = normalize(m), c = categoryMeta(n.category);
  const kind0 = c.kind;
  const kind = (kind0 === 'k-ver' && n.image) ? 'k-vimg' : kind0;
  const square = kind === 'k-skin';
  const thumb = n.image
    ? `<img src="${esc(n.image)}" alt="" width="320" height="${square ? 320 : 180}" decoding="async" loading="${i < EAGER_CARDS ? 'eager' : 'lazy'}">`
    : placeholderHtml(c);
  /* الاسم الظاهر نفسه داخل الاسم المسموع (WCAG 2.5.3) ويميّز الأزرار المتشابهة عند قارئ الشاشة. */
  const button = `<button type="button" class="dl-btn view-btn" aria-label="عرض التفاصيل: ${esc(n.name)}">عرض التفاصيل</button>`;
  const specs = [n.type && n.type !== 'other' ? '.' + n.type : '', n.size, kind === 'k-ver' ? '' : n.mcVersion].filter(Boolean);
  const chips = specs.map(v => `<span dir="ltr">${esc(v)}</span>`).join('<span class="dot" aria-hidden="true">·</span>');
  /* عنوان (h3) للتنقل بين العناصر في قارئ الشاشة. الفتح بالكيبورد عبر زر "عرض التفاصيل" (محطة Tab واحدة لكل بطاقة)،
   * ونقر البطاقة بالماوس/اللمس يفتحها أيضًا (browse.js). */
  const name = `<h3 class="mod-name">${esc(n.name)}</h3>`;
  const specsWrap = chips ? `<div class="mod-spec">${chips}</div>` : '';
  const badges = n.featured ? '<div class="zbadges"><span class="zb zb-top">مميز</span></div>' : '';
  const head = `<article class="mod-card ${kind}${n.featured ? ' is-top' : ''}${isRecent(n) ? ' is-new' : ''}" data-id="${esc(n.id)}" data-cat="${esc(n.category)}" style="--cat-color:${c.color};">`;
  if (kind === 'k-ver') return `${head}<div class="mod-body">${name}${specsWrap}${button}</div></article>`;
  const catLabel = `<div class="mod-cat">${ICON_USE(c.icon)}<span>${esc(c.label)}</span></div>`;
  const desc = n.description ? `<p class="mod-desc">${esc(n.description)}</p>` : '';
  /* الخلفية المموّهة (--bg) تُضبط بعد تحميل الصورة نفسها (initThumbBackdrops)، لأن خلفية CSS لا تحترم loading="lazy"
   * وكانت تُحمّل صور كل البطاقات فورًا حتى البعيدة عن الشاشة. */
  return `${head}<div class="mod-thumb">${badges}${thumb}</div><div class="mod-body">${catLabel}${name}${desc}${specsWrap}${button}</div></article>`;
}

/* بطاقة واحدة تالفة البيانات لا تُسقط القائمة كلها: تُتخطّى وتُسجَّل. */
function renderCard(m, i) {
  try { return cardHtml(m, i); } catch (err) { log.warn('list', 'skipped a card that failed to render', err); return ''; }
}

const GROUP_MORE_CLASS = 'group-more-btn';

function buildGroups() {
  const byCat = new Map();
  view.forEach(m => {
    const cat = normalize(m).category;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(m);
  });
  const extra = [...byCat.keys()].filter(cat => cat && !GROUP_ORDER.includes(cat));
  return [...GROUP_ORDER, ...extra]
    .filter(cat => byCat.has(cat))
    .map(cat => ({ cat, meta: categoryMeta(cat, '#a855f7'), items: byCat.get(cat), shown: 0 }));
}

const groupMoreLabel = g => `المزيد من ${g.meta.label} (${g.items.length - g.shown})`;

function groupCards(g, firstIndex) {
  const part = g.items.slice(g.shown, g.shown + PAGE_SIZE);
  g.shown += part.length;
  return part.map((m, k) => renderCard(m, firstIndex + k)).join('');
}

function groupedHtml() {
  let index = 0;
  return groups.map((g, gi) => {
    const cards = groupCards(g, index);
    index += g.shown;
    const more = g.shown < g.items.length
      ? `<div class="group-more"><button type="button" class="more-btn ${GROUP_MORE_CLASS}" data-group="${gi}">${esc(groupMoreLabel(g))}</button></div>`
      : '';
    return `<section class="category-section" style="--section-color:${g.meta.color}"><h2 class="category-heading"><span class="category-heading-icon">${ICON_USE(g.meta.icon)}</span><span>${esc(g.meta.label)}</span><span class="category-count">${g.items.length}</span></h2><div class="category-grid">${cards}</div>${more}</section>`;
  }).join('');
}

/* زر "المزيد" الخاص بقسم في العرض المجمّع: يضيف الدفعة التالية لنفس القسم بلا إعادة رسم بقية الصفحة. */
export function showMoreInGroup(button) {
  const g = groups[+button.dataset.group];
  const section = button.closest('.category-section');
  const grid = section && section.querySelector('.category-grid');
  if (!g || !grid) return;
  const before = grid.children.length;
  grid.insertAdjacentHTML('beforeend', groupCards(g, before));
  if (g.shown < g.items.length) {
    button.textContent = groupMoreLabel(g);
  } else {
    /* الزر سيُزال: ننقل التركيز لأول بطاقة جديدة كي لا يضيع تركيز لوحة المفاتيح. */
    const firstNew = grid.children[before] && grid.children[before].querySelector('.view-btn');
    button.closest('.group-more').remove();
    if (firstNew) firstNew.focus({ preventScroll: true });
  }
  emit('list:rendered', { count: view.length });
}

function appendPage() {
  const first = shown;
  const part = view.slice(shown, shown + PAGE_SIZE);
  byId('modList').insertAdjacentHTML('beforeend', part.map((m, k) => renderCard(m, first + k)).join(''));
  shown += part.length;
  const left = view.length - shown;
  byId('moreWrap').hidden = left <= 0;
  byId('moreBtn').textContent = left > 0 ? `المزيد من العناصر (${left})` : 'المزيد من العناصر';
}

/* الخلفية المموّهة خلف الصورة: نضبط --bg على الغلاف عند تحميل الصورة (من الذاكرة المؤقتة، بلا طلب إضافي).
 * أحداث load لا تصعد في DOM، فنستمع في مرحلة capture على الحاوية مرة واحدة لكل الصور الحالية والمستقبلية. */
export function initThumbBackdrops(list) {
  list.addEventListener('load', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const thumb = img.closest('.mod-thumb');
    const src = img.currentSrc || img.src;
    if (thumb && src && !thumb.style.getPropertyValue('--bg')) thumb.style.setProperty('--bg', `url('${cssUrl(src)}')`);
  }, true);
}

/* grouped=true: الأقسام مجمّعة (أول PAGE_SIZE من كل قسم + زر المزيد) · false: قائمة مُرقّمة. */
export function renderMods(mods, { grouped }) {
  view = mods || [];
  shown = 0;
  groups = [];
  const list = byId('modList');
  list.classList.toggle('grouped-categories', grouped);
  if (grouped) {
    groups = buildGroups();
    list.innerHTML = groupedHtml();
    shown = view.length;
    byId('moreWrap').hidden = true;
  } else {
    list.innerHTML = '';
    appendPage();
  }
  byId('resultCount').textContent = view.length > 0 ? `تم العثور على ${view.length} عنصر` : '';
  byId('emptyState').hidden = view.length > 0;
  emit('list:rendered', { count: view.length });
}

export function showMore() {
  appendPage();
  emit('list:rendered', { count: view.length });
}
