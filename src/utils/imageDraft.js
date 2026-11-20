// مسودة صورة داخل الجلسة — تمنع إعادة الرفع عند الإغلاق بـ❌.
// الصورة المختارة تُحفظ في sessionStorage بمفتاح النموذج، فتُستعاد عند
// إعادة فتح النموذج في نفس الجلسة، وتُمحى عند الحفظ أو عند إفراغ الحقل.
// الجلسة (sessionStorage) لا الدوام (localStorage): لا صور عالقة بعد الإغلاق.

const PREFIX = 'rooz_img_draft:';

const storage = () => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export const saveImageDraft = (key, dataUrl) => {
  const store = storage();
  if (!store || !key) return;
  try {
    if (dataUrl) store.setItem(PREFIX + key, dataUrl);
    else store.removeItem(PREFIX + key);
  } catch {
    // تجاوز الحصة أو حجب التخزين — الصورة تبقى في حالة النموذج فقط.
  }
};

export const readImageDraft = (key) => {
  const store = storage();
  if (!store || !key) return '';
  try {
    return store.getItem(PREFIX + key) || '';
  } catch {
    return '';
  }
};

export const clearImageDraft = (key) => saveImageDraft(key, '');
