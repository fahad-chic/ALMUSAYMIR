// src/components/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { BRAND } from '../data/brand';
import { auth } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
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

  const [googleEmailConfirm, setGoogleEmailConfirm] = useState('');
  const [googleUserObj, setGoogleUserObj] = useState(null);

  // دخول الزوار: رقم الهاتف فقط — دخول مؤقت مباشر لمدة دقيقتين بلا تحقق
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

      // لا بوابة OTP خارجية: الشرط الوحيد لفتح الموقع هو توثيق بريد Firebase.
      // إن لم يكن موثّقاً نرسل رسالة التحقق الرسمية من Firebase ثم نوجّهه
      // لشاشة إثبات الملكية — ولا محتوى للمتجر قبل الضغط على الرابط.
      if (!signInResult.user.emailVerified) {
        try {
          await sendEmailVerification(signInResult.user);
        } catch (verifyErr) {
          console.warn(
            'email verification send failed:',
            verifyErr?.code
          );
        }

        setLoading(false);
        navigate('/', { replace: true });
        return;
      }

      setSuccess('تم تسجيل الدخول بنجاح! جاري تحويلك...');

      if (selectedRole === 'owner') {
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

    // لا بوابة OTP: نُكمل دخول Google مباشرة. توثيق البريد مضمون من مزوّد
    // Google نفسه، ويبقى حاجز emailVerified في ProtectedRoute هو الفيصل.
    try {
      await completeGoogleLogin();
    } catch (err) {
      setError(
        err.message ||
          'تعذّر إكمال الدخول'
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

  const hiddenInputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(var(--rz-primary-rgb), 0.5)',
    background: 'rgba(var(--rz-ink-rgb), 0.6)',
    color: 'var(--rz-white)',
    fontSize: 16,
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

    setSecretError('');
    setSecretLoading(true);

    try {
      const signInResult = await signInWithEmailAndPassword(
        auth,
        secretEmail.trim(),
        secretPassword
      );

      // التحقق من الرمز يتم على الخادم فقط. لا نقرأ الرمز من import.meta.env
      // ولا نقارنه داخل المتصفح، لأن أي قيمة VITE_ تصبح مكشوفة للزوار.
      const idToken = await signInResult.user.getIdToken();

      if (idToken) {
        localStorage.setItem('auth_token', idToken);
      }

      try {
        await apiCall('/owner-pin', 'POST', {
          action: 'verify',
          pin: secretCode,
        });
      } catch (pinError) {
        markManualSignOut();
        await signOut(auth);
        localStorage.removeItem('auth_token');
        setSecretCode('');
        throw pinError;
      }

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
          : err?.message ||
            'تعذّر الدخول، حاول لاحقاً'
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
          سوقٌ موثوق يجمع الجودة والأناقة ويصون ثقة عملائه
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
