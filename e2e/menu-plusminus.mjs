import { chromium } from 'playwright';
const B = process.env.BASE_URL || 'http://localhost:12000';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar', isMobile: true, hasTouch: true });
const gs = { state: { guestSession: { active: true, phone: 'زائر-9999', startedAt: Date.now(), expiresAt: Date.now() + 3600000, warnedAt: null }, guestWarning: false, guestExpired: false }, version: 0 };
await c.addInitScript((s) => localStorage.setItem('chic-guest-session', s), JSON.stringify(gs));
const p = await c.newPage();
await p.goto(B + '/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);

// افتح الدرج عبر JS مباشرة لتجاوز الطبقات العائمة
// main يستخدم .rz-burger، والفرع يستخدم .rz-burger-mobile — ندعم الاثنين
await p.evaluate(() => (document.querySelector('.rz-burger-mobile') || document.querySelector('.rz-burger'))?.click());
await p.waitForTimeout(600);
console.log('drawer موجود:', await p.locator('.rz-drawer').count(), '| groups:', await p.locator('.rz-group-btn').count());

const iconOf = async (i) => p.evaluate((idx) => {
  const b = document.querySelectorAll('.rz-group-btn')[idx];
  if (!b) return 'NO_BTN';
  const span = b.querySelector('.rz-plus');
  const svg = span?.querySelector('svg');
  // lucide: plus له خطوط أفقية ورأسية، minus خط أفقي فقط
  const lines = svg ? svg.querySelectorAll('line, path').length : -1;
  const expanded = b.getAttribute('aria-expanded');
  const subOpen = !!b.parentElement.querySelector('.rz-sub');
  return { lines, expanded, subOpen, isOpenClass: span?.classList.contains('is-open') };
}, i);

const groups = await p.locator('.rz-group-btn').count();
console.log('عدد المجموعات:', groups);
const before = await iconOf(0);
console.log('قبل الفتح  :', JSON.stringify(before));
await p.locator('.rz-group-btn').nth(0).click();
await p.waitForTimeout(500);
const after = await iconOf(0);
console.log('بعد الفتح  :', JSON.stringify(after));
await p.locator('.rz-group-btn').nth(0).click();
await p.waitForTimeout(500);
const closed = await iconOf(0);
console.log('بعد الإغلاق:', JSON.stringify(closed));

// تحقق منطقي: عدد عناصر الرسم يتغيّر بين + و −
console.log('PASS_ICON_SWITCH =', before.lines !== after.lines);
console.log('PASS_EXPANDED    =', before.expanded === 'false' && after.expanded === 'true' && closed.expanded === 'false');
console.log('PASS_SUB_TOGGLE  =', !before.subOpen && after.subOpen && !closed.subOpen);

// اختبر مجموعة أخرى (المتجر)
await p.locator('.rz-group-btn').nth(0).click(); await p.waitForTimeout(300);
const g2 = await iconOf(1);
await p.locator('.rz-group-btn').nth(1).click(); await p.waitForTimeout(400);
const g2b = await iconOf(1);
console.log('مجموعة 2 قبل/بعد:', g2.lines, '->', g2b.lines, '| PASS =', g2.lines !== g2b.lines);

// تأكد أن الروابط موجودة داخل المجموعة المفتوحة (المجموعة 2 مفتوحة الآن)
const links = await p.locator('.rz-sub-item').count();
console.log('روابط القوائم الفرعية المفتوحة:', links, '| PASS_LINKS =', links > 0);
// تحقق أن الروابط فعّالة (لها نص)
const labels = await p.locator('.rz-sub-item').allInnerTexts();
console.log('نموذج الروابط:', labels.slice(0, 4).join(' | '));

await browser.close();
