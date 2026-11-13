/* مربع البحث: تأخير بسيط أثناء الكتابة، زر المسح، واختصار "/" للتركيز. */
import { SEARCH_DEBOUNCE_MS } from '../config.js';
import { updateFilters } from '../state.js';
import { byId } from '../lib/dom.js';
import { on } from '../lib/bus.js';

export function initSearch() {
  const input = byId('searchInput'), clear = byId('searchClear');
  if (!input) return;
  let timer = 0;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => updateFilters({ q: input.value }, 'replace'), SEARCH_DEBOUNCE_MS);
  });

  if (!clear) return;
  const syncClear = () => { clear.hidden = !input.value; };
  input.addEventListener('input', syncClear);
  on('filters:changed', syncClear);
  syncClear();

  clear.addEventListener('click', () => {
    input.value = '';
    syncClear();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' && input.value) { e.preventDefault(); clear.click(); }
  });
  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      input.focus();
      input.select();
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
}
