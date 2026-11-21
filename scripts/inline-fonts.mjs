#!/usr/bin/env node
/**
 * يُدرج كتلة @font-face المولَّدة (public/fonts/tajawal-fontfaces.css) داخل
 * index.html مكان علامة /*__TAJAWAL_FACES__*\/ — كي يبدأ تحميل الخط فوراً
 * مع HTML بلا ملف CSS خارجي حاجب للرسم.
 *
 * التشغيل بعد scripts/fetch-fonts.mjs:  node scripts/inline-fonts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const marker = '/*__TAJAWAL_FACES__*/';
const facesPath = path.join(root, 'public', 'fonts', 'tajawal-fontfaces.css');
const htmlPath = path.join(root, 'index.html');

const faces = readFileSync(facesPath, 'utf8').trim();
const html = readFileSync(htmlPath, 'utf8');

if (!html.includes(marker)) {
  console.log('لا توجد علامة الإدراج — index.html محدَّث مسبقاً.');
  process.exit(0);
}

writeFileSync(htmlPath, html.replace(marker, faces));
console.log('✓ أُدرجت كتلة @font-face داخل index.html');
