// src/permissions/rbacService.js — خدمة قراءة/كتابة منح الصلاحيات في Firestore
// مجموعة rbac محمية بالقواعد: القراءة للمالك أو صاحب الوثيقة، والكتابة للمالك
// فقط — أي محاولة منح ذاتية من حساب غير المالك يرفضها الخادم وتُسجَّل كاختراق.
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sanitizeGrants } from './logic';

export const RBAC_COLLECTION = 'rbac';

export const getUserRbac = async (uid) => {
  const snap = await getDoc(doc(db, RBAC_COLLECTION, uid));
  return snap.exists() ? snap.data() : null;
};

export const logPermissionAudit = async (type, details, severity = 'medium') => {
  try {
    await addDoc(collection(db, 'security_logs'), {
      type,
      details,
      severity,
      timestamp: serverTimestamp(),
      userId: auth?.currentUser?.uid || null,
      userEmail: auth?.currentUser?.email || null
    });
  } catch {
    // السجل لا يجب أن يكسر العملية الأساسية
  }
};

// كتابة مصفوفة منح كاملة لحساب (المالك فقط — تفرضه القواعد)
export const setUserGrants = async (targetUid, grantsInput, extra = {}) => {
  const grants = sanitizeGrants(grantsInput);
  await setDoc(
    doc(db, RBAC_COLLECTION, targetUid),
    {
      grants,
      ...extra,
      updatedAt: serverTimestamp(),
      updatedBy: auth?.currentUser?.email || 'owner'
    },
    { merge: true }
  );
  return grants;
};

export const toggleGrant = async (targetUid, key, enabled, currentGrants = {}) => {
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

// تجميد حساب مشرف: سحب فوري فعلي لكل الصلاحيات (computeEffectiveGrants يصفّرها)
export const setSuspended = async (targetUid, suspended) => {
  await setDoc(
    doc(db, RBAC_COLLECTION, targetUid),
    {
      suspended: suspended === true,
      suspendedAt: suspended ? serverTimestamp() : null,
      suspendedBy: suspended ? auth?.currentUser?.email || 'owner' : null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  await logPermissionAudit(
    suspended ? 'sub_admin_suspended' : 'sub_admin_restored',
    `${suspended ? 'تجميد' : 'إعادة تفعيل'} حساب المشرف ${targetUid}`,
    'high'
  );
};

// يُستدعى عند رفض Firestore عملية (permission-denied) — يسجلها كمحاولة اختراق
export const reportPermissionViolation = async (action, target) => {
  await logPermissionAudit(
    'permission_violation',
    `محاولة تنفيذ مرفوضة من الخادم: ${action} على ${target} — تلاعب محتمل بكود المتصفح`,
    'high'
  );
};

// يلف أي عملية حساسة: يرفض محلياً إن لم توجد الصلاحية، ويسجل الرفض الخادمي كاختراق
export const guardedAction = async ({ can, permissionKey, action, target, run }) => {
  if (!can(permissionKey)) {
    await logPermissionAudit(
      'permission_denied_local',
      `محاولة ${action} على ${target} بدون صلاحية ${permissionKey}`,
      'high'
    );
    throw new Error('لا تملك هذه الصلاحية — تم تسجيل المحاولة');
  }
  try {
    return await run();
  } catch (err) {
    if (err?.code === 'permission-denied' || /permission/i.test(err?.code || '')) {
      await reportPermissionViolation(action, target);
      throw new Error('رفض الخادم العملية — تم تسجيل المحاولة كحادثة أمنية');
    }
    throw err;
  }
};

// ——— تحقق واجهة موحّد قبل الإجراءات الحساسة ———
export const denyMessage = (key) =>
  `لا تملك صلاحية تنفيذ هذا الإجراء (${key}). تواصل مع صاحب الموقع.`;

export async function requirePerm(can, key, actionLabel = key, target = '-') {
  if (typeof can === 'function' && can(key)) return true;
  try {
    await logPermissionAudit(
      'permission_denied_local',
      `محاولة ${actionLabel} على ${target} بدون صلاحية ${key}`,
      'high'
    );
  } catch { /* ignore */ }
  const err = new Error(denyMessage(key));
  err.code = 'no-permission';
  throw err;
}

export function showIfCan(can, ...keys) {
  if (typeof can !== 'function') return false;
  return keys.some((k) => can(k));
}