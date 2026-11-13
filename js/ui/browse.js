/* منسّق قائمة التصفح: يربط الحالة (التصنيف/البحث/الترتيب) بالرسم والرابط وفتح البطاقات. */
import { state, updateFilters } from '../state.js';
import { parseHash, syncHash } from '../routes.js';
import { queryMods, reloadMods } from '../data/catalog.js';
import { whenSupabaseReady } from '../data/supabase.js';
import { renderMods, showMore, showMoreInGroup, initThumbBackdrops } from './list-view.js';
import { openDetail, isDetailOpen } from './detail.js';
import { syncFromHash } from './navigation.js';
import { byId } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { log } from '../lib/log.js';
import { notifyError } from '../lib/notify.js';

/* "الكل" يُعرض مجمّعًا حسب التصنيف، إلا لو كان هناك عنصر مفتوح/مطلوب من الرابط. */
const isGrouped = () => state.cat === 'All' && !state.detailId;

function apply() {
  try {
    renderMods(queryMods(state), { grouped: isGrouped() });
  } catch (err) {
    log.error('browse', 'failed to render the list', err);
    notifyError('تعذّر عرض القائمة. جرّب تغيير التصنيف أو أعد تحميل الصفحة.');
    return;
  }
  /* رابط مباشر لعنصر وصلت بياناته الآن: افتحه. */
  if (state.detailId && !isDetailOpen()) syncFromHash();
}

/* يعكس الحالة على عناصر الواجهة (data-cat، القائمة، حقل البحث، قائمة الترتيب). */
function syncUi() {
  document.documentElement.setAttribute('data-cat', state.cat);
  document.querySelectorAll('.hnav a').forEach(a => {
    const active = a.dataset.nav === state.cat;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const input = byId('searchInput');
  if (input && input.value !== state.q) input.value = state.q;
  const sortSel = byId('sortSel');
  if (sortSel && sortSel.value !== state.sort) sortSel.value = state.sort;
}

function openCard(card, opener) {
  if (card) openDetail(card.dataset.id, 'push', opener);
}

export function initBrowse() {
  const list = byId('modList');

  on('filters:changed', ({ history }) => {
    syncUi();
    apply();
    if (history !== 'none') syncHash(state, history === 'push');
  });
  on('mods:changed', apply);

  byId('moreBtn').addEventListener('click', showMore);
  byId('sortSel').addEventListener('change', e => updateFilters({ sort: e.target.value }, 'replace'));
  initThumbBackdrops(list);
  list.addEventListener('click', e => {
    const more = e.target.closest('.group-more-btn');
    if (more) return showMoreInGroup(more);
    if (e.target.closest('.dl-btn:not(.view-btn)')) return;
    const card = e.target.closest('.mod-card');
    if (card) openCard(card, card.querySelector('.view-btn'));
  });

  /* الحالة الابتدائية من الرابط + الرسم الأول. */
  const route = parseHash();
  Object.assign(state, { cat: route.cat, q: route.q, sort: route.sort, detailId: route.id });
  syncUi();
  apply();

  /* تحميل البيانات عند جاهزية Supabase. */
  /* reloadMods لا يرمي أبدًا؛ لو لم يُحمَّل الـSDK يضبط حالة "offline" فورًا ويُبلّغ الواجهة. */
  whenSupabaseReady().then(() => reloadMods());
}
