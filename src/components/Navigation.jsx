// src/components/Navigation.jsx
// ============================================================
// Navigation Component - أناقة ROOZ
// تحسينات الأداء + تعليقات توضيحية كاملة
// ============================================================

import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  LogOut,
  Home,
  Users,
  Zap,
  MessageSquare,
  Info,
  Menu,
  X,
  Eye,
  EyeOff,
  ShoppingBag,
  Crown,
  Settings,
  Bell,
  Mail,
  Megaphone,
  Bot,
  Store,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Gem,
  Headphones,
  MonitorSmartphone
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useNotifications from '../store/useNotifications';
import ContactOwnerModal from './ContactOwnerModal';
import BroadcastModal from './BroadcastModal';
import { ROYAL_SECTIONS } from './RoyalHome/sectionsData';
import OwnerEditBadge from './OwnerEditBadge';
import RoyalHeader from './RoyalHeader';

// ============================================================
// ثوابت خارج المكوّن → لا يُعاد إنشاؤها في كل تصيير (تحسين أداء)
// ============================================================
const SECTION_ICONS = {
  'dresses': Home,
  'wedding-dresses': Sparkles,
  'girls-dresses': Sparkles,
  'abayas': Sparkles,
  'bags': ShoppingBag,
  'shoes': Sparkles,
  'used-dresses': Sparkles,
  'perfumes': Sparkles,
  'golden-mothers': Crown,
  'jewelry': Sparkles,
  'home-products': Store,
};

const PAGES = [
  { id: 'dashboard', label: 'الرئيسية', icon: Home, path: '/' },
  { id: 'owner-private', label: 'غرفة صاحب موقع أناقة ROOZ', icon: Crown, path: '/owner-private-room', ownerOnly: true },
  { id: 'admin-panel', label: 'الإدارة', icon: Settings, path: '/admin', ownerOnly: true },
  { id: 'contact-owner', label: 'مراسلة صاحب الموقع', icon: Mail, opensModal: true },
  { id: 'ads', label: 'موقع الحراج الرسمي', icon: ShoppingBag, path: '/haraj' },
  { id: 'branches', label: 'الفروع', icon: Zap, path: '/branches' },
  { id: 'employees', label: 'فريق العمل', icon: Users, path: '/employees' },
  { id: 'contact', label: 'تواصل معنا', icon: MessageSquare, path: '/contact' },
  { id: 'about', label: 'حول الموقع', icon: Info, path: '/about' }
];

// ============================================================
// المكوّن الرئيسي
// ============================================================
const Navigation = ({ onOpenWelcome, onOpenAIChat }) => {
  const {
    user,
    userRole,
    logout,
    isOwnerLoggedIn,
    ownerHiddenMode,
    toggleOwnerHiddenMode
  } = useContext(AuthContext);

  const [isOpen, setIsOpen] = useState(false);
  const [showOwnerContact, setShowOwnerContact] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [showElegantWelcome, setShowElegantWelcome] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setExpandedSection(null);
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    closeMenu();
    try {
      await logout?.();
    } catch (e) {
      console.warn('logout error:', e);
    }
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      window.sessionStorage.removeItem('rooz_owner_banner');
    } catch {
      // تجاهل الأخطاء غير الحرجة
    }
    navigate('/login', { replace: true });
    window.setTimeout(() => setLoggingOut(false), 300);
  }, [logout, navigate, closeMenu]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeMenu]);

  useEffect(() => {
    setExpandedSection(null);
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const hideNavPaths = ['/login', '/register', '/forgot-password', '/unauthorized'];
    if (hideNavPaths.includes(location.pathname)) {
      document.body.classList.remove('rooz-has-nav');
      return undefined;
    }
    document.body.classList.add('rooz-has-nav');
    document.documentElement.style.setProperty('--nav-height', '52px');
    return () => {
      document.body.classList.remove('rooz-has-nav');
    };
  }, [location.pathname]);

  const unreadNotifications = useNotifications((s) =>
    s.muted ? 0 : s.items.filter((i) => i.at > s.lastSeenAt).length
  );

  const visiblePages = useMemo(
    () => PAGES.filter((p) => !p.ownerOnly || isOwnerLoggedIn),
    [isOwnerLoggedIn]
  );

  const catalogSections = useMemo(
    () => ROYAL_SECTIONS.filter((s) => !s.isAction),
    []
  );

  return (
    <>
      {/* قواعد مشتركة يستخدمها RoyalHeader — أُبقيت بعد إزالة كتلة .navbar الميتة
          التي لم يكن أي صنف منها مُصيَّراً في JSX (نُقلت الترويسة إلى RoyalHeader). */}
      <style>{`
        .user-name { font-weight: 800; color: var(--rz-ink); }
        .nav-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100dvh;
          background: rgba(var(--rz-ink-rgb), 0.48);
          z-index: 2500;
          border: none;
          cursor: pointer;
        }
      `}</style>

      {showOwnerContact && (
        <ContactOwnerModal onClose={() => setShowOwnerContact(false)} />
      )}
      {showBroadcast && (
        <BroadcastModal onClose={() => setShowBroadcast(false)} />
      )}

      {isOpen && (
        <button
          type="button"
          className="nav-overlay"
          aria-label="إغلاق القائمة"
          tabIndex={-1}
          onClick={closeMenu}
        />
      )}

      <RoyalHeader
        user={user}
        userRole={userRole}
        isOwnerLoggedIn={isOwnerLoggedIn}
        unreadNotifications={unreadNotifications}
        onOpenAIChat={onOpenAIChat}
        onLogout={handleLogout}
        onOpenOwnerContact={() => setShowOwnerContact(true)}
        onOpenBroadcast={() => setShowBroadcast(true)}
        onOpenWelcome={() => setShowElegantWelcome(true)}
      />

      {showElegantWelcome && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowElegantWelcome(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(var(--rz-ink-rgb), 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.45)',
              borderRadius: 18,
              padding: '1.5rem 1.25rem',
              maxWidth: 370,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 22px 55px rgba(var(--rz-ink-rgb), 0.35)',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <Crown size={30} color="var(--rz-primary)" style={{ marginBottom: 10 }} />
            <h3 style={{ margin: '0 0 0.45rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--rz-ink)' }}>
              أهلاً بكم في أناقة ROOZ
            </h3>
            <p style={{ margin: '0 0 1.1rem', fontSize: '0.88rem', color: 'var(--rz-ink)', lineHeight: 1.65 }}>
              نورت المنصة. هنا تجدون الفخامة والثقة في كل تفصيلة.
              <br />
              استمتعوا بتجربة راقية تليق بذوقكم.
            </p>
            <button
              type="button"
              onClick={() => setShowElegantWelcome(false)}
              style={{
                background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                color: 'var(--rz-white)',
                border: 'none',
                borderRadius: 11,
                padding: '0.55rem 1.5rem',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              متابعة التصفح
            </button>
          </div>
        </div>
      )}

      {infoModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setInfoModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(var(--rz-ink-rgb), 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.45)',
              borderRadius: 18,
              padding: '1.35rem 1.15rem',
              maxWidth: 440,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              textAlign: 'right',
              boxShadow: '0 22px 55px rgba(var(--rz-ink-rgb), 0.35)',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--rz-ink)' }}>
                {infoModal === 'why' && 'لماذا أناقة ROOZ؟'}
                {infoModal === 'contest' && 'المسابقة الكبرى'}
                {infoModal === 'statement' && 'بيان الموقع الرسمي'}
                {infoModal === 'journey' && 'رحلة التسوق في ROOZ'}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                style={{
                  background: 'rgba(var(--rz-primary-rgb), 0.12)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
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

            {infoModal === 'why' && (
              <div style={{ display: 'grid', gap: 11 }}>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 12, padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <ShieldCheck size={17} color="var(--rz-primary)" />
                    <strong style={{ color: 'var(--rz-primary)' }}>موثوق وآمن</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--rz-ink)' }}>نراجع الإعلانات ونضمن بيئة آمنة للتعامل</p>
                </div>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 12, padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Gem size={17} color="var(--rz-primary)" />
                    <strong style={{ color: 'var(--rz-primary)' }}>جودة عالية</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--rz-ink)' }}>إعلانات راقية لأناس راقين مثلك</p>
                </div>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 12, padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <MonitorSmartphone size={17} color="var(--rz-primary)" />
                    <strong style={{ color: 'var(--rz-primary)' }}>سهولة الاستخدام</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--rz-ink)' }}>واجهة بسيطة وتجربة سلسة</p>
                </div>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 12, padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Headphones size={17} color="var(--rz-primary)" />
                    <strong style={{ color: 'var(--rz-primary)' }}>دعم على مدار الساعة</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--rz-ink)' }}>فريق الدعم جاهز لمساعدتك دائماً</p>
                </div>
              </div>
            )}

            {infoModal === 'contest' && (
              <div style={{ textAlign: 'center' }}>
                <Crown size={28} color="var(--rz-primary)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: '1.02rem', color: 'var(--rz-primary)', lineHeight: 1.7, margin: 0 }}>
                  ستُقام مسابقة كبرى قريباً على <strong style={{ color: 'var(--rz-primary)' }}>3 أطقم ذهب عيار 21</strong> وهدايا أخرى قيّمة.
                  <br /><br />
                  <span style={{ fontWeight: 700, color: 'var(--rz-primary)' }}>انتظرونا</span>
                </p>
              </div>
            )}

            {infoModal === 'statement' && (
              <p style={{ fontSize: '0.88rem', lineHeight: 1.9, color: 'var(--rz-ink)', margin: 0 }}>
                منصة «أناقة ROOZ» تعمل تحت <strong style={{ color: 'var(--rz-primary)' }}>حماية قانونية ومحاماة معتمدة</strong>.
                خصوصية جميع المستخدمين مصانة بالكامل، وجميع البيانات محمية بتشفير كامل.
                نلتزم بالاحترام المتبادل، وأعضاؤنا بالنسبة لصاحب الموقع <strong style={{ color: 'var(--rz-primary)' }}>خط أحمر</strong> —
                لا يُقبل أي إساءة أو ضرر لأي شخص داخل المنصة، ومن يتجاوز ذلك يُحال للجهات المختصة.
              </p>
            )}

            {infoModal === 'journey' && (
              <div style={{ display: 'grid', gap: 9 }}>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 11, padding: '0.75rem' }}>
                  <strong style={{ color: 'var(--rz-primary)' }}>01 اكتشف</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: 'var(--rz-ink)' }}>استعرض الأقسام واختر الفئة المناسبة.</p>
                </div>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 11, padding: '0.75rem' }}>
                  <strong style={{ color: 'var(--rz-primary)' }}>02 اختر</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: 'var(--rz-ink)' }}>تصفح المنتجات وابحث عن القطعة المناسبة.</p>
                </div>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 11, padding: '0.75rem' }}>
                  <strong style={{ color: 'var(--rz-primary)' }}>03 تواصل</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: 'var(--rz-ink)' }}>تواصل مع البائع أو الجهة المناسبة عند الحاجة.</p>
                </div>
                <div style={{ background: 'rgba(var(--rz-white-rgb), 0.65)', borderRadius: 11, padding: '0.75rem' }}>
                  <strong style={{ color: 'var(--rz-primary)' }}>04 استمتع</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: 'var(--rz-ink)' }}>استكمل تجربتك داخل أناقة ROOZ بكل سهولة.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;