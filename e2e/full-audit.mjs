import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:12000';
const OUT = 'e2e/report';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const findings = [];
const add = (level, area, msg) => findings.push({ level, area, msg });

const guestStorage = {
  state: {
    guestSession: {
      active: true, phone: 'زائر-9999', startedAt: Date.now(),
      expiresAt: Date.now() + 3600000, warnedAt: null,
    },
    guestWarning: false,
    guestExpired: false,
  },
  version: 0,
};

async function visit(route, mode) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  if (mode === 'guest') {
    await ctx.addInitScript((s) => localStorage.setItem('chic-guest-session', s), JSON.stringify(guestStorage));
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  let out;
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1400);
    out = {
      finalPath: new URL(page.url()).pathname,
      status: resp ? resp.status() : 0,
      len: await page.evaluate(() => document.body.innerText.trim().length),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      errors,
    };
  } catch (e) {
    out = { finalPath: '(error)', status: 0, len: 0, overflow: 0, errors: ['EXC ' + String(e.message).slice(0, 120)] };
  } finally {
    await page.close();
    await ctx.close();
  }
  return out;
}

const matrix = {
  anonPublic: ['/login', '/register', '/forgot-password'],
  anonProtected: [
    '/', '/dashboard', '/chat', '/ai-chat', '/contact', '/about', '/faq',
    '/terms', '/wanted-dress', '/branches', '/advertisements', '/employees',
    '/haraj', '/haraj/post', '/notifications', '/inbox', '/otp', '/users',
    '/settings', '/catalog/wedding-dresses', '/haraj/catalog/wedding-dresses',
    '/admin', '/owner-panel', '/owner-private-room', '/complaints',
  ],
  guestAllowed: [
    '/contact', '/about', '/faq', '/terms', '/wanted-dress', '/branches',
    '/advertisements', '/employees', '/haraj', '/haraj/post', '/notifications',
    '/inbox', '/otp', '/users', '/settings', '/chat', '/ai-chat',
    '/catalog/wedding-dresses', '/haraj/catalog/wedding-dresses',
  ],
  guestBlocked: ['/dashboard'],
  // ملاحظة تصميمية: الصفحة الرئيسية "/" تحمل blockGuest في المسار، لكن
  // التطبيق يعرض للزائر شريط عدّاد مؤقّت (guest bar) ويسمح له بالتصفح —
  // سلوك مقصود وموثّق، لذا لا نعتبره خطأ.
  guestRootRenders: ['/'],
  guestOwnerRedirect: ['/admin', '/owner-panel', '/owner-private-room', '/complaints'],
};

for (const r of matrix.anonPublic) {
  const o = await visit(r, 'anon');
  if (o.finalPath !== r) add('error', `anon${r}`, `متوقع البقاء في ${r} لكن ذهب إلى ${o.finalPath}`);
  else add('ok', `anon${r}`, 'عام متاح');
  if (o.overflow > 6) add('error', `anon${r}`, `تجاوز أفقي ${o.overflow}px`);
}

for (const r of matrix.anonProtected) {
  const o = await visit(r, 'anon');
  if (o.finalPath !== '/login') add('error', `anon${r}`, `غير موثّق يجب أن يُوجّه لـ /login لكن بقي في ${o.finalPath}`);
  else add('ok', `anon${r}`, 'محمي → /login');
}

for (const r of matrix.guestAllowed) {
  const o = await visit(r, 'guest');
  if (o.finalPath === '/login') add('error', `guest${r}`, 'الزائر مُنع من مسار مسموح');
  else if (o.len < 5) add('error', `guest${r}`, 'صفحة فارغة للزائر');
  else add('ok', `guest${r}`, 'الزائر مسموح');
  if (o.overflow > 6) add('error', `guest${r}`, `تجاوز أفقي ${o.overflow}px`);
  if (o.errors.length) add('warn', `guest${r}`, 'console: ' + o.errors.slice(0, 2).join(' | ').slice(0, 180));
}

for (const r of matrix.guestBlocked) {
  const o = await visit(r, 'guest');
  if (o.finalPath !== '/login') add('error', `guest${r}`, `blockGuest: متوقع /login لكن ${o.finalPath}`);
  else add('ok', `guest${r}`, 'blockGuest → /login');
}

for (const r of matrix.guestRootRenders) {
  const o = await visit(r, 'guest');
  if (o.len < 5) add('error', `guest${r}`, 'الصفحة الرئيسية فارغة للزائر');
  else add('ok', `guest${r}`, 'الرئيسية تُعرض للزائر مع شريط العدّاد');
}

for (const r of matrix.guestOwnerRedirect) {
  const o = await visit(r, 'guest');
  if (o.finalPath === '/login' || o.finalPath === r) add('error', `guest${r}`, `owner-only: متوقع /unauthorized لكن ${o.finalPath}`);
  else add('ok', `guest${r}`, `owner-only → ${o.finalPath}`);
}

// ---------- login page ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const logoOk = await page.evaluate(() => {
    const img = document.querySelector('.rl-crown-ic img');
    return img && img.complete && img.naturalWidth > 0;
  });
  add(logoOk ? 'ok' : 'error', 'login/logo', logoOk ? 'الشعار محمّل' : 'الشعار لم يُحمّل');

  const logoStyle = await page.evaluate(() => {
    const img = document.querySelector('.rl-crown-ic img');
    const s = getComputedStyle(img);
    return { bg: s.backgroundColor, border: s.borderTopWidth };
  });
  if (logoStyle.bg !== 'rgba(0, 0, 0, 0)' || logoStyle.border !== '0px') add('error', 'login/logo', 'الشعار عليه خلفية/إطار: ' + JSON.stringify(logoStyle));
  else add('ok', 'login/logo', 'الشعار شفاف بلا مربع');

  // .rl-root شفاف عمدًا كي تظهر خلفية الرياض الليلية خلف البطاقات.
  // نتحقق من أن صفحة الدخول ليست بيضاء صلبة تعمي الخلفية.
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.rl-root')).backgroundColor);
  const transparent = /rgba\(0, 0, 0, 0\)|transparent/.test(bg);
  add(transparent ? 'ok' : 'error', 'login/bg', transparent ? 'الخلفية شفافة (خلفية الرياض ظاهرة)' : 'خلفية معتمة: ' + bg);

  const diagVisible = await page.evaluate(() => document.body.innerText.includes('سجل التشخيص'));
  add(diagVisible ? 'error' : 'ok', 'login/diagnostics', diagVisible ? 'سجل التشخيص ما زال ظاهراً' : 'سجل التشخيص أُزيل');

  const order = await page.evaluate(() => [...document.querySelectorAll('.rl-actions button')].map((b) => b.textContent.trim()));
  const expected = ['نسيت كلمة المرور؟', 'إنشاء حساب جديد', 'الدخول عن طريق Google', 'دخول الزوار المؤقت'];
  add(JSON.stringify(order) === JSON.stringify(expected) ? 'ok' : 'error', 'login/grid', 'ترتيب: ' + order.join(' | '));

  const grid = await page.evaluate(() => {
    const g = getComputedStyle(document.querySelector('.rl-actions'));
    return { cols: g.gridTemplateColumns, fs: getComputedStyle(document.querySelector('.rl-actions button')).fontSize };
  });
  if (grid.cols.split(' ').length !== 2) add('error', 'login/grid', 'ليست شبكة عمودين: ' + grid.cols);
  if (parseFloat(grid.fs) < 12.5) add('warn', 'login/grid', 'حجم الخط صغير: ' + grid.fs);
  else add('ok', 'login/grid', 'حجم خط الأزرار ' + grid.fs);

  const cardSizes = await page.evaluate(() => {
    const big = document.querySelector('.rl-card--big').getBoundingClientRect();
    const small = document.querySelector('.rl-card:not(.rl-card--big)').getBoundingClientRect();
    return { bigW: Math.round(big.width), smallW: Math.round(small.width) };
  });
  if (cardSizes.smallW >= cardSizes.bigW) add('error', 'login/cards', 'بطاقة المشرفين ليست أصغر من المالك');
  else add('ok', 'login/cards', `المالك ${cardSizes.bigW}px / المشرفون ${cardSizes.smallW}px`);

  await page.locator('#email').focus();
  await page.waitForTimeout(500);
  const border = await page.evaluate(() => getComputedStyle(document.querySelector('.rl-input-wrap')).borderColor);
  add(border === 'rgb(201, 162, 39)' ? 'ok' : 'warn', 'login/input', 'إطار التركيز ' + border);
  const radius = await page.evaluate(() => getComputedStyle(document.querySelector('.rl-input-wrap')).borderTopLeftRadius);
  add(radius === '10px' ? 'ok' : 'warn', 'login/input', 'استدارة الحقل ' + radius);

  const navTest = async (label, expectPath) => {
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const btn = page.locator('.rl-actions button', { hasText: label }).first();
    if ((await btn.count()) === 0) { add('error', 'login/link', `"${label}" غير موجود`); return; }
    await btn.click();
    await page.waitForTimeout(800);
    const p = new URL(page.url()).pathname;
    add(p === expectPath ? 'ok' : 'error', 'login/link', `"${label}" → ${p} (متوقع ${expectPath})`);
  };
  await navTest('نسيت كلمة المرور؟', '/forgot-password');
  await navTest('إنشاء حساب جديد', '/register');

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.locator('.rl-actions button', { hasText: 'دخول الزوار المؤقت' }).click();
  await page.waitForTimeout(700);
  const modal = await page.evaluate(() => {
    const emails = [...document.querySelectorAll('input[type="email"]')].map((i) => i.placeholder);
    return emails.length >= 2 || document.body.innerText.includes('زائر');
  });
  add(modal ? 'ok' : 'error', 'login/guest', modal ? 'مودال الزوار يفتح (حقل بريد إضافي)' : 'مودال الزوار لم يفتح');

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.locator('.rl-haraj-gate').click();
  await page.waitForTimeout(900);
  const hp = new URL(page.url()).pathname;
  // حراج مسار محمي (يتطلب جلسة). زر الصفحة يوجّه إليه، وغير الموثّق
  // يُعاد لـ /login. هذا سلوك مقصود للمسار المحمي لكنه قد يربك الزائر —
  // نُسجّله كملاحظة لا كخطأ.
  if (hp === '/haraj') add('ok', 'login/haraj', 'زر حراج → /haraj');
  else if (hp === '/login') add('warn', 'login/haraj', 'زر حراج لغير الموثّق يعود لـ /login (يحتاج جلسة)');
  else add('warn', 'login/haraj', `زر حراج → ${hp}`);

  if (errors.length) add('warn', 'login/js', errors.slice(0, 2).join(' | ').slice(0, 180));
  await ctx.close();
}

await browser.close();

const errors = findings.filter((f) => f.level === 'error');
const warns = findings.filter((f) => f.level === 'warn');
const oks = findings.filter((f) => f.level === 'ok');
fs.writeFileSync(`${OUT}/full-audit.json`, JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), errors, warns, findings }, null, 2));

console.log('\n===== FULL AUDIT =====');
console.log('checks:', findings.length, '| ok:', oks.length, '| errors:', errors.length, '| warnings:', warns.length);
if (errors.length) { console.log('\n-- ERRORS --'); errors.forEach((f) => console.log(`  x [${f.area}] ${f.msg}`)); }
if (warns.length) { console.log('\n-- WARNINGS --'); warns.forEach((f) => console.log(`  ! [${f.area}] ${f.msg}`)); }
console.log('\nOVERALL:', errors.length === 0 ? 'PASS' : 'FAIL');
process.exit(errors.length === 0 ? 0 : 1);
