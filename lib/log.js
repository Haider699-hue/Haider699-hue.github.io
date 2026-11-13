/* سجل أخطاء منظم للمطوّر: كل تسجيل يذهب للـconsole ويُحفظ أيضًا في ذاكرة محدودة (آخر MAX_ENTRIES)
 * يمكن قراءتها من الـconsole عبر window.HAIDER.getLogs() أو إرسالها لمن يساعدك في التشخيص.
 * المستويات: debug (غير حرج) · info · warn (حدث شيء لكن الموقع تابع) · error (فشلت وظيفة). */
const MAX_ENTRIES = 200;
const MAX_STACK_LINES = 6;
const entries = [];

function describe(err) {
  if (err == null) return null;
  if (typeof err !== 'object') return { message: String(err) };
  const out = { name: err.name || '', message: String(err.message || '') };
  if (err.code) out.code = String(err.code);
  if (err.status) out.status = err.status;
  if (err.kind) out.kind = err.kind;
  if (err.stack) out.stack = String(err.stack).split('\n').slice(0, MAX_STACK_LINES).join('\n');
  return out;
}

function record(level, scope, message, err) {
  entries.push({ time: new Date().toISOString(), level, scope, message: String(message), error: describe(err) });
  if (entries.length > MAX_ENTRIES) entries.shift();
  const method = level === 'debug' ? 'debug' : level;
  const args = ['[HAIDER][' + scope + ']', message];
  if (err !== undefined) args.push(err);
  try { console[method](...args); } catch (e) { /* console غير متاح */ }
}

export const log = {
  debug: (scope, message, err) => record('debug', scope, message, err),
  info: (scope, message, err) => record('info', scope, message, err),
  warn: (scope, message, err) => record('warn', scope, message, err),
  error: (scope, message, err) => record('error', scope, message, err)
};

export const getLogs = () => entries.slice();

/* يلفّ دالة (غالبًا معالج حدث لميزة تجميلية) بحيث لا يتحوّل فشلها إلى خطأ عام يزعج الزائر:
 * يُسجَّل بسياقه ويستمر الموقع. للوظائف الحرجة استخدم try/catch صريحًا مع رسالة للمستخدم. */
export function safe(scope, fn) {
  return function guarded(...args) {
    try {
      const result = fn.apply(this, args);
      if (result && typeof result.catch === 'function') result.catch(err => log.error(scope, 'async handler failed', err));
      return result;
    } catch (err) {
      log.error(scope, 'handler failed', err);
    }
  };
}
