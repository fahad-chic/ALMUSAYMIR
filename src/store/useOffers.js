// src/store/useOffers.js — صور شريط العروض (6 مواضع ثابتة)
// تُحفظ مضغوطة داخل Firestore (settings/homeOffers) بلا Firebase Storage.
import { create } from 'zustand';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { compressImageToDataUrl } from '../utils/compressImage';

/** عدد مواضع الشريط الثابتة */
export const OFFER_SLOTS = 6;

/** حد آمن تحت سقف وثيقة Firestore (1 ميجابايت) */
const DOC_SAFE_CHARS = 900000;

/** سقف الصورة الواحدة: 6 × 145000 = 870000 < DOC_SAFE_CHARS، فتتسع الست دائماً */
const SLOT_MAX_CHARS = 145000;

/**
 * محاولات الضغط بالترتيب: نبدأ بالجودة المطلوبة (800 / 0.72)
 * ثم نصغّر تلقائياً إن لم تتسع الصورة في حصتها من الوثيقة.
 */
const COMPRESS_ATTEMPTS = [
  { maxDim: 800, quality: 0.72 },
  { maxDim: 720, quality: 0.62 },
  { maxDim: 640, quality: 0.55 },
  { maxDim: 560, quality: 0.5 },
  { maxDim: 480, quality: 0.45 },
];

const EMPTY = Array.from({ length: OFFER_SLOTS }, () => null);

/** يضمن دائماً مصفوفة بطول OFFER_SLOTS بلا قيم غير صالحة */
const normalizeSlots = (raw) => {
  const out = EMPTY.slice();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < OFFER_SLOTS; i += 1) {
    const slot = raw[i];
    if (slot && typeof slot.url === 'string' && slot.url.trim()) {
      out[i] = {
        url: slot.url,
        path: typeof slot.path === 'string' ? slot.path : '',
      };
    }
  }
  return out;
};

const useOffers = create((set) => ({
  slots: EMPTY.slice(),
  loaded: false,
  setSlots: (slots) => set({ slots: normalizeSlots(slots), loaded: true }),
}));

let started = false;
export const startOffersSync = () => {
  if (started || !db) return;
  started = true;

  onSnapshot(
    doc(db, 'settings', 'homeOffers'),
    (snap) => {
      useOffers.getState().setSlots(snap.exists() ? snap.data().slots : null);
    },
    () => {
      useOffers.getState().setSlots(null);
    }
  );
};

const persist = async (slots) => {
  const weight = JSON.stringify(slots).length;
  if (weight > DOC_SAFE_CHARS) {
    throw new Error(
      'الصور الست كبيرة معاً. اختر صوراً أبسط أو أصغر ثم أعد المحاولة.'
    );
  }
  await setDoc(
    doc(db, 'settings', 'homeOffers'),
    { slots, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  useOffers.getState().setSlots(slots);
};

/**
 * يضغط الصورة بأعلى جودة تتسع في الحد المسموح (limit = عدد الأحرف).
 * compress قابلة للاستبدال لأغراض الاختبار فقط.
 */
export const compressToFit = async (
  file,
  limit,
  compress = compressImageToDataUrl
) => {
  for (const attempt of COMPRESS_ATTEMPTS) {
    const dataUrl = await compress(file, attempt);
    if (dataUrl.length <= limit) return dataUrl;
  }
  throw new Error(
    'الصورة معقّدة وكبيرة حتى بعد الضغط. اختر صورة أبسط أو أصغر ثم أعد المحاولة.'
  );
};

/**
 * يستبدل صورة موضع واحد. تُضغط على الجهاز ثم يُحفظ الرابط الداخلي في Firestore.
 */
export const setOfferImage = async (index, file) => {
  if (!db) throw new Error('Firebase غير مهيأ');
  if (index < 0 || index >= OFFER_SLOTS) throw new Error('موضع غير صالح');

  const current = useOffers.getState().slots.slice();

  // حصة هذه الصورة = الأصغر بين سقف الصورة الواحدة وما تبقّى من الوثيقة
  const othersWeight = current.reduce(
    (sum, slot, i) => (i === index || !slot ? sum : sum + slot.url.length + 40),
    0
  );
  const limit = Math.min(
    SLOT_MAX_CHARS,
    DOC_SAFE_CHARS - othersWeight - 2000
  );
  if (limit < 20000) {
    throw new Error(
      'الصور الأخرى تستهلك مساحة الوثيقة. احذف صورة أو استبدلها بأصغر ثم أعد المحاولة.'
    );
  }

  const dataUrl = await compressToFit(file, limit);

  const next = current.slice();
  next[index] = { url: dataUrl, path: '' };
  await persist(next);
  return dataUrl;
};

/** يحذف صورة موضع ويعيده للنص الافتراضي (اسم الموقع). */
export const clearOfferImage = async (index) => {
  if (!db) throw new Error('Firebase غير مهيأ');
  if (index < 0 || index >= OFFER_SLOTS) throw new Error('موضع غير صالح');

  const current = useOffers.getState().slots.slice();
  const next = current.slice();
  next[index] = null;
  await persist(next);
};

export default useOffers;