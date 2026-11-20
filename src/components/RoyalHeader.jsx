// src/components/RoyalHeader.jsx
// ============================================================
// الترويسة الملكية — متجر المسيمير | ALMUSAYMIR (الطبقتان + الدرج الذكي بزر +)
// واجهة فقط: تستقبل الحالة والدوال جاهزة من Navigation ولا تلمس أي منطق.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search, Heart, Bell, User, Menu, X, Plus, Minus, Home, Store,
  LayoutGrid, Tag, Sparkles, Info, Crown, LogOut, Bot, Compass, Lock, SlidersHorizontal,
} from 'lucide-react';
import { ROYAL_NAV, ROYAL_DRAWER, STORE_HOME_PATH } from '../data/royalMenu';
import { BRAND } from '../data/brand';
import Editable from './Editable';
import useSiteContent from '../store/useSiteContent';
import '../styles/alm-royal.css';

const NAV_ICONS = {
  home: Home,
  store: Store,
  grid: LayoutGrid,
  tag: Tag,
  sparkles: Sparkles,
  info: Info,
  user: User,
  help: Info,
  compass: Compass,
};
const ICON = ({ name, size = 18 }) => {
  const C = NAV_ICONS[name] || Sparkles;
  return <C size={size} />;
};

const RoyalHeader = ({
  user,
  userRole,
  isOwnerLoggedIn,
  unreadNotifications = 0,
  onOpenAIChat,
  onLogout,
  onOpenOwnerContact,
  onOpenBroadcast,
  onOpenWelcome,
  onSearchSubmit,
  tools = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const siteTexts = useSiteContent((s) => s.texts);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [query, setQuery] = useState('');

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // إغلاق الدرج بمفتاح Esc
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  // قفل تمرير الصفحة عند فتح الدرج
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [drawerOpen]);

  const go = useCallback((path) => {
    // مسار بعنصر (#offers): ننتقل للصفحة الرئيسية ثم نُمرّر لعنصر العروض،
    // بدل توجيه المستخدم إلى صفحة إدارية.
    if (typeof path === 'string' && path.includes('#')) {
      const [pathname, hash] = path.split('#');
      navigate(pathname || '/');
      closeDrawer();
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }
    if (path) navigate(path);
    closeDrawer();
  }, [navigate, closeDrawer]);

  const submitSearch = useCallback((e) => {
    e.preventDefault();
    const q = query.trim();
    if (typeof onSearchSubmit === 'function') {
      onSearchSubmit(q);
    } else if (q) {
      navigate(`/catalog/${encodeURIComponent(q)}`);
    }
  }, [query, navigate, onSearchSubmit]);

  const roleLabel = userRole === 'owner' ? 'المالك' : userRole === 'admin' ? 'مدير' : userRole === 'guest' ? 'زائر' : 'عضو';
  const displayName = user?.name || user?.displayName || user?.email?.split('@')[0] || (userRole === 'guest' ? 'زائر' : 'مستخدم');

  const visibleGroups = ROYAL_DRAWER.filter((g) => !g.authOnly || userRole !== 'guest');

  return (
    <header className="rz-header" dir="rtl">
      {/* ---------- الطبقة الأولى ---------- */}
      <div className="rz-topbar">
        <div className="rz-topbar-inner">
          <Link to="/" className="rz-logo" aria-label={`${BRAND.FULL} — الصفحة الرئيسية`}>
            <img src={BRAND.LOGO_WIDE} alt={BRAND.FULL} className="rz-logo-img" />
          </Link>

          <form className="rz-search" onSubmit={submitSearch} role="search">
            <span className="rz-search-icon"><Search size={18} /></span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={siteTexts['header.search_placeholder'] || 'ابحث عن أي منتج أو قسم…'}
              aria-label="البحث في الموقع"
            />
          </form>

          <div className="rz-actions">
            <button type="button" className="rz-icon-btn" aria-label="المفضلة" title="المفضلة"
              onClick={() => go('/favorites')}>
              <Heart size={20} strokeWidth={1.75} />
            </button>
            <button type="button" className="rz-icon-btn" aria-label="الإشعارات" title="الإشعارات"
              onClick={() => go('/notifications')}>
              <Bell size={20} strokeWidth={1.75} />
              {unreadNotifications > 0 && (
                <span className="rz-icon-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
              )}
            </button>
            {/* مدخل واحد واضح للإعدادات — متاح للزائر والعضو معاً.
                الصفحة نفسها تفصل تفضيلات العرض (للجميع) عن بيانات الحساب (للمسجّل). */}
            <button type="button" className="rz-icon-btn" aria-label="الحساب والإعدادات" title="الإعدادات — حجم الخط والألوان والتباين والصوت"
              onClick={() => go('/settings')}>
              <SlidersHorizontal size={19} strokeWidth={1.75} />
            </button>
            {typeof onOpenAIChat === 'function' && (
              <button type="button" className="rz-icon-btn" aria-label="المساعدة الذكية" title="المساعدة الذكية"
                onClick={onOpenAIChat}>
                <Bot size={20} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------- الطبقة الثانية ---------- */}
      <div className="rz-subbar">
        <div className="rz-subbar-inner">
          <button type="button" className="rz-burger" onClick={() => setDrawerOpen(true)} aria-label="فتح القائمة الكاملة">
            <Menu size={18} strokeWidth={2.25} />
            <span>القائمة</span>
          </button>

          <nav aria-label="التنقل الرئيسي" className="rz-nav">
            {ROYAL_NAV.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.id === 'store' && location.pathname.startsWith('/catalog'));
              return (
              <Link
                key={item.id}
                to={item.path}
                className={`rz-nav-link ${isActive ? 'is-active' : ''}`}
                onClick={(e) => {
                  // روابط بعنصر (#offers) تُمرَّر عبر go() لتُمرّر للعنصر
                  // في نفس الصفحة بدل الاعتماد على سلوك المتصفح.
                  if (item.path.includes('#')) {
                    e.preventDefault();
                    go(item.path);
                  }
                }}
              >
                <Editable contentKey={`header.nav.${item.id}`} defaultValue={item.label} />
              </Link>
              );
            })}
          </nav>

          <span className="rz-subbar-spacer" />
          {tools ? <div className="rz-subbar-tools">{tools}</div> : null}
        </div>
      </div>

      {/* ---------- الدرج الذكي ---------- */}
      {drawerOpen && (
        <>
          <button type="button" className="rz-drawer-overlay" aria-label="إغلاق القائمة" tabIndex={-1} onClick={closeDrawer} />
          <aside className="rz-drawer" role="dialog" aria-modal="true" aria-label="قائمة التنقل الكاملة">
            <div className="rz-drawer-head">
              <span className="rz-drawer-title"><Crown size={18} color="var(--rz-gold)" /> {BRAND.FULL}</span>
              <button type="button" className="rz-drawer-close" onClick={closeDrawer} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="rz-drawer-body">
              {visibleGroups.map((group) => {
                const isOpen = openGroup === group.id;
                return (
                  <div className="rz-group" key={group.id}>
                    <button
                      type="button"
                      className="rz-group-btn"
                      aria-expanded={isOpen}
                      onClick={() => setOpenGroup(isOpen ? null : group.id)}
                    >
                      <span className="rz-group-icon"><ICON name={group.icon} size={18} /></span>
                      <span className="rz-group-label">{group.label}</span>
                      <span className={`rz-plus ${isOpen ? 'is-open' : ''}`}>{isOpen ? <Minus size={15} /> : <Plus size={15} />}</span>
                    </button>

                    {isOpen && (
                      <div className="rz-sub">
                        <ul className="rz-sub-list">
                          {group.items.map((it) => (
                            <li key={`${group.id}-${it.path}-${it.label}`}>
                              <button type="button" className="rz-sub-item" onClick={() => go(it.path)}>
                                <span className="rz-sub-dot" />
                                <span>{it.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* غرفة القيادة: يراها الجميع، وبالضغط عليها يُطلب الرمز السري أولاً.
                  لا تُعرض أي قائمة داخلية هنا — المحتوى كله خلف حارس الرمز
                  داخل /owner-private-room، فلا يتسرّب هيكل الغرفة قبل التحقق. */}
              <div className="rz-group">
                <button
                  type="button"
                  className="rz-group-btn"
                  onClick={() => go('/console')}
                >
                  <span className="rz-group-icon"><Crown size={18} /></span>
                  <span className="rz-group-label">غرفة القيادة</span>
                  <span className="rz-plus"><Lock size={14} /></span>
                </button>
              </div>
            </div>

            <div className="rz-drawer-foot">
              <div className="rz-drawer-user">
                <span className="user-name">{displayName}</span>
                <span className="rz-role">{roleLabel}</span>
              </div>
              {typeof onOpenWelcome === 'function' && (
                <button type="button" className="rz-drawer-logout" onClick={() => { closeDrawer(); onOpenWelcome(); }}>
                  <Crown size={15} /> <span>أهلاً بكم</span>
                </button>
              )}
              {!isOwnerLoggedIn && typeof onOpenOwnerContact === 'function' && (
                <button type="button" className="rz-drawer-logout" onClick={() => { closeDrawer(); onOpenOwnerContact(); }}>
                  <User size={15} /> <span>مراسلة صاحب الموقع</span>
                </button>
              )}
              {typeof onLogout === 'function' && (
                <button type="button" className="rz-drawer-logout" onClick={() => { closeDrawer(); onLogout(); }}>
                  <LogOut size={15} /> <span>تسجيل الخروج</span>
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </header>
  );
};

export default RoyalHeader;
