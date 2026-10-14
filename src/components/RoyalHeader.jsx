// src/components/RoyalHeader.jsx
// ============================================================
// الترويسة الملكية — أناقة ROOZ (الطبقتان + الدرج الذكي بزر +)
// واجهة فقط: تستقبل الحالة والدوال جاهزة من Navigation ولا تلمس أي منطق.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search, Heart, Bell, User, Menu, X, Plus, Minus, Home, Store,
  LayoutGrid, Tag, Sparkles, Info, Crown, LogOut, Bot,
} from 'lucide-react';
import { ROYAL_NAV, ROYAL_DRAWER, STORE_HOME_PATH } from '../data/royalMenu';
import '../styles/rooz-royal.css';

const NAV_ICONS = {
  home: Home,
  store: Store,
  grid: LayoutGrid,
  tag: Tag,
  sparkles: Sparkles,
  info: Info,
  user: User,
  help: Info,
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
}) => {
  const navigate = useNavigate();
  const location = useLocation();
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
          <Link to="/" className="rz-logo" aria-label="أناقة ROOZ — الصفحة الرئيسية">
            <img src="/assets/logo.png" alt="أناقة ROOZ" />
          </Link>

          <form className="rz-search" onSubmit={submitSearch} role="search">
            <span className="rz-search-icon"><Search size={18} /></span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ماذا تبحثين عنه؟"
              aria-label="البحث في الموقع"
            />
          </form>

          <div className="rz-actions">
            <button type="button" className="rz-icon-btn" aria-label="المفضلة" title="المفضلة"
              onClick={() => go('/settings')}>
              <Heart size={19} />
            </button>
            <button type="button" className="rz-icon-btn" aria-label="الإشعارات" title="الإشعارات"
              onClick={() => go('/notifications')}>
              <Bell size={19} />
              {unreadNotifications > 0 && (
                <span className="rz-icon-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
              )}
            </button>
            <button type="button" className="rz-icon-btn" aria-label="الحساب" title="الحساب"
              onClick={() => go('/settings')}>
              <User size={19} />
            </button>
            {typeof onOpenAIChat === 'function' && (
              <button type="button" className="rz-icon-btn" aria-label="المساعدة الذكية" title="المساعدة الذكية"
                onClick={onOpenAIChat}>
                <Bot size={19} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------- الطبقة الثانية ---------- */}
      <div className="rz-subbar">
        <div className="rz-subbar-inner">
          <button type="button" className="rz-burger" onClick={() => setDrawerOpen(true)} aria-label="فتح القائمة الكاملة">
            <Menu size={19} />
            <span>القائمة</span>
          </button>

          <nav aria-label="التنقل الرئيسي" style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {ROYAL_NAV.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.id === 'store' && location.pathname.startsWith('/catalog'));
              return (
              <Link
                key={item.id}
                to={item.path}
                className={`rz-nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </Link>
              );
            })}
          </nav>

          <span className="rz-subbar-spacer" />
        </div>
      </div>

      {/* ---------- الدرج الذكي ---------- */}
      {drawerOpen && (
        <>
          <button type="button" className="rz-drawer-overlay" aria-label="إغلاق القائمة" tabIndex={-1} onClick={closeDrawer} />
          <aside className="rz-drawer" role="dialog" aria-modal="true" aria-label="قائمة التنقل الكاملة">
            <div className="rz-drawer-head">
              <span className="rz-drawer-title"><Crown size={18} color="#B8A47A" /> أناقة ROOZ</span>
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

              {isOwnerLoggedIn && (
                <div className="rz-group">
                  <button
                    type="button"
                    className="rz-group-btn"
                    aria-expanded={openGroup === 'owner'}
                    onClick={() => setOpenGroup(openGroup === 'owner' ? null : 'owner')}
                  >
                    <span className="rz-group-icon"><Crown size={18} /></span>
                    <span className="rz-group-label">غرفة القيادة</span>
                    <span className={`rz-plus ${openGroup === 'owner' ? 'is-open' : ''}`}>{openGroup === 'owner' ? <Minus size={15} /> : <Plus size={15} />}</span>
                  </button>
                  {openGroup === 'owner' && (
                    <div className="rz-sub">
                      <ul className="rz-sub-list">
                        <li><button type="button" className="rz-sub-item" onClick={() => go('/owner-private-room')}><span className="rz-sub-dot" /><span>غرفة صاحب الموقع</span></button></li>
                        <li><button type="button" className="rz-sub-item" onClick={() => go('/admin')}><span className="rz-sub-dot" /><span>لوحة الإدارة</span></button></li>
                        <li><button type="button" className="rz-sub-item" onClick={() => go('/users')}><span className="rz-sub-dot" /><span>المستخدمون</span></button></li>
                        <li><button type="button" className="rz-sub-item" onClick={() => go('/employees')}><span className="rz-sub-dot" /><span>الموظفون</span></button></li>
                        <li><button type="button" className="rz-sub-item" onClick={() => { closeDrawer(); onOpenBroadcast?.(); }}><span className="rz-sub-dot" /><span>رسالة البث</span></button></li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
              {isOwnerLoggedIn && typeof onOpenOwnerContact === 'function' && (
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
