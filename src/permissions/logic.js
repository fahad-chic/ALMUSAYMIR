// src/permissions/logic.js — منطق حساب الصلاحيات الفعّالة (نقي وقابل للاختبار)
import * as permissionCatalog from './catalog';

const PERMISSION_KEYS = permissionCatalog.PERMISSION_KEYS;
const OWNER_ONLY_PERMISSION_KEYS =
  permissionCatalog.OWNER_ONLY_PERMISSION_KEYS ||
  new Set([
    'MONITOR_PRIVATE_MESSAGES',
    'VIEW_SYSTEM_AUDIT_LOGS',
    'TRACK_EMPLOYEE_LIVE_SESSIONS',
    'FIREBASE_MUTATION_LOGS',
    'RECOVER_DELETED_ITEMS_ARCHIVE',
    'TRACK_FAILED_LOGINS',
    'MONITOR_USER_TRAFFIC_LIVE'
  ]);
const DEFERRED_PERMISSION_KEYS = permissionCatalog.DEFERRED_PERMISSION_KEYS || new Set();

// صلاحية قابلة للمنح من الواجهة: ليست owner-only وليست مؤجلة.
const isGrantableKey = (key) =>
  !OWNER_ONLY_PERMISSION_KEYS.has(key) && !DEFERRED_PERMISSION_KEYS.has(key);

// يحسب المصفوفة الفعّالة لحساب ما بناءً على دوره ووثيقة rbac الخاصة به.
// - المالك (owner): كل الصلاحيات دائماً ولا يمكن تجميده أو سحبه منه.
// - الحساب المجمّد (suspended) أو المحظور (banned): لا صلاحيات إطلاقاً.
// - SUPER_ADMIN_FULL_ACCESS: يفتح كل الصلاحيات الأخرى تلقائياً.
// - أي منحة بمفتاح غير معروف في الكتالوج تُتجاهل (حماية من التلاعب بالبيانات).
// ملاحظة: هذا حساب واجهة فقط — الفرض الإلزامي في قواعد Firestore (hasPerm)
// التي تقرأ نفس الوثيقة من الخادم عند كل عملية.
export const computeEffectiveGrants = ({ role, rbacDoc }) => {
  const grants = {};
  for (const key of PERMISSION_KEYS) grants[key] = false;

  if (role === 'owner') {
    for (const key of PERMISSION_KEYS) grants[key] = true;
    return { grants, suspended: false, isOwner: true };
  }

  const suspended = rbacDoc?.suspended === true || rbacDoc?.banned === true;
  if (suspended) return { grants, suspended: true, isOwner: false };

  const raw = rbacDoc?.grants && typeof rbacDoc.grants === 'object' ? rbacDoc.grants : {};
  for (const key of PERMISSION_KEYS) {
    grants[key] =
      isGrantableKey(key) &&
      raw[key] === true;
  }

  if (grants.SUPER_ADMIN_FULL_ACCESS) {
    for (const key of PERMISSION_KEYS) {
      if (isGrantableKey(key)) {
        grants[key] = true;
      }
    }
  }

  return { grants, suspended: false, isOwner: false };
};

// يبني وثيقة منح نظيفة للكتابة في Firestore: مفاتيح معروفة فقط وقيم Boolean.
// تُستثنى الصلاحيات المؤجلة فلا تُكتب أبداً (لا تنفيذ ولا بيانات وهمية).
export const sanitizeGrants = (input) => {
  const out = {};
  const raw = input && typeof input === 'object' ? input : {};
  for (const key of PERMISSION_KEYS) {
    if (raw[key] === true && !DEFERRED_PERMISSION_KEYS.has(key)) out[key] = true;
  }
  return out;
};

// عدّ المنح المفعّلة في مصفوفة فعّالة (للعرض في الواجهة)
export const countGranted = (grants) =>
  PERMISSION_KEYS.reduce((n, key) => n + (grants?.[key] === true ? 1 : 0), 0);
