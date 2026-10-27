#!/usr/bin/env node
/* يولّد صفحة ثابتة لكل عنصر + صفحات التصنيفات + sitemap.xml + robots.txt + og-image.jpg، ويحدّث index.html.
   التشغيل (Node 18+):  SITE_URL=https://دومينك.com node build-pages.mjs
   ملاحظة: شغّله تاني كل ما تضيف/تعدّل عناصر. اختياري: --dir مجلد_الموقع  --input mods.json (للتجربة بدون نت) */
import fs from 'node:fs'; import path from 'node:path';
const A = process.argv.slice(2), arg = k => { const i = A.indexOf('--' + k); return i > -1 ? A[i + 1] : ''; };
const SITE = (arg('site') || process.env.SITE_URL || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+/.test(SITE)) { console.error('حدد الدومين:  SITE_URL=https://example.com node build-pages.mjs'); process.exit(1); }
const DIR = arg('dir') || '.', BASE = new URL(SITE).pathname.replace(/\/+$/, ''), ROOT = SITE + '/';
const idx = path.join(DIR, 'index.html'); let html = fs.readFileSync(idx, 'utf8');
const SB = html.match(/HAIDER_SUPABASE_URL = '([^']+)'/)[1], KEY = html.match(/HAIDER_SUPABASE_KEY = '([^']+)'/)[1];
const FONT = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap';
const CAT = { Addons: ['مودات', 'addons', 'مودات ماينكرافت بيدروك'], Shaders: ['الشادرات', 'shaders', 'شادرات ماينكرافت بيدروك'], Skins: ['السكنات', 'skins', 'سكنات ماينكرافت بيدروك'], Versions: ['إصدارات ماينكرافت', 'versions', 'إصدارات ماينكرافت بيدروك'] };
const HOW = { Addons: ['افتح الملف باستخدام لعبة ماينكرافت.', 'انتظر رسالة تأكيد الاستيراد.', 'افتح إعدادات العالم وفعّل الحزمة.'], Skins: ['افتح الملف وثبّته من إعدادات الشخصية.'], Shaders: ['افتح الملف باللعبة ثم فعّل الحزمة من الموارد (قد تتطلب جهازًا قويًا).'], Versions: ['ثبّت التطبيق ووافق على التثبيت الخارجي.'] };
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const J = v => JSON.stringify(v).replace(/</g, '\\u003c');
const ok = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
function mkSlug(n, i) { const b = String(n).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, ''); return (b || 'item') + '-' + String(i).replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase(); }
async function load() {
  if (arg('input')) return JSON.parse(fs.readFileSync(arg('input'), 'utf8'));
  let all = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${SB}/rest/v1/mods?select=*&published=eq.true&order=created_at.desc&limit=1000&offset=${o}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!r.ok) throw new Error('Supabase ' + r.status); const d = await r.json(); all = all.concat(d); if (d.length < 1000) break;
  }
  return all;
}
const CSS = `:root{--ink:#f3f1fb;--dim:#aaa7c2;--ac:#a855f7;--ac2:#c084fc}*{box-sizing:border-box;margin:0}body{background:#050308;color:var(--ink);font:16px/1.8 Cairo,system-ui,sans-serif;padding:0 16px 40px}a{color:inherit;text-decoration:none}.w{max-width:860px;margin:0 auto}header{padding:16px 0;display:flex;justify-content:space-between;border-bottom:1px solid #ffffff17}header b{color:var(--ac2);font-size:20px}nav.bc{color:var(--dim);font-size:14px;margin:16px 0}h1{font-size:28px;line-height:1.4;margin:8px 0 16px}h2{font-size:18px;color:var(--ac2);margin:24px 0 8px}img.hero{width:100%;max-height:420px;object-fit:contain;border-radius:14px;background:#ffffff0d}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:16px 0}dl div{background:#ffffff0d;border-radius:10px;padding:8px 12px}dt{color:var(--dim);font-size:13px}dd{direction:ltr;text-align:right}ol{padding-inline-start:22px}.btn{display:inline-block;background:var(--ac);color:#08060b;font-weight:800;padding:12px 28px;border-radius:12px;margin:20px 0;min-height:44px}.btn.off{background:#ffffff14;color:var(--dim)}a:focus-visible{outline:2px solid var(--ac2);outline-offset:3px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.c{background:#ffffff0d;border-radius:12px;overflow:hidden}.c img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.c span{display:block;padding:10px 12px;font-weight:700}small{color:var(--dim)}footer{margin-top:32px}`;
const page = ({ title, desc, url, img, body, ld }) => `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(desc)}"><link rel="canonical" href="${url}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#050308"><meta property="og:type" content="website"><meta property="og:locale" content="ar_AR"><meta property="og:site_name" content="HAIDER"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${e(img)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${SITE}/og-image.jpg"><link rel="stylesheet" href="${FONT}" media="print" onload="this.media='all'"><style>${CSS}</style><script type="application/ld+json">${J(ld)}</script></head>
<body><div class="w"><header><a href="${BASE}/"><b>HAIDER</b></a><a href="${BASE}/">كل الإضافات</a></header>${body}<footer><small>HAIDER غير مرتبط رسميًا بشركة Mojang أو Microsoft — جميع الإضافات من مصادر خارجية.</small></footer></div></body></html>`;
const urlOf = m => `${SITE}${BASE}/m/${encodeURIComponent(m.slug)}.html`;
const card = m => `<a class="c" href="${BASE}/m/${encodeURIComponent(m.slug)}.html">${m.img ? `<img src="${e(m.img)}" alt="${e(m.name)}" loading="lazy" width="320" height="180">` : ''}<span>${e(m.name)}</span></a>`;
function modPage(m, rel) {
  const c = CAT[m.cat] || [m.cat, '', m.cat], url = urlOf(m);
  const desc = (m.desc || `تحميل مباشر ${m.name} لماينكرافت بيدروك إيديشن.`).replace(/\s+/g, ' ').slice(0, 155);
  const facts = [['إصدار اللعبة', m.ver], ['الحجم', m.size], ['التحميلات', m.dls > 0 ? m.dls.toLocaleString('en') : ''], ['أُضيف في', m.at ? new Date(m.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '']].filter(f => f[1]);
  const body = `<nav class="bc" aria-label="المسار"><a href="${BASE}/">الرئيسية</a> › <a href="${BASE}/c/${c[1]}.html">${e(c[0])}</a></nav><article><h1>${e(m.name)}</h1>${m.img ? `<img class="hero" src="${e(m.img)}" alt="${e(m.name)}" width="860" height="420">` : ''}${facts.length ? `<dl>${facts.map(f => `<div><dt>${f[0]}</dt><dd>${e(f[1])}</dd></div>`).join('')}</dl>` : ''}${m.desc ? `<h2>الوصف</h2><p>${e(m.desc)}</p>` : ''}<h2>متطلبات التشغيل</h2><p>لعبة Minecraft Bedrock Edition${m.ver ? ` — إصدار مسجّل: <span dir="ltr">${e(m.ver)}</span>` : ''}</p>${HOW[m.cat] ? `<h2>طريقة التثبيت</h2><ol>${HOW[m.cat].map(t => `<li>${e(t)}</li>`).join('')}</ol>` : ''}${m.dl ? `<a class="btn" id="dl" href="${e(m.dl)}" target="_blank" rel="noopener noreferrer nofollow">تحميل${m.size ? ' · ' + e(m.size) : ''}</a>` : `<span class="btn off">الرابط غير متاح حاليًا</span>`}${rel.length ? `<h2>محتوى ذو صلة</h2><div class="g">${rel.map(card).join('')}</div>` : ''}</article>
<script>document.getElementById('dl')&&document.getElementById('dl').addEventListener('click',function(){try{var k='dl:'+${J(m.id)};if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1');fetch(${J(SB)}+'/rest/v1/rpc/increment_mod_download',{method:'POST',keepalive:true,headers:{apikey:${J(KEY)},Authorization:'Bearer '+${J(KEY)},'Content-Type':'application/json'},body:JSON.stringify({mod_id:${J(m.id)}})})}catch(e){}})</script>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: m.name, description: desc, url, inLanguage: 'ar', image: m.img || undefined, genre: c[0], dateModified: m.at || undefined, isPartOf: { '@type': 'WebSite', name: 'HAIDER', url: ROOT } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: ROOT }, { '@type': 'ListItem', position: 2, name: c[0], item: `${SITE}${BASE}/c/${c[1]}.html` }, { '@type': 'ListItem', position: 3, name: m.name, item: url }] }];
  return page({ title: `${m.name} — تحميل ${c[0]} ماينكرافت بيدروك | HAIDER`, desc, url, img: m.img || `${SITE}/og-image.jpg`, body, ld });
}
const rows = (await load()).map(r => { const name = String(r.name || '').trim() || 'بدون اسم'; return { id: String(r.id), slug: String(r.slug || mkSlug(name, r.id)), name, cat: r.category, img: ok(r.image_url), dl: ok(r.download_url), desc: String(r.description || '').trim(), ver: r.mc_version || '', size: r.file_size || '', dls: +r.downloads || 0, at: r.created_at || '' }; });
const seen = new Set(); rows.forEach(m => { if (seen.has(m.slug)) console.warn('تحذير: slug مكرر:', m.slug); seen.add(m.slug); });
const mdir = path.join(DIR, 'm'), cdir = path.join(DIR, 'c'); fs.mkdirSync(mdir, { recursive: true }); fs.mkdirSync(cdir, { recursive: true });
fs.readdirSync(mdir).filter(f => f.endsWith('.html')).forEach(f => fs.unlinkSync(path.join(mdir, f)));
for (const m of rows) fs.writeFileSync(path.join(mdir, m.slug.replace(/[\/\\?#%]/g, '-') + '.html'), modPage(m, rows.filter(x => x.cat === m.cat && x.id !== m.id).slice(0, 4)));
const urls = [[ROOT, '']];
for (const [k, c] of Object.entries(CAT)) {
  const items = rows.filter(m => m.cat === k), url = `${SITE}${BASE}/c/${c[1]}.html`; urls.push([url, '']);
  const desc = `تحميل مباشر ${c[2]} محدّثة باستمرار — ${items.length} عنصر.`;
  fs.writeFileSync(path.join(cdir, c[1] + '.html'), page({ title: `${c[2]} — تحميل مباشر | HAIDER`, desc, url, img: `${SITE}/og-image.jpg`, body: `<nav class="bc"><a href="${BASE}/">الرئيسية</a></nav><h1>${e(c[2])}</h1><div class="g">${items.map(card).join('')}</div>`, ld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: c[2], url, inLanguage: 'ar' } }));
}
rows.forEach(m => urls.push([urlOf(m), m.at ? m.at.slice(0, 10) : '']));
fs.writeFileSync(path.join(DIR, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `<url><loc>${e(u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const b64 = html.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/); if (b64) fs.writeFileSync(path.join(DIR, 'og-image.jpg'), Buffer.from(b64[1], 'base64'));
html = html.replace(/const PAGES = '[^']*';/, `const PAGES = '${BASE}/m/';`);
const seo = `<!--seo:start--><link rel="canonical" href="${ROOT}"><meta property="og:url" content="${ROOT}"><meta property="og:image" content="${SITE}/og-image.jpg"><link rel="apple-touch-icon" href="${SITE}/og-image.jpg"><script type="application/ld+json">${J({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'HAIDER', url: ROOT, inLanguage: 'ar' })}</script><!--seo:end-->`;
if (!html.includes('<!--seo:start-->')) console.warn('تحذير: علامات seo مش موجودة في index.html'); else html = html.replace(/<!--seo:start-->.*?<!--seo:end-->/s, () => seo);
fs.writeFileSync(idx, html);
console.log(`تم: ${rows.length} صفحة عنصر + 4 صفحات تصنيف + sitemap.xml + robots.txt`);
