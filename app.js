/* HAIDER app — الأقسام بترتيب التنفيذ الأصلي. كل قسم IIFE معزول بـ try/catch حتى لا يوقف خطأ في قسم بقية الأقسام. */

/* ===== [2] section-2 ===== */
try{
(function(){
  var g=document.getElementById('ytGate'),root=document.documentElement;
  var URL_='https://www.youtube.com/@Haider-f6c1j';
  try{ if(sessionStorage.getItem('ytGateDone')==='1') return; }catch(e){}
  g.hidden=false; root.classList.add('yt-lock'); try{document.getElementById('ytYes').focus()}catch(e){}
  function close(){
    g.hidden=true; root.classList.remove('yt-lock');
    try{ sessionStorage.setItem('ytGateDone','1'); }catch(e){}
  }
  document.getElementById('ytYes').addEventListener('click',close);
  document.getElementById('ytNo').addEventListener('click',function(){
    var w=null; try{ w=window.open(URL_,'_blank'); }catch(e){}
    if(!w){ location.href=URL_; return; }
    close();
  });
  g.addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;
    var a=document.getElementById('ytYes'),z=document.getElementById('ytNo'),f=document.activeElement;
    if(!g.contains(f)){e.preventDefault();a.focus()}
    else if(e.shiftKey&&f===a){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&f===z){e.preventDefault();a.focus()}
  });
})();
}catch(err){console.error('[HAIDER] section failed: section-2',err)}
;

/* ===== [3] section-3 ===== */
window.HAIDER_SUPABASE_URL = 'https://lpnpyekzadlzazehaxqo.supabase.co';
  window.HAIDER_SUPABASE_KEY = 'sb_publishable_Dm9yExHFUUA6y8WcAa4T7g_i_Z4z1fJ';
  window.haiderSupabase = null;
  function haiderInitSb() {
  window.haiderSupabase = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(window.HAIDER_SUPABASE_URL, window.HAIDER_SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;
  if (window.haiderSupabase) window.dispatchEvent(new Event('haider-sb-ready'));
  }
  (function () {
    var t = document.createElement('script');
    t.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4'; t.async = true; t.onload = haiderInitSb;
    document.head.appendChild(t);
  })();
;

/* ===== [4] HAIDER core logic — preserve database, search, and core func ===== */
/* HAIDER core logic — preserve database, search, and core functionality */
  /* ===== أضف عناصرك هنا ===== */
  const LOCAL_MODS = [
    /* انسخ القالب ده وكرره لكل عنصر (حط فاصلة بين كل عنصر والتاني):
    {
      name: 'اسم العنصر',
      category: 'Addons',          // Addons | Shaders | Skins | Versions
      download: 'https://www.mediafire.com/...',
      image: 'https://...صورة.jpg',   // اختياري
      description: 'وصف قصير',        // اختياري
      mcVersion: '1.21',              // اختياري
      size: '25 MB',                  // اختياري
      featured: false                 // true = علامة "مميز"
    },
    */
  ];
  /* ========================== */
  let allMods = LOCAL_MODS.slice();
  const PAGE_SIZE = 24, SEARCH_DEBOUNCE_MS = 200, EAGER_CARDS = 4;
  let sb = window.haiderSupabase;
  const PAGES = '';   /* بعد ما ترفع صفحات build-pages.mjs اكتب هنا '/m/' عشان روابط المشاركة تبقى صفحات ثابتة */   
  const NO_LINK_MSG = 'الرابط غير متاح حاليًا';
  const CAT = {
    Addons:   { label: 'مودات',             c: 'var(--emerald)',  ink: '#000',  st: 'transparent',  icon: 'i-addons',   route: 'addons' },
    Versions: { label: 'إصدارات ماينكرافت', c: 'var(--diamond)',  ink: '#000',  st: 'transparent',  icon: 'i-versions', route: 'versions' },
    Skins:    { label: 'السكنات',           c: 'var(--gold)',     ink: '#000',  st: 'transparent',  icon: 'i-skins',    route: 'skins' },
    Shaders:  { label: 'الشادرات',          c: 'var(--amethyst)', ink: '#000', st: 'transparent', icon: 'i-shaders',  route: 'shaders' }
  };
  const ROUTE_CAT = { all: 'All', addons: 'Addons', versions: 'Versions', skins: 'Skins', shaders: 'Shaders' };
  const TYPES = ['mcpack', 'mcaddon', 'mcworld', 'apk', 'other'];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function safeUrl(u) { try { u = String(u == null ? '' : u).trim(); const x = new URL(u); return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : ''; } catch (e) { return ''; } }
  const cssUrl = u => String(u || '').replace(/\\/g, '%5C').replace(/'/g, '%27').replace(/"/g, '%22').replace(/[()\s]/g, c => encodeURIComponent(c));
  const fold = s => String(s == null ? '' : s).toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  function h32(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function mkSlug(n,i){const b=String(n).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,40).replace(/-+$/,'');return (b||'item')+'-'+String(i).replace(/[^a-z0-9]/gi,'').slice(0,8).toLowerCase()}
  function normalize(m) {
    if (m && m._n) return m._n;
    const src = (m && typeof m === 'object') ? m : {};
    const str = v => v == null ? '' : String(v).trim();
    const list = v => Array.isArray(v) ? v : [];
    const name = str(src.name) || 'بدون اسم', download = safeUrl(src.download);
    const dl = (src.downloads === '' || src.downloads == null || !isFinite(+src.downloads)) ? null : +src.downloads;
    const slug = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    const n = {
      id: str(src.id) || (slug + '-' + h32(name + '|' + download)),
      name, category: str(src.category), image: safeUrl(src.image), download,
      description: str(src.description), mcVersion: str(src.mcVersion), size: str(src.size), downloads: dl,
      createdAt: isFinite(Date.parse(src.createdAt)) ? str(src.createdAt) : '',
      images: list(src.images).map(safeUrl).filter(Boolean), tags: list(src.tags).map(str).filter(Boolean),
      featured: src.featured === true || src.featured === 'true', type: TYPES.indexOf(src.type) > -1 ? src.type : '', slug: str(src.slug) || mkSlug(name, str(src.id) || h32(name + '|' + download))
    };
    n.s = fold(n.name + ' ' + n.tags.join(' ') + ' ' + n.description);
    try { Object.defineProperty(src, '_n', { value: n, enumerable: false }); } catch (e) {}
    return n;
  }

  let detailOpen = false, curId = '', pushed = false, openHash = '', openerEl = null, view = [], shown = 0, curCat = 'All', curQ = '', curSort = 'downloads';
  const $id = id => document.getElementById(id);
  function filtered() {
    const q = fold(curQ).trim();
    const r = allMods.filter(m => { const n = normalize(m); return (curCat === 'All' || n.category === curCat) && (!q || n.s.indexOf(q) > -1); });
    const t = m => Date.parse(normalize(m).createdAt) || 0;
    if (curSort === 'new') r.sort((a, b) => t(b) - t(a));
    else if (curSort === 'old') r.sort((a, b) => t(a) - t(b));
    else if (curSort === 'name') r.sort((a, b) => normalize(a).name.localeCompare(normalize(b).name, 'ar'));
    else if (curSort === 'downloads') r.sort((a, b) => (normalize(b).downloads || 0) - (normalize(a).downloads || 0));
    return r;
  }
  function apply() { renderMods(filtered()); }

  const KIND = { Addons: 'k-addon', Skins: 'k-skin', Shaders: 'k-shader', Versions: 'k-ver' };
  function cardHtml(m, i) {
    const n = normalize(m), c = CAT[n.category] || { label: n.category, c: '#fff', ink: '#000', st: 'transparent', icon: 'i-all' };
    const kind0 = KIND[n.category] || 'k-addon', kind = (kind0 === 'k-ver' && n.image) ? 'k-vimg' : kind0, sq = kind === 'k-skin';
    const thumb = n.image
      ? `<img src="${esc(n.image)}" alt="" width="320" height="${sq ? 320 : 180}" decoding="async" loading="${i < EAGER_CARDS ? 'eager' : 'lazy'}">`
      : `<div class="ph" aria-hidden="true" style="--ph-c:${c.c}; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05);"><svg viewBox="0 0 16 16" style="width:40px;height:40px;color:${c.c};"><use href="#${c.icon}"/></svg></div>`;
    const btn = '<button type="button" class="dl-btn view-btn">عرض التفاصيل</button>';
    const specs = [n.type && n.type !== 'other' ? '.' + n.type : '', n.size, kind === 'k-ver' ? '' : n.mcVersion].filter(Boolean);
    const chips = specs.map(v => `<span dir="ltr">${esc(v)}</span>`).join('<span class="dot" aria-hidden="true">·</span>');
    const name = `<div class="mod-name" role="button" tabindex="0">${esc(n.name)}</div>`;
    const wrap = chips ? `<div class="mod-spec">${chips}</div>` : '';
    const isNew = n.createdAt && (Date.now() - Date.parse(n.createdAt) < 6048e5),
      zb = n.featured ? '<div class="zbadges"><span class="zb zb-top">مميز</span></div>' : '';
    const head = `<div class="mod-card ${kind}${n.featured ? ' is-top' : ''}${isNew ? ' is-new' : ''}" data-id="${esc(n.id)}" data-cat="${esc(n.category)}" style="--cat-color:${c.c};">`;
    if (kind === 'k-ver') return `${head}<div class="mod-body">${name}${wrap}${btn}</div></div>`;
    const catl = `<div class="mod-cat"><svg class="pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${c.icon}"/></svg><span>${esc(c.label)}</span></div>`;
    const desc = n.description ? `<p class="mod-desc">${esc(n.description)}</p>` : '';
    return `${head}<div class="mod-thumb"${n.image?` style="--bg:url('${esc(cssUrl(n.image))}')"`:''}>${zb}${thumb}</div><div class="mod-body">${catl}${name}${desc}${wrap}${btn}</div></div>`;
  }

  function renderMods(mods) {
    if (mods === allMods) mods = filtered();
    view = mods || []; shown = 0;
    const seen = {};
    view.forEach(m => { const n = normalize(m); if (seen[n.id]) n.id += '-' + (++seen[n.id]); else seen[n.id] = 1; });
    const list = $id('modList');
    list.innerHTML = '';
    if (curCat === 'All' && !curId) {
      const order = ['Addons', 'Skins', 'Shaders', 'Versions'];
      const categories = [...order, ...new Set(view.map(m => normalize(m).category).filter(cat => cat && !order.includes(cat)))];
      const groups = categories.map(cat => ({ cat, items: view.filter(m => normalize(m).category === cat) })).filter(g => g.items.length);
      list.classList.add('grouped-categories');
      list.innerHTML = groups.map(g => {
        const meta = CAT[g.cat] || { label: g.cat, c: '#a855f7', icon: 'i-all' };
        return `<section class="category-section" style="--section-color:${meta.c}"><h2 class="category-heading"><span class="category-heading-icon"><svg class="pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${meta.icon}"/></svg></span><span>${esc(meta.label)}</span><span class="category-count">${g.items.length}</span></h2><div class="category-grid">${g.items.map((m, i) => cardHtml(m, i)).join('')}</div></section>`;
      }).join('');
      shown = view.length;
      $id('moreWrap').hidden = true;
    } else {
      list.classList.remove('grouped-categories');
      showMore();
    }
    $id('resultCount').textContent = view.length > 0 ? `تم العثور على ${view.length} عنصر` : '';
    $id('emptyState').hidden = view.length > 0;
    { const et = document.querySelector('#emptyState .empty-title'), es = document.querySelector('#emptyState .empty-sub'); if (et) et.textContent = window.__loadErr ? 'تعذّر تحميل المحتوى' : 'لا توجد نتائج في هذا البُعد'; if (es) es.textContent = window.__loadErr ? 'تحقق من الاتصال بالإنترنت ثم أعد تحميل الصفحة.' : 'جرّب كلمة بحث مختلفة أو اختر تصنيفًا آخر'; const rb = $id('emptyReset'); if (rb) rb.textContent = window.__loadErr ? 'إعادة المحاولة' : 'عرض كل العناصر'; }
    if (curId && !detailOpen) fromHash(true);
  }
  function showMore() {
    const part = view.slice(shown, shown + PAGE_SIZE), first = shown;
    $id('modList').insertAdjacentHTML('beforeend', part.map((m, k) => cardHtml(m, first + k)).join(''));
    shown += part.length;
    const left = view.length - shown;
    $id('moreWrap').hidden = left <= 0;
    $id('moreBtn').textContent = left > 0 ? `المزيد من العناصر (${left})` : 'المزيد من العناصر';
  }
  $id('moreBtn').addEventListener('click', () => showMore());

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?');
    const parts = (qi < 0 ? h : h.slice(0, qi)).split('/'), sp = new URLSearchParams(qi < 0 ? '' : h.slice(qi + 1));
    const r = { cat: 'All', q: sp.get('q') || '', sort: sp.get('sort') === null ? 'downloads' : (sp.get('sort') === 'default' ? '' : sp.get('sort')), id: '' };
    if (parts[0] === 'c' && ROUTE_CAT[parts[1]]) r.cat = ROUTE_CAT[parts[1]];
    else if (parts[0] === 'i' && parts[1]) { try { r.id = decodeURIComponent(parts[1]); } catch (e) {} }
    return r;
  }
  function buildHash() {
    if (curCat === 'All' && !curQ && curSort === 'downloads') return '#/';
    const p = [curQ ? 'q=' + encodeURIComponent(curQ) : '', curSort === 'downloads' ? '' : 'sort=' + (curSort ? encodeURIComponent(curSort) : 'default')].filter(Boolean).join('&');
    return '#/c/' + (curCat === 'All' ? 'all' : CAT[curCat].route) + (p ? '?' + p : '');
  }
  function go(push) {
    try { const h = buildHash(); if (location.hash !== h && !(h === '#/' && !location.hash)) history[push ? 'pushState' : 'replaceState'](null, '', h); } catch (e) {}
  }
  function syncUi() {
    document.documentElement.setAttribute('data-cat', curCat);
    document.querySelectorAll('.hnav a').forEach(a => a.classList.toggle('active', a.dataset.nav === curCat));
    const inp = $id('searchInput'); if (inp && inp.value !== curQ) inp.value = curQ;
    const ss = $id('sortSel'); if (ss && ss.value !== curSort) ss.value = curSort;
  }
  function fromHash(force) {
    if (location.hash === '#admin') return;
    const r = parseHash();
    if (r.id) { if (detailOpen && location.hash === openHash) return; curId = r.id; if (!openDetail(r.id, 'route') && allMods.length) { curId = ''; try { history.replaceState(null, '', '#/'); } catch (e) {} } return; }
    if (detailOpen) closeUi();
    curId = '';
    if (r.cat === curCat && r.q === curQ && r.sort === curSort) return;
    curCat = r.cat; curQ = r.q; curSort = r.sort; syncUi(); apply();
  }
  addEventListener('popstate', fromHash); addEventListener('hashchange', fromHash);

  window.filterMods = function(cat, el) { curCat = cat; syncUi(); apply(); go(true); };
  window.resetFilters = function() { clearTimeout(searchTimer); curCat = 'All'; curQ = ''; syncUi(); apply(); go(true); };
  let searchTimer = 0;
  function searchMods() { clearTimeout(searchTimer); curQ = $id('searchInput').value; apply(); go(false); }
  $id('sortSel').addEventListener('change', e => { curSort = e.target.value; apply(); go(false); });
  $id('searchInput').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(searchMods, SEARCH_DEBOUNCE_MS); });

  const HOW = {
    mcpack:  ['افتح الملف باستخدام لعبة ماينكرافت.', 'انتظر رسالة تأكيد الاستيراد.', 'افتح إعدادات العالم وفعّل الحزمة.', 'العب!'],
    mcaddon: ['افتح الملف باستخدام اللعبة.', 'انتظر الاستيراد.', 'فعّل الحزم من إعدادات العالم.'],
    mcworld: ['افتح الملف باللعبة.', 'ستجد العالم مضافاً لقائمتك.'],
    skin:    ['اختر السكن من إعدادات الشخصية بعد فتحه.'],
    shader:  ['فعّل الحزمة من الموارد، قد تتطلب جهازاً قوياً.'],
    version: ['ثبت التطبيق ووافق على التثبيت الخارجي.']
  };
  const howKey = n => HOW[n.type] ? n.type : n.type === 'apk' ? 'version' : ({ Skins: 'skin', Shaders: 'shader', Versions: 'version' }[n.category] || 'mcpack');
  const sheet = $id('sheetPanel'), sheetBody = $id('detailBody');
  const shareUrl = id => { try { const m = allMods.find(x => normalize(x).id === id), n = m && normalize(m);
    if (PAGES && n && n.slug) return location.origin + PAGES + encodeURIComponent(n.slug) + '.html';
    return location.href.split('#')[0] + '#/i/' + encodeURIComponent((n && n.slug) || id); } catch (e) { return ''; } };
  
  function detailHtml(n) {
    const c = CAT[n.category] || { label: n.category, c: '#fff', icon: 'i-all' };
    const imgs = Array.from(new Set([n.image].concat(n.images).filter(Boolean)));
    const fact = (k, v) => v ? `<div><dt>${k}</dt><dd dir="ltr">${esc(v)}</dd></div>` : '';
    const facts = fact('إصدار اللعبة المسجل', n.mcVersion) + fact('الحجم', n.size) + fact('التحميلات', n.downloads > 0 ? n.downloads.toLocaleString('en') : '') + fact('أُضيف في', n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
    const steps = HOW[howKey(n)] || [];
    const isNew = n.createdAt && (Date.now() - Date.parse(n.createdAt) < 6048e5);
    let h = '<article class="dp" style="--cat-color:' + c.c + '"><div class="dp-top"><div class="dp-media">';
    if (imgs.length) h += `<div class="tt-img"><img src="${esc(imgs[0])}" alt="${esc(n.name)}" decoding="async">` + (imgs.length > 1 ? '<button type="button" class="g-arrow g-prev" aria-label="الصورة السابقة" data-gal="-1"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button><button type="button" class="g-arrow g-next" aria-label="الصورة التالية" data-gal="1"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>' : '') + `</div>`;
    if (imgs.length > 1) h += '<div class="tt-th">' + imgs.map(u => `<img src="${esc(u)}" alt="" loading="lazy" data-gal="0">`).join('') + '</div>';
    h += `</div><div class="dp-info"><p class="dp-cat"><svg class="pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${c.icon}"/></svg>${esc(c.label)}</p><h2 class="d-title" id="dTitle">${esc(n.name)}</h2>`;
    if (isNew) h += '<span class="dp-new">جديد</span>';
    if (facts) h += `<dl class="dp-facts">${facts}</dl>`;
    h += `<button type="button" class="dp-copy" data-url="${esc(shareUrl(n.id))}">نسخ رابط الصفحة</button></div></div>`;
    if (n.tags.length) h += '<div class="tt-tags">' + n.tags.map(t => `<span>${esc(t)}</span>`).join('') + '</div>';
    if (n.description) h += `<section class="dp-sec"><h3>الوصف</h3><p class="d-desc">${esc(n.description)}</p></section>`;
    h += '<section class="dp-sec"><h3>متطلبات التشغيل</h3><ul class="dp-steps dp-req"><li>لعبة Minecraft Bedrock Edition</li>' + (n.mcVersion ? `<li>إصدار اللعبة المسجّل لهذا المحتوى: <span dir="ltr">${esc(n.mcVersion)}</span></li>` : '') + '</ul></section>';
    if (steps.length) h += '<section class="dp-sec"><h3>طريقة التثبيت</h3><ol class="dp-steps">' + steps.map(t => `<li>${esc(t)}</li>`).join('') + '</ol></section>';
    h += '<section class="dp-sec"><h3>المصدر</h3><p class="dp-box">HAIDER يعرض رابط التحميل فقط. الملف من مصدر خارجي وغير مرتبط بـ Mojang أو Microsoft.</p></section>';
    const rel = allMods.map(normalize).filter(x => x.category === n.category && x.id !== n.id).slice(0, 4);
    if (rel.length) h += '<section class="dp-sec"><h3>محتوى ذو صلة</h3><div class="dp-rels">' + rel.map(r => `<button type="button" class="dp-rel" data-open="${esc(r.id)}">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : ''}<span><b>${esc(r.name)}</b><small>${esc(c.label)}</small></span></button>`).join('') + '</div></section>';
    h += '</article><div class="d-dl" style="--cat-color:' + c.c + '">';
    h += n.download
      ? `<a href="${esc(n.download)}" class="dl-btn dl-big" target="_blank" rel="noopener">تحميل${n.size ? ' · <span dir="ltr">' + esc(n.size) + '</span>' : ''}</a>`
      : `<span class="dl-btn dl-big is-off" role="note">${NO_LINK_MSG}</span>`;
    return h + '</div>';
  }

  sheetBody.addEventListener('click', e => {
    const cp = e.target.closest('.dp-copy');
    if (cp) {
      const u = cp.getAttribute('data-url') || location.href;
      const done = ok => { const old = cp.dataset.t || (cp.dataset.t = cp.textContent); cp.textContent = ok ? 'تم النسخ ✓' : 'تعذّر النسخ'; cp.setAttribute('aria-live','polite'); setTimeout(() => { cp.textContent = old; }, 1800); };
      const legacy = () => { let ta; try { ta=document.createElement('textarea'); ta.value=u; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;opacity:0;pointer-events:none'; document.body.appendChild(ta); ta.select(); done(document.execCommand('copy')); } catch (_) { done(false); } finally { if(ta)ta.remove(); } };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(u).then(() => done(true), legacy); } else legacy();
      return;
    }
    const r = e.target.closest('.dp-rel');
    if (r) openDetail(r.getAttribute('data-open'), 'click');
  });

  function lock(on) {
    const r = document.documentElement;
    if (on) { r.classList.add('sheet-open'); } else { r.classList.remove('sheet-open'); }
  }
  
  function openDetail(id, mode, opener) {
    openerEl = opener || document.activeElement;
    const m = allMods.find(x => { const q = normalize(x); return q.id === id || (q.slug && q.slug === id); }); if (!m) return false;
    const n = normalize(m);
    sheetBody.innerHTML = detailHtml(n); curId = n.id; sheet.parentElement.hidden = false; detailOpen = true; sheet.parentElement.scrollTop = 0; document.title = n.name + ' — HAIDER';
    try {
      const h = '#/i/' + encodeURIComponent(n.slug || id); openHash = h;
      if (mode === 'route') { pushed = !!(history.state && history.state.zd); }
      else if (location.hash !== h) { history.pushState({ zd: 1 }, '', h); pushed = true; }
      else { pushed = !!(history.state && history.state.zd); }
    } catch (e) {}
    lock(true);
    requestAnimationFrame(() => { const close = sheet.querySelector('.sheet-close'); if (close) close.focus({preventScroll:true}); });
    return true;
  }
  
  function closeUi() {
    detailOpen = false; sheet.parentElement.hidden = true; sheetBody.innerHTML = ''; lock(false); document.title = 'HAIDER — إضافات ماينكرافت بيدروك';
    curId = '';
    const target = openerEl; openerEl = null;
    if (target && target.isConnected && typeof target.focus === 'function') requestAnimationFrame(() => target.focus({preventScroll:true}));
  }
  function closeDetail() {
    if (!detailOpen) return;
    if (pushed) { pushed = false; try { history.back(); return; } catch (e) {} }
    try { history.replaceState(null, '', buildHash()); } catch (e) {} closeUi();
  }
  
  $id('modList').addEventListener('click', e => {
    if (e.target.closest('.dl-btn:not(.view-btn)')) return;
    const c = e.target.closest('.mod-card'); if (c) openDetail(c.dataset.id, 'push', c.querySelector('.mod-name'));
  });
  $id('modList').addEventListener('keydown', e => {
    const title = e.target.closest('.mod-name');
    if (title && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const card = title.closest('.mod-card'); if (card) openDetail(card.dataset.id, 'push', title); }
  });
  
  sheet.addEventListener('click', e => {
    const t = e.target;
    if (t === sheet.parentElement || t.closest('.sheet-close')) return closeDetail();
  });

  
  sheet.addEventListener('click', async e => {
    const a = e.target.closest('a.dl-btn'); if (!a || !sb || !curId) return;
    try { const k = 'dl:' + curId; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (err) {}
    try { await sb.rpc('increment_mod_download', { mod_id: curId }); } catch (err) {}
  });

  async function loadModsFromSupabase() {
    if (!sb) { console.warn('HAIDER: Supabase JS failed to load.'); return; }
    try {
      const q = async c => { window.__loadErr = 0; let all = []; for (let a = 0; ; a += 1000) { const r = await sb.from('mods').select(c).eq('published', true).order('created_at', { ascending: false }).range(a, a + 999); if (r.error) return { data: null, error: r.error }; all = all.concat(r.data || []); if (!r.data || r.data.length < 1000) break; } return { data: all, error: null }; };
      let { data, error } = await q('id,slug,name,category,image_url,download_url,description,mc_version,file_size,downloads,featured,created_at,published,images');
      if (error) ({ data, error } = await q('id,slug,name,category,image_url,download_url,description,mc_version,file_size,downloads,featured,created_at,published'));
      if (error) throw error;
      allMods = LOCAL_MODS.concat((data || []).map(m => ({ id:m.id, slug:m.slug || '', name:m.name, category:m.category, image:m.image_url || '', download:m.download_url || '', description:m.description || '', mcVersion:m.mc_version || '', size:m.file_size || '', downloads:m.downloads ?? 0, featured:!!m.featured, createdAt:m.created_at || '', images:Array.isArray(m.images) ? m.images : [] })));
      apply();
    } catch (e) { console.error('HAIDER: failed to load mods from Supabase', e); window.__loadErr = 1; document.documentElement.classList.remove('bb-loading'); apply(); }
  }
  

  ;async function haiderBoot() {
    sb = window.haiderSupabase;
    if (!sb) return;
    try {
      await loadModsFromSupabase();
    } catch (e) { console.error(e); }
  }
  if (window.haiderSupabase) haiderBoot(); else addEventListener('haider-sb-ready', haiderBoot, { once: true });


  { const r = parseHash(); curCat = r.cat; curQ = r.q; curSort = r.sort; curId = r.id; syncUi(); }
  renderMods(allMods);
;

/* ===== [5] HAIDER · مرحلة 2: محرك الأبعاد ===== */
try{
/* HAIDER · مرحلة 2: محرك الأبعاد */
(function(){
  var D={All:{n:'السديم',c:(window.zTh||['#a855f7','#c084fc']),t:'mote'},Addons:{n:'الأوفرورلد',c:['#3ddc84','#c6f25a'],t:'orb'},
    Skins:{n:'النذر',c:['#ff8a2b','#ff3d3d'],t:'ember'},Shaders:{n:'الإند',c:['#c05cff','#ff6bd6'],t:'glyph'},
    Versions:{n:'ديب سليت',c:['#4cc9ff','#a8e6ff'],t:'snow'}};
  var B={mote:{vy:[-.35,-.1],sw:0,al:.6},orb:{vy:[-.7,-.25],sw:.35,al:.95,pulse:1},ember:{vy:[-1.6,-.6],sw:.5,al:1,life:1},
    glyph:{vy:[-.4,-.12],sw:.15,al:.75},snow:{vy:[.3,.8],sw:.4,al:.85}};
  var GL=['ᔑ','ʖ','ᓵ','↸','ᒷ','⎓','⊣','⍑','╎','⋮','ꖌ','ꖎ','ᒲ','リ','ᑑ','∷','ᓭ','ℸ','⚍','⍊','∴','⨅'];
  var root=document.documentElement,cur='',px=innerWidth/2,py=innerHeight/2;
  var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('pointerdown',function(e){px=e.clientX;py=e.clientY},{passive:true,capture:true});

  /* جسيمات */
  var cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1';
  document.body.appendChild(cv);
  var ctx=cv.getContext('2d'),dpr=Math.min(devicePixelRatio||1,1.5),W,H,N=matchMedia('(hover:none)').matches?16:((navigator.hardwareConcurrency||4)<=4?26:44),ps=[],sp=[],bt=B.mote,last=0,on=false;
  function rs(){W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
  rs();addEventListener('resize',rs);
  function mk(w,h,f){var e=document.createElement('canvas');e.width=w*dpr;e.height=h*dpr;var c=e.getContext('2d');c.scale(dpr,dpr);f(c);return{e:e,w:w,h:h}}
  function sprites(d){var o=[],c0=d.c[0],c1=d.c[1],i;
    if(d.t=='orb')[10,14,18].forEach(function(s){o.push(mk(s,s,function(c){var g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
      g.addColorStop(0,'#f6ffc8');g.addColorStop(.45,c1);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,s,s)}))});
    else if(d.t=='glyph')for(i=0;i<10;i++)o.push(mk(16,16,function(c){c.font='14px sans-serif';c.fillStyle=i%2?c0:c1;c.fillText(GL[(Math.random()*GL.length)|0],1,13)}));
    else{var cols=d.t=='ember'?['#ffc15e',c0,c1]:d.t=='snow'?['#fff',c1,'#fff']:[c0,c1,c0],sz=d.t=='ember'?[3,4,5]:[2,3,4];
      for(i=0;i<3;i++)(function(i){o.push(mk(sz[i],sz[i],function(c){c.fillStyle=cols[i];c.fillRect(0,0,sz[i],sz[i])}))})(i)}
    return o}
  function spawn(p,init){var b=bt,dn=b.vy[0]>0;p.x=Math.random()*W;p.y=init?Math.random()*H:(dn?-20:H+20);
    p.vy=b.vy[0]+Math.random()*(b.vy[1]-b.vy[0]);p.vx=(Math.random()-.5)*b.sw;p.ph=Math.random()*6.28;
    p.l=init?Math.random():0;p.dl=.002+Math.random()*.004;p.s=sp[(Math.random()*sp.length)|0]}
  function setP(d){bt=B[d.t];sp=sprites(d);ps=[];for(var i=0;i<N;i++){var p={};spawn(p,true);ps.push(p)}}
  function draw(ts){if(!on)return;var k=Math.min(ts-last,50)/16.7;last=ts;ctx.clearRect(0,0,W,H);var t=ts/1000;
    for(var i=0;i<ps.length;i++){var p=ps[i];p.l+=p.dl*k;p.y+=p.vy*k;p.x+=(p.vx+Math.sin(t+p.ph)*.15)*k;
      if(p.l>=1||p.y<-30||p.y>H+30)spawn(p,false);
      ctx.globalAlpha=bt.al*(bt.life?1-p.l:bt.pulse?.65+.35*Math.sin(t*3+p.ph):Math.sin(Math.PI*p.l));
      ctx.drawImage(p.s.e,p.x,p.y,p.s.w,p.s.h)}
    ctx.globalAlpha=1;requestAnimationFrame(draw)}
  function start(){if(rm||on)return;on=true;last=performance.now();requestAnimationFrame(draw)}

  /* بوابة + إشعار البُعد */

  /* خانة الهوت بار المنزلقة */

  function setDim(cat){if(cat===cur||!D[cat])return;var first=!cur;cur=cat;root.setAttribute('data-dim',cat);
    if(!rm)setP(D[cat]);}
  function sync(){setDim(root.getAttribute('data-cat')||'All')}
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-cat']});
  sync();start();
})();
}catch(err){console.error('[HAIDER] section failed: HAIDER · مرحلة 2: محرك الأبعاد',err)}
;

/* ===== [6] HAIDER · مرحلة 3 ===== */
try{
/* HAIDER · مرحلة 3 */
(function(){
  var root=document.documentElement,L=document.getElementById('modList'),cur=null;
  function done(){root.classList.remove('bb-loading')}
  new MutationObserver(function(){if(L.children.length)done()}).observe(L,{childList:true});
  setTimeout(function(){done();if(!window.haiderSupabase || !window.haiderSupabase.from){var t=document.querySelector('#emptyState .empty-title'),u=document.querySelector('#emptyState .empty-sub');
    window.__loadErr=1;var rbx=document.getElementById('emptyReset');if(rbx)rbx.textContent='إعادة المحاولة';if(t)t.textContent='تعذّر الاتصال بالمتجر';if(u)u.textContent='تحقق من الاتصال بالإنترنت ثم أعد تحميل الصفحة.'}},7000);
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  function rst(c){['--rx','--ry','--mx','--my'].forEach(function(p){c.style.removeProperty(p)})}
  L.addEventListener('pointermove',function(e){
    var c=e.target.closest('.mod-card');if(cur&&cur!==c)rst(cur);
    if(!c||c.classList.contains('k-ver')){cur=null;return}cur=c;
    var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    c.style.setProperty('--ry',((x-.5)*12)+'deg');c.style.setProperty('--rx',((.5-y)*10)+'deg');
    c.style.setProperty('--mx',(x*100)+'%');c.style.setProperty('--my',(y*100)+'%')});
  L.addEventListener('pointerleave',function(){if(cur)rst(cur);cur=null});
})();
}catch(err){console.error('[HAIDER] section failed: HAIDER · مرحلة 3',err)}
;

/* ===== [7] HAIDER · مرحلة 4: صوت مولّد بالكود + كريبر + اختصارات ===== */
try{
/* HAIDER · مرحلة 4: صوت مولّد بالكود + كريبر + اختصارات */
(function(){
  var AC=null,master,NB=null,muted=false,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  muted=true;try{muted=localStorage.getItem('bb-mute')!=='0'}catch(e){}
  function ctx(){if(!AC){var AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;AC=new AudioCtx();master=AC.createGain();master.gain.value=.4;master.connect(AC.destination)}
    if(AC.state==='suspended')AC.resume().catch(function(){});return AC}
  function tone(type,f0,f1,dur,vol,delay){var c=ctx();if(!c||muted)return;var t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02)}
  function noise(dur,type,f0,f1,vol,a,q){var c=ctx();if(!c||muted)return;
    if(!NB){NB=c.createBuffer(1,c.sampleRate*2,c.sampleRate);var d=NB.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    var t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=NB;s.loop=true;f.type=type;f.Q.value=q||1;
    f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*a);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.02)}
  var snd={
    click:function(){tone('square',620,420,.06,.1)},
    back:function(){tone('square',420,280,.07,.1)},
    whoosh:function(){noise(.75,'bandpass',250,2400,.5,.3,2);tone('sine',70,220,.6,.25)},
    xp:function(){var p=900+Math.random()*500;tone('sine',p,p*1.6,.11,.2);tone('sine',p*1.25,p*2,.11,.16,0);setTimeout(function(){tone('sine',p*1.5,p*2.4,.1,.14)},70)},
    hiss:function(){noise(1.1,'highpass',3500,6000,.4,.9,.5)},
    boom:function(){noise(.9,'lowpass',2600,110,.9,.05,.7);tone('sine',90,30,.7,.8)}
  };

  /* زرار الكتم */
  var mb=document.getElementById('muteBtn');
  function paint(){mb.classList.toggle('off',muted);mb.setAttribute('aria-pressed',muted?'true':'false');mb.setAttribute('aria-label',muted?'تشغيل الصوت':'كتم الصوت');
    var u=mb.querySelector('use'),id=muted?'i-spk-off':'i-spk-on';if(u&&document.getElementById(id))u.setAttribute('href','#'+id)}
  mb.addEventListener('click',function(){muted=!muted;try{localStorage.setItem('bb-mute',muted?'1':'0')}catch(e){}paint();if(!muted)snd.click()});
  paint();

  /* ربط الأصوات (window capture) */
  addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
    if(t.closest('a.dl-btn'))return snd.xp();
    if(t.closest('.sheet-close'))return snd.back();
    if(t.closest('.hb,.mod-card,.more-btn,.logo-stage'))snd.click()},true);
  new MutationObserver(function(){snd.whoosh()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-dim']});

  /* لمسات: أيقونة التبويب + اختصارات */
  var ic=document.createElement('link');ic.rel='icon';ic.href=document.querySelector('.brand-mark').src;document.head.appendChild(ic);
  addEventListener('keydown',function(e){
    if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();var i=document.getElementById('searchInput');i.focus();i.scrollIntoView({block:'center',behavior:'smooth'})}
    if(e.key==='Escape'){var c=document.querySelector('#detail:not([hidden]) .sheet-close');if(c)c.click()}});
})();
}catch(err){console.error('[HAIDER] section failed: HAIDER · مرحلة 4: صوت مولّد بالكود + كريبر + اختصارات',err)}
;

/* ===== [8] لوحة الإدارة: الدخول عن طريق  #admin  في آخر رابط الموقع ===== */
try{
/* لوحة الإدارة: الدخول عن طريق  #admin  في آخر رابط الموقع */
(function(){
  /* اكتب إيميل حساب الأدمن هنا مرة واحدة (بين العلامتين) وساعتها هيطلب الباسورد بس */
  var ADMIN_EMAIL='';
  var $=function(i){return document.getElementById(i)};
  if(ADMIN_EMAIL)$('admEmailWrap').hidden=true;
  var ov=$('adminModal'),msg=$('admMsg'),logged=false;
  function say(t,ok){msg.textContent=t||'';msg.className=ok?'ok':'err'}
  function client(){return window.haiderSupabase}
  function view(){$('admLogin').hidden=logged;$('admForm').hidden=!logged;$('admFab').hidden=!logged;decorate()}
  function openM(){ov.hidden=false;say('');view()}
  function closeM(){ov.hidden=true;resetEdit()}
  function init(){var c=client();if(!c)return;
    c.auth.getSession().then(function(r){logged=!!(r.data&&r.data.session);view()})}
  if(client())init();else addEventListener('haider-sb-ready',init,{once:true});
  function checkHash(){if(location.hash==='#admin'){openM();try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}}
  addEventListener('hashchange',checkHash);checkHash();
  $('admFab').addEventListener('click',openM);
  $('admClose').addEventListener('click',closeM);
  ov.addEventListener('click',function(e){if(e.target===ov)closeM()});
  addEventListener('keydown',function(e){if(e.key==='Escape'&&!ov.hidden)closeM()});
  $('admLoginBtn').addEventListener('click',async function(){
    var c=client();if(!c){say('الاتصال لسه مجهزش، جرّب بعد لحظات');return}
    var e=ADMIN_EMAIL||$('admEmail').value.trim(),p=$('admPass').value;
    if(!e||!p){say(ADMIN_EMAIL?'اكتب كلمة المرور':'اكتب الإيميل وكلمة المرور');return}
    say('جاري الدخول...',1);
    try{var r=await c.auth.signInWithPassword({email:e,password:p});if(r.error)throw r.error;
      logged=true;$('admPass').value='';view();say('تم الدخول ✓',1)}
    catch(x){var m=(x&&x.message)||'';
      say(/failed to fetch|network|load failed/i.test(m)?'مش قادر أوصل للعنوان: '+String(window.HAIDER_SUPABASE_URL||'').replace('https://','')+' — قارنه بعنوان مشروعك في Supabase وتأكد إن النت شغال':/Invalid login/i.test(m)?'الباسورد غلط أو مفيش مستخدم بالإيميل ده في Supabase':/not confirmed/i.test(m)?'الإيميل لسه متفعّلش في Supabase':'فشل الدخول: '+m)}
  });
  /* ===== وضع التعديل / الحذف (للأدمن فقط) ===== */
  var editId=null;
  /* قائمة الصور: صورة واحدة أو أكتر، من غير حد ثابت */
  function addImgRow(v){
    var r=document.createElement('div');r.className='adm-imgrow';
    var i=document.createElement('input');i.type='url';i.dir='ltr';i.placeholder='https://...';i.value=v||'';i.setAttribute('aria-label','رابط صورة');
    var x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','حذف الصورة');
    x.addEventListener('click',function(){r.remove();if(!$('admImgList').children.length)addImgRow('')});
    r.appendChild(i);r.appendChild(x);$('admImgList').appendChild(r);return i;
  }
  function setImgs(list){
    $('admImgList').innerHTML='';
    var a=(list||[]).filter(Boolean);if(!a.length)a=[''];
    a.forEach(addImgRow);
  }
  function getImgs(){
    return Array.prototype.map.call($('admImgList').querySelectorAll('input'),function(e){return e.value.trim()}).filter(Boolean);
  }
  $('admAddImg').addEventListener('click',function(){addImgRow('').focus()});
  setImgs([]);
  function resetEdit(){
    editId=null;$('admName').value='';$('admDl').value='';setImgs([]);$('admVer').value='';$('admSize').value='';$('admDesc').value='';
    $('admTitle').textContent='إضافة عنصر جديد';$('admAddBtn').textContent='نشر العنصر';$('admCancelEdit').hidden=true;
  }
  function allList(){return (typeof allMods!=='undefined')?allMods:[]}
  function findMod(id){return allList().find(function(x){return x&&x.id!=null&&String(x.id)===id})}
  function decorate(){
    var L=$('modList');if(!L)return;
    L.querySelectorAll('.mod-card').forEach(function(card){
      var old=card.querySelector('.adm-act');
      if(!logged){if(old)old.remove();return}
      if(old||!findMod(card.dataset.id))return;
      var d=document.createElement('div');d.className='adm-act';
      d.innerHTML='<button type="button" data-act="edit" aria-label="تعديل">✎</button><button type="button" data-act="del" aria-label="حذف">🗑</button>';
      card.appendChild(d);
    });
  }
  if($('modList'))new MutationObserver(decorate).observe($('modList'),{childList:true});
  /* capture: عشان الضغط على الأزرار ما يفتحش تفاصيل الكارت */
  $('modList').addEventListener('click',async function(e){
    var btn=e.target.closest('.adm-act button');if(!btn)return;
    e.preventDefault();e.stopPropagation();
    var card=btn.closest('.mod-card'),m=card&&findMod(card.dataset.id),c=client();
    if(!m||!c||!logged)return;
    if(btn.dataset.act==='edit'){
      openM();
      editId=String(m.id);
      $('admCat').value=m.category||'Addons';$('admName').value=m.name||'';
      $('admDl').value=m.download||'';setImgs(Array.from(new Set([m.image].concat(m.images||[]))));$('admVer').value=m.mcVersion||'';$('admSize').value=m.size||'';$('admDesc').value=m.description||'';
      $('admTitle').textContent='تعديل العنصر';$('admAddBtn').textContent='حفظ التعديلات';$('admCancelEdit').hidden=false;
    }else if(btn.dataset.act==='del'){
      if(!confirm('متأكد إنك عايز تحذف "'+(m.name||'')+'" نهائيًا؟'))return;
      btn.disabled=true;
      try{
        var r=await c.from('mods').delete().eq('id',m.id).select('id');
        if(r.error)throw r.error;
        if(!r.data||!r.data.length)throw new Error('مفيش صلاحية للحذف — راجع سياسات Supabase (RLS)');
        if(typeof loadModsFromSupabase==='function')loadModsFromSupabase();
      }catch(x){btn.disabled=false;alert('فشل الحذف: '+((x&&x.message)||'خطأ غير معروف'))}
    }
  },true);
  $('admCancelEdit').addEventListener('click',function(){resetEdit();say('')});
  $('admAddBtn').addEventListener('click',async function(){
    var c=client(),b=this;if(!c)return;
    var name=$('admName').value.trim(),cat=$('admCat').value,dl=$('admDl').value.trim(),ver=$('admVer').value.trim(),size=$('admSize').value.trim(),desc=$('admDesc').value.trim(),all=getImgs(),img=all[0]||'',imgs=all.slice(1);
    if(!name&&!dl&&!desc&&!ver&&!size&&!all.length){say('املأ أي خانة على الأقل');return}
    if((dl&&!/^https?:\/\//i.test(dl))||(img&&!/^https?:\/\//i.test(img))||imgs.some(function(u){return !/^https?:\/\//i.test(u)})){say('الروابط لازم تبدأ بـ https://');return}
    var editing=!!editId;
    b.disabled=true;say(editing?'جاري الحفظ...':'جاري النشر...',1);
    try{
      var fields={name:name,category:cat,image_url:img||null,download_url:dl||'',description:desc||null,mc_version:ver||null,file_size:size||null,images:imgs},r;
      if(editing){
        r=await c.from('mods').update(fields).eq('id',editId).select('id');
        if(r.error)throw r.error;
        if(!r.data||!r.data.length)throw new Error('مفيش صلاحية للتعديل — راجع سياسات Supabase (RLS)');
      }else{
        r=await c.from('mods').insert(Object.assign({published:true},fields));
        if(r.error)throw r.error;
      }
      resetEdit();
      say(editing?'تم حفظ التعديلات ✓':'تمت الإضافة ✓ وظهرت في القسم',1);
      if(typeof loadModsFromSupabase==='function')loadModsFromSupabase();
    }catch(x){say((editing?'فشل الحفظ: ':'فشل النشر: ')+((x&&x.message)||'خطأ غير معروف'))}
    finally{b.disabled=false}
  });
  $('admLogout').addEventListener('click',async function(){
    var c=client();if(c){try{await c.auth.signOut()}catch(e){}}
    logged=false;view();closeM();
  });
})();
}catch(err){console.error('[HAIDER] section failed: لوحة الإدارة: الدخول عن طريق  #admin  في آخر رابط الموقع',err)}
;

/* ===== [9] section-9 ===== */
;

/* ===== [10] HAIDER · PORTAL — فتح البوابة + شريط XP + لمعة الندرة + انفج ===== */
try{
/* HAIDER · PORTAL — فتح البوابة + شريط XP + لمعة الندرة + انفجار التحميل */
(function(){
var d=document,B=d.body,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(t,c){var e=d.createElement(t);if(c)e.className=c;return e}
var xp=$('div');xp.id='zxp';xp.appendChild($('i'));B.appendChild(xp);var f=xp.firstChild,tk=0;
function sc(){tk=0;var h=d.documentElement.scrollHeight-innerHeight;f.style.transform='scaleX('+(h>0?Math.min(scrollY/h,1):0)+')'}
addEventListener('scroll',function(){if(!tk)tk=requestAnimationFrame(sc)},{passive:true});addEventListener('resize',sc);sc();
var L=d.getElementById('modList');
function ft(e){if(e.pointerType==='mouse')return;var c=e.target.closest('.mod-card');if(!c)return;var r=c.getBoundingClientRect();
  c.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');c.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
  c.classList.add('tch');clearTimeout(c._t);c._t=setTimeout(function(){c.classList.remove('tch')},800)}
if(L){L.addEventListener('pointerdown',ft,{passive:true});L.addEventListener('pointermove',ft,{passive:true})}
d.addEventListener('click',function(e){
  var a=e.target.closest('.dl-btn:not(.is-off):not(.view-btn)');if(!a||rm)return;
  var r=a.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,
  cs=(getComputedStyle(d.documentElement).getPropertyValue('--accent')||'').trim()||'#8b5cf6';
  for(var i=0;i<15;i++){(function(){
    var q=$('div','zk'),o=i>9,s=o?9:5+Math.random()*5,an=-Math.PI*(.12+Math.random()*.76),v=70+Math.random()*120;
    q.style.cssText='left:'+x+'px;top:'+y+'px;width:'+s+'px;height:'+s+'px;background:'+(o?'#e9d5ff':cs);if(o)q.classList.add('xo');B.appendChild(q);
    q.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate('+Math.cos(an)*v+'px,'+(Math.sin(an)*v+(o?-60:50))+'px) rotate('+(Math.random()*360)+'deg)',opacity:0}],
      {duration:o?900:650,easing:'cubic-bezier(.2,.7,.4,1)'}).onfinish=function(){q.remove()}})()}
  a.classList.add('mine');setTimeout(function(){a.classList.remove('mine')},400)
},true);
/* دفعة 2 */
var lx=innerWidth/2,ly=innerHeight/2,AC=null;
addEventListener('pointerdown',function(e){lx=e.clientX;ly=e.clientY},{capture:true,passive:true});
function au(){var mu=1;try{mu=localStorage.getItem('bb-mute')!=='0'}catch(e){}if(mu)return null;
  if(!AC){var AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;AC=new AudioCtx()}
  if(AC.state==='suspended')AC.resume().catch(function(){});return AC}
function tone(c,ty,f0,f1,t0,du,v){var o=c.createOscillator(),g=c.createGain(),t=c.currentTime+t0;o.type=ty;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+du);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+du);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+du+.05)}
function zxp(){var c=au();if(!c)return;tone(c,'sine',700,1400,0,.12,.12);tone(c,'sine',900,1800,.09,.14,.1);tone(c,'triangle',1200,2400,.2,.2,.06)}
d.addEventListener('click',function(e){if(e.target.closest('.dl-btn:not(.is-off):not(.view-btn)'))zxp()},true);
var R=d.documentElement,dim=R.getAttribute('data-dim');

if('IntersectionObserver' in window&&L){
  var io=new IntersectionObserver(function(es){es.forEach(function(en){en.target.classList.toggle('vis',en.isIntersecting)})},{rootMargin:'40px'});
  function sk(){L.querySelectorAll('.k-skin:not(.zs)').forEach(function(c){c.classList.add('zs');var t=c.querySelector('.mod-thumb');if(t)t.appendChild($('i','zped'));io.observe(c)})}
  new MutationObserver(sk).observe(L,{childList:true});sk()}
var TH=['end','nether','emerald'],TC={end:['#a855f7','#c084fc'],nether:['#7c3aed','#c084fc'],emerald:['#a855f7','#d8b4fe']},ct='end';
try{ct=localStorage.getItem('zth')||'end'}catch(e){}if(!TC[ct])ct='end';
var hi=d.querySelector('.header-inner');
if(hi){var tb=$('button','hdr-btn'),sw=$('i');tb.id='thBtn';tb.type='button';tb.setAttribute('aria-label','تغيير الثيم');tb.setAttribute('data-tip','تغيير الثيم');
  sw.style.background='linear-gradient(135deg,'+TC[ct][0]+','+TC[ct][1]+')';sw.style.boxShadow='0 0 10px '+TC[ct][0];tb.appendChild(sw);hi.appendChild(tb);
  tb.addEventListener('click',function(){var n=TH[(TH.indexOf(ct)+1)%3];try{localStorage.setItem('zth',n)}catch(e){}
    ct=n;if(n==='end')R.removeAttribute('data-th');else R.setAttribute('data-th',n);window.zTh=TC[n];sw.style.background='linear-gradient(135deg,'+TC[n][0]+','+TC[n][1]+')';sw.style.boxShadow='0 0 10px '+TC[n][0]})}
function zbg(){var n=0;L.querySelectorAll('.mod-card.is-new:not(.is-top):not(.k-ver)').forEach(function(c){c.classList.toggle('zbig',n++<2)})}
if(L){new MutationObserver(zbg).observe(L,{childList:true});zbg()}
/* مرحلة 3: الصورة تطير من الكارت لشاشة التفاصيل */
var DT=d.getElementById('detail'),zf=null;
d.addEventListener('click',function(e){var c=e.target.closest('.mod-card');if(!c||e.target.closest('.dl-btn:not(.view-btn),.adm-act'))return;
  var t=c.querySelector('.mod-thumb img');zf=t?{r:t.getBoundingClientRect(),s:t.currentSrc||t.src,t:Date.now()}:null},true);
if(DT)new MutationObserver(function(){
  var sh=DT.querySelector('.sheet');if(!sh)return;
  if(DT.hidden){sh.style.animation='';return}
  var from=zf;zf=null;
  if(!rm)DT.querySelectorAll('.tt-cat,.tt-row,.tt-tags,.tt-how,.d-desc,.d-dl').forEach(function(e,i){
    e.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:140+i*38,easing:'ease-out',fill:'backwards'})});
  var im=DT.querySelector('.tt-img img');
  if(rm||!from||!from.s||Date.now()-from.t>900||!im)return;
  sh.style.animation='none';sh.animate([{opacity:0},{opacity:1}],{duration:220});
  im.style.visibility='hidden';var done=0;
  function fly(){if(done)return;done=1;var to=im.getBoundingClientRect();
    if(to.width<8||!d.contains(im)){im.style.visibility='';return}
    var g=$('img','zghost');g.alt='';g.src=from.s;
    g.style.cssText='left:'+to.left+'px;top:'+to.top+'px;width:'+to.width+'px;height:'+to.height+'px';B.appendChild(g);
    g.animate([{left:from.r.left+'px',top:from.r.top+'px',width:from.r.width+'px',height:from.r.height+'px',objectFit:'cover'},
      {left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px',objectFit:'contain'}],
      {duration:460,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=function(){im.style.visibility='';g.remove()}}
  if(im.complete&&im.naturalWidth)fly();else{im.addEventListener('load',fly,{once:true});setTimeout(fly,500)}
}).observe(DT,{attributes:true,attributeFilter:['hidden']});
/* مرحلة 4: ليفل أب عند آخر الصفحة + بيضة الألماس */
function zlv(){var c=au();if(!c)return;[523,659,784,1047,1319].forEach(function(f,i){tone(c,'triangle',f,f*1.004,i*.085,.2,.09)})}
var lvd=0;addEventListener('scroll',function(){var h=d.documentElement.scrollHeight-innerHeight,p=h>0?scrollY/h:0;
  if(p>.985&&!lvd&&h>innerHeight){lvd=1;zlv()}else if(p<.9)lvd=0},{passive:true});
var si=d.getElementById('searchInput'),rn=0;
if(si)si.addEventListener('input',function(){var v=si.value.trim().toLowerCase();
  if(rn||rm||(v!=='diamond'&&v!=='الماس'&&v!=='ألماس'))return;rn=1;zlv();
  for(var i=0;i<30;i++){(function(){var q=$('div','zd'),s=14+Math.random()*16;
    q.style.cssText='left:'+Math.random()*100+'vw;top:0;width:'+s+'px;height:'+s+'px';B.appendChild(q);
    q.animate([{transform:'translateY(-40px) rotate(45deg)',opacity:1},{transform:'translateY('+(innerHeight+60)+'px) rotate('+(45+Math.random()*360)+'deg)',opacity:.9}],
      {duration:1500+Math.random()*1300,delay:Math.random()*900,easing:'cubic-bezier(.3,0,.7,1)',fill:'backwards'}).onfinish=function(){q.remove()}})()}
  setTimeout(function(){rn=0},3300)});
})();
}catch(err){console.error('[HAIDER] section failed: HAIDER · PORTAL — فتح البوابة + شريط XP + لمعة الندرة + انفج',err)}
;

/* ===== [11] Header nav ===== */
/* Header nav */
document.addEventListener('click',function(e){
  var a=e.target.closest('.hnav a');if(!a)return;e.preventDefault();
  var c=a.getAttribute('data-nav');
  if(typeof filterMods==='function')filterMods(c,null);
  if(c==='All')window.scrollTo({top:0,behavior:'smooth'});
  else{var z=document.querySelector('.search-zone');if(z)z.scrollIntoView({behavior:'smooth'});}
  document.querySelectorAll('.hnav a').forEach(function(x){x.classList.toggle('active',x===a)});
});
;

/* ===== [12] section-12 ===== */
try{
(function(){if(/^https?:/.test(location.protocol)&&!document.querySelector('link[rel=canonical]')){var l=document.createElement('link');l.rel='canonical';l.href=location.origin+location.pathname;document.head.appendChild(l)}
var P=document.getElementById('sheetPanel');if(!P)return;
P.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var f=P.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');if(!f.length)return;var a=f[0],z=f[f.length-1];
if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}})})();
}catch(err){console.error('[HAIDER] section failed: section-12',err)}
;

/* ===== [13] معرض الصور: تبديل بالأسهم / الصور المصغرة / لوحة المفاتيح / ===== */
/* معرض الصور: تبديل بالأسهم / الصور المصغرة / لوحة المفاتيح / السحب */
function hdrGal(el,step,root){
  var dp=(root||el.closest('.dp'));if(!dp)return;
  var th=[].slice.call(dp.querySelectorAll('.tt-th img'));
  var main=dp.querySelector('.tt-img img');if(!main||!th.length)return;
  var cur=th.findIndex(function(t){return t.classList.contains('on')});
  if(cur<0)cur=Math.max(0,th.findIndex(function(t){return t.src===main.src}));
  var idx=step===0?th.indexOf(el):(cur+step+th.length)%th.length;
  if(idx<0)return;
  th.forEach(function(t,k){t.classList.toggle('on',k===idx)});
  main.src=th[idx].src;
  try{th[idx].scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})}catch(e){}
}
document.addEventListener('keydown',function(e){
  var d=document.getElementById('detail');if(!d||d.hidden)return;
  var dp=d.querySelector('.dp');if(!dp)return;
  if(e.key==='ArrowLeft')hdrGal(null,1,dp);
  else if(e.key==='ArrowRight')hdrGal(null,-1,dp);
});
(function(){
  var x0=null;
  document.addEventListener('touchstart',function(e){var t=e.target.closest&&e.target.closest('#detail .tt-img');x0=t?e.touches[0].clientX:null},{passive:true});
  document.addEventListener('touchend',function(e){
    if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;
    if(Math.abs(dx)<50)return;
    var dp=document.querySelector('#detail .dp');if(dp)hdrGal(null,dx<0?1:-1,dp);
  },{passive:true});
})();
;

/* ===== [14] QA: back-to-top button (was static + had no handler) ===== */
try{
/* QA: back-to-top button (was static + had no handler) */
(function(){var b=document.getElementById('toTop');if(!b)return;var t=0;
function u(){t=0;b.classList.toggle('show',scrollY>600)}
addEventListener('scroll',function(){if(!t)t=requestAnimationFrame(u)},{passive:true});
b.addEventListener('click',function(){var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;scrollTo({top:0,behavior:rm?'auto':'smooth'})});u()})();
}catch(err){console.error('[HAIDER] section failed: QA: back-to-top button (was static + had no handler)',err)}
;

/* ===== [15] section-15 ===== */
try{
(function(){
  var $=function(i){return document.getElementById(i)};
  var inp=$('searchInput'),clr=$('searchClear');
  if(inp&&clr){
    var sync=function(){clr.hidden=!inp.value};
    inp.addEventListener('input',sync);
    clr.addEventListener('click',function(){inp.value='';sync();inp.dispatchEvent(new Event('input',{bubbles:true}));inp.focus()});
    inp.addEventListener('keydown',function(e){if(e.key==='Escape'&&inp.value){e.preventDefault();clr.click()}});
    document.addEventListener('keydown',function(e){
      var t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
      if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();inp.focus();inp.select()}
    });
  }
  var es=$('emptyState'),rb=$('emptyReset'),et=$('emptyTitle'),esub=$('emptySub');
  function emptyMode(){
    if(!rb||!et||!esub)return;
    if(window.__loadErr){et.textContent='تعذّر تحميل العناصر';esub.textContent='تحقق من اتصالك بالإنترنت ثم أعد المحاولة.';rb.textContent='إعادة المحاولة'}
  }
  if(es){new MutationObserver(emptyMode).observe(es,{attributes:true,attributeFilter:['hidden']});emptyMode()}
  if(rb)rb.addEventListener('click',function(){
    if(window.__loadErr){location.reload();return}
    if(typeof resetFilters==='function')resetFilters();else if(typeof filterMods==='function')filterMods('All',null);
    if(inp){inp.value='';if(clr)clr.hidden=true}
  });
  var hd=document.querySelector('header');
  if(hd){var tick=function(){hd.classList.toggle('is-scrolled',window.scrollY>8)};addEventListener('scroll',tick,{passive:true});tick()}
})();
}catch(err){console.error('[HAIDER] section failed: section-15',err)}
;

/* ===== delegated handlers — بديل onclick المضمّن (يسمح بإزالة 'unsafe-inline' من script-src) ===== */
(function(){
  document.addEventListener('click',function(e){
    var g=e.target.closest&&e.target.closest('[data-gal]');
    if(!g)return;
    var step=+g.getAttribute('data-gal');
    if(step!==0)e.stopPropagation();
    hdrGal(g,step);
  },true);
})();
