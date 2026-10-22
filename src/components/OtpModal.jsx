// src/components/OtpModal.jsx
// مودال إدخال كود التحقق (OTP) — يُستخدم في التسجيل والدخول ودخول Google.
// props:
//   email: البريد الذي أُرسل إليه الكود
//   purpose: 'register' | 'login' | 'google'
//   onVerified: callback يُستدعى بعد نجاح التحقق
//   onResend: callback اختياري لإعادة الإرسال (إن لم يُمرّر يُستدعى /api/otp/send داخلياً)
//   onClose: callback لإغلاق المودال
//   loading: تعطيل الأزرار أثناء معالجة خارجية
import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle, AlertCircle, X, RotateCw } from 'lucide-react';

const API_BASE = '/api';

const OtpModal = ({ email, purpose = 'login', onVerified, onClose, loading = false }) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const code = digits.join('');

  const handleResend = async () => {
    setError('');
    setInfo('');
    try {
      const res = await fetch(`${API_BASE}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setInfo('تم إعادة إرسال الكود');
        setResendTimer(45);
        setDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      } else {
        setError(data.error || 'تعذّر إعادة إرسال الكود');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم لإعادة الإرسال');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (code.length !== 6) {
      setError('أدخل الكود المكوّن من 6 أرقام بالكامل');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setInfo('تم التحقق! جاري تسجيل الدخول...');
        try {
          await onVerified?.();
        } catch (verifyErr) {
          // خطأ تسجيل الدخول بعد التحقق — نُبقي المودال مفتوحاً ونُظهر السبب
          setError(verifyErr?.message || 'تعذّر إكمال تسجيل الدخول');
          setInfo('');
        }
      } else {
        setError(data.error || 'الكود غير صحيح');
        setDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } catch {
      setError('تعذّر الاتصال بالخادم للتحقق');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || loading;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(var(--rz-ink-rgb), 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 16,
        fontFamily: 'Tajawal',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--rz-ink)',
          border: '1px solid rgba(var(--rz-primary-rgb), 0.3)',
          borderRadius: 16,
          padding: '1.75rem 1.5rem',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(var(--rz-ink-rgb), 0.5)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          disabled={busy}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'transparent',
            border: 'none',
            color: 'var(--rz-muted)',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 12px',
              borderRadius: '50%',
              background: 'rgba(var(--rz-primary-rgb), 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mail size={30} color="var(--rz-primary)" />
          </div>
          <h2 style={{ color: 'var(--rz-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
            أدخل كود التحقق
          </h2>
          <p
            style={{
              color: 'var(--rz-ivory)',
              fontSize: 17,
              fontWeight: 800,
              margin: '0 0 8px',
              lineHeight: 1.7,
            }}
          >
            عزيزي الزائر، أهلاً وسهلاً بك في موقع «المسيمير | ALMUSAYMIR»
            <br />
            نتمنى لك تسوّقاً ممتعاً
          </p>
          <p style={{ color: 'var(--rz-muted)', fontSize: 14, margin: '0 0 10px' }}>
            أرسلنا كوداً من 6 أرقام إلى:
            <br />
            <b style={{ color: 'var(--rz-ivory)', wordBreak: 'break-all' }}>{email}</b>
          </p>
          <p
            style={{
              color: 'var(--rz-primary)',
              fontSize: 13,
              margin: '0 0 16px',
              background: 'rgba(var(--rz-primary-rgb), 0.08)',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.2)',
              borderRadius: 10,
              padding: '8px 10px',
              lineHeight: 1.7,
            }}
          >
            تنبيه: إذا لم يصلك الكود في البريد الوارد، يُرجى مراجعة مجلد
            «الرسائل غير المرغوب فيها» (Spam/Junk).
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(var(--rz-primary-rgb), 0.15)',
              color: 'var(--rz-ivory)',
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}
        {info && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(var(--rz-ink-rgb), 0.15)',
              color: 'var(--rz-ink)',
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            <CheckCircle size={16} /> <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 18,
              direction: 'ltr',
            }}
            onPaste={handlePaste}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={busy}
                style={{
                  width: 46,
                  height: 56,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--rz-white)',
                  background: 'var(--rz-ink)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.4)',
                  borderRadius: 10,
                  outline: 'none',
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            style={{
              width: '100%',
              padding: '13px',
              background:
                busy || code.length !== 6
                  ? 'var(--rz-ink)'
                  : 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              color: 'var(--rz-white)',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              cursor: busy || code.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? (
              <>
                <RotateCw size={18} className="spin" /> جاري التحقق...
              </>
            ) : (
              <>
                <CheckCircle size={18} /> تأكيد الكود
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 14, color: 'var(--rz-muted)' }}>
          {resendTimer > 0 ? (
            <span>
              إعادة الإرسال بعد <b style={{ color: 'var(--rz-primary)' }}>{resendTimer}</b> ثانية
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={busy}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--rz-primary)',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            >
              لم يصلك الكود؟ إعادة الإرسال
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default OtpModal;