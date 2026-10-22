// src/components/haraj/EscrowPanel.jsx
// نظام "الوساطة الآمنة" — دفع آمن عبر الموقع مع احتجاز المبلغ حتى التأكيد.
import { useState } from 'react';
import { ShieldCheck, Lock, CircleCheck, Truck, Wallet } from 'lucide-react';
import { commissionAmount, commissionRateFor } from '../../utils/dressMeta';

const STEPS = [
  { key: 'paid', label: 'تحويل المبلغ للموقع', icon: Wallet },
  { key: 'shipped', label: 'شحن البائع للمنتج', icon: Truck },
  { key: 'received', label: 'استلام وتأكيد المشترية', icon: CircleCheck },
  { key: 'released', label: 'تحويل المبلغ للبائع', icon: ShieldCheck },
];

const STEP_ORDER = ['none', 'paid', 'shipped', 'received', 'released'];

export default function EscrowPanel({
  ad = {},
  onAction,
  role = 'buyer',
  disabled = false,
}) {
  const [confirming, setConfirming] = useState(false);
  const status = ad.escrow?.status || 'none';
  const price = Number(ad.price || 0);
  const commission = commissionAmount(price, ad.condition);
  const rate = Math.round(commissionRateFor(ad.condition) * 100);
  const currentStep = Math.max(0, STEP_ORDER.indexOf(status));

  const buyerAction =
    status === 'none'
      ? { key: 'pay', label: 'الدفع الآمن عبر الموقع' }
      : status === 'shipped'
      ? { key: 'receive', label: 'تأكيد استلام المنتج' }
      : null;

  const sellerAction =
    status === 'paid'
      ? { key: 'ship', label: 'تأكيد شحن المنتج' }
      : status === 'received'
      ? { key: 'release', label: 'تحرير المبلغ بعد انتهاء مهلة المراجعة (24 ساعة)' }
      : null;

  const action = role === 'seller' ? sellerAction : buyerAction;

  return (
    <div
      className="rooz-escrow"
      style={{
        background: 'var(--rz-white)',
        border: '1px solid var(--rz-ivory)',
        borderRadius: 20,
        padding: 20,
        marginTop: 14,
        boxShadow: '0 8px 30px rgba(var(--rz-ink-rgb), 0.08)',
      }}
    >
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: 18,
          fontWeight: 800,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <ShieldCheck size={20} color="var(--rz-primary)" /> الوساطة الآمنة
      </h3>
      <p
        style={{
          margin: '0 0 14px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--rz-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Lock size={12} /> يحتفظ الموقع بالمبلغ حتى تأكيد الاستلام والمطابقة خلال 24 ساعة.
      </p>

      <ol style={{ listStyle: 'none', margin: '0 0 14px', padding: 0, display: 'grid', gap: 8 }}>
        {STEPS.map((step, i) => {
          const active = i <= currentStep;
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: active ? 'rgba(var(--rz-muted-rgb), 0.08)' : 'var(--rz-ivory)',
                border: `1px solid ${active ? 'rgba(var(--rz-muted-rgb), 0.35)' : 'var(--rz-ivory)'}`,
                borderRadius: 12,
                padding: '9px 12px',
                fontSize: 13.5,
                fontWeight: 700,
                color: active ? 'var(--rz-muted)' : 'var(--rz-muted)',
              }}
            >
              <Icon size={17} />
              <span>{step.label}</span>
              {i === currentStep && status !== 'none' && status !== 'released' && (
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 900 }}>
                  الخطوة الحالية
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div
        style={{
          background: 'rgba(var(--rz-primary-rgb), 0.06)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 700,
          display: 'grid',
          gap: 4,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>قيمة المنتج</span>
          <span>{price.toLocaleString()} ريال</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--rz-primary)' }}>
          <span>عمولة الموقع ({rate}%) — تُستقطع تلقائياً</span>
          <span>{commission.toLocaleString()} ريال</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(var(--rz-primary-rgb), .25)', paddingTop: 4 }}>
          <span>الصافي للبائع</span>
          <span>{(price - commission).toLocaleString()} ريال</span>
        </div>
      </div>

      {action && !disabled ? (
        confirming ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
              تأكيد: {action.label}؟
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onAction?.(action.key);
                  setConfirming(false);
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
                  color: 'var(--rz-ivory)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                تأكيد
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={{
                  flex: 1,
                  background: 'var(--rz-white)',
                  color: 'var(--rz-ink)',
                  border: '1px solid var(--rz-ivory)',
                  borderRadius: 12,
                  padding: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              color: 'var(--rz-ivory)',
              border: 'none',
              borderRadius: 12,
              padding: '0.9rem',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {action.label}
          </button>
        )
      ) : (
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--rz-muted)', fontWeight: 700 }}>
          {status === 'released'
            ? 'تمت العملية بنجاح وحُوّل المبلغ للبائع ✓'
            : status === 'none'
            ? 'لم تُفعّل الوساطة الآمنة على هذا الإعلان.'
            : 'بانتظار الطرف الآخر لإكمال الخطوة.'}
        </p>
      )}
    </div>
  );
}
