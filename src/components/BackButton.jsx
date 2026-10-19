import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HIDDEN_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/unauthorized', '/owner-private-room', '/owner-room']);

/**
 * زر رجوع ثابت.
 * يستخدم فقط history.back() / navigate(-1) — بدون navigate(prev)
 * حتى لا يُدفع مسار جديد في التاريخ ويحدث تذبذب (متجر ↔ حراج).
 */
const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDDEN_PATHS.has(location.pathname)) return null;

  const handleBack = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const path = location.pathname;

    // React Router v6 يخزّن idx في history.state — إن كان > 0 فهناك صفحة سابقة داخل التطبيق
    const idx =
      typeof window !== 'undefined' && window.history.state
        ? window.history.state.idx
        : undefined;

    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }

    // احتياطي: طول التاريخ (قد يكون مضلّلاً إن فتح المستخدم الرابط مباشرة)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }

    // لا يوجد تاريخ — وجهة آمنة حسب القسم
    if (path.startsWith('/haraj') || path.startsWith('/ad/') || path.startsWith('/haraj/')) {
      navigate(path === '/haraj' ? '/' : '/haraj', { replace: true });
    } else if (path.startsWith('/catalog/')) {
      navigate('/', { replace: true });
    } else if (path.startsWith('/branch')) {
      navigate('/branches', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="رجوع للصفحة السابقة"
      title="رجوع"
      style={{
        position: 'fixed',
        top: 'calc(var(--nav-height, 56px) + 6px)',
        insetInlineStart: '10px',
        zIndex: 3200,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 40,
        padding: '0 12px',
        borderRadius: 12,
        border: '1.5px solid var(--rz-primary)',
        background: 'var(--rz-ivory)',
        color: 'var(--rz-ink)',
        fontWeight: 800,
        fontSize: '0.82rem',
        fontFamily: 'Tajawal',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(var(--rz-primary-rgb), 0.2)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
      رجوع
    </button>
  );
};

export default BackButton;
