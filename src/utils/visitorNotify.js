import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ensureFirebaseSession } from './firebaseSession';

// إشعار فوري لغرفة صاحب الموقع عند دخول/خروج أي زائر — تُعرض في
// OwnerPrivateRoom عبر مستمع onSnapshot على مجموعة notifications.
// الكتابة مسموحة للجميع في قواعد Firestore المنشورة (create: if true).
export async function notifyOwner(title, body) {
  try {
    await ensureFirebaseSession();
    await addDoc(collection(db, 'notifications'), {
      title,
      body,
      read: false,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('owner notification skipped:', err?.message);
  }
}

// يبني نص إشعار غرفة المالك من بيانات إعلان حراج جديد — دالة نقيّة
// (نقيّة) حتى تُختبر وحدها وتضمن وصول اسم الناشر وهاتفه ومدينته.
export function buildAdOwnerNotice(ad) {
  const title = 'إعلان جديد في حراج المسيمير';
  const body = [
    `الإعلان: ${ad?.title || ''}`,
    `الناشر: ${ad?.userName || 'غير محدد'}`,
    `الهاتف: ${ad?.userPhone || 'بدون'}`,
    ad?.userRegion ? `المدينة: ${ad.userRegion}` : '',
  ]
    .filter(Boolean)
    .join(' — ');
  return { title, body };
}

export const formatArTime = () =>
  new Date().toLocaleString('ar-SA', { hour12: true });
