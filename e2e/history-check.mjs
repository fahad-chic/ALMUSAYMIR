import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:12000';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const out = [];
const log = (s) => { out.push(s); console.log(s); };

const guestStorage = {
  state: {
    guestSession: { active: true, phone: 'زائر-9999', startedAt: Date.now(), expiresAt: Date.now() + 3600000, warnedAt: null },
    guestWarning: false, guestExpired: false,
  }, version: 0,
};

async function ctx(mode) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  if (mode === 'guest') await c.addInitScript((s) => localStorage.setItem('chic-guest-session', s), JSON.stringify(guestStorage));
  return c;
}

// 1) الزائر: تصفح الصفحات العامة ثم زر الرجوع
{
  const c = await ctx('guest'); const p = await c.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const path = () => new URL(p.url()).pathname;
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900);
  const home = path();
  await p.goto(BASE + '/catalog/wedding-dresses', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700);
  const cat = path();
  await p.goBack(); await p.waitForTimeout(900);
  const back = path();
  log(`[guest] / -> ${home} | /catalog/wedding-dresses -> ${cat} | goBack -> ${back} | errors=${errs.length}`);
  log(`   PASS_RENDER=${home === '/' && cat === '/catalog/wedding-dresses'} PASS_BACK=${back === '/'}`);
  if (errs.length) log('   console: ' + errs.slice(0, 3).join(' | ').slice(0, 300));
  await c.close();
}

// 2) الزائر: /dashboard يجب أن يعطي /login (بلا حلقة)
{
  const c = await ctx('guest'); const p = await c.newPage();
  await p.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1400);
  const final = new URL(p.url()).pathname;
  const hasForm = await p.locator('#email').count();
  log(`[guest] /dashboard -> ${final} | loginForm=${hasForm} | PASS=${final === '/login' && hasForm > 0}`);
  await c.close();
}

// 3) الزائر: /login يجب أن يعرض النموذج (لا يُحوَّل إلى /)
{
  const c = await ctx('guest'); const p = await c.newPage();
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
  const final = new URL(p.url()).pathname;
  const hasForm = await p.locator('#email').count();
  log(`[guest] /login -> ${final} | loginForm=${hasForm} | PASS=${final === '/login' && hasForm > 0}`);
  await c.close();
}

// 4) زائر الصفحات العامة: تحقق من عدم وجود console errors
{
  const c = await ctx('guest'); const p = await c.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  for (const r of ['/', '/about', '/faq', '/contact', '/catalog', '/haraj', '/terms']) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  }
  log(`[guest] تصفح 7 صفحات عامة | console errors=${errs.length}`);
  if (errs.length) log('   ' + errs.slice(0, 5).join(' | ').slice(0, 400));
  await c.close();
}

await browser.close();
