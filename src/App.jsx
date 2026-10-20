import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { db, auth } from './firebase/config';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ensureFirebaseSession } from './utils/firebaseSession';
import { Clock, X } from 'lucide-react';

import { AdminProvider } from './context/AdminContext';
import { useAuth } from './context/AuthContext';
import usePermissions from './permissions/usePermissions';
import useStore from './store/useStore';
import usePrefs from './store/usePrefs';
import useNotifications from './store/useNotifications';
import { installGlobalClickSound } from './utils/clickSound';
import { startSiteTextsSync } from './store/useSiteTexts';
import { startInlineStylesSync } from './store/useInlineStyles';
import { notifyOwner, formatArTime } from './utils/visitorNotify';
import { recordKick } from './utils/kickLog';

import { Login } from './components/Login';

import BackButton from './components/BackButton';
import CloseButton from './components/CloseButton';
import Navigation from './components/Navigation';
import AIChatWidget from './components/RoyalHome/AIChatWidget';
import WhatsAppFloat from './components/WhatsAppFloat';

import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import OwnerPanel from './pages/OwnerPanel';
import OwnerPrivateRoom from './pages/OwnerPrivateRoom';
import UsersList from './pages/UsersList';

import AdminPage from './components/pages/AdminPage';
import SettingsPage from './components/pages/SettingsPage';
import OTPPage from './components/pages/OTPPage';
import MemberInbox from './components/pages/MemberInbox';
import NotificationPanel from './components/NotificationPanel';
import OtpModal from './components/OtpModal';

import ComplaintsPage from './components/pages/ComplaintsPage';
import './styles/global.css';

// ⭐ إضافة صفحة الأسئلة الشائعة
import FAQ from './pages/FAQ';


/* =========================================================
   Lazy Pages
   ========================================================= */

const chunkReloadKey = 'chunkReloadOnce';

const safeLazy = (importer) =>
  lazy(() =>
    importer().catch((err) => {
      if (!sessionStorage.getItem(chunkReloadKey)) {
        sessionStorage.setItem(chunkReloadKey, '1');
        window.location.reload();
        return new Promise(() => {});
      }

      throw err;
    })
  );

window.addEventListener('load', () => {
  setTimeout(() => {
    sessionStorage.removeItem(chunkReloadKey);
  }, 10000);
});

const Dashboard = safeLazy(() => import('./pages/Dashboard'));
const RoyalHomePage = safeLazy(() =>
  import('./components/RoyalHome/NovHomePage')
);
const CatalogPage = safeLazy(() =>
  import('./components/RoyalHome/CatalogPage')
);
const ContactPage = safeLazy(() =>
  import('./components/RoyalHome/ContactPage')
);
const RoyalHarajPage = safeLazy(() =>
  import('./components/RoyalHome/RoyalHarajPage')
);
const AdFormPage = safeLazy(() =>
  import('./components/RoyalHome/AdFormPage')
);
const BranchDetail = safeLazy(() => import('./pages/BranchDetail'));
const BranchesManagement = safeLazy(() =>
  import('./pages/BranchesManagement')
);
const AdvertisementsPage = safeLazy(() =>
  import('./pages/AdvertisementsPage')
);
const EmployeesPage = safeLazy(() => import('./pages/EmployeesPage'));
const AboutPage = safeLazy(() => import('./pages/AboutPage'));
const AIChat = safeLazy(() => import('./components/AIChat'));
const AdDetailsPage = safeLazy(() => import('./pages/AdDetailsPage'));
const ChatPage = safeLazy(() => import('./pages/ChatPage'));
const TermsPage = safeLazy(() => import('./pages/TermsPage'));
const WantedDressPage = safeLazy(() => import('./pages/WantedDressPage'));

/* =========================================================
   Owner Broadcast
   ========================================================= */

const OWNER_WELCOME_MESSAGE =
  'تم تسجيل دخول صاحب موقع "أناقة ROOZ" ويُرحّب بكم جميعاً ويتمنى لكم تجربة تسوّق ممتعة ترضي ذائقتكم الرفيعة. يُذكِّركم بأن من لديه اقتراح أو ملاحظة أو شكوى على أحد موظفي الموقع أو على أي شخص بسبب النصب أو الاحتيال، يتوجّه إلى غرفة صاحب موقع "أناقة ROOZ" ويتقدّم برسالة مفصّلة. وفي حال كانت الشكوى نصب واحتيال فسيتم اتخاذ الإجراءات اللازمة فوراً، سواء من قِبَل صاحب الموقع أو بإحالة الموضوع إلى الجهات الأمنية المختصّة بشكل عاجل، حفاظاً على حقوقكم وسلامة تعاملاتكم. أناقة ROOZ — حيث الأناقة تلتقي بالثقة.';

const OWNER_EMAILS = new Set(
  (
    import.meta.env.VITE_OWNER_EMAILS ||
    'f882771f@gmail.com,kal6667222@gmail.com'
  )
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const OWNER_ALERT_SOUND_URL =
  import.meta.env.VITE_OWNER_SOUND_URL || '/sounds/welcome.mp3';

const SOUND_DURATION_SECONDS =
  Number(import.meta.env.VITE_SOUND_DURATION_SECONDS) || 10;

/* =========================================================
   Fixed bars heights
   ========================================================= */

const GUEST_BAR_HEIGHT = 36;
const OWNER_BANNER_HEIGHT = 48;

/* =========================================================
   Loading
   ========================================================= */

const LoadingScreen = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      color: 'var(--rz-primary)',
      fontSize: '1.5rem',
      fontFamily: 'Tajawal',
      direction: 'rtl',
    }}
  >
    جاري التحميل...
  </div>
);

/* =========================================================
   Security log
   ========================================================= */

const logIntrusionAttempt = (path) => {
  try {
    const key = `rooz_intrusion_${path}`;

    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, '1');

    addDoc(collection(db, 'security_logs'), {
      type: 'unauthorized_access_attempt',
      details: `محاولة دخول غير مصرح بها إلى: ${path}`,
      severity: 'high',
      timestamp: serverTimestamp(),
      userId: auth?.currentUser?.uid || null,
      userEmail: auth?.currentUser?.email || null,
    }).catch(() => {});
  } catch {
    // التسجيل هامشي — لا يعطّل التحويل
  }
};

/* =========================================================
   Unauthorized
   ========================================================= */

const UnauthorizedPage = () => {
  const location = useLocation();

  useEffect(() => {
    logIntrusionAttempt(location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        fontFamily: 'Tajawal',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: '100%',
          textAlign: 'center',
          background: 'linear-gradient(160deg, var(--rz-ivory), var(--rz-ivory))',
          border: '2px solid var(--rz-primary)',
          borderRadius: 20,
          padding: '2.2rem 1.6rem',
          boxShadow: '0 18px 50px rgba(var(--rz-ink-rgb), 0.22)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 14px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
            boxShadow: '0 8px 22px rgba(var(--rz-primary-rgb), 0.35)',
            fontSize: 30,
          }}
        >
          🔒
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            color: 'var(--rz-primary)',
            fontWeight: 900,
            fontSize: '1.4rem',
          }}
        >
          غير مصرح لك بالدخول
        </h1>

        <p
          style={{
            margin: 0,
            color: 'var(--rz-ink)',
            fontWeight: 600,
            lineHeight: 1.9,
            fontSize: '0.95rem',
          }}
        >
          هذه الصفحة مخصصة لصاحب موقع «أناقة ROOZ» فقط، وهي محمية بحماية
          مشددة.
          <br />
          تم تسجيل محاولة الوصول هذه في سجل الأمان.
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   Protected Route
   ========================================================= */

const ProtectedRoute = ({ children, roleRequired, permissionAny, blockGuest }) => {
  const { user, userRole, isAuthenticated } = useAuth();
  const { can, isOwner: permIsOwner, ready: permsReady } = usePermissions();

  const guestActive = useStore((s) => s.guestSession?.active);

  const isGuest =
    useStore((s) => s.userRole === 'guest') || guestActive;

  const liveAuth =
    auth ||
    (() => {
      try {
        return getAuth();
      } catch {
        return null;
      }
    })();

  const currentFirebaseUser = liveAuth?.currentUser || null;
  const hasFirebaseSession = !!currentFirebaseUser;

  const sessionPending =
    hasFirebaseSession &&
    (!isAuthenticated || (!!roleRequired && !userRole));

  const [pendingExpired, setPendingExpired] = useState(false);

  useEffect(() => {
    if (!sessionPending) {
      setPendingExpired(false);
      return undefined;
    }

    const id = setTimeout(() => {
      setPendingExpired(true);
    }, 12000);

    return () => clearTimeout(id);
  }, [sessionPending]);

  if (sessionPending && !pendingExpired) {
    return <LoadingScreen />;
  }

  const effectiveAuthenticated =
    isAuthenticated ||
    (hasFirebaseSession && pendingExpired);

  const allowed =
    effectiveAuthenticated ||
    (!roleRequired && !blockGuest && guestActive);

  if (!allowed) {
    recordKick('protected-route-no-session', {
      roleRequired: roleRequired || null,
      blockGuest: !!blockGuest,
      isAuthenticated,
      hasFirebaseSession,
      pendingExpired,
      userRole: userRole || null,
    });

    return <Navigate to="/login" replace />;
  }

  if (roleRequired && userRole !== roleRequired) {
    const isOwnerAccount =
      roleRequired === 'owner' &&
      OWNER_EMAILS.has(
        String(
          user?.email ||
            currentFirebaseUser?.email ||
            ''
        ).toLowerCase()
      );

    if (!isOwnerAccount) {
      recordKick('protected-route-unauthorized', {
        roleRequired,
        userRole: userRole || null,
        email:
          user?.email ||
          currentFirebaseUser?.email ||
          null,
      });

      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (permissionAny && Array.isArray(permissionAny) && permissionAny.length > 0) {
    if (!permsReady) return <LoadingScreen />;
    const allowedPerm =
      permIsOwner ||
      userRole === 'owner' ||
      permissionAny.some((k) => can(k));
    if (!allowedPerm) {
      recordKick('protected-route-no-permission', {
        permissionAny,
        userRole: userRole || null,
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (blockGuest && isGuest) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/* مسار الدخول: يعرض النموذج لغير المسجّل، ويحوّل المسجّل الحقيقي إلى الرئيسية.
   مهم: الزائر (جلسة مؤقتة) لا يُعتبر مسجّلاً هنا — وإلا حُوِّل إلى "/" فوراً
   فلم يستطع الدخول بحسابه أبداً، وخَلَق مع blockGuest في "/" حلقة توجيه.
   كذلك الجلسة المجهولة من Firebase (تُنشأ تلقائياً عبر ensureFirebaseSession
   لأجل إشعارات/قراءات Firestore) ليست تسجيل دخول حقيقي؛ لو حُسبت "مُسجّلاً"
   لرُمي الزائر الجديد الذي يفتح /login مباشرةً إلى "/" فوراً. */
const LoginRoute = ({ isAuthenticated, isGuest, isAnonymousSession, children }) => {
  if (isAuthenticated && !isGuest && !isAnonymousSession) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/* =========================================================
   App Content
   ========================================================= */

function AppContent() {
  const {
    user,
    isAuthenticated,
    userRole,
    logout,
    loading,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // الزائر = جلسة مؤقتة بلا حساب حقيقي. يجب أن يطابق اشتقاق AuthContext
  // (userRole === 'guest' || guestSession.active) وإلا اختلف حكم LoginRoute
  // عن حكم ProtectedRoute فتنشأ حلقة توجيه بين "/" و "/login".
  const isGuest = useStore(
    (s) => s.userRole === 'guest' || !!s.guestSession?.active
  );

  // جلسة Firebase مجهولة (بلا بريد) — تُنشأ تلقائياً من ensureFirebaseSession
  // لأجل الكتابة/القراءة في Firestore، وليست تسجيل دخول حقيقي. نفرّق بها حتى
  // لا يُرمى الزائر الجديد من /login إلى "/".
  const isAnonymousSession = !!user?.isAnonymous;

  // ربط زر الإغلاق العام (❌) بمُوجّه react-router — فيتنقل خطوة للخلف
  // داخلياً دون إعادة تحميل أو مغادرة الموقع.
  useEffect(() => {
    window.__ROOZ_NAV__ = (url, replace) => {
      navigate(url, { replace: !!replace });
    };
    return () => {
      delete window.__ROOZ_NAV__;
    };
  }, [navigate]);

  // تفاعل وهج الخلفية مع المؤشر + إيقاف الحركة عند إخفاء الصفحة.
  // للأجهزة ذات المؤشر الدقيق فقط، ويكتب متغيّرات CSS مباشرة (بلا re-render)،
  // وينظّف كل المستمعات عند الإزالة.
  const pearlLayerRef = useRef(null);
  useEffect(() => {
    const el = pearlLayerRef.current;
    if (!el) return undefined;
    const mq = window.matchMedia;
    const reduceMotion = mq && mq('(prefers-reduced-motion: reduce)').matches;

    // إيقاف/استئناف حركة الأشكال مع خفاء التبويب => لا استهلاك في الخلفية
    const onVisibility = () => el.classList.toggle('rzp-paused', document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    const finePointer = mq && mq('(hover: hover) and (pointer: fine)').matches;
    let onMove;
    let raf = 0;
    if (finePointer && !reduceMotion) {
      el.classList.add('is-interactive');
      onMove = (e) => {
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty('--rzp-mx', `${e.clientX}px`);
          el.style.setProperty('--rzp-my', `${e.clientY}px`);
        });
      };
      window.addEventListener('pointermove', onMove, { passive: true });
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (onMove) window.removeEventListener('pointermove', onMove);
      if (raf) window.cancelAnimationFrame(raf);
      el.classList.remove('is-interactive');
    };
  }, []);

  // حفظ آخر مسار داخلي قبل الصفحة الحالية (ليستخدمه زر الرجوع بأمان
  // بدل navigate(-1) الذي قد يعيد لصفحة خاطئة أو خارج الموقع)
  const prevPathRef = useRef(null);

  useEffect(() => {
    const current = location.pathname;

    const pathsToSkip = new Set(['/', '/login', '/register', '/forgot-password', '/unauthorized']);

    if (prevPathRef.current && prevPathRef.current !== current) {

      window.history.replaceState(
        {
          ...window.history.state,
          prevPath: prevPathRef.current,
        },
        ''
      );
    }

    if (!pathsToSkip.has(current)) {
      prevPathRef.current = current;
    }
  }, [location.pathname]);

  const guestExpired = useStore((s) => s.guestExpired);
  const guestWarning = useStore((s) => s.guestWarning);
  const endGuestSession = useStore((s) => s.endGuestSession);
  const guestActive = useStore((s) => s.guestSession?.active);
  const [guestWelcomeSeen, setGuestWelcomeSeen] = useState(false);

  /* =======================================================
     Guest welcome banner (ظهور واحد عند كل دخول زائر مؤقت)
     ======================================================= */

  useEffect(() => {
    if (!guestActive) {
      setGuestWelcomeSeen(false);
      return;
    }

    if (guestWelcomeSeen) return;

    const shown = window.sessionStorage.getItem(
      'rooz_guest_welcome_shown'
    );

    if (shown) {
      setGuestWelcomeSeen(true);
      return;
    }

    const t = setTimeout(() => {
      window.sessionStorage.setItem(
        'rooz_guest_welcome_shown',
        '1'
      );

      setGuestWelcomeSeen(true);
    }, 800);

    return () => clearTimeout(t);
  }, [guestActive, guestWelcomeSeen]);

  /* =======================================================
     Dynamic page titles
     ======================================================= */

  useEffect(() => {
    const TITLES = {
      '/': 'أناقة ROOZ | فساتين وعبايات فاخرة في السعودية',
      '/haraj': 'حراج أناقة ROOZ | إعلانات الأزياء',
      '/catalog/dresses': 'فساتين | أناقة ROOZ',
      '/catalog/wedding-dresses': 'فساتين الأعراس | أناقة ROOZ',
      '/catalog/girls-dresses': 'فساتين البنات | أناقة ROOZ',
      '/catalog/used-dresses': 'فساتين مستعملة | أناقة ROOZ',
      '/catalog/abayas': 'عبايات | أناقة ROOZ',
      '/catalog/bags': 'شنط | أناقة ROOZ',
      '/catalog/shoes': 'أحذية | أناقة ROOZ',
      '/catalog/perfumes': 'عطورات | أناقة ROOZ',
      '/catalog/golden-mothers': 'أمهاتنا | أناقة ROOZ',
      '/catalog/home-products': 'الأسر المنتجة | أناقة ROOZ',
      '/contact': 'تواصل معنا | أناقة ROOZ',
      '/terms': 'شروط وأحكام الاستخدام | أناقة ROOZ',
      '/wanted-dress': 'طلب فستان | أناقة ROOZ',
    };

    const title = TITLES[location.pathname];

    if (title) {
      document.title = title;
    }
  }, [location.pathname]);

  /* =======================================================
     Visitor notification
     ======================================================= */

  useEffect(() => {
    if (
      window.sessionStorage.getItem(
        'rooz_visit_notified'
      )
    ) {
      return;
    }

    window.sessionStorage.setItem(
      'rooz_visit_notified',
      '1'
    );

    notifyOwner(
      'زائر جديد دخل الموقع',
      `وقت الدخول: ${formatArTime()}`
    );
  }, []);

  /* =======================================================
     Preferences + global click sound
     ======================================================= */

  useEffect(() => {
    usePrefs.getState().applyAll();

    startSiteTextsSync();
    startInlineStylesSync();

    return installGlobalClickSound();
  }, []);

  /* =======================================================
     Broadcast history
     ======================================================= */

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let cancelled = false;

    fetch('/api/broadcast?history=1', {
      cache: 'no-store',
    })
      .then((res) =>
        res.ok ? res.json() : null
      )
      .then((data) => {
        if (
          !cancelled &&
          Array.isArray(data?.items)
        ) {
          useNotifications
            .getState()
            .syncFromServer(data.items);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     Notify owner on member login/logout
     ======================================================= */

  const prevUserEmailRef = useRef(null);

  useEffect(() => {
    const email = user?.email || null;
    const prev = prevUserEmailRef.current;

    if (usePrefs.getState().incognito) {
      prevUserEmailRef.current = email;
      return;
    }

    if (email && email !== prev) {
      notifyOwner(
        'عضو سجّل دخوله',
        `البريد: ${email} — وقت الدخول: ${formatArTime()}`
      );
    } else if (!email && prev) {
      notifyOwner(
        'عضو غادر الموقع',
        `البريد: ${prev} — وقت الخروج: ${formatArTime()}`
      );
    }

    prevUserEmailRef.current = email;
  }, [user]);

  /* =======================================================
     Guest countdown
     ======================================================= */

  const [guestRemaining, setGuestRemaining] =
    useState(0);

  useEffect(() => {
    if (!guestActive) {
      setGuestRemaining(0);
      return undefined;
    }

    const tick = () => {
      setGuestRemaining(
        useStore.getState().getGuestRemaining()
      );
    };

    tick();

    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [guestActive]);

  /* =======================================================
     Guest expiration
     ======================================================= */

  useEffect(() => {
    if (loading) return;

    const graceId = setTimeout(() => {
      let liveAuthUser = null;

      try {
        liveAuthUser =
          (auth || getAuth())?.currentUser || null;
      } catch {
        liveAuthUser = auth?.currentUser || null;
      }

      const memberPresent =
        (!!liveAuthUser &&
          !liveAuthUser.isAnonymous) ||
        (isAuthenticated &&
          !!userRole &&
          userRole !== 'guest');

      if (
        memberPresent &&
        (guestExpired || guestActive)
      ) {
        endGuestSession('member-active');
        return;
      }

      if (!guestExpired) return;

      // حراج سوق عام — انتهاء جلوسة الزائر لا يطرد من صفحاته.

      const isPublicHarajPath =
        window.location.pathname === '/haraj' ||
        window.location.pathname.startsWith('/haraj/');

      if (isPublicHarajPath) {
        recordKick(
          'guest-expired-ignored-public-haraj',
          {
            guestActive: !!guestActive,
            isAuthenticated,
          }
        );
        return;
      }

      recordKick(
        'guest-expired-effect',
        {
          guestActive: !!guestActive,
          isAuthenticated,
        }
      );

      try {
        window.sessionStorage.setItem(
          'guestExpiredMsg',
          'عزيزي الزائر: تم انتهاء الجلسة المؤقتة، ولو تريد الاستمرار بالدخول في الموقع فأنشئ حساباً جديداً. شكراً لتعاونكم معنا 💐 ولو عندك استفسار أو شكوى فتقدم بإرسال رسالتك إلى صاحب موقع «أناقة ROOZ» وسوف يتم التواصل معكم بأقرب وقت ممكن. بحفظ الرحمن ✋'
        );
      } catch {
        // ignore storage errors
      }

      navigate('/login', {
        replace: true,
      });
    }, 3000);

    return () => clearTimeout(graceId);
  }, [
    guestExpired,
    guestActive,
    isAuthenticated,
    loading,
    navigate,
    endGuestSession,
  ]);

  /* =======================================================
     Owner banner
     ======================================================= */

  // شريط ترحيب المالك — يظهر فقط عند كل تسجيل دخول ناجح لصاحب الموقع،
  // يلف الشريط ٣ لفات كاملة ثم يتوقف (بلا تخزين دائم ولا 24 ساعة)..
  const [ownerWelcomeBanner, setOwnerWelcomeBanner] =
    useState(null);

  // إخفاء شريط ترحيب المالك تلقائيًا بعد ٣ لفات كاملة (300 ثانية = 3×100 ثانية)..
  useEffect(() => {
    if (!ownerWelcomeBanner) return;
    const t = setTimeout(() => {
      setOwnerWelcomeBanner(null);
    }, 300000);
    return () => clearTimeout(t);
  }, [ownerWelcomeBanner]);

  /* =======================================================
     Guest / owner top offset
     ======================================================= */

  // شريط الزائر ورسالة البث لا يظهران إلا في الصفحة الرئيسية فقط (كما طلب المستخدم)
  const guestBarVisible =
    guestActive &&
    guestRemaining > 0 &&
    location.pathname === '/';

  useEffect(() => {
    const guestOffset = guestBarVisible
      ? GUEST_BAR_HEIGHT
      : 0;

    const totalOffset = guestOffset;

    document.documentElement.style.setProperty(
      '--rooz-top-offset',
      `${totalOffset}px`
    );

    return () => {
      document.documentElement.style.setProperty(
        '--rooz-top-offset',
        '0px'
      );
    };
  }, [
    guestBarVisible,
    ownerWelcomeBanner,
    location.pathname,
  ]);

  /* =======================================================
     Owner message / audio
     ======================================================= */

  const [ownerWelcomeMessage, setOwnerWelcomeMessage] =
    useState(OWNER_WELCOME_MESSAGE);

  const isOwnerLoggedIn =
    userRole === 'owner';

  const audioRef = useRef(null);
  const audioTimerRef = useRef(null);
  const lastBroadcastIdRef = useRef(null);

  /* =======================================================
     AI Chat open state
     ======================================================= */

  const [aiChatOpen, setAiChatOpen] = useState(false);

  /* =======================================================
     Visitor popup
     ======================================================= */

  const [showVisitorPopup, setShowVisitorPopup] =
    useState(false);

  const [visitorEmail, setVisitorEmail] = useState("");

  const [visitorOtpEmail, setVisitorOtpEmail] = useState(null);

  /* =======================================================
     Logout
     ======================================================= */

  const handleLogout = async () => {
    try {
      setOwnerWelcomeBanner(null);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error(
        'خطأ في تسجيل الخروج:',
        error
      );
    }
  };

  /* =======================================================
     Owner announcement
     ======================================================= */

  const announceOwnerWelcome =
    useCallback(
      (
        message = OWNER_WELCOME_MESSAGE
      ) => {
        const nowTs = Date.now();

        const bannerData = {
          msg: message,
          at: nowTs,
        };

        setOwnerWelcomeBanner(
          bannerData
        );

        setOwnerWelcomeMessage(
          message
        );

        if (
          audioRef.current &&
          usePrefs.getState().welcomeSound
        ) {
          try {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;

            const playPromise =
              audioRef.current.play();

            if (
              playPromise &&
              typeof playPromise.catch ===
                'function'
            ) {
              playPromise.catch(() => {});
            }
          } catch {
            // ignore audio errors
          }
        }

        if (audioTimerRef.current) {
          window.clearTimeout(
            audioTimerRef.current
          );
        }

        audioTimerRef.current =
          window.setTimeout(() => {
            if (audioRef.current) {
              try {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              } catch {
                // ignore
              }
            }
          }, SOUND_DURATION_SECONDS * 1000);
      },
      []
    );

  /* =======================================================
     Broadcast polling
     ======================================================= */

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          '/api/broadcast',
          {
            cache: 'no-store',
          }
        );

        if (!res.ok) return;

        const data =
          await res.json().catch(
            () => ({})
          );

        if (
          cancelled ||
          !data ||
          !data.id ||
          !data.message
        ) {
          return;
        }

        useNotifications
          .getState()
          .syncFromServer([data]);

        if (
          lastBroadcastIdRef.current ===
          data.id
        ) {
          return;
        }

        lastBroadcastIdRef.current =
          data.id;

        const type = String(
          data.type || 'general'
        );

        if (
          type === 'owner-entry' ||
          type === 'general'
        ) {
          announceOwnerWelcome(
            data.message
          );
        }
      } catch {
        // network errors ignored
      }
    };

    poll();

    let intervalId = null;

    const startPolling = () => {
      if (intervalId === null) {
        intervalId =
          setInterval(
            poll,
            5000
          );
      }
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        poll();
        startPolling();
      }
    };

    startPolling();

    document.addEventListener(
      'visibilitychange',
      onVisibility
    );

    return () => {
      cancelled = true;

      stopPolling();

      document.removeEventListener(
        'visibilitychange',
        onVisibility
      );

      if (audioTimerRef.current) {
        window.clearTimeout(
          audioTimerRef.current
        );
      }
    };
  }, [announceOwnerWelcome]);

  /* =======================================================
     Immediate owner login event
     ======================================================= */

  useEffect(() => {
    const onOwnerLoggedIn =
      (event) => {
        const detail =
          event?.detail || {};

        if (detail.id != null) {
          lastBroadcastIdRef.current =
            detail.id;
        }

        announceOwnerWelcome(
          typeof detail.message ===
            'string' &&
            detail.message.trim()
            ? detail.message
            : OWNER_WELCOME_MESSAGE
        );
      };

    window.addEventListener(
      'ownerLoggedIn',
      onOwnerLoggedIn
    );

    return () =>
      window.removeEventListener(
        'ownerLoggedIn',
        onOwnerLoggedIn
      );
  }, [announceOwnerWelcome]);

  /* =======================================================
     Owner role safety announcement
     ======================================================= */

  const ownerBaselineRef =
    useRef(false);

  const prevUserRoleRef =
    useRef(null);

  useEffect(() => {
    if (loading) return;

    if (userRole !== 'owner') {
      prevUserRoleRef.current = userRole;
      return;
    }

    // صفحة تسجيل الدخول: لا شريط ولا صوت — ننتظر حتى يخرج منها
    if (location.pathname === '/login') return;

    if (!ownerBaselineRef.current) {
      ownerBaselineRef.current = true;
      prevUserRoleRef.current = userRole;
      announceOwnerWelcome(OWNER_WELCOME_MESSAGE);
      return;
    }

    if (prevUserRoleRef.current !== 'owner') {
      announceOwnerWelcome(OWNER_WELCOME_MESSAGE);
    }

    prevUserRoleRef.current = userRole;
  }, [
    userRole,
    loading,
    location.pathname,
    announceOwnerWelcome,
  ]);

  /* =======================================================
     Visitor enter
     ======================================================= */

  // دخول الزوار — التحقق برمز يصل إلى البريد الإلكتروني إجباري (Email OTP)
  const handleVisitorEnter =
    async () => {
      const email = String(
        visitorEmail || ''
      )
        .trim()
        .toLowerCase();

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        window.alert(
          "الرجاء إدخال بريد إلكتروني صحيح"
        );

        return;
      }

      try {
        await ensureFirebaseSession();

        const sendOtp =
          useStore.getState().sendOtp;

        if (typeof sendOtp !== 'function') {
          window.alert(
            "تعذّر إرسال كود التحقق، حاول لاحقاً"
          );

          return;
        }

        const res = await sendOtp(
          email,
          'login'
        );

        if (!res?.success) {
          window.alert(
            res?.error
              ? `تعذّر إرسال كود التحقق: ${res.error}`
              : "تعذّر إرسال كود التحقق، حاول مرة أخرى"
          );

          return;
        }

        setVisitorOtpEmail(email);
        setShowVisitorPopup(false);
      } catch (error) {
        window.console.error(error);

        window.alert(
          "حدث خطأ غير متوقع، حاول مرة أخرى"
        );
      }
    };

  // إكمال دخول الزائر بعد نجاح التحقق بالبريد (Email OTP)
  const handleVisitorOtpVerified =
    async () => {
      await addDoc(
        collection(db, "visitors"),
        { createdAt: serverTimestamp() }
      );

      const guestLogin =
        useStore.getState().guestLogin;

      if (typeof guestLogin === 'function') {
        await guestLogin(visitorOtpEmail);
      }

      setVisitorOtpEmail(null);

      window.alert(
        "كود الخصم الخاص بك: ROOZ10 — أهلاً بك في أناقة ROOZ."
      );
    };

  const openWelcomeModal = () =>
    setShowVisitorPopup(true);

  const closeWelcomeModal = () =>
    setShowVisitorPopup(false);

  /* =======================================================
     Visitor popup keyboard
     ======================================================= */

  useEffect(() => {
    if (!showVisitorPopup) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeWelcomeModal();
      }
    };

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      onKeyDown
    );

    return () => {
      document.body.style.overflow =
        '';

      window.removeEventListener(
        'keydown',
        onKeyDown
      );
    };
  }, [showVisitorPopup]);

  /* =======================================================
     Loading
     ======================================================= */

  if (loading) {
    return <LoadingScreen />;
  }

  /* =======================================================
     Chat direct protection
     ======================================================= */

  // ملاحظة: يمنع هذا الحاجز وصول أي مستخدم غير موثّق (لا عضو ولا زائر)
  // إلى /chat. كان سابقاً يعرض نصاً بلون كريمي على خلفية كريمية فيبدو
  // كصفحة فارغة معطّلة — نوجّه الآن إلى /login مثل بقية المسارات المحمية.
  if (
    !user &&
    !isAuthenticated &&
    window.location.pathname.startsWith(
      '/chat'
    )
  ) {
    return <Navigate to="/login" replace />;
  }

  /* =======================================================
     MAIN APPLICATION
     ======================================================= */

  // كثافة الخلفية اللؤلؤية حسب الصفحة (واجهة فقط — لا يمسّ التوجيه أو المنطق)
  const pearlSurface = (() => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard' || p === '/home') return 'home';
    if (p.startsWith('/catalog') || p.startsWith('/branches') || p === '/products') return 'catalog';
    if (p.startsWith('/haraj') || p.startsWith('/ads') || p.startsWith('/advertisements') || p === '/ad/:id') return 'haraj';
    return 'none';
  })();

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        background:
          location.pathname === '/login'
            ? 'transparent'
            : 'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
        color: 'var(--rz-ink)',
        fontFamily: 'Tajawal',
        position: 'relative',
      }}
    >
      {/* =================================================
          طبقة خلفية لؤلؤية ثلاثية الأبعاد (زخرفية بحتة)
          ثابتة، pointer-events:none، خلف كل المحتوى (z-index:0)
          ================================================= */}
      <div
        ref={pearlLayerRef}
        className="rz-pearl-layer"
        data-pearl={pearlSurface}
        aria-hidden="true"
      >
        <div className="rz-pearl-blob b1" />
        <div className="rz-pearl-blob b2" />
        <div className="rz-pearl-blob b3" />
        <div className="rz-pearl-blob b4" />
        <div className="rz-pearl-flow" />
        <div className="rz-pearl-grid" />
        <div className="rz-pearl-veil" />
      </div>

      {/* =================================================
          Visitor Welcome Popup
          ================================================= */}

      {showVisitorPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "rgba(var(--rz-ink-rgb), 0.5)",
            display: "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
            zIndex: 9999,
            overflowY: 'auto',
            padding: '1rem',
          }}
          role="presentation"
          onClick={
            closeWelcomeModal
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="نموذج دخول الزائر"
            style={{
              background: "var(--rz-white)",
              padding: "25px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "380px",
              textAlign: "center",
              boxShadow:
                "0 0 15px rgba(var(--rz-ink-rgb), 0.2)",
              color: "var(--rz-ink)",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6 }}>
              <button
                type="button"
                onClick={closeWelcomeModal}
                aria-label="إغلاق"
                style={{
                  background: 'rgba(var(--rz-ink-rgb), 0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  marginInlineStart: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--rz-ink)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <h3
              style={{
                marginBottom: "10px",
              }}
            >
              مرحبًا بك في “أناقة ROOZ”
            </h3>

            <p
              style={{
                marginBottom: "20px",
                fontSize: "15px",
              }}
            >
              سجّل معنا الآن وأنشئ حسابك الجديد
              لتحصل على كود خصم 10٪ وتبدأ رحلتك
              في عالم الأناقة.
            </p>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="بريدك الإلكتروني"
              value={visitorEmail}
              onChange={(e) =>
                setVisitorEmail(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border:
                  "1px solid var(--rz-border)",
                marginBottom: "15px",
                fontSize: "16px",
              }}
            />

            <button
              onClick={
                handleVisitorEnter
              }
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--rz-ink)",
                color: "var(--rz-white)",
                borderRadius: "8px",
                border: "none",
                marginBottom: "10px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              إرسال رمز التحقق
            </button>

            <button
              onClick={
                closeWelcomeModal
              }
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--rz-primary)",
                color: "var(--rz-white)",
                borderRadius: "8px",
                border: "none",
                marginBottom: "10px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {visitorOtpEmail && (
        <OtpModal
          email={visitorOtpEmail}
          purpose="login"
          onVerified={handleVisitorOtpVerified}
          onClose={() => setVisitorOtpEmail(null)}
        />
      )}

      {/* =================================================
          Global animations
          ================================================= */}

      <style>{`

        :root {
          --rooz-header-h: 76px;
        }

        @media (max-width: 900px) {
          :root {
            --rooz-header-h: 60px;
          }
        }

        @keyframes ownerGlobalTicker {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }

@keyframes roozCrown3D {
  0%   { transform: perspective(600px) rotateY(0deg) scale(1); filter: drop-shadow(0 0 4px rgba(var(--rz-primary-rgb), 0.9)); }
  50%  { transform: perspective(600px) rotateY(360deg) scale(1.12); filter: drop-shadow(0 0 14px rgba(var(--rz-primary-rgb), 1)); }
  100% { transform: perspective(600px) rotateY(720deg) scale(1); filter: drop-shadow(0 0 4px rgba(var(--rz-primary-rgb), 0.9)); }
}

@keyframes roozStar3D {
  0%   { transform: perspective(400px) rotateX(0deg) scale(0.85); opacity:  0.75; }
  25%  { transform: perspective(400px) rotateX(45deg) scale(1.2); opacity:  1; }
  50%  { transform: perspective(400px) rotateX(-45deg) scale(0.9); opacity:  1; }
  75%  { transform: perspective(400px) rotateX(20deg) scale(1.15); opacity:  1; }
  100% { transform: perspective(400px) rotateX(0deg) scale(0.85); opacity:  0.75; }
}

        .rooz-app-main {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          position: relative;
          z-index: 1;
          box-sizing: border-box;
        }

        .rooz-page-content {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          position: relative;
          z-index: 1;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .rooz-page-content {
            width: 100%;
            min-width: 0;
            max-width: 100%;
          }
        }

      `}</style>

      {/* =================================================
          Owner welcome audio
          ================================================= */}

      <audio
        ref={audioRef}
        src={OWNER_ALERT_SOUND_URL}
        preload="auto"
      />

      {guestActive &&
        guestWelcomeSeen && (
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              bottom: 24,
              left: 16,
              right: 16,
              zIndex: 1460,
              maxWidth: 420,
              marginInline: 'auto',
              background:
                'linear-gradient(150deg, var(--rz-ink), var(--rz-ink))',
              border:
                '1px solid rgba(var(--rz-primary-rgb), 0.55)',
              borderRadius: 16,
              padding:
                '18px 20px',
              fontFamily:
                'Tajawal, sans-serif',
              color: 'var(--rz-ivory)',
              boxShadow:
                '0 18px 50px rgba(var(--rz-ink-rgb), 0.65)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <Clock
                size={30}
                color="var(--rz-gold)"
              />
              <strong
                style={{
                  color: 'var(--rz-ivory)',
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                دخول الزوار المؤقت
              </strong>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.7,
                textAlign: 'right',
                color: 'var(--rz-ivory)',
              }}
            >
              صديقنا العزيز: نفيدك بأن دخولك
              من هذا المكان هو مؤقت لمدة
              دقيقتين فقط، ونأمل منكم تسجيل
              حساب أو تسجيل الدخول لتتمكنوا
              من الدخول بشكل مستمر. شكراً
              لتفهمكم.

              <span
                style={{
                  display: 'block',
                  marginTop: 8,
                  fontSize: 12,
                  color: 'var(--rz-gold)',
                }}
              >
                سيتم إخراجك تلقائياً عند انتهاء الوقت.

              </span>
            </p>
          </div>
        )}

        {/* =================================================
            Guest countdown bar
            ================================================= */}

        {guestActive &&
          guestRemaining > 0 && (
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height:
                `calc(${GUEST_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
              minHeight:
                `calc(${GUEST_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
              paddingTop:
                'env(safe-area-inset-top, 0px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1400,
              background:
                guestRemaining <=
                10000
                  ? 'linear-gradient(90deg, rgba(var(--rz-primary-rgb), 0.97), rgba(var(--rz-primary-rgb), 0.92))'
                  : 'linear-gradient(90deg, var(--rz-ink), var(--rz-primary))',
              color: 'var(--rz-white)',
              padding: '0 1rem',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              boxShadow:
                '0 2px 10px rgba(var(--rz-ink-rgb), 0.3)',
              fontFamily:
                'Tajawal',
              boxSizing: 'border-box',
            }}
          >
            وضع الزائر المؤقت — الوقت
            المتبقي:{' '}
            <b
              style={{
                marginInline:
                  '4px',
              }}
            >
              {Math.ceil(
                guestRemaining / 1000
              )}
            </b>{' '}
            ثانية
            {guestRemaining <=
              10000 &&
              ' — قاربت الجلسة على الانتهاء!'}
          </div>
        )}

      {/* =================================================
          Guest expired popup
          ================================================= */}

      {guestExpired &&
        !isAuthenticated &&
        !window.location.pathname.startsWith('/haraj') && (
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              inset: 0,
              background:
                'rgba(var(--rz-ink-rgb), 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',
              zIndex: 15000,
              padding: 16,
              fontFamily:
                'Tajawal',
            }}
          >
            <div
              style={{
                background: 'var(--rz-ink)',
                border:
                  '1px solid rgba(var(--rz-primary-rgb), 0.4)',
                borderRadius: 16,
                padding:
                  '2rem 1.5rem',
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
                color: 'var(--rz-ivory)',
                boxShadow:
                  '0 20px 60px rgba(var(--rz-ink-rgb), 0.6)',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent:
                    'center',
                }}
              >
                <Clock
                  size={48}
                  color="var(--rz-primary)"
                />
              </div>

              <h2
                style={{
                  color: 'var(--rz-primary)',
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                تم انتهاء الجلسة
              </h2>

              <p
                style={{
                  color: 'var(--rz-border)',
                  fontSize: 15,
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                عزيزي الزائر: تم انتهاء الجلسة
                المؤقتة، ولو تريد الاستمرار
                بالدخول في الموقع فأنشئ
                حساباً جديداً. شكراً لتعاونكم
                معنا 💐 ولو عندك استفسار أو
                شكوى فتقدم بإرسال رسالتك
                إلى صاحب موقع «أناقة ROOZ»
                وسوف يتم التواصل معكم بأقرب
                وقت ممكن. بحفظ الرحمن ✋
              </p>

              <button
                type="button"
                onClick={() => {
                  endGuestSession(
                    'manual'
                  );

                  navigate(
                    '/register',
                    {
                      replace: true,
                    }
                  );
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  background:
                    'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                  color: 'var(--rz-white)',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginBottom: 8,
                }}
              >
                إنشاء حساب جديد
              </button>

              <button
                type="button"
                onClick={() => {
                  endGuestSession(
                    'manual'
                  );

                  navigate(
                    '/login',
                    {
                      replace: true,
                    }
                  );
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  background:
                    'transparent',
                  color: 'var(--rz-primary)',
                  border:
                    '1px solid rgba(var(--rz-primary-rgb), 0.4)',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                الذهاب لتسجيل الدخول
              </button>
            </div>
          </div>
        )}

      {/* =================================================
          Navigation
          ================================================= */}

      {isAuthenticated && (
        <Navigation
          user={user}
          onLogout={handleLogout}
          onOpenWelcome={
            openWelcomeModal
          }
          onOpenAIChat={() => setAiChatOpen(true)}
        />
      )}

      {/* ================================================= */}
      {/* Floating Back Button */}
      {/* ================================================= */}

      <BackButton />

      {/* =================================================
          Global Close Button (❌) — يظهر في الصفحات الفرعية
          واللوحات/التبويبات، ولا يظهر في الجذر/المصادقة.
          اللوحات الداخلية (الإدارة/غرفة المالك) توفّر زرها الخاص.
          ================================================= */}

      {/* CloseButton معطل — زر الرجوع وحده لتجنب التداخل */}

      {/* =================================================
          AI assistant
          ================================================= */}

      {isAuthenticated && (
        <AIChatWidget
          topOffset={
            guestBarVisible
              ? 80
              : ownerWelcomeBanner
              ? 48
              : 0
          }
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
        />
      )}

      {/* =================================================
          WhatsApp
          ================================================= */}

      {location.pathname !==
        '/login' && (
        <WhatsAppFloat />
      )}

      {/* =================================================
          MAIN PAGE CONTENT
          ================================================= */}

      <main
        className="rooz-app-main"
        style={{
          flex: '1 1 auto',
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
          paddingTop: isAuthenticated ? 'var(--nav-height, 56px)' : 0,
          marginTop: 0,
        }}
      >

        {/* =================================================
            Owner welcome ticker
            - يظهر فوق الشعار مباشرة داخل محتوى الصفحة الرئيسية
            - يظهر الرسالة كاملة من البداية
            - الاتجاه صحيح (من اليمين لليسار)
            - يمر 3 مرات متتالية فقط ثم يختفي
            - يظهر مع كل تسجيل دخول لصاحب الموقع
            ================================================= */}

        {ownerWelcomeBanner && location.pathname === '/' && (
          <div
            dir="rtl"
            style={{
              position: 'relative',
              left: 0,
              right: 0,
              width: '100%',
              height: '60px',
              overflow: 'hidden',
              display: 'block',
              background: 'linear-gradient(90deg, var(--rz-ink) 0%, var(--rz-ink) 40%, var(--rz-ink) 60%, var(--rz-ink) 100%)',
              borderTop: '2px solid var(--rz-primary)',
              borderBottom: '2px solid var(--rz-primary)',
              boxShadow: '0 12px 32px rgba(var(--rz-ink-rgb), 0.6), 0 0 22px rgba(var(--rz-primary-rgb), 0.25)',
              zIndex: 80,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '60px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 'max-content',
                  minWidth: 'max-content',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  animation: 'ownerGlobalTicker 32s linear 3',
                  willChange: 'transform',
                }}
                onAnimationEnd={() => {
                  setOwnerWelcomeBanner(null);
                }}
              >
                <b
                  style={{
                    display: 'block',
                    flexShrink: 0,
                    padding: '0 60px',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Tajawal, "Noto Sans Arabic", Tahoma, sans-serif',
                    fontSize: 'clamp(1.15rem, 2.5vw, 1.55rem)',
                    fontWeight: 900,
                    WebkitTextStroke: '0.4px rgba(var(--rz-champagne-rgb), 0.5)',
                    lineHeight: '60px',
                    direction: 'rtl',
                    unicodeBidi: 'isolate',
                    color: 'var(--rz-champagne)',
                    WebkitTextFillColor: 'var(--rz-champagne)',
                    textShadow: '0 1px 2px rgba(var(--rz-black-rgb), 0.45)',
                  }}
                >
                  {ownerWelcomeBanner?.msg || OWNER_WELCOME_MESSAGE}
                </b>
              </div>
            </div>
          </div>
        )}

        <div
          className="rooz-page-content"
          style={{
            width: '100%',
            minWidth: 0,
            maxWidth: '100%',
            position: 'relative',
            zIndex: 1,
            boxSizing: 'border-box',
          }}
        >
          <Suspense
            fallback={
              <LoadingScreen />
            }
          >
            <Routes>

              <Route
                path="/login"
                element={
                  <LoginRoute
                    isAuthenticated={isAuthenticated}
                    isGuest={isGuest}
                    isAnonymousSession={isAnonymousSession}
                  >
                    <Login />
                  </LoginRoute>
                }
              />

              <Route
                path="/unauthorized"
                element={
                  <UnauthorizedPage />
                }
              />

              <Route
                path="/register"
                element={
                  <Register />
                }
              />

              <Route
                path="/forgot-password"
                element={
                  <ForgotPassword />
                }
              />

              <Route
                path="/contact"
                element={
                  <ProtectedRoute>
                    <ContactPage />
                  </ProtectedRoute>
                }
              />

              {/* الرئيسية مسار عام: الزائر يتصفّحها مع شريط العدّاد.
                  إزالة blockGuest هنا تمنع حلقة التوجيه مع /login.
                  الصفحات الخاصة (مثل /dashboard) تبقى محمية بـ blockGuest. */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoyalHomePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute
                    blockGuest
                  >
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/catalog/:catalogId"
                element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branches"
                element={
                  <ProtectedRoute>
                    <BranchesManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/branch/:id"
                element={
                  <ProtectedRoute>
                    <BranchDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/advertisements"
                element={
                  <ProtectedRoute>
                    <AdvertisementsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ad/:id"
                element={
                  <ProtectedRoute>
                    <AdDetailsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/haraj/ad/:id"
                element={
                  <ProtectedRoute>
                    <AdDetailsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employees"
                element={
                  <ProtectedRoute
                    permissionAny={['ADD_NEW_EMPLOYEE', 'EDIT_EMPLOYEE_PROFILE', 'SUSPEND_SUB_ADMIN_ACCOUNT', 'SUPER_ADMIN_FULL_ACCESS']}
                  >
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/complaints"
                element={
                  <ProtectedRoute
                    roleRequired="owner"
                  >
                    <ComplaintsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ai-chat"
                element={
                  <ProtectedRoute>
                    <AIChat />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/haraj"
                element={
                  <ProtectedRoute>
                    <RoyalHarajPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/haraj/catalog/:catalogId"
                element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/haraj/post"
                element={
                  <ProtectedRoute>
                    <AdFormPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/about"
                element={
                  <ProtectedRoute>
                    <AboutPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    permissionAny={['SUPER_ADMIN_FULL_ACCESS', 'UPDATE_GLOBAL_SETTINGS', 'CREATE_NEW_CATALOG', 'DELETE_MAIN_CATALOG']}
                  >
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inbox"
                element={
                  <ProtectedRoute>
                    <MemberInbox />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/otp"
                element={
                  <ProtectedRoute>
                    <OTPPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UsersList />
                  </ProtectedRoute>
                }
              />

              {/* ⭐ مسار الأسئلة الشائعة الجديد */}
              <Route
                path="/faq"
                element={
                  <ProtectedRoute>
                    <FAQ />
                  </ProtectedRoute>
                }
              />

              {/* ⭐ صفحة الشروط والأحكام */}
              <Route
                path="/terms"
                element={
                  <ProtectedRoute>
                    <TermsPage />
                  </ProtectedRoute>
                }
              />

              {/* ⭐ صفحة طلب فستان (الخصائص الذكية) */}
              <Route
                path="/wanted-dress"
                element={
                  <ProtectedRoute>
                    <WantedDressPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationPanel />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/owner-room"
                element={
                  <Navigate
                    to="/owner-private-room"
                    replace
                  />
                }
              />

              <Route
                path="/owner-private-room"
                element={
                  <ProtectedRoute
                    roleRequired="owner"
                  >
                    <OwnerPrivateRoom />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/owner-panel"
                element={
                  <ProtectedRoute
                    roleRequired="owner"
                  >
                    <OwnerPanel />
                  </ProtectedRoute>
                }
              />

              <Route
                path="*"
                element={
                  <Navigate
                    to={isAuthenticated ? '/' : '/login'}
                    replace
                  />
                }
              />

            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
APP
========================================================= */

export default function App() {
  return (
    <AdminProvider>
      <AppContent />
    </AdminProvider>
  );
}