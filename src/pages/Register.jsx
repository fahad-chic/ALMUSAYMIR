import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  User,
  MapPin
} from 'lucide-react';
import useStore from '../store/useStore';
import OtpModal from '../components/OtpModal';

const SAUDI_REGIONS = [
  'حفر الباطن',
  'الرياض',
  'جدة',
  'الدمام',
  'الخبر',
  'مكة المكرمة',
  'المدينة المنورة',
  'أبها',
  'تبوك',
  'بريدة',
  'حائل',
  'نجران',
  'جازان',
  'الأحساء',
  'ينبع',
  'أخرى',
];

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpModal, setOtpModal] = useState(null);

  const navigate = useNavigate();
  const store = useStore();
  const redirectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const showError = (message) => {
    if (!mountedRef.current) return;
    setError(message);
    setSuccess('');
  };

  const showSuccess = (message) => {
    if (!mountedRef.current) return;
    setSuccess(message);
    setError('');
  };

  const handleAccountError = (err) => {
    if (!mountedRef.current) return;

    switch (err?.code) {
      case 'auth/email-already-in-use':
        showError('هذا البريد مستخدم مسبقًا');
        break;
      case 'auth/invalid-email':
        showError('البريد الإلكتروني غير صحيح');
        break;
      case 'auth/weak-password':
        showError('كلمة المرور ضعيفة (6 أحرف على الأقل)');
        break;
      case 'auth/network-request-failed':
        showError('تعذر الاتصال بالشبكة، تحقق من الاتصال وحاول مجددًا');
        break;
      case 'auth/too-many-requests':
        showError('تمت محاولات كثيرة، يرجى الانتظار قليلًا ثم المحاولة مجددًا');
        break;
      default:
        showError(err?.message || 'حدث خطأ أثناء إنشاء الحساب');
        break;
    }
  };

  const createAccount = async (normalizedEmail, normalizedName, normalizedRegion) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );

    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: normalizedName,
      email: user.email,
      region: normalizedRegion,
      createdAt: serverTimestamp(),
      role: 'user',
      status: 'active'
    });

    try {
      await sendEmailVerification(user);
    } catch (verifyErr) {
      console.warn('email verification skipped:', verifyErr?.message);
    }

    return user;
  };

  const scheduleRedirect = (delay) => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      navigate('/', { replace: true });
    }, delay);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setSuccess('');

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRegion = region.trim();

    if (!normalizedName) {
      showError('الاسم مطلوب');
      return;
    }

    if (normalizedName.length < 2) {
      showError('يرجى إدخال الاسم بشكل صحيح');
      return;
    }

    if (!normalizedEmail) {
      showError('البريد الإلكتروني مطلوب');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    if (!normalizedRegion) {
      showError('المنطقة مطلوبة');
      return;
    }

    if (password.length < 6) {
      showError('كلمة المرور ضعيفة (6 أحرف على الأقل)');
      return;
    }

    if (password !== confirmPassword) {
      showError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);

    try {
      const otpResult = await store.sendOtp(normalizedEmail, 'register');

      // التحقق برمز الإيميل إجباري — لا يُنشأ حساب بدون نجاح إرسال OTP
      if (!otpResult?.success) {
        console.warn(
          'OTP unavailable for register — blocked for security:',
          otpResult?.error
        );

        showError(
          otpResult?.error
            ? `تعذّر إرسال كود التحقق: ${otpResult.error}. تأكد من صحة بريدك وحاول مرة أخرى.`
            : 'تعذّر إرسال كود التحقق إلى بريدك. لا يمكن إنشاء الحساب بدون رمز التحقق. حاول مرة أخرى بعد قليل.'
        );

        return;
      }

      showSuccess(
        'تم إرسال كود التحقق إلى بريدك. أدخله لإكمال إنشاء الحساب.'
      );

      if (!mountedRef.current) return;

      setOtpModal({
        email: normalizedEmail,
        purpose: 'register',
        onVerified: async () => {
          if (!mountedRef.current) return;

          setOtpModal(null);
          setLoading(true);
          setError('');
          setSuccess('');

          try {
            await createAccount(
              normalizedEmail,
              normalizedName,
              normalizedRegion
            );

            showSuccess(
              'تم إنشاء الحساب وتسجيل الدخول بنجاح! جارٍ تحويلك...'
            );

            scheduleRedirect(800);
          } catch (err) {
            handleAccountError(err);
          } finally {
            if (mountedRef.current) {
              setLoading(false);
            }
          }
        },
      });
    } catch (err) {
      handleAccountError(err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div style={page} dir="rtl">
      <div style={card}>
        <div style={brandMark} aria-hidden="true">
          <span>R</span>
        </div>

        <h1 style={title}>إنشاء حساب جديد</h1>
        <p style={subtitle}>انضم إلى أناقة ROOZ</p>

        {error && (
          <div style={alertError} role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={alertSuccess} role="status">
            <CheckCircle size={18} aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister} noValidate>
          <label htmlFor="register-name" style={label}>
            الاسم الكامل
          </label>

          <div style={inputWrapper}>
            <User size={18} style={inputIcon} aria-hidden="true" />
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="اكتب اسمك الكامل"
              style={input}
              dir="rtl"
            />
          </div>

          <label htmlFor="register-email" style={label}>
            البريد الإلكتروني
          </label>

          <div style={inputWrapper}>
            <Mail size={18} style={inputIcon} aria-hidden="true" />
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              inputMode="email"
              placeholder="example@email.com"
              style={{ ...input, direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          <label htmlFor="register-region" style={label}>
            المنطقة
          </label>

          <div style={inputWrapper}>
            <MapPin size={18} style={inputIcon} aria-hidden="true" />
            <select
              id="register-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              disabled={loading}
              autoComplete="address-level1"
              style={{
                ...input,
                appearance: 'auto',
                paddingRight: 40,
                paddingLeft: 12,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">اختر منطقتك</option>
              {SAUDI_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <label htmlFor="register-password" style={label}>
            كلمة المرور
          </label>

          <div style={inputWrapper}>
            <Lock size={18} style={inputIcon} aria-hidden="true" />
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              placeholder="6 أحرف على الأقل"
              style={input}
              dir="ltr"
            />
          </div>

          <label htmlFor="register-confirm-password" style={label}>
            تأكيد كلمة المرور
          </label>

          <div style={inputWrapper}>
            <Lock size={18} style={inputIcon} aria-hidden="true" />
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              placeholder="أعد كتابة كلمة المرور"
              style={input}
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            style={{
              ...submitBtn,
              ...(loading ? submitBtnDisabled : {}),
            }}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span style={loadingContent}>
                <span style={spinner} aria-hidden="true" />
                جاري المعالجة...
              </span>
            ) : (
              'إنشاء حساب'
            )}
          </button>
        </form>

        <p style={switchForm}>
          لديك حساب؟{' '}
          <Link to="/login" style={link}>
            سجل دخول
          </Link>
        </p>
      </div>

      {otpModal && (
        <OtpModal
          email={otpModal.email}
          purpose={otpModal.purpose}
          loading={loading}
          onVerified={otpModal.onVerified}
          onClose={() => {
            if (!loading) {
              setOtpModal(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default Register;

const page = {
  minHeight: '100vh',
  width: '100%',
  background:
    'radial-gradient(circle at top, rgba(var(--rz-primary-rgb), 0.10), transparent 40%), linear-gradient(135deg, var(--rz-ivory) 0%, var(--rz-ivory) 50%, var(--rz-ivory) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  boxSizing: 'border-box',
  fontFamily: 'Tajawal, Tajawal, sans-serif',
};

const card = {
  background: 'var(--rz-white)',
  padding: '30px 26px',
  borderRadius: 22,
  width: '100%',
  maxWidth: 430,
  border: '1px solid rgba(var(--rz-ink-rgb), 0.08)',
  boxShadow:
    '0 22px 60px rgba(var(--rz-ink-rgb), 0.12), inset 0 1px 0 rgba(var(--rz-white-rgb), 0.6)',
  textAlign: 'center',
  boxSizing: 'border-box',
};

const brandMark = {
  width: 54,
  height: 54,
  margin: '0 auto 12px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'linear-gradient(145deg, var(--rz-primary) 0%, var(--rz-primary) 55%, var(--rz-primary) 100%)',
  color: 'var(--rz-white)',
  fontSize: 25,
  fontWeight: 900,
  boxShadow: '0 8px 24px rgba(var(--rz-primary-rgb), 0.2)',
};

const title = {
  color: 'var(--rz-ink)',
  fontSize: 26,
  fontWeight: 900,
  margin: '0 0 6px',
  letterSpacing: '-0.3px',
};

const subtitle = {
  color: 'var(--rz-muted)',
  fontSize: 13,
  margin: '0 0 22px',
};

const label = {
  color: 'var(--rz-ink)',
  fontSize: 14,
  fontWeight: 700,
  textAlign: 'right',
  display: 'block',
  marginBottom: 7,
};

const inputWrapper = {
  position: 'relative',
  marginBottom: 17,
};

const inputIcon = {
  position: 'absolute',
  top: '50%',
  left: 13,
  transform: 'translateY(-50%)',
  color: 'var(--rz-primary)',
  zIndex: 1,
  pointerEvents: 'none',
};

const input = {
  width: '100%',
  minHeight: 48,
  padding: '12px 14px 12px 42px',
  borderRadius: 12,
  border: '1px solid rgba(var(--rz-ink-rgb), 0.14)',
  outline: 'none',
  background: 'var(--rz-ivory)',
  color: 'var(--rz-ink)',
  fontSize: 15,
  fontFamily: 'Tajawal, Tajawal, sans-serif',
  boxSizing: 'border-box',
  transition: 'border-color 160ms ease, box-shadow 160ms ease',
};

const submitBtn = {
  width: '100%',
  minHeight: 50,
  padding: '13px 14px',
  background:
    'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 48%, var(--rz-primary) 100%)',
  color: 'var(--rz-white)',
  border: '1px solid rgba(var(--rz-cream-4-rgb), 0.45)',
  borderRadius: 12,
  fontWeight: 800,
  cursor: 'pointer',
  marginTop: 5,
  fontSize: 15,
  fontFamily: 'Tajawal, Tajawal, sans-serif',
  boxShadow: '0 8px 24px rgba(var(--rz-primary-rgb), 0.16)',
  transition: 'transform 160ms ease, opacity 160ms ease',
};

const submitBtnDisabled = {
  opacity: 0.65,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const loadingContent = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
};

const spinner = {
  width: 15,
  height: 15,
  borderRadius: '50%',
  border: '2px solid rgba(var(--rz-ink-rgb), 0.25)',
  borderTopColor: 'var(--rz-ink)',
  display: 'inline-block',
  animation: 'roozRegisterSpin 700ms linear infinite',
};

const switchForm = {
  margin: '21px 0 0',
  color: 'var(--rz-muted)',
  fontSize: 14,
};

const link = {
  color: 'var(--rz-primary)',
  fontWeight: 800,
  textDecoration: 'none',
};

const alertError = {
  background: 'var(--rz-cream-4)',
  border: '1px solid rgba(var(--rz-primary-rgb), 0.25)',
  color: 'var(--rz-primary)',
  padding: '11px 12px',
  borderRadius: 11,
  marginBottom: 17,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  lineHeight: 1.6,
  textAlign: 'right',
};

const alertSuccess = {
  background: 'var(--rz-ivory)',
  border: '1px solid rgba(var(--rz-ink-rgb), 0.25)',
  color: 'var(--rz-ink)',
  padding: '11px 12px',
  borderRadius: 11,
  marginBottom: 17,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  lineHeight: 1.6,
  textAlign: 'right',
};

if (
  typeof document !== 'undefined' &&
  !document.getElementById('rooz-register-animation')
) {
  const style = document.createElement('style');
  style.id = 'rooz-register-animation';
  style.textContent = `
    @keyframes roozRegisterSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}