import { readFile, writeFile } from 'node:fs/promises';

const OUT = process.env.OUT || './marketplace.json';
const TITLE_ID = '20CA2';
const PF = `https://${TITLE_ID.toLowerCase()}.playfabapi.com`;
const MAX_ITEMS = 1000; // حد أقصى 1000 عنصر لنقاء وسرعة الملف
const AKEY = process.env.ANTHROPIC_API_KEY;

const readJson = async (p, d) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return d; } };

const post = async (path, body, headers = {}) => {
  const r = await fetch(PF + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j.data;
};

const pick = (o) => (o && (o.NEUTRAL || o['en-US'] || Object.values(o)[0])) || '';
const catOf = (t) => (/skin|persona/i.test(t || '') ? 'Skins' : 'Addons');
const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const vkey = (v) => v.split('.').map(Number).reduce((a, n) => a * 1000 + (n || 0), 0);

async function sizeOf(it) {
  try {
    const url = (it.Contents || []).find((c) => c.Url)?.Url;
    if (!url) return '';
    const r = await fetch(url, { method: 'HEAD' });
    const n = +r.headers.get('content-length');
    return r.ok && n > 0 ? fmtSize(n) : '';
  } catch { return ''; }
}
function mcVersionOf(it) {
  const v = (it.Contents || []).map((c) => c.MinClientVersion).filter(Boolean).sort((a, b) => vkey(b) - vkey(a))[0];
  return v ? v + '+' : '';
}
async function toArabic(text) {
  if (!AKEY || !text || /[\u0600-\u06FF]/.test(text)) return text || '';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': AKEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5', max_tokens: 1000,
        system: 'ترجم وصف إضافة ماينكرافت التالي إلى العربية الفصحى المبسطة بأسلوب طبيعي. أبقِ أسماء الشخصيات والعناصر والأوامر كما هي. أرجع الترجمة فقط بدون أي مقدمة.',
        messages: [{ role: 'user', content: text }],
      }),
    });
    const j = await r.json();
    return j.content?.[0]?.text?.trim() || text;
  } catch { return text; }
}
async function pool(arr, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < arr.length) await fn(arr[i++]); }));
}

async function getEntityToken() {
  const attempts = [
    { path: '/Client/LoginWithAndroidDeviceID', body: { TitleId: TITLE_ID, AndroidDeviceId: '8a9f0e1d2c3b4a5e', CreateAccount: true, OS: 'Android' } },
    { path: '/Client/LoginWithIOSDeviceID', body: { TitleId: TITLE_ID, DeviceId: '8A9F0E1D-2C3B-4A5E-9012-3456789ABCDE', CreateAccount: true, OS: 'iOS' } }
  ];
  for (const att of attempts) {
    try {
      const res = await post(att.path, att.body);
      if (res?.EntityToken?.EntityToken) return res.EntityToken.EntityToken;
    } catch (e) {
      console.log(`تخطي المحاولة ${att.path}...`);
    }
  }
  throw new Error('فشل الحصول على رمز الوصول من PlayFab');
}

const entityToken = await getEntityToken();

const items = [];
let token;
do {
  const data = await post('/Catalog/SearchItems', { Count: 100, OrderBy: 'creationDate DESC', ContinuationToken: token }, { 'X-EntityToken': entityToken });
  items.push(...(data.Items || []));
  token = data.ContinuationToken;
} while (token && items.length < MAX_ITEMS);

const old = await readJson(OUT, []);
const oldById = new Map(old.map((m) => [m.id, m]));
const block = new Set(await readJson('./blocklist.json', []));

// فلاتر تنقية المحتوى الحقيقي فقط
const VALID_TYPES = /world|addon|skinpack|texturepack|persona|bundle/i;
const IGNORE_TITLE = /default image|placeholder|followed creators|studio/i;

const fresh = [];
const result = [];
for (const it of items) {
  const id = 'mp-' + String(it.Id).toLowerCase();
  const title = pick(it.Title) || '';
  const contentType = it.ContentType || '';

  // فلترة الملفات العشوائية
  if (!VALID_TYPES.test(contentType)) continue;
  if (IGNORE_TITLE.test(title)) continue;
  if (block.has(it.Id) || block.has(id)) continue;

  if (oldById.has(id)) { result.push(oldById.get(id)); continue; }
  
  const imgs = (it.Images || []).map((i) => i.Url).filter(Boolean);
  const thumb = (it.Images || []).find((i) => /thumbnail/i.test(i.Tag || ''))?.Url || imgs[0] || '';
  if (!thumb) continue;

  const m = {
    id, slug: id,
    name: title || 'بدون اسم',
    category: catOf(contentType),
    image: thumb,
    images: imgs.slice(0, 8),
    description: pick(it.Description),
    mcVersion: mcVersionOf(it),
    size: '',
    createdAt: it.CreationDate || '',
    download: '',
  };
  fresh.push([m, it]);
  result.push(m);
}

await pool(fresh, 5, async ([m, it]) => {
  m.description = await toArabic(m.description);
  m.size = await sizeOf(it);
});

await writeFile(OUT, JSON.stringify(result));
console.log(`done: ${fresh.length} new / ${result.length} total -> ${OUT}`);
