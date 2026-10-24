// ضغط صورة على جهاز الزائر إلى JPEG صغير قابل للحفظ داخل Firestore
// بلا Firebase Storage وبلا بطاقة. الناتج Data URL جاهز لـ <img src>.

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export function compressImageToDataUrl(file, options = {}) {
  const maxDim = options.maxDim || 800;
  const quality = options.quality || 0.72;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;

  return new Promise((resolve, reject) => {
    if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
      reject(new Error('الملف المحدد ليس صورة.'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت قبل الضغط.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('تعذّر فتح الصورة.'));
      img.onload = () => {
        let { width, height } = img;
        const edge = Math.max(width, height);
        if (edge > maxDim) {
          const scale = maxDim / edge;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذّر تجهيز الصورة على هذا الجهاز.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          reject(new Error('تعذّر ضغط الصورة.'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}