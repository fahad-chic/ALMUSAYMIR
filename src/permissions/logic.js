// src/permissions/logic.js — منطق حساب الصلاحيات الفعّالة (نقي وقابل للاختبار)
import {
  OWNER_ONLY_PERMISSION_KEYS,
  PERMISSION_KEYS
} from './catalog';

// يحسب المصفوفة الفعّالة لحساب ما بناءً على دوره ووثيقة rbac الخاصة به.
// - المالك (owner): كل الصلاحيات دائماً ولا يمكن تجميده أو سحبها منه.
// - الحساب المجمّد (suspended): لا صلاحيات إطلاقاً مهما كانت منحه.
// - SUPER_ADMIN_FULL_ACCESS: يفتح كل الصلاحيات الأخرى تلقائياً.
// - أي منحة بمفتاح غير معروف في الكتالوج تُتجاهل (حماية من التلاعب بالبيانات).
export const computeEffectiveGrants = ({ role, rbacDoc }) => {
  const grants = {};
  for (const key of PERMISSION_KEYS) grants[key] = false;

  if (role === 'owner') {
    for (const key of PERMISSION_KEYS) grants[key] = true;
    return { grants, suspended: false, isOwner: true };
  }

  const suspended = rbacDoc?.suspended === true;
  if (suspended) return { grants, suspended: true, isOwner: false };

  const raw = rbacDoc?.grants && typeof rbacDoc.grants === 'object' ? rbacDoc.grants : {};
  for (const key of PERMISSION_KEYS) {
    grants[key] =
      !OWNER_ONLY_PERMISSION_KEYS.has(key) &&
      raw[key] === true;
  }

  if (grants.SUPER_ADMIN_FULL_ACCESS) {
    for (const key of PERMISSION_KEYS) {
      if (!OWNER_ONLY_PERMISSION_KEYS.has(key)) {
        grants[key] = true;
      }
    }
  }

  return { grants, suspended: false, isOwner: false };
};

// يبني وثيقة منح نظيفة للكتابة في Firestore: مفاتيح معروفة فقط وقيم Boolean.
export const sanitizeGrants = (input) => {
  const out = {};
  const raw = input && typeof input === 'object' ? input : {};
  for (const key of PERMISSION_KEYS) {
    if (raw[key] === true) out[key] = true;
  }
  return out;
};

// عدّ المنح المفعّلة في مصفوفة فعّالة (للعرض في الواجهة)
export const countGranted = (grants) =>
  PERMISSION_KEYS.reduce((n, key) => n + (grants?.[key] === true ? 1 : 0), 0);
