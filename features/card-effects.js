/* تأثيرات البطاقات: إمالة ثلاثية الأبعاد عند المرور، لمعة اللمس، قاعدة السكنات، وتمييز أحدث عنصرين. */
import { byId, create, hasFinePointer, prefersReducedMotion } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { safe } from '../lib/log.js';
import { onScroll } from '../lib/scroll.js';

const TILT_X_DEG = 12, TILT_Y_DEG = 10, TOUCH_GLOW_MS = 800, BIG_NEW_COUNT = 2;

function pointerRatio(rect, event) {
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
}

/* إمالة البطاقة نحو المؤشر (للأجهزة ذات الماوس فقط، وتُعطَّل مع Reduced Motion).
 * الأداء: pointermove يصدر أكثر من مرة في الإطار، وقراءة getBoundingClientRect بعد كتابة الأنماط تُجبر المتصفح على حساب التخطيط
 * في كل مرة. لذلك: (1) نحسب المقاس مرة عند دخول البطاقة ونعيد حسابه فقط بعد تمرير/تغيير حجم، (2) نكتب الأنماط مرة واحدة في كل إطار رسم. */
function initTilt(list) {
  if (!hasFinePointer() || prefersReducedMotion()) return;
  let active = null, rect = null, pending = null, frame = 0;
  const reset = card => ['--rx', '--ry', '--mx', '--my'].forEach(p => card.style.removeProperty(p));
  const flush = () => {
    frame = 0;
    if (!pending || !active) return;
    const { x, y } = pointerRatio(rect, pending);
    pending = null;
    active.style.setProperty('--ry', ((x - 0.5) * TILT_X_DEG) + 'deg');
    active.style.setProperty('--rx', ((0.5 - y) * TILT_Y_DEG) + 'deg');
    active.style.setProperty('--mx', (x * 100) + '%');
    active.style.setProperty('--my', (y * 100) + '%');
  };
  const release = () => { if (active) reset(active); active = null; rect = null; pending = null; };
  onScroll(() => { rect = null; }, { onResize: true });
  list.addEventListener('pointermove', safe('card-effects:tilt', e => {
    const card = e.target.closest('.mod-card');
    if (card !== active) release();
    if (!card || card.classList.contains('k-ver')) return;
    active = card;
    if (!rect) rect = card.getBoundingClientRect();
    pending = { clientX: e.clientX, clientY: e.clientY };
    if (!frame) frame = requestAnimationFrame(safe('card-effects:tilt-frame', flush));
  }));
  list.addEventListener('pointerleave', release);
}

/* لمعة تتبع الإصبع على الشاشات اللمسية. */
function initTouchGlow(list) {
  const timers = new WeakMap();
  const glow = safe('card-effects:glow', e => {
    if (e.pointerType === 'mouse') return;
    const card = e.target.closest('.mod-card');
    if (!card) return;
    const { x, y } = pointerRatio(card.getBoundingClientRect(), e);
    card.style.setProperty('--mx', (x * 100) + '%');
    card.style.setProperty('--my', (y * 100) + '%');
    card.classList.add('tch');
    clearTimeout(timers.get(card));
    timers.set(card, setTimeout(() => card.classList.remove('tch'), TOUCH_GLOW_MS));
  });
  list.addEventListener('pointerdown', glow, { passive: true });
  list.addEventListener('pointermove', glow, { passive: true });
}

/* قاعدة (pedestal) لبطاقات السكنات + إظهارها فقط وهي داخل الشاشة. */
function initSkinPedestals(list) {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(en => en.target.classList.toggle('vis', en.isIntersecting));
  }, { rootMargin: '40px' });
  const decorate = () => {
    list.querySelectorAll('.k-skin:not(.zs)').forEach(card => {
      card.classList.add('zs');
      const thumb = card.querySelector('.mod-thumb');
      if (thumb) thumb.appendChild(create('i', 'zped'));
      observer.observe(card);
    });
  };
  on('list:rendered', decorate);
  decorate();
}

/* أول عنصرين "جديدين" (غير المميزين وغير الإصدارات) يأخذان حجمًا أكبر. */
function markBigNew(list) {
  let n = 0;
  list.querySelectorAll('.mod-card.is-new:not(.is-top):not(.k-ver)').forEach(card => card.classList.toggle('zbig', n++ < BIG_NEW_COUNT));
}

export function initCardEffects() {
  const list = byId('modList');
  if (!list) return;
  initTilt(list);
  initTouchGlow(list);
  initSkinPedestals(list);
  on('list:rendered', () => markBigNew(list));
  markBigNew(list);
}
