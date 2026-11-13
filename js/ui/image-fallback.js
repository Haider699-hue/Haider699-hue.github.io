/* فشل تحميل الصور (رابط ميت/محذوف/حظر): بدل أيقونة صورة مكسورة يظهر بديل مناسب.
 * مستمع واحد بمرحلة capture (أحداث error للصور لا تصعد في DOM)، يغطي كل الصور الحالية والمستقبلية:
 *   - بطاقة القائمة  ← بديل التصنيف نفسه المستخدم للبطاقات بلا صورة
 *   - صورة التفاصيل الرئيسية ← أول صورة سليمة من المعرض، وإلا رسالة نصية
 *   - صورة مصغّرة في المعرض ← تُزال، وتُخفى الأسهم لو بقيت صورة واحدة
 *   - صورة محتوى ذي صلة ← تُزال والبطاقة تبقى بنصها */
import { categoryMeta } from '../config.js';
import { create } from '../lib/dom.js';
import { log, safe } from '../lib/log.js';
import { placeholderHtml } from './list-view.js';

const FAILED = 'failed';
const IMAGE_ERROR_TEXT = 'تعذّر تحميل الصورة';

function cardImageFailed(img) {
  const thumb = img.closest('.mod-thumb'), card = img.closest('.mod-card');
  thumb.style.removeProperty('--bg');
  img.remove();
  thumb.classList.add('img-failed');
  thumb.insertAdjacentHTML('beforeend', placeholderHtml(categoryMeta(card ? card.dataset.cat : '')));
}

/* يعيد ترتيب المعرض بعد أي فشل: يتجاهل الصور المعروفة بفشلها، ولا يدور في حلقة لأن كل فشل يُضاف لقائمة سوداء. */
function refreshGallery(dp, img) {
  const bad = (dp.dataset.badSrcs || '').split('\n').filter(Boolean);
  const src = img.getAttribute('src') || '';
  if (src && !bad.includes(src)) bad.push(src);
  dp.dataset.badSrcs = bad.join('\n');
  const isBad = el => bad.includes(el.getAttribute('src') || '');

  dp.querySelectorAll('.tt-th-btn').forEach(btn => { const t = btn.querySelector('img'); if (t && isBad(t)) btn.remove(); });
  const thumbs = [...dp.querySelectorAll('.tt-th img')];
  const frame = dp.querySelector('.tt-img');
  const main = frame && frame.querySelector('img');
  if (main && isBad(main)) {
    const next = thumbs[0];
    if (next) {
      main.src = next.getAttribute('src');
      thumbs.forEach((t, i) => t.classList.toggle('on', i === 0));
    } else {
      const note = create('p', 'img-fail');
      note.setAttribute('role', 'note');
      note.textContent = IMAGE_ERROR_TEXT;
      frame.replaceChildren(note);
    }
  }
  dp.querySelectorAll('.g-arrow').forEach(a => { a.hidden = thumbs.length <= 1; });
  if (thumbs.length <= 1) { const strip = dp.querySelector('.tt-th'); if (strip && !thumbs.length) strip.hidden = true; }
}

const onImageError = safe('image-fallback', event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset[FAILED]) return;
  const dp = img.closest('#detail .dp');
  /* في المعرض قد نغيّر src لنفس الصورة بعد فشل سابق، فلا نُعلّم العنصر نهائيًا هناك. */
  if (!dp) img.dataset[FAILED] = '1';
  log.warn('image', 'failed to load ' + (img.currentSrc || img.src));

  if (img.closest('.mod-thumb')) return cardImageFailed(img);
  if (dp && (img.closest('.tt-img') || img.closest('.tt-th-btn'))) return refreshGallery(dp, img);
  if (img.closest('.dp-rel')) img.remove();
});

export function initImageFallback() {
  document.addEventListener('error', onImageError, true);
  /* صور فشلت قبل تركيب المستمع (نادر): نعالجها الآن. */
  document.querySelectorAll('.mod-thumb img').forEach(img => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) onImageError({ target: img });
  });
}
