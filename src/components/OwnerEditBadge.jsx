import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// شارة «تعديل» موحدة تظهر للمالك فقط فوق البطاقات (إعلان/قسم/كتالوج).
// الاستخدام: ضعها داخل حاوية عليها position:relative — تُثبَّت أعلى اليسار
// (نهاية السطر في RTL) وتفتح لوحة الإدارة المناسبة دون إيقاف تنقل البطاقة.
const OwnerEditBadge = ({ to, label = 'تعديل' }) => {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  if (userRole !== 'owner' || !to) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(to);
      }}
      aria-label={label}
      style={{
        position: 'absolute',
        top: 8,
        insetInlineEnd: 8,
        zIndex: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
        color: 'var(--rz-white)',
        border: '1.5px solid var(--rz-primary)',
        borderRadius: 999,
        padding: '5px 11px',
        fontFamily: 'Tajawal',
        fontWeight: 800,
        fontSize: '0.72rem',
        cursor: 'pointer',
        boxShadow: '0 3px 10px rgba(var(--rz-primary-rgb), 0.35)',
        minWidth: 64,
      }}
    >
      <Pencil size={13} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </button>
  );
};

export default OwnerEditBadge;