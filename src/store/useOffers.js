// src/store/useOffers.js — صور شريط العروض (6 مواضع ثابتة)
// تُحفظ في Firestore (settings/homeOffers) وتُقرأ لحظياً لكل الزوار،
// فتبقى الصور بعد إعادة التحميل ولا تعتمد على تخزين وهمي.
// الملفات المرفوعة تُخزَّن في Firebase Storage تحت home_offers/.
import { useEffect } from 'react';
import { create } from 'zustand';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadFile, deleteFile } from '../firebase/storage';

/** عدد مواضع الشريط الثابتة */
export const OFFER_SLOTS = 6;

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
      // رفضت القواعد القراءة — نعرض الاسم الافتراضي في كل المواضع
      useOffers.getState().setSlots(null);
    }
  );
};

const persist = async (slots) => {
  await setDoc(
    doc(db, 'settings', 'homeOffers'),
    { slots, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  useOffers.getState().setSlots(slots);
};

/**
 * يستبدل صورة موضع واحد. يرفع الملف إلى Storage ثم يحفظ الرابط في Firestore.
 * الملف القديم للموضع نفسه يُحذف بعد نجاح الحفظ لتوفير المساحة.
 */
export const setOfferImage = async (index, file) => {
  if (!db) throw new Error('Firebase غير مهيأ');
  if (index < 0 || index >= OFFER_SLOTS) throw new Error('موضع غير صالح');
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('يُسمح بالصور فقط');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const path = `home_offers/slot-${index + 1}-${Date.now()}.${ext}`;

  const result = await uploadFile(path, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000',
  });
  if (!result.success) throw new Error(result.error || 'تعذر رفع الصورة');

  const current = useOffers.getState().slots.slice();
  const previous = current[index];
  const next = current.slice();
  next[index] = { url: result.url, path: result.path };
  await persist(next);

  if (previous?.path) {
    // تنظيف أفضل-جهد: فشل الحذف لا يُبطل التعديل المحفوظ
    deleteFile(previous.path).catch(() => {});
  }

  return result.url;
};

/** يحذف صورة موضع ويعيده للنص الافتراضي (اسم الموقع). */
export const clearOfferImage = async (index) => {
  if (!db) throw new Error('Firebase غير مهيأ');
  if (index < 0 || index >= OFFER_SLOTS) throw new Error('موضع غير صالح');

  const current = useOffers.getState().slots.slice();
  const previous = current[index];
  const next = current.slice();
  next[index] = null;
  await persist(next);

  if (previous?.path) {
    deleteFile(previous.path).catch(() => {});
  }
};

export default useOffers;
