/* محرك الجسيمات الخلفي: لكل "بُعد" (تصنيف) شكل وسلوك وألوان. يرسم على canvas ثابت خلف المحتوى.
 * الأداء: يتوقف تمامًا (لا رسم ولا طلب إطار) حين تكون الجسيمات غير مرئية — صفحة التفاصيل مفتوحة (تغطي الشاشة)،
 * أو التبويب مخفي — ويستأنف تلقائيًا. معدل الرسم محدود (30 إطارًا/ث على الأجهزة اللمسية وضعيفة المعالج، 60 على غيرها
 * حتى على شاشات 120Hz) والحركة تعتمد على الزمن الفعلي فلا تتغير سرعتها. تغيير الحجم يُؤجَّل ولا يعيد تخصيص الـcanvas بلا داعٍ. */
import { prefersReducedMotion } from '../lib/dom.js';
import { state } from '../state.js';
import { on, emit } from '../lib/bus.js';
import { themeColors } from './theme.js';
import { log } from '../lib/log.js';

/* ألوان "All" تأتي من الثيم الحالي. */
const DIMENSIONS = {
  All:      { type: 'mote' },
  Addons:   { colors: ['#3ddc84', '#c6f25a'], type: 'orb' },
  Skins:    { colors: ['#ff8a2b', '#ff3d3d'], type: 'ember' },
  Shaders:  { colors: ['#c05cff', '#ff6bd6'], type: 'glyph' },
  Versions: { colors: ['#4cc9ff', '#a8e6ff'], type: 'snow' }
};
/* vy: مدى السرعة الرأسية · sway: انحراف أفقي · alpha: الشفافية · pulse: نبض · fade: يتلاشى مع العمر */
const BEHAVIOR = {
  mote:  { vy: [-0.35, -0.1], sway: 0,    alpha: 0.6 },
  orb:   { vy: [-0.7, -0.25], sway: 0.35, alpha: 0.95, pulse: true },
  ember: { vy: [-1.6, -0.6],  sway: 0.5,  alpha: 1,    fade: true },
  glyph: { vy: [-0.4, -0.12], sway: 0.15, alpha: 0.75 },
  snow:  { vy: [0.3, 0.8],    sway: 0.4,  alpha: 0.85 }
};
const GLYPHS = ['ᔑ', 'ʖ', 'ᓵ', '↸', 'ᒷ', '⎓', '⊣', '⍑', '╎', '⋮', 'ꖌ', 'ꖎ', 'ᒲ', 'リ', 'ᑑ', '∷', 'ᓭ', 'ℸ', '⚍', '⍊', '∴', '⨅'];

export function initParticles() {
  const root = document.documentElement;
  const reduced = prefersReducedMotion();

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  /* الجسيمات تجميلية: لو تعذّر الرسم (canvas معطّل/خطأ أثناء الرسم) نوقفها ونُبقي بقية الموقع (data-dim) يعمل. */
  let enabled = !!ctx;
  function disable(reason, err) {
    if (!enabled && !running) return;
    enabled = false;
    stop();
    canvas.remove();
    log.error('particles', reason + ' — particles disabled', err);
  }
  if (!ctx) { canvas.remove(); log.warn('particles', '2d canvas context unavailable — particles disabled'); }
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const count = matchMedia('(hover:none)').matches ? 16 : ((navigator.hardwareConcurrency || 4) <= 4 ? 26 : 44);
  const lowPower = matchMedia('(hover:none)').matches || (navigator.hardwareConcurrency || 4) <= 4;
  const MIN_FRAME_MS = lowPower ? 30 : 15;
  const RESIZE_DEBOUNCE_MS = 150;
  let W = 0, H = 0, particles = [], sprites = [], behavior = BEHAVIOR.mote, last = 0, running = false, current = '', rafId = 0;
  let detailOpen = false;

  function resize() {
    const w = innerWidth, h = innerHeight;
    if (w === W && h === H) return; /* شريط العنوان في الجوال يغيّر الارتفاع أثناء التمرير: لا نعيد تخصيص الـcanvas إلا لو تغيّر المقاس فعلًا */
    W = w; H = h;
    if (!enabled) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  let resizeTimer = 0;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, RESIZE_DEBOUNCE_MS); });

  function makeSprite(w, h, paint) {
    const el = document.createElement('canvas');
    el.width = w * dpr; el.height = h * dpr;
    const c = el.getContext('2d');
    c.scale(dpr, dpr);
    paint(c);
    return { el, w, h };
  }

  function makeSprites(dim) {
    const [c0, c1] = dim.colors || themeColors();
    if (dim.type === 'orb') {
      return [10, 14, 18].map(s => makeSprite(s, s, c => {
        const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, '#f6ffc8'); g.addColorStop(0.45, c1); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      }));
    }
    if (dim.type === 'glyph') {
      return Array.from({ length: 10 }, (_, i) => makeSprite(16, 16, c => {
        c.font = '14px sans-serif';
        c.fillStyle = i % 2 ? c0 : c1;
        c.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], 1, 13);
      }));
    }
    const colors = dim.type === 'ember' ? ['#ffc15e', c0, c1] : dim.type === 'snow' ? ['#fff', c1, '#fff'] : [c0, c1, c0];
    const sizes = dim.type === 'ember' ? [3, 4, 5] : [2, 3, 4];
    return sizes.map((s, i) => makeSprite(s, s, c => { c.fillStyle = colors[i]; c.fillRect(0, 0, s, s); }));
  }

  function spawn(p, initial) {
    const b = behavior, falling = b.vy[0] > 0;
    p.x = Math.random() * W;
    p.y = initial ? Math.random() * H : (falling ? -20 : H + 20);
    p.vy = b.vy[0] + Math.random() * (b.vy[1] - b.vy[0]);
    p.vx = (Math.random() - 0.5) * b.sway;
    p.phase = Math.random() * 6.28;
    p.life = initial ? Math.random() : 0;
    p.lifeRate = 0.002 + Math.random() * 0.004;
    p.sprite = sprites[(Math.random() * sprites.length) | 0];
  }

  function build(dim) {
    behavior = BEHAVIOR[dim.type];
    sprites = makeSprites(dim);
    particles = Array.from({ length: count }, () => { const p = {}; spawn(p, true); return p; });
  }

  function frame(ts) {
    rafId = 0;
    if (!running) return;
    if (ts - last >= MIN_FRAME_MS) {
      try { draw(ts); } catch (err) { disable('animation frame failed', err); return; }
    }
    rafId = requestAnimationFrame(frame);
  }

  function draw(ts) {
    const k = Math.min(ts - last, 50) / 16.7;
    last = ts;
    ctx.clearRect(0, 0, W, H);
    const t = ts / 1000;
    for (const p of particles) {
      p.life += p.lifeRate * k;
      p.y += p.vy * k;
      p.x += (p.vx + Math.sin(t + p.phase) * 0.15) * k;
      if (p.life >= 1 || p.y < -30 || p.y > H + 30) spawn(p, false);
      ctx.globalAlpha = behavior.alpha * (behavior.fade ? 1 - p.life : behavior.pulse ? 0.65 + 0.35 * Math.sin(t * 3 + p.phase) : Math.sin(Math.PI * p.life));
      ctx.drawImage(p.sprite.el, p.x, p.y, p.sprite.w, p.sprite.h);
    }
    ctx.globalAlpha = 1;
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* تعمل فقط حين تكون مرئية فعلًا: لا صفحة تفاصيل تغطيها ولا تبويب مخفي. */
  function start() {
    if (!enabled || reduced || running || detailOpen || document.hidden) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function syncRunning() { if (detailOpen || document.hidden) stop(); else start(); }

  function setDimension(cat) {
    if (cat === current || !DIMENSIONS[cat]) return;
    const first = current === '';
    current = cat;
    root.setAttribute('data-dim', cat);
    if (enabled && !reduced) {
      try { build(DIMENSIONS[cat]); } catch (err) { disable('failed to build particles', err); }
    }
    if (!first) emit('dimension:changed', cat);
  }

  on('filters:changed', () => setDimension(state.cat));
  on('detail:opened', () => { detailOpen = true; syncRunning(); });
  on('detail:closed', () => { detailOpen = false; syncRunning(); });
  document.addEventListener('visibilitychange', syncRunning);
  /* تغيير الثيم يعيد بناء جسيمات "All" بألوانه الجديدة. */
  on('theme:changed', () => {
    if (!(current === 'All' && enabled && !reduced)) return;
    try { build(DIMENSIONS.All); } catch (err) { disable('failed to rebuild particles for the new theme', err); }
  });

  setDimension(root.getAttribute('data-cat') || 'All');
  start();
}
