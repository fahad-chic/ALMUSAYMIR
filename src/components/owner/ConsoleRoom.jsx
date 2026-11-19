// src/components/owner/ConsoleRoom.jsx — غرفة القيادة
// ============================================================
// تظهر في القائمة للجميع، وبالضغط عليها يُطلب رمز الحارس أولاً:
//   • صاحب الموقع  → OwnerGatekeeper (PIN خادمي، 5 محاولات = قفل 15 دقيقة)
//   • مشرف مفوَّض  → بوابة صلاحية صريحة (لا يكفي تسجيل الدخول)
//   • غيرهما        → /unauthorized (بلا أي تفاصيل عن الغرفة)
//
// بعد اجتياز البوابة تُعرض 5 أقسام فقط، وكل بند ينقل لمكان العمل الحقيقي
// عبر CONSOLE_SECTIONS. لا بند بلا هدف ولا تكرار بين قسمين.
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Gauge, LayoutGrid, Crown, Palette, Lock, ChevronLeft,
  ShoppingBag, MessageSquare, Star, AlertTriangle, Flag, Shield, Users,
  UserCheck, Key, Settings, Bell, Image as ImageIcon, Type, Activity, ChartBar,
} from 'lucide-react';
import OwnerGatekeeper from './OwnerGatekeeper';
import usePermissions from '../../permissions/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { CONSOLE_SECTIONS, visibleItems } from '../../data/consoleSections';
import { OWNER_ROOM_PATH } from '../../permissions/permissionRoutes';

const ICONS = {
  dashboard: LayoutDashboard, gauge: Gauge, grid: LayoutGrid, crown: Crown,
  palette: Palette, bag: ShoppingBag, chat: MessageSquare, star: Star,
  alert: AlertTriangle, flag: Flag, shield: Shield, users: Users,
  usercheck: UserCheck, key: Key, settings: Settings, bell: Bell,
  image: ImageIcon, type: Type, activity: Activity, chart: ChartBar,
};

const Icon = ({ name, size = 17 }) => {
  const C = ICONS[name] || LayoutDashboard;
  return <C size={size} aria-hidden="true" />;
};

// شاشة الرمز للزائر: تُعرض قبل أي محتوى، ولا تكشف أي قسم أو إحصائية.
// الرمز نفسه لا يُتحقق منه هنا — التحقق في /api/owner-pin بعد تسجيل الدخول،
// لذلك تبقى المصادقة والتحقق المعتادان شرطاً إلزامياً.
const ConsoleGateScreen = ({ onCancel, onNeedAuth }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code)) {
      setError('أدخل الرمز السري (4 إلى 8 أرقام)');
      return;
    }
    // لا تحقق محلي ولا تجاوز: الرمز يُتحقق منه خادمياً بعد إثبات الهوية.
    setError('لإكمال التحقق: سجّل الدخول بحسابك المصرّح ثم أدخل الرمز — الرمز يُفحص في الخادم.');
    onNeedAuth();
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[var(--rz-ivory)] text-[var(--rz-ink)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--rz-primary)]/25 bg-[var(--rz-white)] p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] mb-3">
          <Lock size={22} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-black">غرفة القيادة</h1>
        <p className="text-xs font-bold text-[var(--rz-muted)] mt-1 mb-4">
          محتوى محمي — أدخل الرمز السري للمتابعة
        </p>

        <form onSubmit={submit}>
          <label htmlFor="console-code" className="sr-only">الرمز السري</label>
          <input
            id="console-code"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
            placeholder="الرمز السري"
            className="w-full rounded-xl border border-[var(--rz-primary)]/30 px-4 py-3 text-center text-lg font-black tracking-[0.35em] bg-[var(--rz-ivory)]"
          />
          {error && (
            <p role="alert" className="text-[11px] font-bold text-[var(--rz-error)] mt-2 leading-relaxed">{error}</p>
          )}
          <button
            type="submit"
            className="w-full mt-3 rounded-xl bg-[var(--rz-primary)] text-[var(--rz-white)] font-extrabold py-3 text-sm"
          >
            متابعة
          </button>
        </form>

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-[11px] font-bold text-[var(--rz-muted)] underline"
        >
          رجوع
        </button>
      </div>
    </div>
  );
};

const ConsoleRoom = () => {
  const navigate = useNavigate();
  const { userRole, user, isAuthenticated } = useAuth();
  const { can, ready } = usePermissions();
  const isOwner = userRole === 'owner';

  const [gatePassed, setGatePassed] = useState(false);

  const sections = useMemo(
    () =>
      CONSOLE_SECTIONS.map((section) => ({
        ...section,
        items: visibleItems(section, { can, isOwner }),
      })).filter((section) => section.items.length > 0),
    [can, isOwner]
  );

  // الزائر يرى اسم «غرفة القيادة» وشاشة الرمز فقط — لا محتوى ولا أقسام.
  // التحقق الحقيقي يحتاج جلسة موثّقة، فلا يوجد أي مسار يتجاوز المصادقة.
  if (!isAuthenticated) {
    return (
      <ConsoleGateScreen
        onCancel={() => navigate('/', { replace: true })}
        onNeedAuth={() => navigate('/login', { state: { from: '/console' } })}
      />
    );
  }

  if (!ready) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center font-bold bg-[var(--rz-ivory)] text-[var(--rz-ink)]">
        جارٍ التحقق من الصلاحيات…
      </div>
    );
  }

  // البوابة: صاحب الموقع يمرّ بحارس الرمز؛ المشرف يحتاج صلاحية صريحة.
  if (!gatePassed) {
    if (isOwner) {
      return (
        <OwnerGatekeeper
          onPassed={() => setGatePassed(true)}
          onCancel={() => navigate('/', { replace: true })}
        />
      );
    }
    const allowedAdmin = ['ADD_NEW_EMPLOYEE', 'GRANT_SUB_ADMIN_PERMISSIONS', 'MANAGE_REPORTS',
      'MANAGE_REVIEWS', 'MANAGE_NOTIFICATIONS', 'MANAGE_CATEGORIES', 'MANAGE_SITE_BANNERS',
      'MANAGE_USER_VERIFICATION'].some((key) => can(key));
    if (!allowedAdmin) return <Navigate to="/unauthorized" replace />;
    // مشرف مفوَّض: يبقى محتاجاً للرمز كطبقة ثانية.
    return (
      <OwnerGatekeeper
        onPassed={() => setGatePassed(true)}
        onCancel={() => navigate('/', { replace: true })}
      />
    );
  }

  const go = (target) => {
    if (target.kind === 'route') {
      navigate(target.path);
      return;
    }
    navigate(`${OWNER_ROOM_PATH}?tab=${encodeURIComponent(target.tab)}`);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[var(--rz-ivory)] text-[var(--rz-ink)]">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--rz-primary)]/25 bg-[var(--rz-primary)]/10 text-[var(--rz-primary)] text-[11px] font-extrabold mb-2">
            <Lock size={13} aria-hidden="true" />
            {isOwner ? 'صاحب الموقع' : 'مشرف مفوَّض'} · تم التحقق
          </div>
          <h1 className="text-2xl font-black">غرفة القيادة</h1>
          <p className="text-xs font-semibold mt-1 text-[var(--rz-primary)]">
            كل بند ينقلك إلى مكان العمل الفعلي — لا أزرار بلا وظيفة
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <section
              key={section.id}
              className="rounded-2xl border border-[var(--rz-primary)]/22 bg-[var(--rz-white)] overflow-hidden"
            >
              <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--rz-primary)]/15">
                <span className="text-[var(--rz-primary)]"><Icon name={section.icon} /></span>
                <h2 className="font-extrabold text-sm">{section.title}</h2>
                {section.note && (
                  <span className="text-[10px] font-bold text-[var(--rz-muted)] ms-auto hidden sm:inline">
                    {section.note}
                  </span>
                )}
              </header>

              <ul className="divide-y divide-[var(--rz-primary)]/10">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.target)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-[var(--rz-primary)]/08 transition-colors"
                    >
                      <span className="text-[var(--rz-primary)] flex-shrink-0"><Icon name={item.icon} size={16} /></span>
                      <span className="text-sm font-bold flex-1 min-w-0">{item.label}</span>
                      <ChevronLeft size={15} className="text-[var(--rz-muted)] flex-shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="text-center text-[11px] font-semibold text-[var(--rz-muted)] mt-6">
          المحتوى محجوب قبل اجتياز البوابة — {user?.email || 'حساب غير معروف'}
        </p>
      </div>
    </div>
  );
};

export default ConsoleRoom;
