/* الوصول الوحيد لـ localStorage / sessionStorage. التخزين قد يكون ممنوعًا (وضع خاص، سياسة المتصفح) أو ممتلئًا،
 * فكل دالة هنا لا ترمي أبدًا: get ترجع null، وset/remove ترجع true/false. لا تستعمل localStorage مباشرة في أي وحدة أخرى
 * (يفرض ذلك tests/structure.mjs)؛ الاستثناء الوحيد boot.js لأنه سكربت عادي لا يستورد وحدات. */
function area(name) {
  /* نقرأ الكائن العام عند كل استدعاء (لا نخزّنه): الوصول نفسه قد يرمي، والاختبارات تبدّله. */
  const get = () => { try { return globalThis[name] || null; } catch (e) { return null; } };
  return {
    get(key) { try { const s = get(); return s ? s.getItem(key) : null; } catch (e) { return null; } },
    set(key, value) { try { const s = get(); if (!s) return false; s.setItem(key, String(value)); return true; } catch (e) { return false; } },
    remove(key) { try { const s = get(); if (!s) return false; s.removeItem(key); return true; } catch (e) { return false; } },
    /* كل المفاتيح (فارغة لو التخزين غير متاح). */
    keys() {
      try {
        const s = get(), out = [];
        for (let i = 0; s && i < s.length; i++) out.push(s.key(i));
        return out;
      } catch (e) { return []; }
    }
  };
}

export const local = area('localStorage');
export const session = area('sessionStorage');
