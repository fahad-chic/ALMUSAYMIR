// src/hooks/useIsOwner.js
// ============================================================
// بوابة المالك الوحيدة — تُستخدم في كل مكوّنات التحكم بالمحتوى.
// شرط واحد صارم: جلسة موثّقة حقيقية + userRole === 'owner'.
// الزائر والمشرف والموظف: كلهم ممنوعون (لا يعتمد على منح الصلاحيات).
// ============================================================
import { useAuth } from '../context/AuthContext';

export const useIsOwner = () => {
  const { userRole, isAuthenticated } = useAuth();
  return isAuthenticated === true && userRole === 'owner';
};

export default useIsOwner;
