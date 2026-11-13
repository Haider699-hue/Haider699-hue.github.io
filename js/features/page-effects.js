/* تأثيرات الصفحة: شريط XP، انفجار زر التحميل، ليفل-أب عند آخر الصفحة، وبيضة "الألماس" في البحث. */
import { byId, create, prefersReducedMotion } from '../lib/dom.js';
import { onScroll } from '../lib/scroll.js';
import { sounds } from './audio.js';
import { safe } from '../lib/log.js';

const DOWNLOAD_BTN = '.dl-btn:not(.is-off):not(.view-btn)';
const DIAMOND_WORDS = ['diamond', 'الماس', 'ألماس'];
const BURST_FLASH_MS = 400;      /* مدة وهج زر التحميل بعد الانفجار */
const DIAMOND_COOLDOWN_MS = 3300; /* لا تتكرر بيضة الألماس قبل انتهاء السقوط */

/* شريط تقدّم التمرير أعلى الصفحة. */
function initXpBar() {
  const bar = create('div'), fill = create('i');
  bar.id = 'zxp';
  bar.appendChild(fill);
  document.body.appendChild(bar);
  onScroll(({ y, max }) => { fill.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')'; }, { immediate: true, onResize: true });
}

/* شظايا تنطلق من زر التحميل + نغمة التحميل + لمسة على الزر. */
function initDownloadBurst() {
  document.addEventListener('click', safe('page-effects:burst', e => {
    const btn = e.target.closest(DOWNLOAD_BTN);
    if (!btn) return;
    sounds.chime();
    if (prefersReducedMotion()) return;
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const accent = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim() || '#8b5cf6';
    for (let i = 0; i < 15; i++) {
      const light = i > 9;
      const piece = create('div', 'zk'), size = light ? 9 : 5 + Math.random() * 5;
      const angle = -Math.PI * (0.12 + Math.random() * 0.76), speed = 70 + Math.random() * 120;
      piece.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${light ? '#e9d5ff' : accent}`;
      if (light) piece.classList.add('xo');
      document.body.appendChild(piece);
      piece.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * speed}px,${Math.sin(angle) * speed + (light ? -60 : 50)}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], { duration: light ? 900 : 650, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => piece.remove();
    }
    btn.classList.add('mine');
    setTimeout(() => btn.classList.remove('mine'), BURST_FLASH_MS);
  }), true);
}

/* نغمة عند الوصول لآخر الصفحة (مرة واحدة حتى يرجع المستخدم للأعلى). */
function initLevelUp() {
  let done = false;
  onScroll(({ y, max }) => {
    const progress = max > 0 ? y / max : 0;
    if (progress > 0.985 && !done && max > innerHeight) { done = true; sounds.levelUp(); }
    else if (progress < 0.9) done = false;
  });
}

/* كتابة "diamond" أو "الماس" في البحث تُنزل ألماسًا من أعلى الشاشة. */
function initDiamondEgg() {
  const input = byId('searchInput');
  if (!input) return;
  let busy = false;
  input.addEventListener('input', safe('page-effects:diamond', () => {
    const word = input.value.trim().toLowerCase();
    if (busy || prefersReducedMotion() || !DIAMOND_WORDS.includes(word)) return;
    busy = true;
    sounds.levelUp();
    for (let i = 0; i < 30; i++) {
      const gem = create('div', 'zd'), size = 14 + Math.random() * 16;
      gem.style.cssText = `left:${Math.random() * 100}vw;top:0;width:${size}px;height:${size}px`;
      document.body.appendChild(gem);
      gem.animate([
        { transform: 'translateY(-40px) rotate(45deg)', opacity: 1 },
        { transform: `translateY(${innerHeight + 60}px) rotate(${45 + Math.random() * 360}deg)`, opacity: 0.9 }
      ], { duration: 1500 + Math.random() * 1300, delay: Math.random() * 900, easing: 'cubic-bezier(.3,0,.7,1)', fill: 'backwards' }).onfinish = () => gem.remove();
    }
    setTimeout(() => { busy = false; }, DIAMOND_COOLDOWN_MS);
  }));
}

export function initPageEffects() {
  initXpBar();
  initDownloadBurst();
  initLevelUp();
  initDiamondEgg();
}
