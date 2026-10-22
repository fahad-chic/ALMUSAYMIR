// src/components/WhatsAppFloat.jsx — زر واتساب عائم أسفل يمين الشاشة
// رابط مباشر wa.me بدون أي خدمات خارجية. الموضع: أسفل اليمين حتى لا يتعارض
// مع زر الخروج العائم (أسفل اليسار) ولا مع ودجت المساعد (أعلى اليسار).
import { CONTACT_INFO } from '../utils/constants';
import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const WHATSAPP_NUMBER = CONTACT_INFO.WHATSAPP;
const PREFILLED_TEXT = 'السلام عليكم، أتواصل معكم من متجر المسيمير | ALMUSAYMIR';

const WhatsAppFloat = () => {
  const [bubbleOpen, setBubbleOpen] = useState(false);

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_TEXT)}`;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: 'max(18px, env(safe-area-inset-bottom, 0px))',
        left: 16,
        right: 'auto',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
      }}
    >
      {bubbleOpen && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(var(--rz-ink-rgb), 0.25)',
            textDecoration: 'none',
            maxWidth: 240,
          }}
        >
          <span
            style={{
              fontFamily: 'Tajawal',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--rz-ink)',
              lineHeight: 1.5,
            }}
          >
            تحتاج مساعدة؟
            <br />
            <span style={{ fontWeight: 400, color: 'var(--rz-primary)' }}>
              راسلنا واتساب وسنرد عليك بسرعة
            </span>
          </span>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={(e) => {
              e.preventDefault();
              setBubbleOpen(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              color: 'var(--rz-primary)',
            }}
          >
            <X size={14} />
          </button>
        </a>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل معنا عبر واتساب"
        onClick={() => setBubbleOpen(false)}
        onMouseEnter={() => setBubbleOpen(true)}
        onFocus={() => setBubbleOpen(true)}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--rz-ink) 0%, var(--rz-primary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(var(--rz-primary-rgb), 0.45)',
          textDecoration: 'none',
        }}
      >
        <MessageCircle size={28} color="var(--rz-white)" fill="var(--rz-white)" />
      </a>
    </div>
  );
};

export default WhatsAppFloat;