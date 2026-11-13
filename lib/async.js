/* أدوات العمليات غير المتزامنة: مهلة، وإعادة محاولة بتأخير متزايد. */
import { AppError } from './errors.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* run(signal) ← يُلغى طلبه (AbortController) ويُرفض بخطأ timeout لو تجاوز ms. */
export function withTimeout(run, ms, label) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new AppError('timeout', (label || 'operation') + ' timed out after ' + ms + 'ms')); }, ms);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

/* يعيد المحاولة حتى tries مرة بتأخير baseMs × 2^n، فقط للأخطاء التي يقبلها shouldRetry. */
export async function retry(run, { tries = 3, baseMs = 500, shouldRetry = () => true, onRetry } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await run(attempt);
    } catch (err) {
      attempt++;
      if (attempt >= tries || !shouldRetry(err)) throw err;
      if (onRetry) onRetry(err, attempt);
      await sleep(baseMs * Math.pow(2, attempt - 1));
    }
  }
}

/* يشغّل fn على كل عنصر بحدّ أقصى limit عمليات متزامنة، ويرجع النتائج بنفس ترتيب العناصر.
 * أول فشل يوقف إطلاق عمليات جديدة ويُرفض به الوعد (العمليات الجارية تنتهي وحدها). */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0, failed = false;
  async function worker() {
    while (!failed && next < items.length) {
      const index = next++;
      try { results[index] = await fn(items[index], index); } catch (err) { failed = true; throw err; }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}
