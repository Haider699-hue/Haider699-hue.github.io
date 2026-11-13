/* فحص الروابط. */
function parse(u) {
  try {
    const x = new URL(String(u == null ? '' : u).trim());
    return (x.username || x.password) ? null : x;
  } catch (e) { return null; }
}

/* رابط http(s) بلا يوزر/باسورد، أو '' لو غير صالح (للعرض). */
export function safeUrl(u) {
  const x = parse(u);
  return x && (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : '';
}

/* https فقط وبطول أقصى، أو null لو غير صالح (للحفظ من لوحة الإدارة). */
export function httpsUrl(u, maxLen) {
  if (!u || u.length > maxLen) return null;
  const x = parse(u);
  return x && x.protocol === 'https:' ? x.href : null;
}
