#!/usr/bin/env node
/**
 * npm run speed:help
 * يطبع روابط أدوات قياس السرعة وأوامر الفحص المحلية، ويتحقّق سريعاً من أن
 * ترويسات الكاش (public/_headers) وملفات الخطوط موجودة فعلاً.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const ok = (b) => (b ? '✓' : '✗');

console.log(`
المسيمير | ALMUSAYMIR — أدوات قياس السرعة
=========================================

1) PageSpeed Insights (نفس تقرير المالك — موبايل)
   https://pagespeed.web.dev/analysis?url=https%3A%2F%2Falmusaymir.pages.dev&form_factor=mobile

2) أدوات بديلة (لا تحتاج مفتاح API)
   GTmetrix ................ https://gtmetrix.com/
   WebPageTest ............. https://www.webpagetest.org/ (iPhone 12 · 4G · Mobile)
   Lighthouse محلي ......... npm run speed:lighthouse

3) قياس محلي قبل النشر (Playwright + محاكاة iPhone 4G/CPU×4)
   npm run build
   npm run preview            # خادم على 4173
   npm run speed:audit        # BASE_URL=http://localhost:4173 افتراضياً

4) حجم الحزمة وتقسيمها
   npm run analyze            # يُنتج dist/stats.html (خريطة تفاعلية)

5) مراجعة الأصول الثقيلة
   node scripts/optimize-images.mjs   # AVIF + ضغط الأيقونات
   node scripts/fetch-fonts.mjs       # خط Tajawal محلي (woff2)
   node scripts/inline-fonts.mjs      # إدراج @font-face داخل index.html
`);

const headersPath = path.join(root, 'public', '_headers');
const headers = existsSync(headersPath) ? readFileSync(headersPath, 'utf8') : '';
console.log('فحص سريع:');
console.log(`  ${ok(headers.includes('/assets/*'))} public/_headers يحوي قاعدة /assets/*`);
console.log(`  ${ok(/immutable/.test(headers))} كاش immutable للأصول ذات البصمة`);
console.log(`  ${ok(headers.includes('/fonts/*'))} كاش طويل لخطوط /fonts/*`);
console.log(`  ${ok(headers.includes('Strict-Transport-Security'))} HSTS`);
console.log(`  ${ok(headers.includes('X-Frame-Options') || headers.includes('frame-ancestors'))} حماية Clickjacking`);

const fontsDir = path.join(root, 'public', 'fonts');
if (existsSync(fontsDir)) {
  const fonts = readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'));
  const total = fonts.reduce((sum, f) => sum + statSync(path.join(fontsDir, f)).size, 0);
  console.log(`  ✓ خطوط محلية: ${fonts.length} ملف woff2 (${kb(total)})`);
} else {
  console.log('  ✗ لا يوجد public/fonts — شغّل: node scripts/fetch-fonts.mjs');
}

const html = readFileSync(path.join(root, 'index.html'), 'utf8');
console.log(`  ${ok(!/fonts\.googleapis\.com\/css/.test(html))} لا طلب CSS لخطوط Google من index.html`);
console.log(`  ${ok(/logo-almusaymir\.avif/.test(html))} الشعار يُقدَّم بصيغة AVIF`);
console.log('');
