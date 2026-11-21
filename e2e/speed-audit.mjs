#!/usr/bin/env node
/**
 * e2e/speed-audit.mjs — قياس أداء حقيقي محلياً (بدل انتظار حصة PageSpeed API).
 *
 * يحاكي جوالاً متوسطاً على 4G مع خنق معالج ×4 (نفس ظروف تقرير PSI للموبايل)،
 * ثم يقرأ FCP / LCP / CLS / TBT من PerformanceObserver داخل الصفحة، ويجمع
 * حجم ما نُقل فعلياً من JS/CSS/خطوط/صور.
 *
 * التشغيل:
 *   npm run build && npm run preview
 *   npm run speed:audit
 *   BASE_URL=https://almusaymir.pages.dev npm run speed:audit   # قياس الإنتاج
 *   ROUTES=/login,/ npm run speed:audit                        # مسارات محددة
 *   NO_THROTTLE=1 npm run speed:audit                          # بلا خنق (قياس نسبي)
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'http://localhost:4173').replace(/\/$/, '');
const ROUTES = (process.env.ROUTES || '/login')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);
const THROTTLE = !process.env.NO_THROTTLE;
const WARMUP_MS = Number(process.env.WARMUP_MS || 4000);

const MB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const sec = (ms) => `${(ms / 1000).toFixed(2)}s`;

const THRESHOLDS = {
  fcp: [1800, 3000],
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  tbt: [200, 600],
};

const rate = (value, [good, ok]) => (value <= good ? 'GOOD' : value <= ok ? 'OK' : 'POOR');

const INIT = () => {
  window.__perf = { fcp: 0, lcp: 0, cls: 0, tbt: 0, lcpElement: '' };
  const observe = (type, cb, buffered = true) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(cb)).observe({ type, buffered });
    } catch {
      /* نوع غير مدعوم */
    }
  };
  observe('paint', (e) => {
    if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime;
  });
  observe('largest-contentful-paint', (e) => {
    window.__perf.lcp = Math.max(window.__perf.lcp, e.startTime);
    if (e.element) {
      const el = e.element;
      window.__perf.lcpElement = `${el.tagName?.toLowerCase() || '?'}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`;
    }
  });
  observe('layout-shift', (e) => {
    if (!e.hadRecentInput) window.__perf.cls += e.value;
  });
  observe('longtask', (e) => {
    window.__perf.tbt += Math.max(0, e.duration - 50);
  });
};

const run = async (browser, route) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  if (THROTTLE) {
    await cdp.send('Network.enable');
    // 4G متوسط: 1.6Mbps تنزيل · 750Kbps رفع · 150ms زمن وصول
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  await page.addInitScript(INIT);
  const started = Date.now();
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - started;
  await page.waitForTimeout(WARMUP_MS);

  const perf = await page.evaluate(() => window.__perf);
  const resources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((r) => ({
      name: r.name,
      type: r.initiatorType,
      size: r.transferSize || 0,
    }))
  );

  const sumBy = (test) =>
    resources.filter((r) => test(r.name)).reduce((acc, r) => acc + r.size, 0);
  const totals = {
    all: resources.reduce((acc, r) => acc + r.size, 0),
    js: sumBy((n) => n.includes('.js')),
    css: sumBy((n) => n.includes('.css')),
    fonts: sumBy((n) => n.includes('.woff2')),
    images: sumBy((n) => /\.(png|jpe?g|avif|webp|svg|ico)/.test(n)),
    external: sumBy((n) => !n.startsWith(BASE)),
    requests: resources.length,
  };

  await context.close();
  return { route, perf, totals, loadMs };
};

// بعض البيئات (وخوادم CI) فيها Chromium نظامي بلا حزم Playwright المحزومة.
const launch = async () => {
  const args = ['--no-sandbox', '--disable-dev-shm-usage'];
  const system = process.env.CHROME_PATH || '/usr/bin/chromium';
  try {
    return await chromium.launch({ args });
  } catch (error) {
    if (existsSync(system)) return chromium.launch({ args, executablePath: system });
    throw error;
  }
};

const main = async () => {
  const browser = await launch();
  console.log(
    `\nقياس: ${BASE} · ${THROTTLE ? '4G + CPU×4' : 'بلا خنق'} · ${ROUTES.join(', ')}\n`
  );

  for (const route of ROUTES) {
    const { perf, totals, loadMs } = await run(browser, route);
    console.log(`── ${route}`);
    console.log(
      `   FCP ${sec(perf.fcp)} [${rate(perf.fcp, THRESHOLDS.fcp)}]` +
        ` · LCP ${sec(perf.lcp)} [${rate(perf.lcp, THRESHOLDS.lcp)}]` +
        ` · CLS ${perf.cls.toFixed(3)} [${rate(perf.cls, THRESHOLDS.cls)}]` +
        ` · TBT ${Math.round(perf.tbt)}ms [${rate(perf.tbt, THRESHOLDS.tbt)}]`
    );
    console.log(
      `   load ${sec(loadMs)} · طلبات ${totals.requests} · نُقل ${MB(totals.all)}` +
        ` (JS ${MB(totals.js)} · CSS ${MB(totals.css)} · خطوط ${MB(totals.fonts)} · صور ${MB(totals.images)})`
    );
    if (perf.lcpElement) console.log(`   عنصر LCP: ${perf.lcpElement}`);
    if (totals.external) console.log(`   ⚠ طلبات خارجية: ${MB(totals.external)}`);
    console.log('');
  }

  await browser.close();
};

main().catch((error) => {
  console.error('فشل القياس:', error.message);
  process.exit(1);
});
