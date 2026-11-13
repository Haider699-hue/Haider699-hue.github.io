/* مستمع تمرير واحد مشترك (بدل 4 مستمعين منفصلين): شريط XP، زر الأعلى، ظل الهيدر، ليفل-أب.
 * يُنفَّذ المشتركون مرة واحدة في كل إطار رسم عبر requestAnimationFrame. */
import { log } from './log.js';

const subscribers = [];
let bound = false;
let queued = 0;
let resizeQueued = 0;

/* مشترك فاشل لا يوقف بقية المشتركين (كان خطأ واحد يعطّل شريط XP وزر الأعلى وظل الهيدر معًا). */
function run(sub, s) {
  try { sub.fn(s); } catch (err) { log.error('scroll', 'subscriber failed', err); }
}

const read = () => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight });

function bind() {
  if (bound) return;
  bound = true;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      const s = read();
      subscribers.forEach(sub => run(sub, s));
    });
  }, { passive: true });
  /* resize قد يصدر عشرات المرات في الثانية (سحب النافذة، شريط العنوان في الجوال): نجمعها في إطار رسم واحد. */
  addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = requestAnimationFrame(() => {
      resizeQueued = 0;
      const s = read();
      subscribers.forEach(sub => { if (sub.onResize) run(sub, s); });
    });
  });
}

/* fn({y, max}) — y: موضع التمرير، max: أقصى تمرير ممكن.
 * immediate: نفّذ فورًا مرة واحدة · onResize: نفّذ أيضًا عند تغيّر حجم النافذة. */
export function onScroll(fn, { immediate = false, onResize = false } = {}) {
  bind();
  subscribers.push({ fn, onResize });
  if (immediate) run({ fn }, read());
}
