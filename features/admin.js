/* لوحة الإدارة (#admin) — افتحها بإضافة #admin لرابط الموقع.
 * نموذج الأمان: لا شيء في هذا الملف يُعدّ حاجز حماية. الصلاحيات تُفرض من جهة الخادم عبر
 * Supabase RLS + public.is_admin() (supabase/sql/01_admin_and_rls.sql).
 * الواجهة تُظهر أدوات الإدارة فقط بعد أن يؤكد الخادم أن المستخدم أدمن، وأي جلسة غير أدمن تُنهى فورًا. */
import { ADMIN } from '../config.js';
import { getMods, normalize, reloadMods, upsertRemoteRow, removeRemoteRow, fetchRowById, getSelectColumns, supportsColumn } from '../data/catalog.js';
import { validateModInput, findDuplicate } from '../data/mod-schema.js';
import { activateModal } from '../lib/modal.js';
import { getClient, whenSupabaseReady } from '../data/supabase.js';
import { byId, create } from '../lib/dom.js';
import { on } from '../lib/bus.js';
import { log } from '../lib/log.js';
import { AppError, classifyError, describeError } from '../lib/errors.js';
import { notifyError, notifySuccess } from '../lib/notify.js';

const { limits } = ADMIN;
const adminText = err => describeError(err, { admin: true });

export function initAdmin() {
  if (ADMIN.email) byId('admEmailWrap').hidden = true;
  const overlay = byId('adminModal'), message = byId('admMsg');
  const list = byId('modList'), imageList = byId('admImgList');
  const findByRawId = id => getMods().find(m => m && m.id != null && String(m.id) === id);
  let logged = false, fails = 0, lockUntil = 0, idleTimer = 0, editId = null, editToken = '';

  /* الأخطاء تُعلَن فورًا (assertive) والنجاح بهدوء (polite)؛ نضبط ذلك قبل وضع النص كي يُعلَن بالنمط الصحيح. */
  const say = (text, ok) => { message.setAttribute('aria-live', ok ? 'polite' : 'assertive'); message.textContent = text || ''; message.className = ok ? 'ok' : 'err'; };

  /* ربط خطأ التحقق بالحقل المعيب: تعليم aria-invalid + ربطه برسالة الخطأ + تركيزه (لوحة المفاتيح وقارئ الشاشة يصلان للمشكلة مباشرة). */
  const FIELD_IDS = { name: 'admName', category: 'admCat', download: 'admDl', version: 'admVer', size: 'admSize', description: 'admDesc' };
  const fieldEl = key => (key === 'images' ? imageList.querySelector('input') || byId('admAddImg') : byId(FIELD_IDS[key]));
  function clearInvalid() {
    overlay.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  }
  function flagInvalid(key) {
    clearInvalid();
    const el = key && fieldEl(key);
    if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', 'admMsg');
    el.focus();
  }

  function render() {
    byId('admLogin').hidden = logged;
    byId('admForm').hidden = !logged;
    byId('admFab').hidden = !logged;
    decorateCards();
  }
  /* النافذة: عزل الخلفية وحبس Tab وتركيز أول حقل عند الفتح، وإعادة التركيز لما كان قبلها عند الإغلاق (lib/modal.js). */
  let releaseModal = null;
  const firstField = () => byId(logged ? 'admName' : (byId('admEmailWrap').hidden ? 'admPass' : 'admEmail'));
  function openModal() {
    overlay.hidden = false; say(''); render();
    if (!releaseModal) releaseModal = activateModal(overlay, { dialog: overlay.querySelector('.adm-box'), initialFocus: firstField() });
  }
  function closeModal() {
    overlay.hidden = true; clearInvalid(); resetForm();
    if (releaseModal) { releaseModal(); releaseModal = null; }
  }

  /* ===== الجلسة ===== */
  /* يسأل الخادم: هل الجلسة الحالية لأدمن؟ يرجع 'yes' | 'no' | 'error'. */
  async function checkAdmin(client) {
    try {
      const r = await client.rpc('is_admin');
      if (r.error) throw r.error;
      return r.data === true ? 'yes' : 'no';
    } catch (err) {
      log.warn('admin', 'could not verify admin role with the server', err);
      return 'error';
    }
  }

  async function endSession() {
    const client = getClient();
    if (client) {
      try {
        const r = await client.auth.signOut({ scope: 'global' });
        if (r && r.error) await client.auth.signOut({ scope: 'local' });
      } catch (err) {
        log.warn('admin', 'global sign-out failed; falling back to local sign-out', err);
        try { await client.auth.signOut({ scope: 'local' }); } catch (e) { log.warn('admin', 'local sign-out failed too', e); }
      }
    }
    logged = false;
    clearTimeout(idleTimer);
    byId('admPass').value = '';
    render();
  }

  function bumpIdle() {
    if (!logged) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => endSession().then(closeModal), ADMIN.idleMs);
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(type => addEventListener(type, bumpIdle, { passive: true }));

  async function restoreSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!(data && data.session)) { logged = false; render(); return; }
    const verdict = await checkAdmin(client);
    if (verdict === 'no') { await endSession(); return; }   /* مسجّل لكن ليس أدمن ← أسقط الجلسة */
    logged = verdict === 'yes';                              /* 'error' (بدون نت): تبقى الواجهة مقفلة والجلسة محفوظة */
    render();
    bumpIdle();
  }

  whenSupabaseReady().then(client => {
    if (!client) return;
    restoreSession(client).catch(err => { log.error('admin', 'could not restore the saved session', err); logged = false; render(); });
    /* انتهت الجلسة أو خرج من تبويب آخر ← أخفِ أدوات الإدارة (أعلام وDOM فقط). */
    client.auth.onAuthStateChange((event, session) => { if (!session && logged) { logged = false; render(); } });
  });

  function checkHash() {
    if (location.hash !== '#admin') return;
    openModal();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* history غير متاح */ }
  }
  addEventListener('hashchange', checkHash);
  checkHash();

  byId('admFab').addEventListener('click', openModal);
  byId('admClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

  byId('admLogin').addEventListener('submit', async e => {
    e.preventDefault();
    const client = getClient();
    if (!client) { say('الاتصال لسه مجهزش، جرّب بعد لحظات'); return; }
    const wait = Math.ceil((lockUntil - Date.now()) / 1000);
    if (wait > 0) { say('محاولات كتير — استنى ' + wait + ' ثانية وجرّب تاني'); return; }
    const email = ADMIN.email || byId('admEmail').value.trim(), password = byId('admPass').value;
    if (!email || !password) {
      say(ADMIN.email ? 'اكتب كلمة المرور' : 'اكتب الإيميل وكلمة المرور');
      const empty = !password ? byId('admPass') : byId('admEmail');
      empty.setAttribute('aria-invalid', 'true'); empty.setAttribute('aria-describedby', 'admMsg'); empty.focus();
      return;
    }
    if (navigator.onLine === false) { say(adminText(new AppError('network'))); return; }
    const loginButton = byId('admLoginBtn');
    loginButton.disabled = true;
    say('جاري الدخول...', 1);
    try {
      const r = await client.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
      const verdict = await checkAdmin(client);
      if (verdict !== 'yes') {
        await endSession();
        say(verdict === 'no' ? 'الحساب ده مش مسجّل كأدمن' : 'تعذّر التحقق من صلاحيات الإدارة، جرّب تاني');
        return;
      }
      fails = 0; logged = true;
      byId('admPass').value = '';
      clearInvalid(); render(); bumpIdle(); say('تم الدخول ✓', 1);
      byId('admName').focus(); /* نموذج الدخول اختفى: ننقل التركيز للنموذج الجديد بدل أن يضيع */
    } catch (err) {
      const kind = classifyError(err);
      /* القفل المؤقت لمحاولات الدخول الخاطئة فقط؛ انقطاع النت أو عطل السيرفر ليس تخمينًا للباسورد. */
      if (kind === 'credentials' && ++fails >= ADMIN.maxFails) lockUntil = Date.now() + ADMIN.lockMs * Math.pow(2, Math.min(fails - ADMIN.maxFails, 4));
      log.warn('admin', 'sign-in failed (' + kind + ')', err);
      say(adminText(err));
    } finally {
      loginButton.disabled = false;
    }
  });
  byId('admLogout').addEventListener('click', async () => { await endSession(); closeModal(); });

  /* ===== قائمة الصور: صورة واحدة أو أكتر (حد أقصى limits.images) ===== */
  function addImageRow(value) {
    const row = create('div', 'adm-imgrow');
    const input = create('input');
    input.type = 'url'; input.dir = 'ltr'; input.placeholder = 'https://...'; input.maxLength = limits.url;
    input.value = value || '';
    input.setAttribute('aria-label', 'رابط صورة');
    const remove = create('button');
    remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', 'حذف الصورة');
    remove.addEventListener('click', () => { row.remove(); if (!imageList.children.length) addImageRow(''); });
    row.appendChild(input); row.appendChild(remove);
    imageList.appendChild(row);
    return input;
  }
  function setImages(list) {
    imageList.innerHTML = '';
    const urls = (list || []).filter(Boolean);
    (urls.length ? urls : ['']).forEach(addImageRow);
  }
  const getImages = () => [...imageList.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
  byId('admAddImg').addEventListener('click', () => {
    if (imageList.children.length >= limits.images) { say('الحد الأقصى ' + limits.images + ' صورة'); return; }
    addImageRow('').focus();
  });
  setImages([]);

  /* ===== نموذج الإضافة / التعديل ===== */
  function resetForm() {
    editId = null;
    editToken = ''; /* قيمة updated_at وقت فتح العنصر للتعديل (كشف التعارض) */
    ['admName', 'admDl', 'admVer', 'admSize', 'admDesc'].forEach(id => { byId(id).value = ''; });
    setImages([]);
    byId('admTitle').textContent = 'إضافة عنصر جديد';
    byId('admAddBtn').textContent = 'نشر العنصر';
    byId('admCancelEdit').hidden = true;
  }
  byId('admCancelEdit').addEventListener('click', () => { resetForm(); say(''); });

  /* تحديث رجع بلا صفوف: إما العنصر اتحذف، أو اتعدّل من مكان آخر (تعارض)، أو الصلاحيات (RLS). نسأل الخادم لنعرف أيها. */
  async function explainEmptyUpdate(id, token) {
    const fresh = await fetchRowById(id);
    if (!fresh) { removeRemoteRow(id); throw new AppError('not-found', 'update affected 0 rows: the item no longer exists'); }
    if (token && fresh.updated_at && fresh.updated_at !== token) {
      upsertRemoteRow(fresh); /* نحدّث القائمة بنسخة الخادم الحالية */
      throw new AppError('conflict', 'update affected 0 rows: updated_at changed (' + token + ' → ' + fresh.updated_at + ')');
    }
    throw new AppError('permission', 'update affected 0 rows (RLS)');
  }

  /* الخطأ زال بمجرد أن يبدأ المستخدم بتصحيح الحقل. */
  overlay.addEventListener('input', e => {
    if (e.target.hasAttribute && e.target.hasAttribute('aria-invalid')) { e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-describedby'); }
  });

  byId('admForm').addEventListener('submit', async e => {
    e.preventDefault();
    const client = getClient(), button = byId('admAddBtn');
    if (!client || !logged) return;
    /* التحقق والتنظيف في وحدة نقية (mod-schema.js)، وقاعدة البيانات تفرض نفس الحدود بقيود CHECK. */
    const checked = validateModInput({
      name: byId('admName').value, category: byId('admCat').value, download: byId('admDl').value,
      version: byId('admVer').value, size: byId('admSize').value, description: byId('admDesc').value, images: getImages()
    }, limits);
    if (!checked.ok) { say(checked.error); flagInvalid(checked.field); return; }
    clearInvalid();
    const fields = checked.fields;
    const editing = !!editId;

    const dup = findDuplicate(fields, getMods().map(normalize), editing ? editId : null);
    if (dup && !confirm('في عنصر مشابه بالفعل: "' + dup.item.name + '" (' + (dup.by === 'download' ? 'نفس رابط التحميل' : 'نفس الاسم في نفس القسم') + ').\nتكمل الحفظ برضه؟')) {
      say('اتلغى الحفظ — العنصر مكرر'); return;
    }

    if (navigator.onLine === false) { say(adminText(new AppError('network'))); return; }
    button.disabled = true;
    say(editing ? 'جاري الحفظ...' : 'جاري النشر...', 1);
    try {
      const columns = getSelectColumns();
      if (editing) {
        /* شرط updated_at = القيمة وقت فتح العنصر: لو عدّله أدمن آخر في الأثناء يرجع الطلب بلا صفوف بدل أن نطمس تعديله. */
        let query = client.from('mods').update(fields).eq('id', editId);
        if (editToken && supportsColumn('updated_at')) query = query.eq('updated_at', editToken);
        const r = await query.select(columns);
        if (r.error) throw r.error;
        if (!r.data || !r.data.length) await explainEmptyUpdate(editId, editToken);
        upsertRemoteRow(r.data[0]);
      } else {
        const r = await client.from('mods').insert(Object.assign({ published: true }, fields)).select(columns);
        if (r.error) throw r.error;
        if (r.data && r.data[0]) upsertRemoteRow(r.data[0]); else reloadMods(); /* لا يرمي */
      }
      resetForm();
      say(editing ? 'تم حفظ التعديلات ✓' : 'تمت الإضافة ✓ وظهرت في القسم', 1);
    } catch (err) {
      log.error('admin', (editing ? 'update' : 'insert') + ' failed', err);
      if (classifyError(err) === 'session') await endSession();
      say((editing ? 'فشل الحفظ: ' : 'فشل النشر: ') + adminText(err));
    } finally {
      button.disabled = false;
    }
  });

  /* ===== أزرار تعديل/حذف على البطاقات (للأدمن فقط) ===== */
  function decorateCards() {
    list.querySelectorAll('.mod-card').forEach(card => {
      const existing = card.querySelector('.adm-act');
      if (!logged) { if (existing) existing.remove(); return; }
      if (existing || !findByRawId(card.dataset.id)) return;
      const actions = create('div', 'adm-act');
      actions.innerHTML = '<button type="button" data-act="edit" aria-label="تعديل">✎</button><button type="button" data-act="del" aria-label="حذف">🗑</button>';
      card.appendChild(actions);
    });
  }
  on('list:rendered', decorateCards);

  /* capture: كي لا يفتح الضغط على الأزرار تفاصيل البطاقة. */
  list.addEventListener('click', async e => {
    const btn = e.target.closest('.adm-act button');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest('.mod-card'), mod = card && findByRawId(card.dataset.id), client = getClient();
    if (!mod || !client || !logged) return;
    if (btn.dataset.act === 'edit') {
      openModal();
      editId = String(mod.id);
      editToken = mod.updatedAt || '';
      byId('admCat').value = mod.category || 'Addons';
      byId('admName').value = mod.name || '';
      byId('admDl').value = mod.download || '';
      setImages(Array.from(new Set([mod.image].concat(mod.images || []))));
      byId('admVer').value = mod.mcVersion || '';
      byId('admSize').value = mod.size || '';
      byId('admDesc').value = mod.description || '';
      byId('admTitle').textContent = 'تعديل العنصر';
      byId('admAddBtn').textContent = 'حفظ التعديلات';
      byId('admCancelEdit').hidden = false;
    } else if (btn.dataset.act === 'del') {
      if (!confirm('متأكد إنك عايز تحذف "' + (mod.name || '') + '" نهائيًا؟')) return;
      btn.disabled = true;
      try {
        const r = await client.from('mods').delete().eq('id', mod.id).select('id');
        if (r.error) throw r.error;
        if (!r.data || !r.data.length) throw new AppError('permission', 'delete affected 0 rows (RLS or already deleted)');
        removeRemoteRow(mod.id);
        notifySuccess('تم حذف العنصر.');
      } catch (err) {
        log.error('admin', 'delete failed', err);
        btn.disabled = false;
        if (classifyError(err) === 'session') await endSession();
        notifyError('فشل الحذف: ' + adminText(err));
      }
    }
  }, true);
}
