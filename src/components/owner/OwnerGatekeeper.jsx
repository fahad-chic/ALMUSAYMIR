// src/components/owner/OwnerGatekeeper.jsx — حارس غرفة صاحب الموقع
// طبقة حماية ثانية (PIN) تُطلب قبل فتح الغرفة حتى لو كان الحساب مسجلاً
// دخوله بالفعل. التحقق يتم في الخادم (/api/owner-pin) لا في المتصفح:
// الرمز لا يُخزَّن ولا يُقارن محلياً إطلاقاً، والمحاولات الفاشلة تُقفل
// الحساب 15 دقيقة وتُسجَّل في security_logs كحادثة أمنية.
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Lock, KeyRound, X, RefreshCw } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const logGateEvent = async (type, details, severity = 'high') => {
  try {
    await addDoc(collection(db, 'security_logs'), {
      type,
      details,
      severity,
      timestamp: serverTimestamp(),
      userId: auth?.currentUser?.uid || null,
      userEmail: auth?.currentUser?.email || null
    });
  } catch { /* السجل لا يكسر الحارس */ }
};

const callPinApi = async (payload) => {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/owner-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    return { ok: res.ok, status: res.status, data: data && typeof data === 'object' ? data : {} };
  } catch (err) {
    return { ok: false, status: 0, data: {} };
  }
};

const OwnerGatekeeper = ({ onPassed, onCancel }) => {
  const [phase, setPhase] = useState('checking'); // checking | setup | verify | error
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // إعادة محاولة تلقائية عدة مرات: الخادم البارد (Cold Start) قد يأخذ
        // ثوانٍ حتى يستيقظ على Pages Workers خاصة بعد النشر الجديد.
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { ok, data } = await callPinApi({ action: 'status' });
          if (!alive) return;
          if (ok && data.success) {
            setPhase(data.pinSet ? 'verify' : 'setup');
            return;
          }
          if (attempt < 3) await new Promise(r => setTimeout(r, 1400));
        }
        setError('تعذر الاتصال بحارس الأمان');
        setPhase('error');
      } catch {
        if (!alive) return;
        setError('تعذر الوصول لخادم الحماية — تحقق من الاتصال ثم أعد المحاولة');
        setPhase('error');
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if ((phase === 'verify' || phase === 'setup') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!/^\d{4,8}$/.test(pin)) { setError('الرمز يجب أن يكون 4 إلى 8 أرقام'); return; }
    if (pin !== pinConfirm) { setError('تأكيد الرمز غير مطابق'); return; }
    setBusy(true);
    try {
      const { ok, data } = await callPinApi({ action: 'set', pin });
      if (ok && data.success) {
        await logGateEvent('owner_pin_created', 'أنشأ صاحب الموقع الرمز السري لحارس الغرفة', 'info');
        setInfo('تم إنشاء الرمز السري — أدخله الآن لفتح الغرفة');
        setPin('');
        setPinConfirm('');
        setPhase('verify');
      } else {
        setError((data && data.error) || 'تعذر إنشاء الرمز — أعد المحاولة');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const { ok, status, data } = await callPinApi({ action: 'verify', pin });
      if (ok && data.success) {
        await logGateEvent('owner_gate_passed', 'اجتاز صاحب الموقع حارس الغرفة (PIN)', 'info');
        onPassed();
        return;
      }
      await logGateEvent(
        'owner_gate_failed',
        `محاولة فتح غرفة المالك برمز خاطئ (HTTP ${status})`,
        'high'
      );
      setError((data && data.error) || 'رمز غير صحيح — أعد المحاولة');
      setPin('');
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  };

  const retry = () => { setError(''); setPhase('checking'); window.location.reload(); };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, var(--rz-ivory), var(--rz-ivory))',
        padding: '1rem',
        fontFamily: 'Tajawal'
      }}
    >
      <div
        role="dialog"
        aria-label="حارس غرفة صاحب الموقع"
        style={{
          width: 'min(430px, 100%)',
          background: 'linear-gradient(160deg, var(--rz-ivory), var(--rz-ivory))',
          border: '2px solid var(--rz-primary)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(var(--rz-ink-rgb), 0.35)',
          overflow: 'hidden'
        }}
      >
        <div style={{
          background: 'linear-gradient(120deg, var(--rz-ivory), var(--rz-ivory))',
          color: 'var(--rz-ink)',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900 }}>
            <ShieldCheck size={20} aria-hidden="true" />
            حارس غرفة صاحب الموقع
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إلغاء والعودة"
            style={{ background: 'none', border: 'none', color: 'var(--rz-ink)', cursor: 'pointer', display: 'flex', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 18px' }}>
          {phase === 'checking' && (
            <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--rz-ink)', padding: '1.5rem 0' }}>
              جاري فحص حالة الحارس الأمني…
            </p>
          )}

          {phase === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--rz-primary)', fontWeight: 800, marginBottom: 14 }}>{error}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={retry} style={btnStyle('var(--rz-primary)')}>
                  <RefreshCw size={15} aria-hidden="true" /> إعادة المحاولة
                </button>
                <button type="button" onClick={onCancel} style={btnStyle('var(--rz-muted)')}>عودة</button>
              </div>
            </div>
          )}

          {phase === 'setup' && (
            <form onSubmit={handleSetup}>
              <p style={{ fontWeight: 800, color: 'var(--rz-ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={17} aria-hidden="true" /> إنشاء الرمز السري لأول مرة
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--rz-ink)', fontWeight: 600, marginBottom: 14, lineHeight: 1.8 }}>
                هذا الرمز يُطلب قبل فتح الغرفة في كل مرة حتى مع بقاء تسجيل الدخول —
                اختر 4 إلى 8 أرقام واحفظها، فهي لا تُسترجع.
              </p>
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="الرمز السري (4-8 أرقام)"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                style={inputStyle}
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="تأكيد الرمز السري"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                style={{ ...inputStyle, marginTop: 10 }}
              />
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={busy} style={{ ...btnStyle('var(--rz-primary)'), width: '100%', marginTop: 12 }}>
                {busy ? 'جاري الإنشاء…' : 'إنشاء الرمز السري'}
              </button>
            </form>
          )}

          {phase === 'verify' && (
            <form onSubmit={handleVerify}>
              <p style={{ fontWeight: 800, color: 'var(--rz-ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={17} aria-hidden="true" /> أدخل الرمز السري لفتح الغرفة
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--rz-ink)', fontWeight: 600, marginBottom: 14, lineHeight: 1.8 }}>
                حماية إضافية: 5 محاولات خاطئة تقفل الحساب 15 دقيقة وتُسجَّل أمنياً.
              </p>
              {info && <p style={{ color: 'var(--rz-ink)', fontWeight: 800, fontSize: '0.85rem', marginBottom: 10 }}>{info}</p>}
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="الرمز السري"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                style={inputStyle}
              />
              {error && <p style={errorStyle}>{error}</p>}
              <button type="submit" disabled={busy || pin.length < 4} style={{ ...btnStyle('var(--rz-primary)'), width: '100%', marginTop: 12 }}>
                {busy ? 'جاري التحقق…' : 'فتح الغرفة'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 12,
  border: '1.5px solid var(--rz-primary)',
  background: 'var(--rz-ivory)',
  padding: '12px 14px',
  fontFamily: 'Tajawal',
  fontSize: '1.05rem',
  fontWeight: 800,
  letterSpacing: '0.35em',
  textAlign: 'center',
  color: 'var(--rz-ink)',
  outline: 'none'
};

const errorStyle = { color: 'var(--rz-primary)', fontWeight: 800, fontSize: '0.85rem', marginTop: 10 };

const btnStyle = (bg) => ({
  border: 'none',
  borderRadius: 12,
  padding: '11px 16px',
  fontFamily: 'Tajawal',
  fontWeight: 900,
  fontSize: '0.92rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  color: 'var(--rz-white)',
  background: bg,
  flex: 1
});

export default OwnerGatekeeper;