import React, { useState, useCallback } from 'react';
import { CreditCard, Building2, Landmark } from 'lucide-react';
import { BANK_ACCOUNTS, COMMISSION_RATES } from '../../utils/constants';

const BEIGE = '#E8E2D6';
const NAVY = '#1E293B';
const CREAM = '#F7F3EB';

const ICONS = {
  alrajhi: Building2,
  arabank: Landmark,
};

/**
 * قسم نسبة الموقع + الحسابات البنكية
 * مظهر فخم، تباين عالي، أزرار نسخ واضحة
 */
export default function CommissionAndBanks({
  showTitle = true,
  compact = false,
}) {
  const [copied, setCopied] = useState(null);

  const copyText = useCallback(async (text, id) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 14 : 22 }}>
      {/* ===== نسبة الموقع ===== */}
      <section>
        {showTitle && (
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: NAVY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <CreditCard size={20} color={NAVY} />
            نسبة الموقع
          </h2>
        )}

        <div
          style={{
            background: `linear-gradient(145deg, ${NAVY} 0%, #243044 100%)`,
            borderRadius: 16,
            padding: compact ? '1.1rem 1rem' : '1.35rem 1.2rem',
            textAlign: 'center',
            boxShadow: '0 12px 28px rgba(30,41,59,0.22)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
              gap: 0,
              marginBottom: 12,
            }}
          >
            {/* الجديدة */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: BEIGE,
                  opacity: 0.95,
                  marginBottom: 4,
                }}
              >
                السلع الجديدة
              </div>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: BEIGE,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                }}
              >
                {COMMISSION_RATES.NEW}
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>٪</span>
              </div>
            </div>

            <div
              style={{
                width: 1,
                background: 'rgba(232,226,214,0.28)',
                alignSelf: 'stretch',
              }}
            />

            {/* المستخدمة */}
            <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: BEIGE,
                  opacity: 0.95,
                  marginBottom: 4,
                }}
              >
                السلع المستخدمة
              </div>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: BEIGE,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                }}
              >
                {COMMISSION_RATES.USED}
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>٪</span>
              </div>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              paddingTop: 10,
              borderTop: '1px solid rgba(232,226,214,0.22)',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: BEIGE,
              lineHeight: 1.5,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {COMMISSION_RATES.NOTE}
          </p>
        </div>
      </section>

      {/* ===== الحسابات البنكية ===== */}
      <section>
        {showTitle && (
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: NAVY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            <CreditCard size={20} color={NAVY} />
            الحسابات البنكية
          </h2>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BANK_ACCOUNTS.map((bank) => {
            const Icon = ICONS[bank.id] || Building2;
            return (
              <div
                key={bank.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(30,41,59,0.12)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  boxShadow: '0 3px 12px rgba(30,41,59,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: NAVY,
                      fontFamily: 'Tajawal, sans-serif',
                    }}
                  >
                    {bank.name}
                  </span>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: NAVY,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={14} color={BEIGE} strokeWidth={2} />
                  </div>
                </div>

                {/* IBAN */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: CREAM,
                    borderRadius: 8,
                    padding: '5px 8px',
                    marginBottom: 5,
                    width: 'fit-content',
                    maxWidth: '100%',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: '#6B7280',
                      minWidth: 32,
                    }}
                  >
                    IBAN
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: NAVY,
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      letterSpacing: '0.2px',
                    }}
                  >
                    {bank.iban}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(bank.iban, `${bank.id}-iban`)}
                    aria-label={`نسخ IBAN ${bank.name}`}
                    style={{
                      background: NAVY,
                      color: BEIGE,
                      border: 'none',
                      borderRadius: 6,
                      padding: '3px 9px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif',
                      flexShrink: 0,
                    }}
                  >
                    {copied === `${bank.id}-iban` ? 'تم' : 'نسخ'}
                  </button>
                </div>

                {/* رقم الحساب */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: CREAM,
                    borderRadius: 8,
                    padding: '5px 8px',
                    width: 'fit-content',
                    maxWidth: '100%',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: '#6B7280',
                      minWidth: 32,
                    }}
                  >
                    الحساب
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: NAVY,
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      letterSpacing: '0.2px',
                    }}
                  >
                    {bank.account}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(bank.account, `${bank.id}-acc`)}
                    aria-label={`نسخ رقم حساب ${bank.name}`}
                    style={{
                      background: NAVY,
                      color: BEIGE,
                      border: 'none',
                      borderRadius: 6,
                      padding: '3px 9px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif',
                      flexShrink: 0,
                    }}
                  >
                    {copied === `${bank.id}-acc` ? 'تم' : 'نسخ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
