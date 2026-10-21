/* eslint-disable */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 SIZE SIZE">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4af37"/>
      <stop offset="100%" style="stop-color:#f4d03f"/>
    </linearGradient>
  </defs>
  <rect width="SIZE" height="SIZE" rx="SIZE" fill="url(#bg)"/>
  <text x="SIZE" y="SIZE" font-family="Arial, sans-serif" font-size="SIZE" font-weight="bold" fill="url(#gold)" text-anchor="middle">اناقة</text>
  <text x="SIZE" y="SIZE" font-family="Arial, sans-serif" font-size="SIZE" fill="url(#gold)" text-anchor="middle">ROOZ</text>
</svg>`;

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  
  for (const size of sizes) {
    const svg = svgContent.split('SIZE').join(size);
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    try {
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(filepath);
      console.log('Created ' + filename);
    } catch (err) {
      console.error('Error creating ' + filename + ':', err.message);
    }
  }
  
  console.log('All icons generated!');
}

generateIcons();
