// يضمن وجود جلسة Firebase حقيقية قبل أي عملية Firestore محمية.
// ممنوع الدخول المجهول (signInAnonymously): لا جلسة إلا بحساب Email/Password
// بريده موثّق (emailVerified). بغيابها نُعيد null لتفشل العملية بأمان بدل
// منح وصول ضمني.
import { auth } from '../firebase/config';

export const ensureFirebaseSession = async () => {
  const current = auth?.currentUser;
  if (!current) return null;
  if (current.isAnonymous) return null;
  if (!current.emailVerified) return null;
  return current;
};
