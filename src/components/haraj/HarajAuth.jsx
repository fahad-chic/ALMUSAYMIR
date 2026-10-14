// نظام تسجيل دخول خاص بمنصة الإعلانات — حقيقي عبر Firestore (haraj_users)
import { useState, useEffect } from 'react';
import { X, User, Phone } from 'lucide-react';
import { db, auth } from '../../firebase/config';
import { signInAnonymously } from 'firebase/auth';
import { colorAlpha } from '../../utils/color';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

// توحيد صيغة رقم الجوال (إزالة الفراغات والرموز)
const normalizePhone = (raw) => String(raw || '').replace(/[\s\-()+]/g, '').trim();

// البحث عن مستخدم مسجل برقم الجوال
async function findHarajUser(phone) {
  if (!db) throw new Error('خدمة التسجيل غير متاحة حالياً');
  const q = query(
    collection(db, 'haraj_users'),
    where('phone', '==', phone),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

const C = {
  gold: 'var(--rz-primary)',
  goldLight: 'var(--rz-gold)',
  goldDark: 'var(--rz-primary)',
  black: 'var(--rz-ink)',
  blackLight: 'var(--rz-ink)',
  gray: 'var(--rz-ink)',
  grayLight: 'var(--rz-ink)',
  grayMid: 'var(--rz-muted)',
  white: 'var(--rz-ivory)',
  cream: 'var(--rz-ivory)',
  green: 'var(--rz-ink)',
  red: 'var(--rz-primary)',
};

export default function HarajAuth({ isOpen, onClose, onSuccess, onCreateAccount }) {
  const [mode, setMode] = useState('choose');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('choose');
      setName('');
      setPhone('');
      setError('');
    }
  }, [isOpen]);

  const handleLogin = async () => {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      setError('أدخل رقم الجوال');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const existing = await findHarajUser(cleanPhone);
      if (!existing) {
        setError('هذا الرقم غير مسجّل. أنشئ حساباً جديداً أولاً.');
        setLoading(false);
        return;
      }
      const userData = {
        uid: existing.uid,
        name: existing.name || 'مستخدم',
        phone: existing.phone,
        email: existing.email || '',
        region: existing.region || '',
        createdAt: existing.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      };
      localStorage.setItem('harajUser', JSON.stringify(userData));
      setLoading(false);
      onSuccess?.(userData);
      onClose?.();
    } catch (e) {
      console.error('haraj login error:', e);
      setError('تعذّر تسجيل الدخول حالياً. تحقق من الاتصال وحاول مرة أخرى.');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);
    if (!cleanName || !cleanPhone) {
      setError('أكمل جميع الحقول');
      return;
    }
    if (cleanPhone.length < 9) {
      setError('رقم الجوال غير صحيح');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const existing = await findHarajUser(cleanPhone);
      if (existing) {
        setError('هذا الرقم مسجّل مسبقاً. استخدم تسجيل الدخول.');
        setLoading(false);
        return;
      }
      // جلسة Firebase مطلوبة لقواعد Firestore الحالية — دخول مجهول صامت ثم إنشاء الحساب
      try {
        if (auth && !auth.currentUser) await signInAnonymously(auth);
      } catch (anonymousErr) {
        console.warn('anon auth skipped:', anonymousErr);
      }
      const ref = await addDoc(collection(db, 'haraj_users'), {
        name: cleanName,
        phone: cleanPhone,
        email: '',
        region: '',
        createdAt: serverTimestamp(),
      });
      const userData = {
        uid: ref.id,
        name: cleanName,
        phone: cleanPhone,
        email: '',
        region: '',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('harajUser', JSON.stringify(userData));
      setLoading(false);
      onSuccess?.(userData);
      onClose?.();
    } catch (e) {
      console.error('haraj register error:', e);
      setError('تعذّر إنشاء الحساب حالياً. تحقق من الاتصال وحاول مرة أخرى.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(var(--rz-ink-rgb), 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: `linear-gradient(145deg, ${C.gray} 0%, ${C.blackLight} 100%)`,
          borderRadius: 20,
          padding: 30,
          maxWidth: 400,
          width: '100%',
          border: `1px solid colorAlpha(C.gold, 0.25)`,
          boxShadow: `0 20px 60px rgba(var(--rz-ink-rgb), 0.5)`,
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 15,
            left: 15,
            background: 'transparent',
            border: 'none',
            color: 'var(--rz-gold)',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 25 }}>
          <h2 style={{ 
            color: C.gold, 
            margin: 0, 
            fontSize: 22,
            fontFamily: 'Tajawal',
          }}>
            {mode === 'choose' && 'تسجيل الدخول لمنصة الإعلانات'}
            {mode === 'login' && 'تسجيل الدخول'}
            {mode === 'register' && 'إنشاء حساب جديد'}
          </h2>
          <p style={{ 
            color: 'var(--rz-gold)', 
            marginTop: 8,
            fontSize: 14,
          }}>
            {mode === 'choose' && 'سجل دخولك للتواصل مع البائعين ونشر إعلاناتك'}
            {mode === 'login' && 'أدخل رقم جوالك'}
            {mode === 'register' && 'أدخل بياناتك لإنشاء حساب'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(var(--rz-primary-rgb), 0.12)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.4)',
            color: 'var(--rz-ivory)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            marginBottom: 16,
            textAlign: 'center',
            fontFamily: 'Tajawal',
          }}>
            {error}
          </div>
        )}

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => setMode('login')}
              style={{
                background: `linear-gradient(135deg, ${C.green} 0%, var(--rz-ink) 100%)`,
                border: 'none',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontFamily: 'Tajawal',
              }}
            >
              <Phone size={20} /> تسجيل دخول
            </button>
            <button
              onClick={() => {
                if (typeof onCreateAccount === 'function') {
                  onCreateAccount();
                } else {
                  setMode('register');
                }
              }}
              style={{
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`,
                border: 'none',
                borderRadius: 12,
                padding: 16,
                color: C.black,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontFamily: 'Tajawal',
              }}
            >
              <User size={20} /> إنشاء حساب جديد
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: `1px solid ${C.grayLight}`,
                borderRadius: 12,
                padding: 12,
                color: 'var(--rz-gold)',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              متابعة كمستخدم عادي
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <input
              type="tel"
              placeholder="رقم الجوال (05xxxxxxxx)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                background: 'rgba(var(--rz-white-rgb), 0.08)',
                border: `1px solid colorAlpha(C.gold, 0.25)`,
                color: C.white,
                fontSize: 16,
                fontFamily: 'Tajawal',
              }}
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${C.green} 0%, var(--rz-ink) 100%)`,
                border: 'none',
                borderRadius: 12,
                padding: 16,
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
            <button
              onClick={() => setMode('choose')}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.gold,
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'Tajawal',
              }}
            >
               رجوع
            </button>
          </div>
        )}

        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <input
              type="text"
              placeholder="الاسم"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                background: 'rgba(var(--rz-white-rgb), 0.08)',
                border: `1px solid colorAlpha(C.gold, 0.25)`,
                color: C.white,
                fontSize: 16,
                fontFamily: 'Tajawal',
              }}
            />
            <input
              type="tel"
              placeholder="رقم الجوال"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                background: 'rgba(var(--rz-white-rgb), 0.08)',
                border: `1px solid colorAlpha(C.gold, 0.25)`,
                color: C.white,
                fontSize: 16,
                fontFamily: 'Tajawal',
              }}
            />
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDark} 100%)`,
                border: 'none',
                borderRadius: 12,
                padding: 16,
                color: C.black,
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'Tajawal',
              }}
            >
              {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
            </button>
            <button
              onClick={() => setMode('choose')}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.gold,
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'Tajawal',
              }}
            >
               رجوع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
