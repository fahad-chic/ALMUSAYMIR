#!/usr/bin/env node
/**
 * يجلب خط Tajawal من Google Fonts ويستضيفه محلياً في public/fonts/.
 * السبب: ملف CSS الخارجي لخطوط Google كان طلباً حاجباً للرسم (render-blocking)
 * ويضيف قفزتين شبكيتين (DNS + TLS) إلى المسار الحرج. الاستضافة المحلية تُلغي
 * الطلب الخارجي كلياً وتسمح بكاش immutable طويل.
 *
 * التشغيل: node scripts/fetch-fonts.mjs
 * ثم انسخ محتوى public/fonts/tajawal-fontfaces.css إلى <style> في index.html
 * (يُدرج تلقائياً عبر scripts/inline-fonts.mjs).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const WEIGHTS = [300, 400, 500, 700, 800, 900];
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@' +
  WEIGHTS.join(';') +
  '&display=swap';
// UA حديث ليعيد Google صيغة woff2 بدل ttf
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const root = process.cwd();
const outDir = path.join(root, 'public', 'fonts');

const css = await fetch(CSS_URL, { headers: { 'User-Agent': UA } }).then((r) => {
  if (!r.ok) throw new Error(`فشل جلب CSS الخطوط: ${r.status}`);
  return r.text();
});

await mkdir(outDir, { recursive: true });

const blocks = css.split('@font-face').slice(1);
const faces = [];

for (const block of blocks) {
  const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
  const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
  if (!weight || !url) continue;

  const subset = range && range.includes('U+0600') ? 'arabic' : 'latin';
  const name = `tajawal-${weight}-${subset}.woff2`;
  const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  await writeFile(path.join(outDir, name), buf);

  faces.push({ weight, subset, name, range });
  console.log(`✓ ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

const faceCss = faces
  .map(
    (f) => `@font-face {
  font-family: 'Tajawal';
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url('/fonts/${f.name}') format('woff2');
  unicode-range: ${f.range};
}`
  )
  .join('\n');

await writeFile(path.join(outDir, 'tajawal-fontfaces.css'), faceCss + '\n');
console.log(`\n✓ ${faces.length} ملفات + tajawal-fontfaces.css`);
