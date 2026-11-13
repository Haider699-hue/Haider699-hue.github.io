/* مزامنة الواجهة مع تغيّر الرابط (زر الرجوع/الأمام، رابط مباشر لعنصر أو تصنيف). */
import { state, updateFilters } from '../state.js';
import { parseHash } from '../routes.js';
import { findMod, getStatus } from '../data/catalog.js';
import { openDetail, closeDetailUi, isDetailOpen, getOpenHash } from './detail.js';
import { safe } from '../lib/log.js';
import { notifyError } from '../lib/notify.js';

const goHome = () => {
  state.detailId = '';
  try { history.replaceState(null, '', '#/'); } catch (e) { /* history غير متاح */ }
};

export function syncFromHash() {
  const route = parseHash();
  if (route.id) {
    if (isDetailOpen() && location.hash === getOpenHash()) return;
    state.detailId = route.id;
    if (!findMod(route.id)) {
      /* لا نحكم بأن العنصر غير موجود إلا بعد وصول البيانات فعلًا؛ لو فشل التحميل نترك المعرّف معلّقًا
       * (يُفتح بعد نجاح إعادة المحاولة، ويرى الزائر سبب التأخير في حالة الفشل). */
      if (getStatus() === 'ready') {
        goHome();
        notifyError('العنصر المطلوب غير موجود أو تم حذفه.');
      }
      return;
    }
    if (!openDetail(route.id, 'route')) goHome(); /* فشل العرض (يُبلَّغ الزائر داخل openDetail) */
    return;
  }
  if (isDetailOpen()) closeDetailUi();
  state.detailId = '';
  if (route.cat === state.cat && route.q === state.q && route.sort === state.sort) return;
  updateFilters({ cat: route.cat, q: route.q, sort: route.sort }, 'none');
}

export function initNavigation() {
  const onRouteChange = safe('navigation', syncFromHash);
  addEventListener('popstate', onRouteChange);
  addEventListener('hashchange', onRouteChange);
}
