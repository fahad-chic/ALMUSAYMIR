// حد أدنى للصفحات التي لا معنى لزر إغلاق فيها (جذر/مصادقة)
const HIDDEN_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/unauthorized']);

// وجهة آمنة عند غياب مسار سابق — حسب القسم الحالي لا الرئيسية العمياء
const FALLBACKS = [
  { prefixes: ['/haraj', '/ad/'], path: '/haraj' },
  { prefixes: ['/catalog/'], path: '/' },
  { prefixes: ['/branch/'], path: '/branches' },
  { prefixes: ['/owner-panel'], path: '/dashboard' },
];

/**
 * زر إغلاق عام (❌) للصفحات الفرعية والنوافذ والتبويبات.
 * - عند تمرير onClose: يُغلَق العنصر النشط مباشرة (تبويب داخل لوحة، مودال...)
 *   دون أي تنقل — فيبقى المستخدم داخل نفس اللوحة.
 * - بدونه: يعيد «خطوة واحدة» للخلف عبر history.back() فقط
 *   (بدون navigate(prev) حتى لا يحدث تذبذب متجر↔حراج).
 *   ومع غياب مسار سابق يذهب لوجهة آمنة حسب القسم.
 */
const CloseButton = ({
  onClose,
  style,
  className,
  label = 'إغلاق',
  corner = 'topRight',
  zIndex = 3500,
  currentPath,
}) => {
  const resolvedPath =
    currentPath ||
    (typeof window !== 'undefined' ? window.location.pathname : '');

  if (!onClose && HIDDEN_PATHS.has(resolvedPath)) {
    return null;
  }

  const handleClick = () => {
    if (typeof onClose === 'function') {
      onClose();
      return;
    }

    const currentPath = resolvedPath;

    // رجوع حقيقي خطوة بخطوة — فقط history.back() بدون push لمسار سابق
    // (navigate(prev) كان يسبب تذبذب متجر↔حراج)
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    let fallback = '/';
    for (const f of FALLBACKS) {
      if (f.prefixes.some((p) => currentPath.startsWith(p))) {
        fallback = f.path;
        break;
      }
    }

    const nav = window.__ROOZ_NAV__;
    if (typeof nav === 'function') nav(fallback, true);
    else window.location.assign(fallback);
  };

  const cornerStyle =
    corner === 'topLeft'
      ? { left: 'max(12px, env(safe-area-inset-left, 0px))' }
      : { right: 'max(12px, env(safe-area-inset-right, 0px))' };

  const baseStyle = {
    position: 'fixed',
    top: 'calc(var(--rooz-top-offset, 0px) + 68px)',
    zIndex,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    border: '1.5px solid rgba(30,41,59,0.5)',
    background: 'linear-gradient(145deg, #E8E2D6, #E8E2D6)',
    color: '#202A3A',
    cursor: 'pointer',
    boxShadow: '0 8px 22px rgba(32,42,58,0.28)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    fontFamily: 'Tajawal',
    ...cornerStyle,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
};

export default CloseButton;