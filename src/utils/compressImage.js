// ضغط صورة على جهاز الزائر إلى JPEG صغير قابل للحفظ داخل Firestore
// بلا Firebase Storage وبلا بطاقة. الناتج Data URL جاهز للحفظ.

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
// Firestore document size is limited to 1 MiB. Keep image data well below
// that limit because the same document also contains text and timestamps.
const DEFAULT_MAX_STORED_BYTES = 420 * 1024;

export function compressImageToDataUrl(file, options = {}) {
  const maxDim = options.maxDim || 800;
  const quality = options.quality || 0.72;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const maxStoredBytes =
    options.maxStoredBytes || DEFAULT_MAX_STORED_BYTES;

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
          let currentCanvas = canvas;
          let currentQuality = Math.min(0.9, Math.max(0.45, quality));
          let dataUrl = '';

          // Retry with lower quality and, if necessary, a smaller canvas.
          // This keeps data-URL images usable on the free Firestore path.
          for (let attempt = 0; attempt < 10; attempt += 1) {
            dataUrl = currentCanvas.toDataURL(
              'image/jpeg',
              currentQuality
            );

            const base64Length =
              dataUrl.length -
              dataUrl.indexOf(',') -
              1;
            const estimatedBytes =
              Math.ceil(base64Length * 0.75);

            if (estimatedBytes <= maxStoredBytes) {
              resolve(dataUrl);
              return;
            }

            if (currentQuality > 0.45) {
              currentQuality = Math.max(
                0.45,
                currentQuality - 0.08
              );
              continue;
            }

            const nextWidth = Math.max(
              320,
              Math.round(currentCanvas.width * 0.82)
            );
            const nextHeight = Math.max(
              320,
              Math.round(currentCanvas.height * 0.82)
            );

            if (
              nextWidth === currentCanvas.width &&
              nextHeight === currentCanvas.height
            ) {
              break;
            }

            const nextCanvas =
              document.createElement('canvas');
            nextCanvas.width = nextWidth;
            nextCanvas.height = nextHeight;
            const nextContext =
              nextCanvas.getContext('2d');

            if (!nextContext) break;

            nextContext.fillStyle = '#ffffff';
            nextContext.fillRect(
              0,
              0,
              nextWidth,
              nextHeight
            );
            nextContext.drawImage(
              currentCanvas,
              0,
              0,
              nextWidth,
              nextHeight
            );
            currentCanvas = nextCanvas;
            currentQuality = 0.62;
          }

          reject(
            new Error(
              'تعذّر ضغط الصورة إلى حجم مناسب للحفظ المجاني.'
            )
          );
        } catch {
          reject(new Error('تعذّر ضغط الصورة.'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}