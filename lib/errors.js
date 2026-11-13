/* تصنيف الأخطاء وتحويلها لرسائل مفهومة. مصدر واحد للنصوص بدل نصوص متفرقة (أو رسائل إنجليزية خام من Supabase).
 * kind: network · timeout · rate-limit · credentials · unconfirmed · session · permission · not-found ·
 *       duplicate · conflict · invalid · server · unknown */
export class AppError extends Error {
  constructor(kind, message) {
    super(message || kind);
    this.name = 'AppError';
    this.kind = kind;
  }
}

const NETWORK_RE = /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|err_network/i;
const SESSION_RE = /jwt (is )?(expired|invalid)|session[_ ]not[_ ]found|refresh_token|auth session missing/i;
const PERMISSION_RE = /row-level security|permission denied|not authorized|insufficient[_ ]privilege/i;
const INVALID_CODES = ['22P02', '22001', '22003', '23502', '23514', '23503'];

export function classifyError(err) {
  if (!err) return 'unknown';
  if (err.kind) return err.kind;
  const name = err.name || '', message = String(err.message || err), code = String(err.code || '');
  const status = Number(err.status) || 0;
  if (name === 'AbortError' || /timed? ?out|timeout/i.test(message)) return 'timeout';
  if (NETWORK_RE.test(message)) return 'network';
  if (status === 429 || /rate_limit/.test(code)) return 'rate-limit';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'credentials';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'unconfirmed';
  if (SESSION_RE.test(message) || /^PGRST30[12]$/.test(code) || code === 'session_not_found') return 'session';
  if (code === '42501' || status === 401 || status === 403 || PERMISSION_RE.test(message)) return 'permission';
  if (code === 'PGRST116' || status === 404) return 'not-found';
  if (code === '23505' || status === 409) return 'duplicate';
  if (INVALID_CODES.includes(code) || status === 400 || status === 422) return 'invalid';
  if (status >= 500) return 'server';
  return 'unknown';
}

/* أخطاء مؤقتة تستحق إعادة المحاولة تلقائيًا (الشبكة/المهلة/الخادم). الباقي لن يتغيّر بإعادة المحاولة. */
export const isRetryable = kind => kind === 'network' || kind === 'timeout' || kind === 'server';

const PUBLIC = {
  network: 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.',
  timeout: 'استغرق الخادم وقتًا طويلًا في الرد. حاول مرة أخرى.',
  'rate-limit': 'محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مرة أخرى.',
  credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  unconfirmed: 'لم يتم تفعيل هذا البريد الإلكتروني بعد.',
  session: 'انتهت الجلسة. سجّل الدخول من جديد.',
  permission: 'لا تملك صلاحية تنفيذ هذا الإجراء.',
  'not-found': 'العنصر المطلوب غير موجود.',
  duplicate: 'هذا العنصر موجود بالفعل.',
  conflict: 'تم تعديل هذا العنصر من مكان آخر. حدّث الصفحة ثم أعد المحاولة.',
  invalid: 'البيانات المُدخلة غير صالحة. راجع الحقول وحاول مرة أخرى.',
  server: 'حدثت مشكلة في الخادم. حاول لاحقًا.',
  unknown: 'حدث خطأ غير متوقع. حاول مرة أخرى.'
};

/* نفس المعاني بلهجة لوحة الإدارة الحالية. */
const ADMIN = {
  network: 'مش قادر أوصل للسيرفر — تأكد إن النت شغال وجرّب تاني',
  timeout: 'السيرفر اتأخر في الرد — جرّب تاني',
  'rate-limit': 'محاولات كتير — استنى شوية وجرّب تاني',
  credentials: 'الإيميل أو الباسورد غلط',
  unconfirmed: 'الإيميل لسه متفعّلش في Supabase',
  session: 'الجلسة انتهت — سجّل الدخول من جديد',
  permission: 'مفيش صلاحية للعملية دي — راجع سياسات Supabase (RLS)',
  'not-found': 'العنصر مش موجود (ممكن يكون اتحذف)',
  duplicate: 'العنصر ده موجود بالفعل (الاسم أو الـslug مكرر)',
  conflict: 'العنصر ده اتعدّل من مكان تاني بعد ما فتحته — اتحدّثت نسخته في القائمة، افتحه تاني وراجع وجرّب',
  invalid: 'في بيانات مش مقبولة — راجع الحقول وجرّب تاني',
  server: 'في مشكلة في السيرفر — جرّب بعد شوية',
  unknown: 'حصل خطأ غير متوقع — جرّب تاني'
};

export const messageFor = (kind, { admin = false } = {}) => (admin ? ADMIN : PUBLIC)[kind] || (admin ? ADMIN : PUBLIC).unknown;
export const describeError = (err, opts) => messageFor(classifyError(err), opts);
