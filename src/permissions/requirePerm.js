// مساعد موحّد للتحقق من الصلاحية قبل أي إجراء حساس
import { logPermissionAudit } from './rbacService';

export const denyMessage = (key) =>
  `لا تملك صلاحية تنفيذ هذا الإجراء (${key}). تواصل مع صاحب الموقع.`;

/** يتحقق محلياً؛ يرمي Error برسالة عربية ويسجّل المحاولة */
export async function requirePerm(can, key, actionLabel = key, target = '-') {
  if (typeof can === 'function' && can(key)) return true;
  try {
    await logPermissionAudit(
      'permission_denied_local',
      `محاولة ${actionLabel} على ${target} بدون صلاحية ${key}`,
      'high'
    );
  } catch {
    /* التسجيل لا يوقف الرفض */
  }
  const err = new Error(denyMessage(key));
  err.code = 'no-permission';
  throw err;
}

/** للعرض: هل يظهر الزر؟ */
export function showIfCan(can, ...keys) {
  if (typeof can !== 'function') return false;
  return keys.some((k) => can(k));
}

export default requirePerm;
