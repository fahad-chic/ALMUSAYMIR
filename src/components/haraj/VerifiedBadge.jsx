// src/components/haraj/VerifiedBadge.jsx
// شارة "مستخدم موثق" ذهبية بجانب اسم المعلن الموثق.
import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ verified, size = 16, withLabel = false }) {
  if (!verified) return null;
  return (
    <span
      className="rooz-verified-badge"
      title="مستخدم موثق — تم التحقق من الهوية"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'linear-gradient(135deg, var(--rz-gold) 0%, var(--rz-gold) 45%, var(--rz-muted) 100%)',
        color: 'var(--rz-primary)',
        border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
        borderRadius: 999,
        padding: withLabel ? '3px 10px' : '3px',
        fontSize: 12,
        fontWeight: 900,
        boxShadow: '0 3px 10px rgba(var(--rz-gold-deep-rgb), 0.35)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <BadgeCheck size={size} color="var(--rz-primary)" strokeWidth={2.4} />
      {withLabel && <span>موثق</span>}
    </span>
  );
}
