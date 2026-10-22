/* eslint-disable */
/**
 * توليد أيقونات PWA لهوية «المسيمير | ALMUSAYMIR».
 *
 * المصدر: public/assets/emblem.png (شعار العلامة الفعلي).
 * الخلفية: كريمي #FDFBF7 — نفس background_color في public/manifest.json.
 * الشعار يشغل 72% من الإطار (هامش 14% من كل جهة) ليبقى واضحاً كأيقونة maskable.
 *
 * المقاسات هنا مطابقة تماماً لما يشير إليه public/manifest.json.
 * عند تغيير المقاسات: حدّث manifest.json أيضاً، وإلا صارت مراجع الأيقونات مكسورة (404).
 *
 * الضغط: PNG بجدول ألوان 256 لوناً (الشعار تصميم مسطّح) — نفس الشكل بحجم أصغر بكثير.
 *
 * الاستخدام: npm run icons
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZES = [72, 96, 192, 512];
const BRAND_BG = '#FDFBF7';
const EMBLEM_RATIO = 0.72;

const root = path.join(__dirname, '..');
const emblemPath = path.join(root, 'public', 'assets', 'emblem.png');
const iconsDir = path.join(root, 'public', 'icons');

async function generateIcons() {
  if (!fs.existsSync(emblemPath)) {
    console.error('Missing brand emblem: ' + emblemPath);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of SIZES) {
    const inner = Math.round(size * EMBLEM_RATIO);
    const emblem = await sharp(emblemPath)
      .resize(inner, inner, {
        fit: 'contain',
        kernel: 'lanczos3',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const filepath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp({
      create: { width: size, height: size, channels: 4, background: BRAND_BG },
    })
      .composite([{ input: emblem, gravity: 'center' }])
      .png({ compressionLevel: 9, palette: true, colors: 256 })
      .toFile(filepath);

    console.log('Created icon-' + size + 'x' + size + '.png');
  }

  console.log('All ALMUSAYMIR icons generated.');
}

generateIcons().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
