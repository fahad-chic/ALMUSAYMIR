// src/utils/motionPreview.js
// "المنتج في الحركة": يستخرج إطارات متتابعة من مقطع قصير (٥ ثوانٍ كحد أقصى)
// ويحفظها كمعاينة حركة خفيفة تُخزَّن داخل وثيقة Firestore (بدون Firebase Storage).
import { MAX_VIDEO_SECONDS, MAX_VIDEO_BYTES } from './dressMeta';

const loadVideoMeta = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذّر قراءة الفيديو'));
    };
    video.src = url;
  });

const seek = (video, time) =>
  new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = time;
    } catch {
      resolve();
    }
  });

/**
 * يتحقق من مقطع الفيديو ثم يستخرج عدداً من الإطارات موزّعة على مدته.
 * يعيد { frames, duration } أو يرمي خطأً عربياً واضحاً عند المخالفة.
 */
export const extractMotionFrames = async (file, count = 6) => {
  if (!file.type.startsWith('video/')) {
    throw new Error('الملف المحدد ليس مقطع فيديو صالحاً.');
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('حجم الفيديو كبير جداً — اختر مقطعاً أقصر وأخف.');
  }

  const { video, url } = await loadVideoMeta(file);
  try {
    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('تعذّر تحديد مدة الفيديو.');
    }
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`مدة الفيديو يجب ألا تتجاوز ${MAX_VIDEO_SECONDS} ثوانٍ.`);
    }

    const vw = video.videoWidth || 320;
    const vh = video.videoHeight || 320;
    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const frames = [];
    const safeDuration = Math.min(duration, MAX_VIDEO_SECONDS);
    for (let i = 0; i < count; i += 1) {
      const t = (safeDuration * i) / (count - 1 || 1);
      await seek(video, Math.min(t, Math.max(0, safeDuration - 0.05)));
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas.toDataURL('image/jpeg', 0.6));
    }
    return { frames, duration: safeDuration };
  } finally {
    URL.revokeObjectURL(url);
  }
};
