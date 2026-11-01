// src/utils/harajSecurity.js — سجل أمني وتنبيه المالك عند محاولات حراج مرفوضة
//
// الفرض الفعلي يتم في قواعد Firestore (haraj_users / haraj_uid_index): ملف
// حراج واحد لكل حساب Firebase. هذا الملف لا يمنح أي قدرة — يوثّق المحاولة
// المرفوضة (security_logs) وينبّه المالك (notifications) بعد رفض القواعد،
// حتى يعرف صاحب الموقع بالتكرار أو المحاولات المشبوهة ويتخذ القرار بنفسه.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { notifyOwner } from './visitorNotify';

/**
 * يوثّق محاولة إنشاء ملف حراج ثانٍ أو محاولة رفضتها القواعد.
 * @param {{ uid?: string, email?: string, phone?: string, reason?: string }} info
 */
export async function logHarajDuplicate(info = {}) {
  const uid = info.uid || auth?.currentUser?.uid || null;
  const email = info.email || auth?.currentUser?.email || null;
  const phone = info.phone || '';
  const reason = info.reason || 'محاولة إنشاء ملف حراج ثانٍ لنفس الحساب';

  try {
    if (db) {
      await addDoc(collection(db, 'security_logs'), {
        type: 'haraj_duplicate_profile',
        details: `${reason} — uid: ${uid || 'غير معروف'}، البريد: ${email || 'غير معروف'}، الهاتف: ${phone || '—'}`,
        severity: 'high',
        actorUid: uid,
        actorEmail: email,
        phone,
        timestamp: serverTimestamp(),
      });
    }
  } catch {
    /* السجل الأمني إضافي */
  }

  try {
    await notifyOwner(
      'تنبيه: محاولة ملف حراج ثانٍ',
      `uid: ${uid || 'غير معروف'} — البريد: ${email || 'غير معروف'} — الهاتف: ${phone || '—'}`
    );
  } catch {
    /* التنبيه إضافي */
  }
}

/**
 * يوثّق محاولة دخول حراج برقم مرتبط بحساب آخر (رقم الجوال ليس وسيلة دخول وحده).
 * @param {{ uid?: string, email?: string, phone?: string, ownerAuthUid?: string }} info
 */
export async function logHarajLoginMismatch(info = {}) {
  const uid = info.uid || auth?.currentUser?.uid || null;
  const email = info.email || auth?.currentUser?.email || null;
  const phone = info.phone || '';
  const ownerAuthUid = info.ownerAuthUid || '';

  try {
    if (db) {
      await addDoc(collection(db, 'security_logs'), {
        type: 'haraj_login_phone_mismatch',
        details: `محاولة دخول برقم مرتبط بحساب آخر — المحاول: uid ${uid || 'غير معروف'} (${email || 'غير معروف'})، الهاتف: ${phone || '—'}، صاحب الرقم: ${ownerAuthUid || 'غير معروف'}`,
        severity: 'high',
        actorUid: uid,
        actorEmail: email,
        phone,
        ownerAuthUid,
        timestamp: serverTimestamp(),
      });
    }
  } catch {
    /* السجل الأمني إضافي */
  }

  try {
    await notifyOwner(
      'تنبيه: دخول برقم شخص آخر',
      `المحاول: ${email || uid || 'غير معروف'} — الرقم: ${phone || '—'} — صاحب الرقم: ${ownerAuthUid || 'غير معروف'}`
    );
  } catch {
    /* التنبيه إضافي */
  }
}
