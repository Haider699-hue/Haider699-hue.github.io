/* الثيمات: زر تبديل في الهيدر، حفظ الاختيار، وألوان الثيم للجسيمات.
 * "end" هو الافتراضي (بلا data-th). boot.js يطبّق الثيم المحفوظ قبل أول رسم لمنع الوميض. */
import { STORAGE } from '../config.js';
import { create } from '../lib/dom.js';
import { emit } from '../lib/bus.js';
import { local } from '../lib/storage.js';

const THEMES = {
  end:     ['#a855f7', '#c084fc'],
  nether:  ['#7c3aed', '#c084fc'],
  emerald: ['#a855f7', '#d8b4fe']
};
const ORDER = ['end', 'nether', 'emerald'];

function savedTheme() {
  const t = local.get(STORAGE.theme);
  return ORDER.includes(t) ? t : 'end';
}

let current = savedTheme();

export const themeColors = () => THEMES[current];

function applyAttribute() {
  const root = document.documentElement;
  if (current === 'end') root.removeAttribute('data-th'); else root.setAttribute('data-th', current);
}

export function initTheme() {
  applyAttribute();
  const header = document.querySelector('.header-inner');
  if (!header) return;

  const swatch = create('i');
  const paintSwatch = () => {
    const [a, b] = THEMES[current];
    swatch.style.background = `linear-gradient(135deg,${a},${b})`;
    swatch.style.boxShadow = `0 0 10px ${a}`;
  };
  paintSwatch();

  const button = create('button', 'hdr-btn');
  button.id = 'thBtn';
  button.type = 'button';
  button.setAttribute('aria-label', 'تغيير الثيم');
  button.appendChild(swatch);
  header.appendChild(button);

  button.addEventListener('click', () => {
    current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    local.set(STORAGE.theme, current);
    applyAttribute();
    paintSwatch();
    emit('theme:changed', current);
  });
}
