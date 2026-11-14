// src/store/useSiteContent.js
// ============================================================
// محتوى الموقع القابل للتحكم الكامل من صاحب الموقع — مصدر واحد حقيقي.
// يُحفظ في Firestore: settings/siteContent (قراءة عامة، كتابة للمالك فقط
// على مستوى القواعد). كل تغيير (نص / رقم / خيار / حذف) يُزامَن لحظياً لكل
// الزوار على كل الأجهزة عبر onSnapshot — لا نسخة محلية ولا وهمية.
//
// البنية:
//   texts:  { [key]: string }   نص مخصّص (غيابه = القيمة الافتراضية)
//   hidden: { [key]: true }     عنصر محذوف/مخفي (يختفي من كل الموقع)
//   lists:  { [listKey]: [..] } قائمة عناصر (إضافة/تعديل/حذف/ترتيب)
// ============================================================
import { create } from 'zustand';
import { doc, setDoc, onSnapshot, deleteField } from 'firebase/firestore';
import { db } from '../firebase';

const DOC_PATH = ['settings', 'siteContent'];

const EMPTY = Object.freeze({ texts: {}, hidden: {}, lists: {} });

const normalize = (data) => {
  const safe = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  return {
    texts: safe(data?.texts),
    hidden: safe(data?.hidden),
    lists: safe(data?.lists),
  };
};

const useSiteContent = create((set) => ({
  ...EMPTY,
  loaded: false,
  saving: false,
  error: null,

  applySnapshot: (data) => set({ ...normalize(data), loaded: true }),

  setSaving: (on) => set({ saving: !!on }),
  setError: (error) => set({ error: error ? String(error) : null }),

  // تحديث محلي فوري (يتزامن بعدها من Firestore)
  patchTexts: (patch) => set((s) => ({ texts: { ...s.texts, ...patch } })),
  patchHidden: (patch) => set((s) => ({ hidden: { ...s.hidden, ...patch } })),
  patchList: (listKey, items) =>
    set((s) => ({ lists: { ...s.lists, [listKey]: items } })),
}));

let started = false;
export const startSiteContentSync = () => {
  if (started || !db) return;
  started = true;
  onSnapshot(
    doc(db, ...DOC_PATH),
    (snap) => {
      useSiteContent.getState().applySnapshot(snap.exists() ? snap.data() : EMPTY);
    },
    () => {
      useSiteContent.getState().applySnapshot(EMPTY);
    }
  );
};

const clampText = (v) => String(v ?? '').slice(0, 4000);

// -------- نصوص --------
export const setSiteText = async (key, value) => {
  if (!db || !key) throw new Error('مفتاح غير صالح');
  const val = clampText(value);
  const store = useSiteContent.getState();
  store.setSaving(true);
  store.setError(null);
  store.patchTexts({ [key]: val });
  try {
    await setDoc(
      doc(db, ...DOC_PATH),
      { texts: { [key]: val }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    store.setSaving(false);
    return val;
  } catch (e) {
    store.setSaving(false);
    store.setError(e?.message || 'تعذر الحفظ');
    throw e;
  }
};

export const clearSiteText = async (key) => {
  if (!db || !key) throw new Error('مفتاح غير صالح');
  const store = useSiteContent.getState();
  store.setSaving(true);
  store.setError(null);
  store.patchTexts({ [key]: undefined });
  try {
    await setDoc(
      doc(db, ...DOC_PATH),
      { texts: { [key]: deleteField() }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    store.setSaving(false);
  } catch (e) {
    store.setSaving(false);
    store.setError(e?.message || 'تعذر الحذف');
    throw e;
  }
};

// -------- إخفاء/حذف عنصر --------
export const hideSiteItem = async (key) => {
  if (!db || !key) throw new Error('مفتاح غير صالح');
  const store = useSiteContent.getState();
  store.setSaving(true);
  store.setError(null);
  store.patchHidden({ [key]: true });
  try {
    await setDoc(
      doc(db, ...DOC_PATH),
      { hidden: { [key]: true }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    store.setSaving(false);
  } catch (e) {
    store.setSaving(false);
    store.setError(e?.message || 'تعذر الحذف');
    throw e;
  }
};

export const showSiteItem = async (key) => {
  if (!db || !key) throw new Error('مفتاح غير صالح');
  const store = useSiteContent.getState();
  store.setSaving(true);
  store.setError(null);
  store.patchHidden({ [key]: false });
  try {
    await setDoc(
      doc(db, ...DOC_PATH),
      { hidden: { [key]: deleteField() }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    store.setSaving(false);
  } catch (e) {
    store.setSaving(false);
    store.setError(e?.message || 'تعذر الاسترجاع');
    throw e;
  }
};

// -------- قوائم --------
export const setSiteList = async (listKey, items) => {
  if (!db || !listKey) throw new Error('مفتاح غير صالح');
  const safe = Array.isArray(items) ? items : [];
  const store = useSiteContent.getState();
  store.setSaving(true);
  store.setError(null);
  store.patchList(listKey, safe);
  try {
    await setDoc(
      doc(db, ...DOC_PATH),
      { lists: { [listKey]: safe }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    store.setSaving(false);
    return safe;
  } catch (e) {
    store.setSaving(false);
    store.setError(e?.message || 'تعذر الحفظ');
    throw e;
  }
};

export const addSiteListItem = (listKey, item) => {
  const items = useSiteContent.getState().lists[listKey] || [];
  return setSiteList(listKey, [...items, item]);
};

export const updateSiteListItem = (listKey, id, patch) => {
  const items = useSiteContent.getState().lists[listKey] || [];
  return setSiteList(
    listKey,
    items.map((it) => (it.id === id ? { ...it, ...patch } : it))
  );
};

export const deleteSiteListItem = (listKey, id) => {
  const items = useSiteContent.getState().lists[listKey] || [];
  return setSiteList(
    listKey,
    items.filter((it) => it.id !== id)
  );
};

export default useSiteContent;
