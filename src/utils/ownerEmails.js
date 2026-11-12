// مصدر واحد لإيميلات المالك/المشرف — تُقرأ من متغيرات البيئة فقط.
// لا قيم احتياطية مكتوبة في الكود (قرار المالك): إن غابت المتغيرات تكون
// القائمة فارغة ولا يُعامل أحد كمالك في الواجهة.
//
// ملاحظة أمنية: الفرض الحقيقي للملكية على الخادم في firestore.rules
// (isOwner) — هذه القائمة للواجهة فقط.

const RAW_OWNER_EMAILS =
  import.meta.env.VITE_OWNER_EMAILS ||
  import.meta.env.VITE_ADMIN_EMAILS ||
  '';

export const OWNER_EMAILS = RAW_OWNER_EMAILS
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const OWNER_EMAIL_SET = new Set(OWNER_EMAILS);

export const isOwnerEmail = (email) =>
  typeof email === 'string' && OWNER_EMAIL_SET.has(email.trim().toLowerCase());
