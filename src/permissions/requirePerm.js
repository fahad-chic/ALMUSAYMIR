// src/permissions/requirePerm.js
// واجهة التحقق من الصلاحيات قبل الإجراءات الحساسة.
// المنطق مربوط بـ rbacService (التسجيل + نفس الرسائل).

export {
  requirePerm,
  showIfCan,
  showIfCanAny,
  denyMessage,
  guardedAction,
} from './rbacService';

export { requirePerm as default } from './rbacService';
