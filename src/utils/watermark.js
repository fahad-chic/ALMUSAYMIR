// src/utils/watermark.js
// علامة مائية شفافة (أيقونة حرف R والتاج) تُطبَّق تلقائياً على صور إعلانات
// الإعلانات لحمايتها — تُرسم على Canvas قبل حفظ الصورة.

export const WATERMARK_OPACITY = 0.15;
export const WATERMARK_SRC = '/assets/emblem.png';

let watermarkImagePromise = null;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذّر تحميل العلامة المائية'));
    img.src = src;
  });

const getWatermarkImage = () => {
  if (!watermarkImagePromise) {
    watermarkImagePromise = loadImage(WATERMARK_SRC).catch(() => null);
  }
  return watermarkImagePromise;
};

/**
 * يرسم صورة المصدر على canvas ويضيف العلامة المائية في الزاوية اليمنى السفلى.
 * يعيد Data URL بصيغة JPEG. عند تعذّر تحميل العلامة المائية تُعاد الصورة
 * الأصلية بدون علامة بدل إفشال النشر.
 */
export const watermarkDataUrl = async (
  dataUrl,
  { opacity = WATERMARK_OPACITY, ratio = 0.22, margin = 0.03 } = {}
) => {
  const base = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth || base.width;
  canvas.height = base.naturalHeight || base.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

  const mark = await getWatermarkImage();
  if (mark) {
    const size = Math.round(Math.min(canvas.width, canvas.height) * ratio);
    const pad = Math.round(Math.min(canvas.width, canvas.height) * margin);
    ctx.globalAlpha = opacity;
    ctx.drawImage(
      mark,
      canvas.width - size - pad,
      canvas.height - size - pad,
      size,
      size
    );
    ctx.globalAlpha = 1;
  }

  return canvas.toDataURL('image/jpeg', 0.72);
};
