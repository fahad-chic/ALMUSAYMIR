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
 * يستبدل صورة موضع واحد. تُضغط على الجهاز ثم يُحفظ الرابط الداخلي في Firestore.
 */
export const setOfferImage = async (index, file) => {
  if (!db) throw new Error('Firebase غير مهيأ');
  if (index < 0 || index >= OFFER_SLOTS) throw new Error('موضع غير صالح');

  const dataUrl = await compressImageToDataUrl(file, {
    maxDim: 720,
    quality: 0.62,
  });

  const current = useOffers.getState().slots.slice();
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