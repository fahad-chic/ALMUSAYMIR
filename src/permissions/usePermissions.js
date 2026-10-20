// src/permissions/usePermissions.js — خطاف الصلاحيات الحي
// يشترك في وثيقة rbac/{uid} لحظياً (onSnapshot) ويحسب المصفوفة الفعّالة.
// ملاحظة أمنية: هذا الخطاف يخفي/يظهر عناصر الواجهة فقط — الفرض الإلزامي
// يتم في قواعد Firestore (hasPerm) التي تقرأ نفس الوثيقة من الخادم، فأي
// تلاعب بكود المتصفح لإظهار زر مخفي يرفضه الخادم عند التنفيذ.
import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { computeEffectiveGrants } from './logic';

export const usePermissions = () => {
  const { user, userRole, isAuthenticated } = useAuth();
  const [rbacDoc, setRbacDoc] = useState(null);
  const [ready, setReady] = useState(false);

  const uid = user?.uid || null;
  const isOwner = userRole === 'owner';

  useEffect(() => {
    if (!isAuthenticated || !uid || isOwner || !db) {
      setRbacDoc(null);
      setReady(true);
      return undefined;
    }
    setReady(false);
    const ref = doc(db, 'rbac', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setRbacDoc(snap.exists() ? snap.data() : null);
        setReady(true);
      },
      () => {
        // رفضت القواعد القراءة — تعامل كوثيقة فارغة (لا صلاحيات)
        setRbacDoc(null);
        setReady(true);
      }
    );
    return () => unsub();
  }, [uid, isAuthenticated, isOwner]);

  return useMemo(() => {
    const role = isOwner ? 'owner' : userRole;
    const { grants, suspended } = computeEffectiveGrants({ role, rbacDoc });
    const can = (key) => grants[key] === true;
    const canAny = (...keys) => keys.some((k) => grants[k] === true);
    return { ready, can, canAny, grants, suspended, isOwner };
  }, [isOwner, userRole, rbacDoc, ready]);
};

export default usePermissions;