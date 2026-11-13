/* حالة التحميل والفراغ: إزالة هيكل التحميل، ونص حالة "جارٍ التحميل / لا نتائج / فشل التحميل / لا اتصال"،
 * وإعادة المحاولة بلا إعادة تحميل الصفحة، وتنبيهات الفشل والنجاح وانقطاع الإنترنت.
 * مصدر واحد للنصوص (كانت تُكتب من 3 أماكن متعارضة). */
import { LOAD_TIMEOUT_MS } from '../config.js';
import { getStatus, setStatus, retryLoad } from '../data/catalog.js';
import { getClient } from '../data/supabase.js';
import { state, updateFilters } from '../state.js';
import { byId } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { messageFor } from '../lib/errors.js';
import { notifyError, notifySuccess } from '../lib/notify.js';

/* [العنوان، الشرح، نص الزر (فارغ = بلا زر)] */
const TEXTS = {
  loading: ['ما زلنا نحمّل العناصر…', 'الاتصال أبطأ من المعتاد، لحظات من فضلك.', ''],
  empty:   ['لا توجد نتائج في هذا البُعد', 'جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر', 'عرض كل العناصر'],
  error:   ['تعذّر تحميل العناصر', 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.', 'إعادة المحاولة'],
  offline: ['تعذّر الاتصال بالمتجر', 'تحقق من الاتصال بالإنترنت ثم أعد المحاولة.', 'إعادة المحاولة']
};
const RETRYING_LABEL = 'جاري المحاولة…';
const isFailure = status => status === 'error' || status === 'offline';

const finishLoading = () => document.documentElement.classList.remove('bb-loading');

let retrying = false;

function paintEmptyState() {
  const status = getStatus();
  const [title, sub, button] = TEXTS[isFailure(status) ? status : (status === 'loading' ? 'loading' : 'empty')];
  const action = byId('emptyReset');
  byId('emptyTitle').textContent = title;
  byId('emptySub').textContent = sub;
  action.hidden = !button;
  action.disabled = retrying;
  action.textContent = retrying ? RETRYING_LABEL : button;
  byId('emptyState').setAttribute('aria-busy', retrying || status === 'loading' ? 'true' : 'false');
}

async function retry() {
  if (retrying) return;
  retrying = true;
  paintEmptyState();
  try { await retryLoad(); } finally { retrying = false; paintEmptyState(); }
}

export function initStatus() {
  const list = byId('modList');
  let sawFailure = false;

  on('list:rendered', () => { if (list.children.length) finishLoading(); });
  on('status:changed', status => {
    if (status !== 'loading') finishLoading();
    list.setAttribute('aria-busy', status === 'loading' ? 'true' : 'false');
    if (isFailure(status)) sawFailure = true;
    else if (status === 'ready' && sawFailure) { sawFailure = false; notifySuccess('تم تحميل العناصر بنجاح.'); }
    paintEmptyState();
  });

  /* الزائر يحتاج تنبيهًا حين لا تفسّر الشاشة وحدها ما حدث: بيانات قديمة معروضة، أو ضغط إعادة المحاولة،
   * أو عنصر مطلوب من الرابط لم يصل. (لو القائمة فارغة تمامًا فحالة الفشل نفسها هي الرسالة.) */
  on('load:failed', ({ kind, stale }) => {
    if (!(stale || retrying || state.detailId)) return;
    const prefix = stale ? 'تعذّر تحديث القائمة. ' : (state.detailId ? 'تعذّر تحميل العنصر المطلوب. ' : '');
    notifyError(prefix + messageFor(kind));
  });

  /* لو لم يصل شيء خلال المهلة: أخفِ الهيكل، ولو لم يُحمَّل Supabase أصلًا اعرض "لا اتصال". */
  setTimeout(() => {
    finishLoading();
    if (getStatus() === 'loading' && !getClient()) setStatus('offline');
    paintEmptyState();
  }, LOAD_TIMEOUT_MS);

  byId('emptyReset').addEventListener('click', () => {
    if (isFailure(getStatus())) { retry(); return; }
    updateFilters({ q: '', cat: 'All' }, 'push');
  });

  addEventListener('offline', () => notifyError('انقطع الاتصال بالإنترنت.'));
  addEventListener('online', () => {
    notifySuccess('عاد الاتصال بالإنترنت.');
    if (isFailure(getStatus())) retry();
  });

  list.setAttribute('aria-busy', getStatus() === 'loading' ? 'true' : 'false');
  paintEmptyState();
}
