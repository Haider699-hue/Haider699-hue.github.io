/* الرابط (hash) ⇄ حالة التصفية. دوال نقية بلا اعتماد على الواجهة.
 * الصيغ: #/ · #/c/<route>?q=..&sort=.. · #/i/<slug-or-id> */
import { CATEGORIES, ROUTE_TO_CATEGORY, DEFAULT_SORT } from './config.js';

export function parseHash() {
  const h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?');
  const parts = (qi < 0 ? h : h.slice(0, qi)).split('/');
  const params = new URLSearchParams(qi < 0 ? '' : h.slice(qi + 1));
  const sortParam = params.get('sort');
  const route = {
    cat: 'All',
    q: params.get('q') || '',
    sort: sortParam === null ? DEFAULT_SORT : (sortParam === 'default' ? '' : sortParam),
    id: ''
  };
  if (parts[0] === 'c' && ROUTE_TO_CATEGORY[parts[1]]) route.cat = ROUTE_TO_CATEGORY[parts[1]];
  else if (parts[0] === 'i' && parts[1]) { try { route.id = decodeURIComponent(parts[1]); } catch (e) { /* رابط تالف */ } }
  return route;
}

export function buildHash({ cat, q, sort }) {
  if (cat === 'All' && !q && sort === DEFAULT_SORT) return '#/';
  const params = [
    q ? 'q=' + encodeURIComponent(q) : '',
    sort === DEFAULT_SORT ? '' : 'sort=' + (sort ? encodeURIComponent(sort) : 'default')
  ].filter(Boolean).join('&');
  return '#/c/' + (cat === 'All' ? 'all' : CATEGORIES[cat].route) + (params ? '?' + params : '');
}

export function itemHash(n) {
  return '#/i/' + encodeURIComponent(n.slug || n.id);
}

/* يكتب حالة التصفية في الرابط (push أو replace) دون تكرار نفس الرابط. */
export function syncHash(filters, push) {
  try {
    const h = buildHash(filters);
    if (location.hash !== h && !(h === '#/' && !location.hash)) history[push ? 'pushState' : 'replaceState'](null, '', h);
  } catch (e) { /* history غير متاح (iframe/sandbox) */ }
}
