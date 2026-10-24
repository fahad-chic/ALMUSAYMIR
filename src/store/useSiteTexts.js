import { useEffect } from 'react';
import { create } from 'zustand';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// نصوص الواجهة القابلة للتعديل من قبل المالك — تُحفظ في Firestore
// (settings/siteTexts) وتُقرأ لحظياً لجميع الزوار. القيم الفارغة تعني
// استخدام النص الافتراضي المكتوب في الكود.
export const TEXT_FIELDS = [
  { key: 'heroTitle', label: 'العنوان الرئيسي (الهيرو)' },
  { key: 'heroSub', label: 'وصف الهيرو' },
  { key: 'searchPlaceholder', label: 'نص حقل البحث' },
  { key: 'marquee1', label: 'الشريط المتحرك — اللافتة الأولى' },
  { key: 'marquee2', label: 'الشريط المتحرك — اللافتة الثانية' },
  { key: 'marquee3', label: 'الشريط المتحرك — اللافتة الثالثة' },
  { key: 'marquee4', label: 'شريط العروض — اللافتة الأولى' },
  { key: 'marquee5', label: 'شريط العروض — اللافتة الثانية' },
  { key: 'marquee6', label: 'شريط العروض — اللافتة الثالثة' },
  { key: 'heroBanner', label: 'لافتة الخدمة (الشريط الثاني)' },
  { key: 'home.hero_sub', label: 'الرئيسية — وصف الهيرو' },
  { key: 'home.footer_tag', label: 'الرئيسية — وسم التذييل' },
  { key: 'faq.page_title', label: 'الأسئلة الشائعة — العنوان' },
  { key: 'contact.hero_subtitle', label: 'تواصل معنا — الجملة الرئيسية' },
  { key: 'terms.page_title', label: 'شروط الاستخدام — العنوان' },
];

const VALID_KEYS = new Set(TEXT_FIELDS.map((field) => field.key));

const useSiteTexts = create((set) => ({
  texts: {},
  loaded: false,
  saving: false,
  saveStatus: 'idle',
  lastSavedKey: null,
  saveError: null,

  setTexts: (texts) =>
    set({
      texts:
        texts && typeof texts === 'object' && !Array.isArray(texts)
          ? texts
          : {},
      loaded: true,
    }),

  setSaving: (key) =>
    set({
      saving: true,
      saveStatus: 'saving',
      lastSavedKey: key,
      saveError: null,
    }),

  setSaved: (key) =>
    set({
      saving: false,
      saveStatus: 'saved',
      lastSavedKey: key,
      saveError: null,
    }),

  setSaveError: (error) =>
    set({
      saving: false,
      saveStatus: 'error',
      saveError: error instanceof Error ? error.message : 'تعذر حفظ التعديل',
    }),

  resetSaveStatus: () =>
    set({
      saving: false,
      saveStatus: 'idle',
      lastSavedKey: null,
      saveError: null,
    }),
}));

let started = false;
export const startSiteTextsSync = () => {
  if (started || !db) return;
  started = true;

  const ref = doc(db, 'settings', 'siteTexts');

  onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        useSiteTexts
          .getState()
          .setTexts(snap.data().texts || {});
      } else {
        useSiteTexts.getState().setTexts({});
      }
    },
    () => {
      useSiteTexts.getState().setTexts({});
    }
  );
};

export const saveSiteText = async (key, value) => {
  if (!db || !VALID_KEYS.has(key)) {
    const error = new Error('مفتاح النص غير صالح');
    useSiteTexts.getState().setSaveError(error);
    throw error;
  }

  const safeValue =
    typeof value === 'string'
      ? value.slice(0, 1000)
      : String(value ?? '').slice(0, 1000);

  const store = useSiteTexts.getState();
  store.setSaving(key);

  try {
    const ref = doc(db, 'settings', 'siteTexts');

    await setDoc(
      ref,
      {
        texts: {
          [key]: safeValue,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const currentTexts =
      useSiteTexts.getState().texts &&
      typeof useSiteTexts.getState().texts === 'object'
        ? useSiteTexts.getState().texts
        : {};

    useSiteTexts.getState().setTexts({
      ...currentTexts,
      [key]: safeValue,
    });

    useSiteTexts.getState().setSaved(key);

    return safeValue;
  } catch (error) {
    useSiteTexts.getState().setSaveError(error);
    throw error;
  }
};

export default useSiteTexts;