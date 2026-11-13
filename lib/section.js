/* عزل الأقسام: خطأ في قسم واحد يُسجَّل ولا يوقف بقية الأقسام. */
import { log } from './log.js';

export function runSection(name, init) {
  const fail = err => log.error('section:' + name, 'section failed to start', err);
  try {
    const result = init();
    if (result && typeof result.catch === 'function') result.catch(fail);
  } catch (err) {
    fail(err);
  }
}
