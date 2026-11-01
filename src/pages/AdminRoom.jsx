// src/pages/AdminRoom.jsx — غرفة المشرف (مشرف/موظف مُفوَّض)
//
// مسار إداري منفصل وآمن: لا يفتح غرفة صاحب الموقع، ولا يعرض إلا الأقسام التي
// يملك المشرف صلاحيتها فعلاً. كل عملية تُفرض خادمياً بقواعد Firestore عبر
// requirePerm/hasPerm — إخفاء الأقسام هنا مجرد راحة، والفرض الحقيقي على الخادم.
//
// الأقسام (كل قسم مفتاحه مستقل):
//   reports        → MANAGE_REPORTS
//   reviews        → MANAGE_REVIEWS
//   notifications  → MANAGE_NOTIFICATIONS
//   categories     → MANAGE_CATEGORIES
//   banners        → MANAGE_SITE_BANNERS
import { useEffect, useMemo, useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Flag, Star, Bell, LayoutGrid, Image as ImageIcon, Shield, LogOut, RefreshCw } from 'lucide-react';
import { auth, db, collection, getDocs } from '../firebase';
import usePermissions from '../permissions/usePermissions';
import { ReportsPanel, ReviewsPanel } from '../components/owner/ModerationPanels';
import { CategoriesManager, BannersManager, NotificationsManager } from '../components/admin/ContentPanels';

const SECTIONS = [
  { id: 'reports', label: 'البلاغات', icon: Flag, perm: 'MANAGE_REPORTS' },
  { id: 'reviews', label: 'التقييمات', icon: Star, perm: 'MANAGE_REVIEWS' },
  { id: 'notifications', label: 'التنبيهات', icon: Bell, perm: 'MANAGE_NOTIFICATIONS' },
  { id: 'categories', label: 'التصنيفات', icon: LayoutGrid, perm: 'MANAGE_CATEGORIES' },
  { id: 'banners', label: 'البنرات', icon: ImageIcon, perm: 'MANAGE_SITE_BANNERS' },
];

const AdminRoom = () => {
  const navigate = useNavigate();
  const { can, ready } = usePermissions();

  const allowed = useMemo(() => SECTIONS.filter((s) => can(s.perm)), [can]);
  // توقيع ثابت للأقسام المسموحة — يُستخدم كاعتماد لإعادة تحميل البيانات عند
  // تغيّر الصلاحيات (حتى لو بقي عدد الأقسام كما هو).
  const allowedKey = allowed.map((s) => s.id).join(',');

  const [activeSection, setActiveSection] = useState('');
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);

  // أول قسم مسموح افتراضياً
  useEffect(() => {
    if (!activeSection && allowed.length > 0) setActiveSection(allowed[0].id);
  }, [allowed, activeSection]);

  const loadData = useCallback(async () => {
    if (!db) return;
    const jobs = [];
    if (can('MANAGE_REPORTS')) {
      jobs.push(
        getDocs(collection(db, 'reports'))
          .then((snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
          .catch(() => setReports([]))
      );
    }
    if (can('MANAGE_REVIEWS')) {
      jobs.push(
        getDocs(collection(db, 'reviews'))
          .then((snap) => setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
          .catch(() => setReviews([]))
      );
    }
    await Promise.all(jobs);
  }, [can]);

  useEffect(() => {
    if (ready && allowedKey) loadData();
  }, [ready, allowedKey, loadData]);

  // منع الوصول المباشر للمسار عند عدم وجود أي صلاحية
  if (!ready) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[var(--rz-ivory)] text-[var(--rz-ink)] font-bold">
        جارٍ التحقق من الصلاحيات…
      </div>
    );
  }

  if (allowed.length === 0) {
    return <Navigate to="/unauthorized" replace />;
  }

  const signOut = async () => {
    try {
      await auth?.signOut();
    } catch { /* ignore */ }
    navigate('/login', { replace: true });
  };

  return (
    <div dir="rtl" lang="ar" className="console-room min-h-screen">
      <header className="royal-surface border-b royal-border px-3 py-3 md:px-6 md:py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Shield className="text-[var(--rz-primary)]" size={24} />
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold royal-text">غرفة المشرف</h1>
              <p className="text-xs royal-muted font-medium">
                {auth?.currentUser?.email || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2.5 rounded-lg royal-text hover:bg-[var(--rz-primary)]/10 border border-transparent hover:border-[var(--rz-primary)]/20 transition-colors"
              title="تحديث البيانات"
              aria-label="تحديث البيانات"
            >
              <RefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={signOut}
              className="p-2.5 rounded-lg text-[var(--rz-primary)] hover:bg-[var(--rz-primary)]/10 border border-transparent hover:border-[var(--rz-primary)]/20 transition-colors"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 py-4 md:px-6 md:py-6">
        {/* تبويبات الأقسام المسموحة فقط */}
        <nav className="flex flex-wrap gap-2 mb-5" aria-label="أقسام المشرف">
          {allowed.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                  active
                    ? 'bg-[var(--rz-primary)]/15 border-[var(--rz-primary)]/45 text-[var(--rz-primary)]'
                    : 'royal-surface border royal-border royal-text hover:border-[var(--rz-primary)]/40'
                }`}
              >
                <Icon size={17} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <main>
          {activeSection === 'reports' && (
            <ReportsPanel reports={reports} onChanged={loadData} />
          )}
          {activeSection === 'reviews' && (
            <ReviewsPanel reviews={reviews} onChanged={loadData} />
          )}
          {activeSection === 'notifications' && (
            <NotificationsManager isOwner={false} />
          )}
          {activeSection === 'categories' && <CategoriesManager />}
          {activeSection === 'banners' && <BannersManager />}
        </main>
      </div>
    </div>
  );
};

export default AdminRoom;
