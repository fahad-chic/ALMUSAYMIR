#!/usr/bin/env node
/**
 * تحسين أصول العلامة (الصور) — يُشغَّل يدوياً بعد استبدال أي صورة:
 *   node scripts/optimize-images.mjs
 *
 * المخرجات:
 *   - نسخ AVIF للشعارات (أصغر بـ 50–60% من PNG) مع إبقاء PNG كبديل آمن
 *     لكل المتصفحات عبر <picture><source type="image/avif">.
 *   - إعادة ضغط الأيقونات (apple-touch-icon / favicon) بخريطة ألوان.
 * لا يغيّر أبعاد الصور ولا مساراتها الحالية، لذا لا يكسر أي مرجع قائم.
 */
import sharp from 'sharp';
import { statSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assets = path.join(root, 'public', 'assets');

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const report = (label, before, after) =>
  console.log(`${label}: ${kb(before)} → ${kb(after)}`);

// 1) نسخ AVIF للشعارات (بلا تغيير الأبعاد)
const avifTargets = [
  ['logo-almusaymir.png', 'logo-almusaymir.avif', 52],
  ['logo-almusaymir-wide.png', 'logo-almusaymir-wide.avif', 58],
];

for (const [src, out, quality] of avifTargets) {
  const from = path.join(assets, src);
  const to = path.join(assets, out);
  const buf = await sharp(from).avif({ quality, effort: 9 }).toBuffer();
  writeFileSync(to, buf);
  report(out, statSync(from).size, statSync(to).size);
}

// 2) ضغط الأيقونات بخريطة ألوان
const pngTargets = [
  path.join(root, 'public', 'apple-touch-icon.png'),
  path.join(root, 'public', 'favicon-96x96.png'),
  path.join(root, 'public', 'assets', 'emblem.png'),
];

for (const file of pngTargets) {
  const before = statSync(file).size;
  const buf = await sharp(file)
    .png({ compressionLevel: 9, effort: 10, palette: true, quality: 92 })
    .toBuffer();
  if (buf.length < before) {
    writeFileSync(file, buf);
    report(path.relative(root, file), before, statSync(file).size);
  } else {
    console.log(`${path.relative(root, file)}: بلا تغيير (${kb(before)})`);
  }
}

console.log('\nملفات assets الحالية:');
for (const f of readdirSync(assets).sort()) {
  console.log(`  ${f}  ${kb(statSync(path.join(assets, f)).size)}`);
}
