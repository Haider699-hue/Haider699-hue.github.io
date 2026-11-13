/* أدوات DOM مشتركة. */
export const byId = id => document.getElementById(id);

export function create(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => motionQuery.matches;
export const hasFinePointer = () => matchMedia('(hover:hover) and (pointer:fine)').matches;

/* نسخ نص للحافظة. يرجع true/false. */
export async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }
  let ta;
  try {
    ta = create('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    return document.execCommand('copy');
  } catch (e) {
    return false;
  } finally {
    if (ta) ta.remove();
  }
}
