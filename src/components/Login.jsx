// src/components/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { BRAND } from '../data/brand';
import { auth } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  Crown,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  UserPlus,
  KeyRound,
  MailOpen,
  Phone,
} from 'lucide-react';
import OtpModal from './OtpModal';
import ContactOwnerModal from './ContactOwnerModal';
import { markManualSignOut, readKickLog, kickReasonLabel } from '../utils/kickLog';
import '../styles/global.css';
import '../styles/LoginNova.css';

const OWNER_MARQUEE = 'تم تسجيل دخول صاحب موقع "المسيمير | ALMUSAYMIR" ويُرحّب بكم جميعاً ويتمنى لكم تجربة تسوّق ممتعة ترضي ذائقتكم الرفيعة. يُذكِّركم بأن من لديه اقتراح أو ملاحظة أو شكوى على أحد موظفي الموقع أو على أي شخص بسبب النصب أو الاحتيال، يتوجّه إلى غرفة صاحب موقع "المسيمير | ALMUSAYMIR" ويتقدّم برسالة مفصّلة. وفي حال كانت الشكوى نصب واحتيال فسيتم اتخاذ الإجراءات اللازمة فوراً، سواء من قِبَل صاحب الموقع أو بإحالة الموضوع إلى الجهات الأمنية المختصّة بشكل عاجل، حفاظاً على حقوقكم وسلامة تعاملاتكم. المسيمير | ALMUSAYMIR — حيث الأناقة تلتقي بالثقة.';
const OWNER_SOUND_URL = '/sounds/welcome.mp3';
const API_BASE = '/api';

// بريدا المالك المعتمدان — نفس القيمة الاحتياطية في App.jsx وAuthContext
// وfirebase/index.js. كل مسار دخول مالك (OTP/احتياطي/سري) يجب أن يمر
// بهذا الفحص قبل فتح صفحات المالك — بدونه كان أي حساب مسجّل يدخل
// /owner-panel لو اختار بطاقة المالك أو عرف الرمز السري.
const OWNER_EMAIL_SET = new Set(
  (
    import.meta.env.VITE_OWNER_EMAILS ||
    import.meta.env.VITE_ADMIN_EMAILS ||
    'f882771f@gmail.com,kal6667222@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const token = localStorage.getItem('auth_token');

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ');
  }

  return data;
}

const publishOwnerBroadcast = async (message, soundUrl) => {
  try {
    let token = localStorage.getItem('auth_token');

    if (!token && auth?.currentUser) {
      token = await auth.currentUser.getIdToken();

      if (token) {
        localStorage.setItem('auth_token', token);
      }
    }

    return await apiCall('/broadcast', 'POST', {
      message,
      soundUrl,
      type: 'owner-entry',
    });
  } catch (err) {
    console.error('Broadcast error:', err);
    return null;
  }
};

const Login = () => {
  const store = useStore();
  const navigate = useNavigate();

  // لا بطاقة مُختارة افتراضياً — الزوار والعملاء يدخلون مباشرة كنموذج
  // دخول رئيسي موحّد؛ صاحب الموقع/المشرف يضغط بطاقته فيتخصص العنوان والمسار.
  // لا يُخزّن الاختيار — كل تحديث للصفحة يعود للوضع المحايد.
  const [selectedRole, setSelectedRole] = useState(null);

  // سجل تشخيص الطرد الصامت — يُقرأ مرة عند فتح الصفحة ويُطبع في الـ Console
  const [kickEntries] = useState(() => readKickLog());

  useEffect(() => {
    if (kickEntries.length > 0) {
      console.info(
        '[ALMUSAYMIR] آخر أسباب الرجوع لصفحة الدخول:',
        kickEntries.slice(-3).reverse().map((entry) => ({
          at: new Date(entry.at).toLocaleTimeString('ar-SA'),
          reason: kickReasonLabel(entry.reason),
          path: entry.path || '',
        }))
      );
    }
  }, [kickEntries]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // وضع الدخول المخفي بالرمز السري (زر ®️ المخفي)
  const [hiddenMode, setHiddenMode] = useState(false);
  const [secretCode, setSecretCode] = useState('');

  // خانات البريد وكلمة المرور داخل المودال نفسه — المودال أصبح مكتفياً
  // ذاتياً ولا يعتمد على النموذج الرئيسي (تُعبَّى مبدئياً من قيم النموذج
  // الحالية وتُحرَّر داخل المودال مباشرة).
  const [secretEmail, setSecretEmail] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [secretError, setSecretError] = useState('');
  const [secretLoading, setSecretLoading] = useState(false);

  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [otpModal, setOtpModal] = useState(null);
  const [googleEmailConfirm, setGoogleEmailConfirm] = useState('');
  const [googleUserObj, setGoogleUserObj] = useState(null);

  // دخول الزوار: رقم الهاتف فقط — دخول مؤقت مباشر لمدة دقيقتين بلا تحقق
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEntryOpen, setGuestEntryOpen] = useState(false);

  // خلفية الصفحة عند ظهورها — لؤلؤية فاتحة منسجمة مع هوية ALMUSAYMIR
  useEffect(() => {
    const previous = document.body.style.background;

    document.body.style.background =
      'radial-gradient(1100px 600px at 80% -15%, rgba(var(--rz-gold-rgb), 0.10), transparent 60%), radial-gradient(700px 400px at 15% 25%, rgba(var(--rz-ink-rgb), 0.06), transparent 55%), linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 45%, var(--rz-sand) 100%)';

    return () => {
      document.body.style.background = previous;
    };
  }, []);

  useEffect(() => {
    if (timer <= 0) return;

    const id = setTimeout(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [timer]);

  useEffect(() => {
    try {
      const msg = window.sessionStorage.getItem(
        'guestExpiredMsg'
      );

      if (msg) {
        // نُظهر الرسالة فقط دون فرض بطاقة معيّنة — فرْض بطاقة المشرفين
        // هنا كان يربك المالك القادم لتسجيل الدخول بعد انتهاء جلسة زائر
        setError(msg);

        window.sessionStorage.removeItem(
          'guestExpiredMsg'
        );
      }
    } catch {
      // sessionStorage may be unavailable
    }
  }, []);

  // مرجعا قسم النموذج وخانة البريد — ضغطة بطاقة المالك/المشرفين تنقل
  // المستخدم مباشرة إلى النموذج (كانت تغيّر العنوان فقط، فيظن أن الضغطة
  // لم تعمل خصوصاً على الجوال حيث النموذج أسفل الشاشة).
  const formSectionRef = useRef(null);
  const emailInputRef = useRef(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setSuccess('');

    if (typeof store.setOtpSent === 'function') {
      store.setOtpSent(false);
    }

    formSectionRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    });

    // التركيز بعد اكتمال التمرير السلس حتى لا يقاطعه المتصفح
    setTimeout(() => {
      emailInputRef.current?.focus({ preventScroll: true });
    }, 400);
  };

  const handleOwnerBroadcast = async () => {
    try {
      if (!localStorage.getItem('auth_token') && auth?.currentUser) {
        const idToken = await auth.currentUser.getIdToken();

        if (idToken) {
          localStorage.setItem('auth_token', idToken);
        }
      }

      const posted = await publishOwnerBroadcast(
        OWNER_MARQUEE,
        OWNER_SOUND_URL
      );

      // إطلاق الشريط والصوت فوراً على جهاز المالك نفسه (ضمن نافذة تفاعل
      // المستخدم حتى لا يحظر المتصفح الصوت) — بث D1 يغطي بقية الأجهزة،
      // وتمرير id يمنع تكرار الصوت عندما يلتقطه الاستطلاع الدوري.
      window.dispatchEvent(
        new CustomEvent('ownerLoggedIn', {
          detail: {
            id: posted?.id ?? null,
            message: OWNER_MARQUEE,
          },
        })
      );
    } catch {
      // Silent fail
    }
  };

  const handleOtpVerified = async (
    verifiedEmail,
    verifiedPassword,
    authInstance,
    role
  ) => {
    setOtpModal(null);
    setLoading(true);
    setError('');

    try {
      // الجلسة موجودة أصلاً من handleLogin — لا نُعيد signInWithEmailAndPassword
      // على iOS/WebKit: إعادة الدخول فوراً بعد signOut تُفقد التوكن في IndexedDB
      // فيرى ProtectedRoute جلسة فارغة ويطرد المالك رغم نجاح OTP.
      if (!authInstance.currentUser) {
        await signInWithEmailAndPassword(
          authInstance,
          verifiedEmail,
          verifiedPassword
        );
      }

      // حفظ توكن المالك فوراً — تستخدمه نقاط /api/broadcast وحمايات الخادم
      if (role === 'owner' && authInstance?.currentUser) {
        const idToken = authInstance.currentUser
          ? await authInstance.currentUser.getIdToken()
          : null;

        if (idToken) {
          localStorage.setItem('auth_token', idToken);
        }
      }

      // بوابة أمنية: بطاقة "مالك" لا تكفي — البريد نفسه يجب أن يكون مالكاً
      // معتمداً، وإلا أُلغيت الجلسة فوراً ورفض الدخول.
      if (
        role === 'owner' &&
        !OWNER_EMAIL_SET.has(
          verifiedEmail.trim().toLowerCase()
        )
      ) {
        markManualSignOut();
        await signOut(authInstance);

        setError(
          'هذا الحساب غير مصرّح له بدخول صفحة صاحب الموقع'
        );

        setLoading(false);
        return;
      }

      setSuccess(
        'تم تسجيل الدخول بنجاح! جاري تحويلك...'
      );

      if (role === 'owner') {
        try {
          await handleOwnerBroadcast();
        } catch (broadcastErr) {
          console.warn(
            'broadcast skipped:',
            broadcastErr?.message
          );
        }
      }

      setLoading(false);

      // بعد الدخول يهبط المستخدم على الرئيسية دائماً (بطلب المالك) —
      // غرفة المالك تُفتح من زر التاج في الترويسة.
      navigate('/', { replace: true });
    } catch (err) {
      console.error(
        'post-OTP login error:',
        err?.code,
        err?.message
      );

      // لا نعيد فتح مودال OTP هنا — الكود استُهلك وحُذف من الخادم عند نجاح
      // التحقق، فإعادة فتحه تُدخل المستخدم في حلقة مفرغة. نظهر الخطأ في
      // نموذج الدخول ليعيد المحاولة من البداية برمز جديد.
      setError(
        (
          err?.code === 'auth/wrong-password' ||
          err?.code === 'auth/invalid-credential'
        )
          ? 'كلمة المرور غير صحيحة — تحقق منها وأعد تسجيل الدخول'
          : err?.code === 'auth/network-request-failed'
            ? 'تعذّر الاتصال بخوادم المصادقة — تحقق من الإنترنت أو عطّل حاجب الإعلانات/الشبكة الافتراضية ثم أعد المحاولة'
            : err?.code === 'auth/too-many-requests'
              ? 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة'
              : `تعذّر إكمال الدخول (${err?.code || 'خطأ'}) — حاول مجدداً`
      );

      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // تشخيص مرئي فوري — يظهر حتى قبل فحص auth
    console.log(
      '[LOGIN] handleLogin called',
      {
        hasEmail: !!email,
        hasPass: !!password,
      }
    );

    if (!auth) {
      // رسالة أوضح للمالك — تساعد على تشخيص إعدادات Firebase مباشرة
      const missing = [
        'apiKey',
        'projectId',
        'appId',
      ].filter(
        (k) =>
          !String(
            import.meta.env[
              `VITE_FIREBASE_${k.toUpperCase()}`
            ] || ''
          ).trim()
      );

      setError(
        missing.length
          ? `إعدادات Firebase ناقصة (${missing.join(', ')}). أضِفها في Cloudflare Pages → Environment Variables ثم أعد النشر.`
          : 'خدمة المصادقة غير متاحة حالياً. تحقق من اتصال الإنترنت وحاول لاحقاً.'
      );

      return;
    }

    if (!email || !password) {
      setError(
        'يرجى إدخال البريد الإلكتروني وكلمة المرور'
      );

      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const authInstance = auth;

      console.log(
        '[LOGIN] Firebase signIn attempt for:',
        email.trim()
      );

      const signInResult =
        await signInWithEmailAndPassword(
          authInstance,
          email.trim(),
          password
        );

      console.log(
        '[LOGIN] Firebase signIn success, uid:',
        signInResult.user.uid
      );

      // امسح أي هوية زائر راكدة فور نجاح مصادقة Firebase — قبل فتح مودال
      // OTP حتى لا تستمر مؤقّتات الزائر القديمة بالعمل في الخلفية ولا تبقى
      // userRole='guest' تلطخ الدور لحظات بعد الدخول (كانت تظهر «صوت فقط
      // بلا رسالة» وتطرد المالك عبر تأثير guestExpired في التطبيق الجديد).
      try {
        await store.clearStaleGuestIdentity?.();
      } catch {
        // non-critical
      }

      const otpResult = await store.sendOtp(
        email.trim(),
        'login'
      );

      console.log(
        '[LOGIN] OTP send result:',
        otpResult
      );

      // التحقق الثنائي (OTP) إجباري للحماية — لا يُسمح بالدخول بدون كود التحقق.
      // إن تعذّر إرسال الكود نُلغي الجلسة المؤقتة ونُظهر رسالة واضحة.
      if (!otpResult?.success) {
        console.warn(
          'OTP unavailable — login blocked for security:',
          otpResult?.error
        );

        try {
          markManualSignOut();
          await signOut(authInstance);
        } catch {
          // non-critical
        }

        setError(
          otpResult?.error
            ? `تعذّر إرسال كود التحقق: ${otpResult.error}. حاول مرة أخرى بعد قليل.`
            : 'تعذّر إرسال كود التحقق الثنائي. يرجى المحاولة لاحقاً أو تواصل مع الدعم.'
        );

        setLoading(false);
        return;
      }

      // لا نُسجّل الخروج هنا — على iOS/WebKit يتعارض signOut ثم signIn
      // الفوري مع IndexedDB فيُفقد التوكن، فيرى ProtectedRoute جلسة فارغة
      // ويطرد المالك رغم نجاح OTP. الجلسة الجديدة تستبدل القديمة تلقائياً.

      setSuccess(
        'تم إرسال كود التحقق إلى بريدك'
      );

      setOtpModal({
        email: email.trim(),
        purpose: 'login',
        onVerified: () =>
          handleOtpVerified(
            email.trim(),
            password,
            authInstance,
            selectedRole
          ),
      });
    } catch (err) {
      const code = err?.code || '';

      let msg =
        err.message ||
        'حدث خطأ، حاول مجدداً';

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        msg =
          'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (
        code === 'auth/too-many-requests'
      ) {
        msg =
          'محاولات كثيرة، حاول لاحقاً';
      } else if (
        code === 'auth/network-request-failed'
      ) {
        msg =
          'تعذّر الاتصال بخوادم المصادقة — تحقق من اتصال الإنترنت، أو عطّل حاجب الإعلانات/VPN، أو امسح بيانات الموقع من إعدادات المتصفح ثم أعد المحاولة';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const authInstance = auth;
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(
        authInstance,
        provider
      );

      const gUser = result.user;

      markManualSignOut();
      await signOut(authInstance);

      setGoogleUserObj(gUser);
      setGoogleEmailConfirm('');
      setError('');

      setSuccess(
        `اخترت حساب ${gUser.email} — للتأكد، اكتب نفس البريد بالأسفل`
      );
    } catch (err) {
      const code = err?.code || '';

      let msg =
        err.message ||
        'فشل تسجيل الدخول بجوجل';

      if (
        code ===
        'auth/popup-closed-by-user'
      ) {
        msg =
          'تم إغلاق نافذة Google';
      } else if (
        code ===
        'auth/cancelled-popup-request'
      ) {
        msg = 'تم إلغاء العملية';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConfirmEmail = async () => {
    setError('');
    setSuccess('');

    if (!googleUserObj) {
      setError(
        'تعذّر تحديد حساب Google، حاول مجدداً'
      );

      return;
    }

    const typed =
      googleEmailConfirm
        .trim()
        .toLowerCase();

    const real =
      (googleUserObj.email || '')
        .trim()
        .toLowerCase();

    if (!typed) {
      setError(
        'اكتب نفس البريد المرتبط بحساب Google'
      );

      return;
    }

    if (typed !== real) {
      setError(
        'البريد الذي كتبته لا يطابق حساب Google الذي اخترته'
      );

      return;
    }

    setLoading(true);

    // إكمال دخول Google بعد التحقق (سواء عبر OTP أو بالمسار الاحتياطي) —
    // يعيد فتح نافذة Google للتأكد أن الحساب المختار هو نفسه المؤكَّد.
    const completeGoogleLogin = async () => {
      setOtpModal(null);
      setLoading(true);

      try {
        const provider =
          new GoogleAuthProvider();

        const res2 =
          await signInWithPopup(
            auth,
            provider
          );

        const u2 = res2.user;

        if (
          (u2.email || '')
            .trim()
            .toLowerCase() !== real
        ) {
          markManualSignOut();
          await signOut(auth);

          setError(
            'تم اختيار حساب Google مختلف عن المؤكّد. أعد المحاولة.'
          );
        } else {
          // امسح أي هوية زائر راكدة قبل إكمال دخول Google الحقيقي
          try {
            await store.clearStaleGuestIdentity?.();
          } catch {
            // non-critical
          }

          const storeResult =
            await store.loginWithGoogle(u2);

          if (!storeResult?.success) {
            throw new Error(
              storeResult?.error ||
                'تعذّر إكمال الدخول'
            );
          }

          // دخول المالك عبر Google يُعلَن مثل بقية المسارات (شريط + صوت)
          if (OWNER_EMAIL_SET.has(real)) {
            try {
              await handleOwnerBroadcast();
            } catch {
              // بث الترحيب لا يوقف الدخول
            }
          }

          setSuccess(
            'تم تسجيل الدخول عبر Google بنجاح! '
          );

          navigate('/');
        }
      } catch (err) {
        setError(
          err.message ||
            'تعذّر إكمال الدخول'
        );
      } finally {
        setLoading(false);
      }
    };

    try {
      const result = await store.sendOtp(
        real,
        'google'
      );

      if (!result?.success) {
        // التحقق الثنائي إجباري حتى مع Google — لا نكمل بدون OTP.
        console.warn(
          'OTP unavailable for Google login — blocked for security:',
          result?.error
        );

        setError(
          result?.error
            ? `تعذّر إرسال كود التحقق: ${result.error}. حاول مرة أخرى بعد قليل.`
            : 'تعذّر إرسال كود التحقق الثنائي. يرجى المحاولة لاحقاً.'
        );

        setLoading(false);
        return;
      }

      setSuccess(
        'تم إرسال كود التحقق إلى بريدك'
      );

      setOtpModal({
        email: real,
        purpose: 'google',
        onVerified: completeGoogleLogin,
      });
    } catch (err) {
      setError(
        err.message ||
          'تعذّر إرسال كود التحقق'
      );
    } finally {
      setLoading(false);
    }
  };

  const completeGuestLogin = async (verifiedEmail) => {
    setError('');
    setSuccess('');

    // إنهِ أي جلسة زائر سابقة قبل بدء جلسة جديدة — مؤقّتها القديم كان
    // يبقى يعمل في الخلفية ويستدعي signOut فيُسقِط الدخول الجديد (كان
    // يطرد حتى المالك إذا سجّل دخوله بعد زائر مباشرة). endGuestSession
    // يوقّف المؤقّتات، ومسح مفتاح التخزين يمنع استرجاع آثارها عند التحديث.
    // (نلغي clearStaleGuestIdentity هنا — guestLogin نفسه يبني الجلسة
    // وينظّف السابقة بأمان عبر startGuestSession/endGuestSession، فلا
    // تُمسح هوية الزائر الجديد لحظة بنائه فيُرمى لصفحة الدخول.)

    try {
      await store.endGuestSession?.(
        'restart'
      );

      localStorage.removeItem(
        'chic-guest-session'
      );
    } catch {
      // غير حرج — نكمل الدخول
    }

    const result =
      await store.guestLogin(verifiedEmail);

    if (!result?.success) {
      throw new Error(
        result?.error ||
          'فشل الدخول كزائر'
      );
    }

    setSuccess(
      'تم الدخول كزائر بنجاح!'
    );

    navigate('/');
  };

  // دخول الزوار — التحقق برمز يصل إلى البريد الإلكتروني إجباري (Email OTP)
  const handleGuestOtpRequest = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    const email =
      String(guestEmail || '')
        .trim()
        .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('أدخل بريداً إلكترونياً صحيحاً');

      setLoading(false);

      return;
    }

    try {
      const otpResult = await store.sendOtp(email, 'login');

      if (!otpResult?.success) {
        setError(
          otpResult?.error
            ? `تعذّر إرسال كود التحقق: ${otpResult.error}. حاول مرة أخرى بعد قليل.`
            : 'تعذّر إرسال كود التحقق. حاول مرة أخرى بعد قليل.'
        );

        return;
      }

      setGuestEntryOpen(false);
      setSuccess('تم إرسال كود التحقق إلى بريدك');
      setOtpModal({
        email,
        purpose: 'login',
        onVerified: () => completeGuestLogin(email),
      });
    } catch (err) {
      setError(
        err?.message ||
          'تعذّر إرسال كود التحقق — حاول مرة أخرى'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * المفتاح الذهبي:
   * - ضغطة واحدة: لا شيء.
   * - ضغطتان: لا شيء.
   * - 3 ضغطات خلال 1.2 ثانية: اختيار صاحب الموقع.
   *
   * e.stopPropagation() مهم جداً حتى لا تتعارض
   * ضغطة المفتاح مع onClick الخاص بمربع صاحب الموقع.
   */

  // الزر المخفي: 3 ضغطات متتالية خلال 1.2 ثانية تفتح خانة الرمز السري
  const hiddenTapRef = useRef({
    count: 0,
    timer: null,
  });

  const [hiddenTapCount, setHiddenTapCount] =
    useState(0);

  const [showOwnerContact, setShowOwnerContact] =
    useState(false);

  const handleHiddenTrigger = (e) => {
    e.stopPropagation();

    const ref = hiddenTapRef.current;

    ref.count += 1;

    setHiddenTapCount(ref.count);

    if (ref.timer) {
      clearTimeout(ref.timer);
    }

    ref.timer = setTimeout(() => {
      ref.count = 0;
      ref.timer = null;
      setHiddenTapCount(0);
    }, 2500);

    if (ref.count >= 3) {
      clearTimeout(ref.timer);

      ref.count = 0;
      ref.timer = null;

      setHiddenTapCount(0);

      setHiddenMode(true);
      setSecretCode('');
      setSecretError('');

      // نسحب قيم النموذج الرئيسي مبدئياً — المستخدم يحرّرها داخل المودال
      setSecretEmail(email);
      setSecretPassword(password);
    }
  };

  // الرمز السري لبوابة المالك المخفية — يُقرأ حصراً من متغير البناء VITE_OWNER_SECRET_CODE؛
  // لا توجد قيمة افتراضية في الكود — إن لم يُضبط المتغير تبقى البوابة مقفلة تماماً.
  // الحماية الفعلية مضاعفة حتى مع معرفة الرمز: البريد يجب أن يكون من
  // إيميلات المالك المعتمدة + كلمة مرور Firebase + قفل 15د بعد 5 محاولات.
  const OWNER_SECRET_CODE = String(
    import.meta.env.VITE_OWNER_SECRET_CODE || ''
  ).trim();

  // عدّاد محاولات الرمز السري الفاشلة — يقفل المودال مؤقتاً ضد التخمين
  const secretAttemptsRef = useRef({
    count: 0,
    lockedUntil: 0,
  });

  const hiddenInputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(var(--rz-primary-rgb), 0.5)',
    background: 'rgba(var(--rz-ink-rgb), 0.6)',
    color: 'var(--rz-white)',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'inherit',
    marginBottom: 10,
  };

  const handleHiddenLogin = async (e) => {
    e.preventDefault();

    if (secretLoading) return;

    if (!auth) {
      setSecretError(
        'خدمة المصادقة غير متاحة حالياً.'
      );

      return;
    }

    if (
      !secretEmail.trim() ||
      !secretPassword
    ) {
      setSecretError(
        'أدخل البريد وكلمة المرور والرمز السري'
      );

      return;
    }

    const attempts =
      secretAttemptsRef.current;

    if (
      Date.now() <
      attempts.lockedUntil
    ) {
      setSecretError(
        'محاولات كثيرة — انتظر دقائق ثم أعد المحاولة'
      );

      return;
    }

    if (
      !OWNER_SECRET_CODE ||
      secretCode.trim() !==
        OWNER_SECRET_CODE
    ) {
      attempts.count += 1;

      // 5 محاولات فاشلة = قفل 15 دقيقة ضد التخمين الآلي
      if (attempts.count >= 5) {
        attempts.count = 0;

        attempts.lockedUntil =
          Date.now() +
          15 * 60 * 1000;

        setSecretError(
          'محاولات كثيرة — انتظر دقائق ثم أعد المحاولة'
        );
      } else {
        setSecretError(
          'الرمز السري غير صحيح'
        );
      }

      setSecretCode('');

      return;
    }

    attempts.count = 0;

    // البريد نفسه يجب أن يكون مالكاً معتمداً — معرفة الرمز السري وحده
    // لا تفتح صفحات المالك لأي حساب آخر.
    if (
      !OWNER_EMAIL_SET.has(
        secretEmail
          .trim()
          .toLowerCase()
      )
    ) {
      setSecretError(
        'هذا البريد غير مصرّح له بدخول صفحة صاحب الموقع'
      );

      return;
    }

    setSecretError('');
    setSecretLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        secretEmail.trim(),
        secretPassword
      );

      // امسح أي هوية زائر راكدة (إصلاح سباق «صوت فقط بلا رسالة»)
      try {
        await store.clearStaleGuestIdentity?.();
      } catch {
        // non-critical
      }

      // دخول المالك يُعلَن دائماً (شريط + صوت) — المسار السري كان صامتاً
      // عمداً فلا تصل رسالة الترحيب ولا الصوت رغم نجاح الدخول.
      try {
        await handleOwnerBroadcast();
      } catch {
        // بث الترحيب لا يوقف الدخول
      }

      setHiddenMode(false);
      setSecretLoading(false);

      navigate('/', {
        replace: true,
      });
    } catch (err) {
      setSecretError(
        err?.code ===
          'auth/wrong-password' ||
        err?.code ===
          'auth/invalid-credential'
          ? 'بيانات الدخول غير صحيحة'
          : 'تعذّر الدخول، حاول لاحقاً'
      );

      setSecretLoading(false);
    }
  };

  // 🔑 يفتح نفس مودال ®️ المخفي — بدون التوجيه لعدّاد مستقل كان يفتح
  // المودال بلا تعبئة مبدئية للبريد/المرور.
  const handleOwnerSecretTap = (e) =>
    handleHiddenTrigger(e);

  const roleCards = [
    {
      icon: Crown,
      role: 'owner',
      title: 'دخول صاحب موقع “المسيمير | ALMUSAYMIR”',
      subtitle: 'الإدارة والإشراف العام',
      phrase:
        'متجر المسيمير | ALMUSAYMIR يسعى لراحة الزوار وتلبية تطلعاتهم برؤية مبتكرة تجمع بين جودة الإدارة وثقة التعامل.',
      big: true,
    },
    {
      icon: Shield,
      role: 'admin',
      title: 'دخول المشرفين والمراقبين',
      subtitle: 'حراس الفخامة',
      phrase:
        'طاقة العطاء الدائمة، يضبطون الإيقاع ويحسمون التفاصيل لتظل تجربة زوارنا مثالية بلا عيوب.',
      big: false,
    },
  ];

  return (
    <div
      className="rl-root"
      style={{
        background: 'var(--rz-white)',
      }}
    >
      <div className="rl-wrap">
        <header className="rl-head">
        <div className="rl-crown-ic">
          <img
            src={BRAND.LOGO}
            alt="شعار المسيمير | ALMUSAYMIR"
          />
        </div>

        <div className="rl-tag">
          المسيمير | ALMUSAYMIR
        </div>
      </header>

      <section
        className="rl-cards animate-fadeInSoft"
        aria-label="نوع الدخول"
      >
        {roleCards.map((r) => (
          <div
            key={r.role}
            role="button"
            tabIndex={0}
            className={[
              'rl-card',
              r.big
                ? 'rl-card--big'
                : '',
              selectedRole === r.role
                ? 'rl-card--active'
                : '',
            ].join(' ')}
            onClick={() =>
              handleRoleSelect(r.role)
            }
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' ||
                e.key === ' '
              ) {
                e.preventDefault();
                handleRoleSelect(
                  r.role
                );
              }
            }}
            aria-label={r.title}
          >
            <span className="rl-card-crown-line">
              <img
                src={BRAND.LOGO}
                alt=""
                className="rl-card-logo"
              />
            </span>
            <span className="rl-card-title text-royal-gold font-bold">
              {r.title}
            </span>

            <span className="rl-card-sub text-royal-goldSoft">
              {r.subtitle}
            </span>

            <span className="rl-card-phrase text-royal-white">
              {r.phrase}
            </span>

            {r.big && (
              <span className="rl-owner-badge text-royal-gold">
                <span
                  className="rl-badge-mark"
                  aria-hidden="true"
                >
                  ®️
                </span>

                <span style={{ color: 'var(--rz-white)', fontWeight: 900 }}>المالك الرئيسي</span>

                <button
                  type="button"
                  className="rl-badge-mark rl-hidden-trigger"
                  onClick={
                    handleHiddenTrigger
                  }
                  aria-label="دخول مخفي"
                  title=" "
                >
                  ®️
                </button>
              </span>
            )}

            {r.big &&
              hiddenTapCount > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    marginTop: 6,
                    fontSize: 11,
                    color:
                      'rgba(var(--rz-primary-rgb), 0.55)',
                    letterSpacing: 1,
                  }}
                >
                  {'●'.repeat(
                    hiddenTapCount
                  )}
                  {'○'.repeat(
                    Math.max(
                      0,
                      3 -
                        hiddenTapCount
                    )
                  )}
                </span>
              )}

            {r.big && (
              <button
                type="button"
                className="rl-contact-owner"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOwnerContact(
                    true
                  );
                }}
              >
                <MailOpen
                  size={16}
                  aria-hidden="true"
                />
                لمراسلة صاحب الموقع اضغط هنا
              </button>
            )}
          </div>
        ))}
      </section>

      <section
        className="rl-form-card"
        ref={formSectionRef}
      >
        <div className="rl-form-top">
          <h2 className="rl-form-title">
            {selectedRole ===
            'owner'
              ? 'دخول صاحب الموقع'
              : selectedRole ===
                  'admin'
                ? 'دخول المشرفين'
                : 'تسجيل الدخول'}
          </h2>
        </div>

        <div className="rl-form-divider">
          <span />
          <b>
            دخول آمن إلى المسيمير | ALMUSAYMIR — تحقق ثنائي مفعّل
          </b>
          <span />
        </div>

        {error ? (
          <div
            className="rl-alert rl-alert-err"
            role="alert"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div
            className="rl-alert rl-alert-ok"
            role="status"
            aria-live="polite"
          >
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        ) : null}

        <form
          onSubmit={handleLogin}
          noValidate
          className="rl-login-form"
        >
          <div className="rl-fields-box">
            <div className="rl-field rl-field-inline">
              <label
                className="rl-label"
                htmlFor="email"
              >
                البريد الإلكتروني:
              </label>

              <div className="rl-input-wrap">
                <Mail
                  className="rl-input-ic"
                  size={19}
                />

                <input
                  id="email"
                  ref={emailInputRef}
                  className="rl-input"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="example@mail.com"
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="rl-field rl-field-inline">
              <label
                className="rl-label"
                htmlFor="password"
              >
                كلمة المرور:
              </label>

              <div className="rl-input-wrap">
                <Lock
                  className="rl-input-ic"
                  size={19}
                />

                <input
                  id="password"
                  className="rl-input"
                  type={
                    showPass
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="rl-eye"
                  onClick={() =>
                    setShowPass(
                      !showPass
                    )
                  }
                  aria-label="إظهار أو إخفاء كلمة المرور"
                  disabled={loading}
                >
                  {showPass ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="rl-btn"
            disabled={loading}
          >
            {loading
              ? 'جاري المعالجة...'
              : 'تسجيل الدخول'}
          </button>
        </form>

        {/* سجل التشخيص وإصدار الواجهة كانا يُعرضان هنا — نُقلا إلى الـ Console
            (انظر useEffect أعلاه) لإزالة العنصر الرمادي من الواجهة. */}

        {googleUserObj && (
          <div className="rl-google-confirm">
            <div className="rl-google-confirm-head">
              <span
                style={{
                  display:
                    'inline-flex',
                  alignItems:
                    'center',
                }}
              >
                <Shield
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <strong>
                تأكيد حساب Google
              </strong>
            </div>

            <p>
              للتأكد من ملكية الحساب، أعد
              كتابة نفس البريد المرتبط بحساب
              Google.
            </p>

            <div className="rl-field">
              <label
                className="rl-label"
                htmlFor="gEmailConfirm"
              >
                البريد الإلكتروني
              </label>

              <div className="rl-input-wrap">
                <Mail
                  className="rl-input-ic"
                  size={21}
                />

                <input
                  id="gEmailConfirm"
                  className="rl-input"
                  type="email"
                  value={
                    googleEmailConfirm
                  }
                  onChange={(e) =>
                    setGoogleEmailConfirm(
                      e.target.value
                    )
                  }
                  placeholder={
                    googleUserObj.email ||
                    'example@mail.com'
                  }
                  required
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="button"
              className="rl-btn"
              onClick={
                handleGoogleConfirmEmail
              }
              disabled={
                loading ||
                !googleEmailConfirm
              }
            >
              {loading
                ? 'جاري المعالجة...'
                : 'إرسال كود التحقق'}
            </button>

            <button
              type="button"
              className="rl-cancel-link"
              onClick={() => {
                setGoogleUserObj(null);
                setGoogleEmailConfirm(
                  ''
                );
              }}
              disabled={loading}
            >
              إلغاء والعودة
            </button>
          </div>
        )}

        {/* شبكة 2×2: السطر الأول (نسيت كلمة المرور | إنشاء حساب جديد)
            والسطر الثاني (Google | دخول الزوار المؤقت) */}
        <div className="rl-actions">
          <button
            type="button"
            className="rl-link"
            onClick={() =>
              navigate(
                '/forgot-password'
              )
            }
            disabled={loading}
          >
            نسيت كلمة المرور؟
          </button>

          <button
            type="button"
            className="rl-link"
            onClick={() =>
              navigate('/register')
            }
            disabled={loading}
          >
            إنشاء حساب جديد
          </button>

          <button
            type="button"
            className="rl-google"
            onClick={handleGoogleLogin}
            disabled={
              loading ||
              !!googleUserObj
            }
          >
            الدخول عن طريق Google
          </button>

          <button
            type="button"
            className="rl-link"
            onClick={() => {
              setError('');
              setSuccess('');
              setGuestEntryOpen(true);
            }}
            disabled={loading}
          >
            دخول الزوار المؤقت
          </button>
        </div>

        {/* زر حراج أونلاين — تصميم أنيق ومتناسق أسفل الشبكة */}
        <button
          type="button"
          onClick={() =>
            navigate('/haraj')
          }
          className="rl-haraj-gate"
          aria-label="الدخول إلى موقع حراج أونلاين"
          title="الدخول إلى موقع حراج أونلاين"
        >
          <Shield
            size={18}
            aria-hidden="true"
          />

          <span>
            الدخول إلى موقع حراج أونلاين
          </span>

          <span
            className="rl-haraj-gate-arrow"
            aria-hidden="true"
          >
            ‹
          </span>
        </button>

        {hiddenMode && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background:
                'rgba(var(--rz-ink-rgb), 0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() =>
              setHiddenMode(false)
            }
          >
            <div
              style={{
                background:
                  'linear-gradient(150deg, var(--rz-ink), var(--rz-ink))',
                border:
                  '1px solid rgba(var(--rz-primary-rgb), 0.6)',
                borderRadius: 16,
                padding:
                  '22px 22px 18px',
                maxWidth: 360,
                width: '100%',
                textAlign: 'center',
                boxShadow:
                  '0 20px 60px rgba(var(--rz-ink-rgb), 0.6)',
                fontFamily:
                  'Tajawal',
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div
                style={{
                  fontSize: 26,
                  marginBottom: 6,
                }}
              >
                ®️
              </div>

              <h3
                style={{
                  color: 'var(--rz-primary)',
                  margin:
                    '0 0 6px',
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                دخول مخفي
              </h3>

              <p
                style={{
                  color: 'var(--rz-ivory)',
                  fontSize: 13,
                  margin:
                    '0 0 14px',
                }}
              >
                أدخل بياناتك والرمز السري للمتابعة بدون إعلان
              </p>

              <form
                onSubmit={
                  handleHiddenLogin
                }
              >
                <input
                  type="email"
                  value={secretEmail}
                  onChange={(e) => {
                    setSecretEmail(
                      e.target.value
                    );
                    setSecretError('');
                  }}
                  placeholder="البريد الإلكتروني"
                  autoComplete="username"
                  style={
                    hiddenInputStyle
                  }
                  disabled={
                    secretLoading
                  }
                  dir="ltr"
                />

                <input
                  type="password"
                  value={
                    secretPassword
                  }
                  onChange={(e) => {
                    setSecretPassword(
                      e.target.value
                    );
                    setSecretError('');
                  }}
                  placeholder="كلمة المرور"
                  autoComplete="current-password"
                  style={
                    hiddenInputStyle
                  }
                  disabled={
                    secretLoading
                  }
                />

                <input
                  type="password"
                  value={secretCode}
                  onChange={(e) => {
                    setSecretCode(
                      e.target.value
                    );
                    setSecretError('');
                  }}
                  placeholder="الرمز السري"
                  autoFocus
                  style={{
                    ...hiddenInputStyle,
                    letterSpacing: 2,
                  }}
                  disabled={
                    secretLoading
                  }
                />

                {secretError && (
                  <div
                    style={{
                      background:
                        'rgba(var(--rz-primary-rgb), 0.14)',
                      border:
                        '1px solid rgba(var(--rz-primary-rgb), 0.45)',
                      color:
                        'var(--rz-ivory)',
                      borderRadius: 10,
                      padding:
                        '8px 10px',
                      fontSize: 13,
                      marginBottom: 10,
                    }}
                  >
                    {secretError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    secretLoading
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 12,
                    border:
                      '1px solid rgba(var(--rz-cream-4-rgb), 0.5)',
                    background:
                      'linear-gradient(135deg, var(--rz-ivory), var(--rz-primary) 55%, var(--rz-primary))',
                    color: 'var(--rz-ink)',
                    fontSize: 15,
                    fontWeight: 900,
                    cursor:
                      secretLoading
                        ? 'wait'
                        : 'pointer',
                    fontFamily:
                      'inherit',
                    marginBottom: 8,
                  }}
                >
                  {secretLoading
                    ? 'جاري الدخول...'
                    : 'دخول'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setHiddenMode(
                      false
                    )
                  }
                  disabled={
                    secretLoading
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 12,
                    border:
                      '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                    background:
                      'transparent',
                    color: 'var(--rz-ivory)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor:
                      'pointer',
                    fontFamily:
                      'inherit',
                  }}
                >
                  إلغاء
                </button>
              </form>
            </div>
          </div>
        )}

        {guestEntryOpen && (
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              inset: 0,
              background:
                'rgba(var(--rz-ink-rgb), 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15000,
              padding: 16,
              fontFamily:
                'Tajawal',
            }}
            onClick={() =>
              setGuestEntryOpen(false)
            }
          >
            <div
              style={{
                background:
                  'linear-gradient(150deg, var(--rz-ink), var(--rz-ink))',
                border:
                  '1px solid rgba(var(--rz-primary-rgb), 0.6)',
                borderRadius: 18,
                padding:
                  '24px 20px 18px',
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
                boxShadow:
                  '0 20px 60px rgba(var(--rz-ink-rgb), 0.6)',
                color: 'var(--rz-ivory)',
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div
                style={{
                  fontSize: 26,
                  marginBottom: 8,
                }}
              >
                <Sparkles
                  size={28}
                  color="var(--rz-primary)"
                />
              </div>

              <h3
                style={{
                  color: 'var(--rz-primary)',
                  margin:
                    '0 0 10px',
                  fontSize: 17,
                  fontWeight: 900,
                }}
              >
                دخول الزوار المؤقت
              </h3>

              <p
                style={{
                  color: 'var(--rz-ivory)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin:
                    '0 0 12px',
                }}
              >
                صديقنا العزيز: نفيدك بأن دخولك من هذا المكان
                مؤقت، ولضمان أمان حسابك أصبح التحقق إجبارياً عبر
                رمز يصل إلى بريدك الإلكتروني.

                <br />
                <br />
                أدخل بريدك الإلكتروني لاستلام رمز التحقق:
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGuestOtpRequest();
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <input
                    type="email"
                    inputMode="email"
                    value={guestEmail}
                    onChange={(e) =>
                      setGuestEmail(e.target.value)
                    }
                    placeholder="name@example.com"
                    disabled={loading}
                    autoComplete="email"
                    style={{
                      flex: 1,
                      padding:
                        '13px 14px',
                      borderRadius: 10,
                      border:
                        '1px solid rgba(var(--rz-cream-4-rgb), 0.35)',
                      background:
                        'rgba(var(--rz-ink-rgb), 0.45)',
                      color: 'var(--rz-white)',
                      fontSize: 15,
                      fontFamily:
                        'inherit',
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !guestEmail.trim()
                    }
                    style={{
                      padding:
                        '13px 18px',
                      borderRadius: 10,
                      border: 'none',
                      background:
                        'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                      color: 'var(--rz-white)',
                      fontWeight: 900,
                      fontSize: 14,
                      cursor:
                        loading
                          ? 'wait'
                          : 'pointer',
                      fontFamily:
                        'inherit',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {loading
                      ? 'جاري الإرسال...'
                      : 'إرسال الرمز'}
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() =>
                  setGuestEntryOpen(false)
                }
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: 10,
                  background:
                    'transparent',
                  border: 'none',
                  color: 'var(--rz-primary)',
                  fontSize: 13,
                  fontWeight:  700,
                  cursor: 'pointer',
                  fontFamily:
                    'inherit',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {otpModal && (
          <OtpModal
            email={otpModal.email}
            purpose={otpModal.purpose}
            loading={loading}
            onVerified={
              otpModal.onVerified
            }
            onClose={() =>
              setOtpModal(null)
            }
          />
        )}

        <div className="rl-official">
          <b>
            جميع بيانات المستخدمين
            مشفّرة وأمانٌ عالٍ.
          </b>

          <br />

          المسيمير | ALMUSAYMIR — متجر شامل وحراج إعلانات
          معتمدة،

          <br />

          نلتزم بأعلى معايير الحماية
          والخصوصية لحماية حسابك
          وخصوصيتك.
        </div>
      </section>

      <footer className="rl-foot">
        جميع الحقوق محفوظة © المسيمير | ALMUSAYMIR
        2026
      </footer>

      {showOwnerContact && (
        <ContactOwnerModal
          onClose={() =>
            setShowOwnerContact(false)
          }
        />
      )}
      </div>
    </div>
  );
};
export { Login };
export default Login;
