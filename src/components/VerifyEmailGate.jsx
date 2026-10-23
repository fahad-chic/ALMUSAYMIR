// شاشة إثبات ملكية البريد — الحاجز الوحيد أمام كل مسارات الموقع.
// لا يُعرض أي محتوى للمتجر قبل emailVerified === true. الرسالة تُرسلها
// Firebase نفسها (رابط تفعيل من noreply@<project>.firebaseapp.com) بلا
// أي مزوّد خارجي وبلا دومين مدفوع.
import { useState } from 'react';
import { auth } from '../firebase/config';
import { sendEmailVerification, signOut } from 'firebase/auth';

const VerifyEmailGate = () => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const email = auth?.currentUser?.email || '';

  const handleResend = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const u = auth?.currentUser;
      if (!u) throw new Error('لا توجد جلسة');
      await sendEmailVerification(u);
      setMsg('أُرسلت رسالة تحقق جديدة إلى بريدك. افتح الرابط ثم اضغط «تحقّقت».');
    } catch (e) {
      setErr(
        e?.code === 'auth/too-many-requests'
          ? 'محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة.'
          : 'تعذّر إرسال الرسالة. حاول مرة أخرى بعد قليل.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCheck = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const u = auth?.currentUser;
      if (!u) throw new Error('لا توجد جلسة');
      await u.reload();
      if (u.emailVerified) {
        // أعد تحميل التطبيق ليقرأ onAuthStateChanged الحالة الموثّقة ويفتح الموقع.
        window.location.replace('/');
        return;
      }
      setErr('لم يُوثَّق البريد بعد. افتح رابط الرسالة أولاً ثم اضغط «تحقّقت».');
    } catch {
      setErr('تعذّر التحقق الآن. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      // non-critical
    }
    window.location.replace('/login');
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--rz-ivory)',
        padding: '1.25rem',
        fontFamily: 'Tajawal',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--rz-white)',
          border: '1px solid rgba(var(--rz-gold-rgb), 0.35)',
          borderRadius: 16,
          padding: '1.75rem',
          boxShadow: 'var(--rz-shadow, 0 10px 30px rgba(var(--rz-ink-rgb), 0.12))',
          color: 'var(--rz-ink)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'var(--rz-primary)',
          }}
        >
          تفعيل البريد مطلوب
        </h1>

        <p style={{ margin: '0 0 1rem', lineHeight: 1.9, fontSize: '0.98rem' }}>
          لا يُفتح الموقع إلا بعد إثبات ملكية بريدك. أرسلنا رابط تفعيل من Firebase
          إلى:
        </p>

        <p
          style={{
            margin: '0 0 1.25rem',
            fontWeight: 700,
            wordBreak: 'break-all',
            color: 'var(--rz-primary)',
          }}
        >
          {email || '—'}
        </p>

        <p style={{ margin: '0 0 1.25rem', lineHeight: 1.9, fontSize: '0.92rem' }}>
          افتح الرسالة واضغط رابط التفعيل، ثم ارجع هنا واضغط «تحقّقت من بريدي».
        </p>

        {msg && (
          <p
            role="status"
            style={{
              margin: '0 0 1rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 10,
              background: 'rgba(var(--rz-success-rgb), 0.12)',
              color: 'var(--rz-success)',
              fontSize: '0.9rem',
            }}
          >
            {msg}
          </p>
        )}

        {err && (
          <p
            role="alert"
            style={{
              margin: '0 0 1rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 10,
              background: 'rgba(var(--rz-error-rgb), 0.12)',
              color: 'var(--rz-error)',
              fontSize: '0.9rem',
            }}
          >
            {err}
          </p>
        )}

        <button
          type="button"
          onClick={handleCheck}
          disabled={busy}
          style={{
            width: '100%',
            padding: '0.85rem',
            marginBottom: '0.6rem',
            borderRadius: 10,
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            background: 'var(--rz-primary)',
            color: 'var(--rz-white)',
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: 'Tajawal',
            opacity: busy ? 0.7 : 1,
          }}
        >
          تحقّقت من بريدي
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={busy}
          style={{
            width: '100%',
            padding: '0.8rem',
            marginBottom: '0.6rem',
            borderRadius: 10,
            cursor: busy ? 'not-allowed' : 'pointer',
            background: 'transparent',
            border: '1px solid var(--rz-primary)',
            color: 'var(--rz-primary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            fontFamily: 'Tajawal',
          }}
        >
          إعادة إرسال رسالة التفعيل
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: 10,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            color: 'var(--rz-muted)',
            fontSize: '0.9rem',
            fontFamily: 'Tajawal',
            textDecoration: 'underline',
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailGate;
