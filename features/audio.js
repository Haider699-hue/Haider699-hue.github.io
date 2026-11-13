/* الصوت: مؤثرات مولّدة بالكود (بلا ملفات)، زر الكتم، وربط الأصوات بالنقرات وتغيّر البُعد.
 * AudioContext واحد مشترك (كان هناك اثنان) وحالة كتم واحدة. الافتراضي: مكتوم حتى يفعّله المستخدم. */
import { STORAGE } from '../config.js';
import { byId } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { log } from '../lib/log.js';
import { local } from '../lib/storage.js';

let ctx = null, master = null, noiseBuffer = null;
let muted = local.get(STORAGE.mute) !== '0'; /* بلا قيمة محفوظة ← مكتوم */

/* الصوت ميزة جمالية: أي فشل (متصفح بلا دعم، سياسة autoplay، جهاز صوت غير متاح) يُسجَّل ولا يكسر النقرات.
 * بعد MAX_FAILURES إخفاقات متتالية نتوقف عن المحاولة لبقية الجلسة. */
const MAX_FAILURES = 3;
const XP_ECHO_MS = 70; /* تأخير النغمة الثالثة في صوت xp */
let failures = 0, disabled = false;
function failed(err) {
  if (++failures >= MAX_FAILURES) disabled = true;
  log.warn('audio', 'sound effect failed' + (disabled ? ' — audio disabled for this session' : ''), err);
}

function audio() {
  if (disabled) return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { disabled = true; log.info('audio', 'Web Audio API is not supported in this browser'); return null; }
    try {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    } catch (err) { ctx = null; master = null; failed(err); return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(err => log.debug('audio', 'AudioContext.resume was blocked (needs a user gesture)', err));
  return ctx;
}

/* direct: يتجاوز مستوى الصوت العام (للنغمات الاحتفالية الأعلى صوتًا). */
function tone(type, f0, f1, dur, vol, delay = 0, direct = false) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime + delay, osc = c.createOscillator(), gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(direct ? c.destination : master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (err) { failed(err); }
}

function noise(dur, filterType, f0, f1, vol, attack, q) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  try {
    if (!noiseBuffer) {
      noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime, src = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    src.buffer = noiseBuffer;
    src.loop = true;
    filter.type = filterType;
    filter.Q.value = q || 1;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + dur * attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  } catch (err) { failed(err); }
}

export const sounds = {
  click() { tone('square', 620, 420, 0.06, 0.1); },
  back() { tone('square', 420, 280, 0.07, 0.1); },
  whoosh() { noise(0.75, 'bandpass', 250, 2400, 0.5, 0.3, 2); tone('sine', 70, 220, 0.6, 0.25); },
  xp() {
    const p = 900 + Math.random() * 500;
    tone('sine', p, p * 1.6, 0.11, 0.2);
    tone('sine', p * 1.25, p * 2, 0.11, 0.16, 0);
    setTimeout(() => tone('sine', p * 1.5, p * 2.4, 0.1, 0.14), XP_ECHO_MS);
  },
  /* نغمة التحميل (فوق xp) */
  chime() {
    tone('sine', 700, 1400, 0.12, 0.12, 0, true);
    tone('sine', 900, 1800, 0.14, 0.1, 0.09, true);
    tone('triangle', 1200, 2400, 0.2, 0.06, 0.2, true);
  },
  /* ليفل-أب: نهاية الصفحة وبيضة الألماس */
  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f * 1.004, 0.2, 0.09, i * 0.085, true));
  }
};

export function initAudio() {
  const button = byId('muteBtn');
  if (!button) { log.warn('audio', '#muteBtn not found; sound toggle unavailable'); return; }
  function paint() {
    button.classList.toggle('off', muted);
    button.setAttribute('aria-pressed', muted ? 'true' : 'false');
    button.setAttribute('aria-label', muted ? 'تشغيل الصوت' : 'كتم الصوت');
    const use = button.querySelector('use'), iconId = muted ? 'i-spk-off' : 'i-spk-on';
    if (use && byId(iconId)) use.setAttribute('href', '#' + iconId);
  }
  button.addEventListener('click', () => {
    muted = !muted;
    local.set(STORAGE.mute, muted ? '1' : '0');
    paint();
    if (!muted) sounds.click();
  });
  paint();

  /* أصوات النقر (مرحلة capture على window لتعمل حتى لو أوقف أحد انتشار الحدث). */
  addEventListener('click', e => {
    const t = e.target;
    if (!t.closest) return;
    if (t.closest('a.dl-btn')) return sounds.xp();
    if (t.closest('.sheet-close')) return sounds.back();
    if (t.closest('.mod-card,.more-btn')) sounds.click();
  }, true);

  on('dimension:changed', () => sounds.whoosh());
}
