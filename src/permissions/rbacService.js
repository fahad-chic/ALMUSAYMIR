// src/permissions/rbacService.js
// خدمة قراءة/كتابة منح الصلاحيات في Firestore
// مجموعة rbac محمية بالقواعد: القراءة للمالك أو صاحب الوثيقة، والكتابة للمالك فقط.
// أي محاولة منح ذاتية من حساب غير المالك يرفضها الخادم وتُسجَّل.

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sanitizeGrants } from './logic';

export const RBAC_COLLECTION = 'rbac';

/** قراءة وثيقة صلاحيات حساب — null إذا لم توجد */
export const getUserRbac = async (uid) => {
  if (!uid || !db) return null;
  try {
    const snap = await getDoc(doc(db, RBAC_COLLECTION, uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
};

/** تسجيل حدث صلاحيات في security_logs — لا يكسر العملية الأساسية */
export const logPermissionAudit = async (type, details, severity = 'medium') => {
  if (!db) return;
  try {
    await addDoc(collection(db, 'security_logs'), {
      type: String(type || 'permission_event'),
      details: String(details || ''),
      severity: severity === 'high' || severity === 'low' ? severity : 'medium',
      timestamp: serverTimestamp(),
      userId: auth?.currentUser?.uid || null,
      userEmail: auth?.currentUser?.email || null,
    });
  } catch {
    // السجل لا يجب أن يكسر العملية الأساسية
  }
};

/**
 * كتابة مصفوفة منح كاملة لحساب (المالك فقط — تفرضه قواعد Firestore)
 * @returns {Promise<object>} المنح المنظّفة بعد الحفظ
 */
export const setUserGrants = async (targetUid, grantsInput, extra = {}) => {
  if (!targetUid) throw new Error('معرّف الحساب مطلوب');
  if (!db) throw new Error('قاعدة البيانات غير متاحة');

  const grants = sanitizeGrants(grantsInput);
  await setDoc(
    doc(db, RBAC_COLLECTION, targetUid),
    {
      grants,
      ...extra,
      updatedAt: serverTimestamp(),
      updatedBy: auth?.currentUser?.email || 'owner',
    },
    { merge: true }
  );
  return grants;
};

/**
 * تفعيل أو إيقاف صلاحية واحدة مع تسجيل الحدث
 * @returns {Promise<object>} مصفوفة المنح بعد التعديل
 */
export const toggleGrant = async (targetUid, key, enabled, currentGrants = {}) => {
  if (!targetUid) throw new Error('معرّف الحساب مطلوب');
  if (!key) throw new Error('مفتاح الصلاحية مطلوب');

  const next = { ...sanitizeGrants(currentGrants) };
  if (enabled) next[key] = true;
  else delete next[key];

  await setUserGrants(targetUid, next);
  await logPermissionAudit(
    enabled ? 'permission_granted' : 'permission_revoked',
    `${enabled ? 'منح' : 'سحب'} صلاحية ${key} ${enabled ? 'إلى' : 'من'} الحساب ${targetUid}`,
    'medium'
  );
  return next;
};

/**
 * تجميد / إلغاء تجميد حساب مشرف
 * عند التجميد: computeEffectiveGrants يصفّر كل الصلاحيات فعليًا
 */
export const setSuspended = async (targetUid, suspended) => {
  if (!targetUid) throw new Error('معرّف الحساب مطلوب');
  if (!db) throw new Error('قاعدة البيانات غير متاحة');

  const isSuspended = suspended === true;
  await setDoc(
    doc(db, RBAC_COLLECTION, targetUid),
    {
      suspended: isSuspended,
      suspendedAt: isSuspended ? serverTimestamp() : null,
      suspendedBy: isSuspended ? auth?.currentUser?.email || 'owner' : null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logPermissionAudit(
    isSuspended ? 'sub_admin_suspended' : 'sub_admin_restored',
    `${isSuspended ? 'تجميد' : 'إعادة تفعيل'} حساب المشرف ${targetUid}`,
    'high'
  );
};

/** يُستدعى عند رفض Firestore عملية (permission-denied) */
export const reportPermissionViolation = async (action, target) => {
  await logPermissionAudit(
    'permission_violation',
    `محاولة تنفيذ مرفوضة من الخادم: ${action} على ${target} — تلاعب محتمل بكود المتصفح`,
    'high'
  );
};

/**
 * يلف أي عملية حساسة:
 * - يرفض محليًا إن لم توجد الصلاحية
 * - يسجّل الرفض الخادمي كمحاولة اختراق
 */
export const guardedAction = async ({ can, permissionKey, action, target, run }) => {
  if (typeof can !== 'function' || !can(permissionKey)) {
    await logPermissionAudit(
      'permission_denied_local',
      `محاولة ${action || permissionKey} على ${target || '-'} بدون صلاحية ${permissionKey}`,
      'high'
    );
    throw new Error('لا تملك هذه الصلاحية — تم تسجيل المحاولة');
  }
  try {
    return await run();
  } catch (err) {
    const code = err?.code || '';
    if (code === 'permission-denied' || /permission/i.test(String(code))) {
      await reportPermissionViolation(action || permissionKey, target || '-');
      throw new Error('رفض الخادم العملية — تم تسجيل المحاولة كحادثة أمنية');
    }
    throw err;
  }
};

// ——— واجهة التحقق الموحّدة (تُستخدم من requirePerm.js أيضًا) ———

export const denyMessage = (key) =>
  `لا تملك صلاحية تنفيذ هذا الإجراء (${key || 'غير معروف'}). تواصل مع صاحب الموقع.`;

/**
 * يتحقق من الصلاحية قبل التنفيذ.
 * إن وُجدت: يعود true
 * إن لم توجد: يسجّل المحاولة ويرمي Error برسالة عربية
 */
export async function requirePerm(can, key, actionLabel = key, target = '-') {
  if (typeof can === 'function' && key && can(key)) return true;

  try {
    await logPermissionAudit(
      'permission_denied_local',
      `محاولة ${actionLabel || key} على ${target} بدون صلاحية ${key}`,
      'high'
    );
  } catch {
    /* ignore */
  }

  const err = new Error(denyMessage(key));
  err.code = 'no-permission';
  throw err;
}

/** للعرض في الواجهة: هل يظهر الزر؟ */
export function showIfCan(can, ...keys) {
  if (typeof can !== 'function' || !keys?.length) return false;
  return keys.some((k) => k && can(k) === true);
}

/** هل يملك أي صلاحية من القائمة؟ */
export function showIfCanAny(can, keys = []) {
  return showIfCan(can, ...(Array.isArray(keys) ? keys : [keys]));
}
