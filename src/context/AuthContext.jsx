// src/context/AuthContext.jsx — نظام المصادقة الحقيقي والمؤمّن 100% عبر Firebase
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { auth as firebaseAuth, db as firebaseDb } from '../firebase/config';
import useStore from '../store/useStore';
import { recordKick, markManualSignOut, consumeManualSignOut } from '../utils/kickLog';

export const AuthContext = createContext(null);

// قراءة ايميلات المالك من ENV مع نفس القيمة الاحتياطية المستخدمة في App.jsx
// وfirebase/index.js — بدونها كانت القائمة فارغة عند غياب المتغير فيُعامل
// المالك كزائر. ثابت على مستوى الوحدة: تعريفها داخل المكوّن كان يُنتج
// مصفوفة جديدة كل render فيُعاد تشغيل تأثير onAuthStateChanged (إلغاء
// اشتراك ثم اشتراك) مع كل تحديث للواجهة.
const OWNER_EMAILS_LIST = (
  import.meta.env.VITE_OWNER_EMAILS || import.meta.env.VITE_ADMIN_EMAILS ||
  'f882771f@gmail.com,kal6667222@gmail.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [confirmationResult, setConfirmationResult] = useState(null);

  const [ownerHiddenMode, setOwnerHiddenMode] = useState(false);

  // آخر مستخدم عضو (غير مجهول) أكدته Firebase — يُستخدم لتمييز "سقوط الجلسة"
  // عن الحالة الابتدائية (لا جلسة أصلاً) عندما يصل null من onAuthStateChanged.
  const lastMemberRef = useRef(null);
  const nullGraceTimerRef = useRef(null);

  const auth = firebaseAuth;
  const db = firebaseDb;

  const OWNER_EMAILS = OWNER_EMAILS_LIST;

  // Alias for backward compatibility - ADMIN_EMAILS is used elsewhere in the codebase
  const ADMIN_EMAILS = OWNER_EMAILS;

  const isOwnerEmail = (email) => typeof email === 'string' && OWNER_EMAILS.includes(email.toLowerCase());

  // تسجيل الأحداث في Firestore
  const logAction = async (action, target, extra = {}) => {
    try {
      await addDoc(collection(db, 'logs'), {
        action,
        target,
        by: auth.currentUser?.uid || 'system',
        byEmail: auth.currentUser?.email || 'system',
        time: serverTimestamp(),
        ...extra
      });
    } catch (e) {
      console.error('Log Error', e);
    }
  };

  // منع الإيميلات الوهمية
  const checkDisposableEmail = async (email) => {
    const domain = email.split('@')[1];
    const disposableDomains = [
      'mailinator.com',
      '10minutemail.com',
      'temp-mail.org',
      'yopmail.com',
      'mohmal.com'
    ];

    if (disposableDomains.includes(domain)) {
      await logAction('DISPOSABLE_EMAIL_ATTEMPT', email, { ip: 'captured_by_backend' });
      throw new Error('ممنوع استخدام الايميلات الوهمية. تم تسجيل المحاولة.');
    }
  };

  // مراقبة حالة تسجيل الدخول
  useEffect(() => {
    // إذا لم يُهيَّأ Firebase (مثل بيئات الاختبار دون مفاتيح)، أوقف التحميل فقط
    if (!auth) {
      setLoading(false);
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // جلسة حية — ألغِ أي مهلة سماح مجدولة من حدث null سابق
          if (nullGraceTimerRef.current) {
            clearTimeout(nullGraceTimerRef.current);
            nullGraceTimerRef.current = null;
          }
          // فعّل الجلسة فوراً بمجرد تأكيد Firebase — انتظار Firestore هنا كان
          // يجمّد المصادقة عندما يتأخر/يتعذر الوصول لقاعدة البيانات، فينتهي
          // مؤقّت ProtectedRoute ويُعاد المستخدم لصفحة الدخول.
          const isAdmin = isOwnerEmail(firebaseUser.email);
          // الزائر المؤقت يدخل بمصادقة Firebase المجهولة — لا يُنشأ له ملف
          // مستخدم ولا يُمنح دور 'user' حتى لا يظهر كعضو؛ دوره يُشتق من
          // جلسة الزائر في useStore (guestActive → 'guest').
          const isAnonymous = !!firebaseUser.isAnonymous;
          // تتبّع آخر جلسة عضو: دخول مجهول (زائر) يستبدل جلسة العضو عمداً
          // من التطبيق نفسه، فلا يُعتبر لاحقاً "سقوط جلسة" غامض.
          lastMemberRef.current = isAnonymous ? null : firebaseUser;
          setUser(firebaseUser);
          setUserRole(isAdmin ? 'owner' : isAnonymous ? null : 'user');
          setIsAuthenticated(true);
          setLoading(false);

          // حبة سام للزائر الراكد: وصول عضو Firebase حقيقي (أو مالك) يعني
          // أن أي هوية زائر قديمة في useStore (chic-guest-session) ملغاة —
          // وإلا تندمج الهوية (user || guestUser) وتحجب المالك/العضو
          // ويعود «يدخل ثم يُرمى لصفحة الدخول» أو «صوت بلا رسالة».
          if (!isAnonymous) {
            try {
              const store = useStore.getState();
              if (store.guestSession?.active) {
                await store.endGuestSession?.('member-logged-in');
              }
              store.clearStaleGuestIdentity?.();
            } catch {
              // غير حرج
            }
          }

          // ثم نُثري الدور من Firestore في الخلفية دون حجب الجلسة
          // (يُتخطى للزائر المجهول — لا ملف مستخدم ولا سجل دخول له)
          if (!isAnonymous) {
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);

              if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                  email: firebaseUser.email,
                  role: isAdmin ? 'owner' : 'user',
                  status: 'active',
                  createdAt: serverTimestamp(),
                  lastLogin: serverTimestamp()
                });
              } else {
                await updateDoc(userDocRef, { lastLogin: serverTimestamp() }).catch(() => {});
                // دورُ Firestore يُحترَم فقط لغير المالك — إيميلات المالك المعتمدة
                // (OWNER_EMAILS) تأخذ 'owner' دائماً، حتى لو سجّلت قاعدة
                // البيانات دوراً أسوأ (كانت تعيد المالك لـ /unauthorized رغم حقه).
                if (!isAdmin) {
                  const role = userDoc.data().role;
                  if (role && role !== 'user') {
                    setUserRole(role);
                  }
                }
              }
            } catch (firestoreErr) {
              // Firestore بطيء أو القواعد تمنع القراءة — الجلسة تبقى صالحة
              console.warn('Firestore user doc unavailable:', firestoreErr?.code);
            }

            logAction('USER_LOGIN', firebaseUser.email).catch(() => {});
          }
        } else {
          const clearSession = () => {
            lastMemberRef.current = null;
            setUser(null);
            setUserRole(null);
            setIsAuthenticated(false);
            setLoading(false);
          };

          if (consumeManualSignOut()) {
            // خروج يدوي مقصود (زر خروج معروف) — امسح فوراً بلا تشخيص
            clearSession();
          } else if (lastMemberRef.current) {
            // كانت لدينا جلسة عضو فعّالة ووصل null دون خروج يدوي — هذا هو
            // "الطرد الصامت". سجّله للتشخيص، ثم امنح مهلة قصيرة وتحقق من
            // الجلسة الحية قبل الهدم: Firebase قد يبعث null لحظياً أثناء
            // تجديد التوكن على شبكة ضعيفة فيطرد العضو بلا سبب حقيقي.
            recordKick('auth-session-lost', {
              email: lastMemberRef.current.email || null,
            });
            setLoading(false);
            if (nullGraceTimerRef.current) clearTimeout(nullGraceTimerRef.current);
            nullGraceTimerRef.current = setTimeout(() => {
              nullGraceTimerRef.current = null;
              if (auth.currentUser) {
                // عادت الجلسة — الحدث القادم من المستمع سيصلح الحالة
                recordKick('auth-session-restored', {
                  email: auth.currentUser.email || null,
                });
              } else {
                clearSession();
              }
            }, 5000);
          } else {
            clearSession();
          }
        }
      } catch (err) {
        console.error('Auth state error:', err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (nullGraceTimerRef.current) {
        clearTimeout(nullGraceTimerRef.current);
        nullGraceTimerRef.current = null;
      }
    };
  }, [auth, db]);

  // تسجيل الدخول بالإيميل + إطلاق الحدث الملكي للمالك
  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        await checkDisposableEmail(email);

        const isAdmin = isOwnerEmail(email);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        if (isAdmin) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(
            userDocRef,
            {
              email: firebaseUser.email,
              role: 'owner',
              status: 'active',
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );

          //  إطلاق الحدث الملكي عند دخول المالك — ما لم يكن دخولاً صامتًا (الزر المخفي)
          const silent =
            typeof window !== 'undefined' &&
            window.sessionStorage.getItem('ownerSilentLogin') === '1';
          if (silent) {
            window.sessionStorage.removeItem('ownerSilentLogin');
          } else {
            window.dispatchEvent(new CustomEvent('ownerLoggedIn'));
          }
        }

        await logAction('LOGIN_SUCCESS', email);

        return firebaseUser;
      } catch (error) {
        await logAction('LOGIN_FAILED', email, { error: error.message });
        throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
    [auth, db]
  );

  // إرسال رمز للجوال
  const sendPhoneOTP = useCallback(
    async (phoneNumber, elementId) => {
      setLoading(true);
      try {
        const recaptchaVerifier = new RecaptchaVerifier(auth, elementId, { size: 'invisible' });
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        setConfirmationResult(confirmation);
      } catch (error) {
        throw new Error(`فشل إرسال الرمز للجوال: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
    [auth]
  );

  // التحقق من رمز الجوال
  const verifyPhoneOTP = useCallback(
    async (otpCode) => {
      if (!confirmationResult) throw new Error('لا توجد جلسة إرسال نشطة');
      setLoading(true);
      try {
        const result = await confirmationResult.confirm(otpCode);
        return result.user;
      } catch {
        throw new Error('رمز التحقق غير صحيح');
      } finally {
        setLoading(false);
      }
    },
    [confirmationResult]
  );

  // وضع التخفي للمالك
  const toggleOwnerHiddenMode = useCallback(() => {
    setOwnerHiddenMode(prev => !prev);
  }, []);

  // تسجيل الخروج — نقطة الخروج الموحّدة لكل الموقع: كل زر خروج في أي صفحة
  // (الترويسة/القائمة/الإشعارات/الإعدادات) يمر من هنا، فيمسح الجلسة
  // المحلية(مفاتيح التخزين + جلسة الزائر + شريط ترحيب المالك) بغض النظر
  // عن نجاح/فشل signOut (شبكة/جلسة منتهية) — فلا يعلق المستخدم أبداً.
  const logout = useCallback(
    async () => {
      try {
        await logAction('USER_LOGOUT', user?.email);
      } catch {
        // غير حرج
      }
      setLoading(true);
      try {
        markManualSignOut();
        await signOut(auth);
      } catch (error) {
        console.error('خطأ أثناء تسجيل الخروج', error);
      } finally {
        // تنظيف الجلسة المحلية دائماً — يضمن الرجوع لصفحة الدخول حتى لو
        // فشل Firebase (شبكة/جلسة منتهية/محاولة أولى بلا جلسة حقيقية)
        try {
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('chic-guest-session');
          try {
            window.sessionStorage.removeItem('rooz_owner_banner');
          } catch {
            // non-critical
          }
          const store = (await import('../store/useStore')).default;
          store.getState().clearStaleGuestIdentity?.().catch(() => {});
        } catch {
          // non-critical
        }
        setLoading(false);
      }
    },
    [auth, user, logAction]
  );

  const value = {
    user,
    userRole,
    isAuthenticated,
    loading,

    // مصادقة
    login,
    logout,


    // OTP للجوال
    sendPhoneOTP,
    verifyPhoneOTP,

    // وضع التخفي للمالك
    ownerHiddenMode,
    toggleOwnerHiddenMode,

    // أدوات إضافية
    logAction,
    ADMIN_EMAILS,
    isOwnerLoggedIn: userRole === 'owner'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || {
  user: null,
  userRole: null,
  isAuthenticated: false,
  loading: false,
  logout: async () => {},
  login: async () => {},
  sendPhoneOTP: async () => {},
  verifyPhoneOTP: async () => ({ success: true }),
  ownerHiddenMode: false,
  toggleOwnerHiddenMode: () => {},
  logAction: async () => {},
  ADMIN_EMAILS: [],
  isOwnerLoggedIn: false,
};
