/* الحالة المشتركة الوحيدة للواجهة: عوامل التصفية + العنصر المفتوح.
 * التعديل يمرّ عبر updateFilters ليُبلَّغ الجميع بحدث واحد. */
import { DEFAULT_SORT } from './config.js';
import { emit } from './lib/bus.js';

export const state = {
  cat: 'All',
  q: '',
  sort: DEFAULT_SORT,
  detailId: '' /* معرّف العنصر المفتوح أو المطلوب فتحه من الرابط */
};

/* history: 'push' (ضغط تصنيف) | 'replace' (بحث/ترتيب) | 'none' (مصدره الرابط نفسه) */
export function updateFilters(patch, history = 'none') {
  Object.assign(state, patch);
  emit('filters:changed', { history });
}

export const setCategory = cat => updateFilters({ cat }, 'push');
