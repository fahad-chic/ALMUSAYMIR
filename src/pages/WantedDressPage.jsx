// src/pages/WantedDressPage.jsx
// ميزة "طلب فستان" — تنشر المشترية مواصفاتها ليرسل النظام تنبيهاً للمعلنين.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Send, Loader2, CircleCheck, Sparkles } from 'lucide-react';
import { db, auth } from '../firebase/config';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { ensureFirebaseSession } from '../utils/firebaseSession';
import { notifyOwner } from '../utils/visitorNotify';
import { SIZE_FIELDS } from '../utils/dressMeta';

const COLORS = ['أبيض', 'أحمر', 'أسود', 'ذهبي', 'وردي', 'أزرق', 'أخضر', 'بنفسجي', 'بيج', 'أخرى'];

// تطبيع رقم الجوال السعودي: 05xxxxxxxx أو 9665xxxxxxxx (مع تجاهل المسافات/الرموز).
const normalizePhone = (value) =>
  String(value || '').replace(/\D/g, '').replace(/^966/, '0');

const isValidSaudiPhone = (value) =>
  /^05\d{8}$/.test(normalizePhone(value));

const emptyForm = {
  title: '',
  color: '',
  budget: '',
  eventDate: '',
  bust: '',
  waist: '',
  hip: '',
  length: '',
  notes: '',
  userPhone: '',
};

export default function WantedDressPage() {
  const navigate = useNavigate();
  const [harajUser, setHarajUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('harajUser');
      if (stored) {
        const u = JSON.parse(stored);
        setHarajUser(u);
        const prefilled = normalizePhone(u.phone || u.userPhone || '');
        if (isValidSaudiPhone(prefilled)) {
          setForm((prev) => ({ ...prev, userPhone: prefilled }));
        }
      }
    } catch {
      localStorage.removeItem('harajUser');
    }
  }, []);

  useEffect(() => {
    if (!db) return undefined;
    let unsub = null;
    (async () => {
      try {
        await ensureFirebaseSession();
        unsub = onSnapshot(
          query(collection(db, 'wanted_dresses'), orderBy('createdAt', 'desc'), limit(12)),
          (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          () => {}
        );
      } catch {
        /* العرض العام غير حرج */
      }
    })();
    return () => unsub && unsub();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'اكتبي وصفاً موجزاً للفستان المطلوب';
    if (!form.color) next.color = 'اختاري اللون';
    if (!(Number(form.budget) > 0)) next.budget = 'أدخلي ميزانية تقديرية';
    if (!isValidSaudiPhone(form.userPhone)) {
      next.userPhone = 'أدخلي رقم جوال صحيح (مثال: 05xxxxxxxx)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    if (!harajUser) {
      navigate('/haraj');
      return;
    }
    setSubmitting(true);
    try {
      await ensureFirebaseSession();
      const uid = harajUser.uid || auth?.currentUser?.uid || '';
      if (!uid) {
        setErrors({ submit: 'تعذّر التحقق من هويتك، حاولي إعادة المحاولة.' });
        return;
      }
      const userPhone = normalizePhone(form.userPhone);
      // لا يُنشأ أي مستند قبل التحقق من الرقم (حماية من طلبات يتيمة بلا تواصل).
      if (!isValidSaudiPhone(userPhone)) {
        setErrors({ userPhone: 'أدخلي رقم جوال صحيح (مثال: 05xxxxxxxx)' });
        return;
      }
      // الوثيقة العامة: بيانات الفستان + ownerUid (للربط) فقط، بلا أي بيانات شخصية.
      const publicPayload = {
        title: form.title.trim(),
        color: form.color,
        budget: Number(form.budget),
        eventDate: form.eventDate || '',
        bust: form.bust ? Number(form.bust) : null,
        waist: form.waist ? Number(form.waist) : null,
        hip: form.hip ? Number(form.hip) : null,
        length: form.length ? Number(form.length) : null,
        notes: form.notes.trim(),
        status: 'open',
        userName: harajUser.name || harajUser.userName || 'مشترية',
        ownerUid: uid,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(
        collection(db, 'wanted_dresses'),
        publicPayload
      );
      const privateRef = doc(db, 'wanted_dresses', ref.id, 'private', uid);
      // بيانات التواصل في وثيقة فرعية محصورة؛ البريد اختياري (الإشعار لا يتطلبه).
      try {
        await setDoc(privateRef, {
          userPhone,
          userEmail: harajUser.email || harajUser.userEmail || '',
          createdAt: serverTimestamp(),
        });
      } catch {
        // فشل الحفظ الخاص: امسح أي بقايا (خاص ثم عام) ولا نُظهر نجاحاً مضلّلاً.
        try {
          await deleteDoc(privateRef);
        } catch {
          /* لا يوجد ما يُحذف */
        }
        try {
          await deleteDoc(doc(db, 'wanted_dresses', ref.id));
        } catch {
          /* تعذّر التراجع — قواعد الحذف تمنع بقاء بيانات خاصة يتيمة */
        }
        setErrors({
          submit:
            'تعذّر حفظ بيانات التواصل، ولم يُنشر الطلب. حاولي مرة أخرى.',
        });
        return;
      }
      notifyOwner(
        'طلب فستان جديد',
        `${publicPayload.userName} تطلب فستاناً: ${publicPayload.title} — اللون ${publicPayload.color} — الميزانية ${publicPayload.budget.toLocaleString()} ريال`
      );
      setDone(true);
      setForm(emptyForm);
    } catch {
      setErrors({ submit: 'تعذّر نشر الطلب، حاولي مرة أخرى.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
        fontFamily: 'Tajawal, sans-serif',
        color: 'var(--rz-ink)',
        padding: '1.25rem',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 12px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, var(--rz-gold), var(--rz-primary))',
              boxShadow: '0 10px 24px rgba(var(--rz-primary-rgb), 0.28)',
            }}
          >
            <Heart size={30} color="var(--rz-ivory)" />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900, color: 'var(--rz-primary)' }}>
            طلب فستان
          </h1>
          <p style={{ margin: 0, color: 'var(--rz-muted)', fontWeight: 600 }}>
            انشري مواصفات الفستان الذي تبحثين عنه، وسيصل تنبيه للمعلنين الذين يملكون فساتين مطابقة.
          </p>
        </header>

        {done && (
          <div
            style={{
              background: 'rgba(var(--rz-muted-rgb), 0.10)',
              border: '1px solid rgba(var(--rz-muted-rgb), 0.35)',
              color: 'var(--rz-muted)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 14,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CircleCheck size={18} /> تم نشر طلبك بنجاح، وسيصل تنبيه للمعلنين المطابقين.
          </div>
        )}

        <div
          style={{
            background: 'var(--rz-white)',
            border: '1px solid var(--rz-ivory)',
            borderRadius: 22,
            padding: '1.5rem',
            boxShadow: '0 10px 34px rgba(var(--rz-ink-rgb), 0.07)',
            display: 'grid',
            gap: 14,
          }}
        >
          <Field label="وصف الفستان المطلوب *" error={errors.title}>
            <input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="مثال: فستان زفاف أبيض مطرز بالدانتيل"
              style={inputStyle(!!errors.title)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="اللون *" error={errors.color}>
              <select
                value={form.color}
                onChange={(e) => setField('color', e.target.value)}
                style={inputStyle(!!errors.color)}
              >
                <option value="">اختاري اللون</option>
                {COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="الميزانية (ريال) *" error={errors.budget}>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={form.budget}
                onChange={(e) => setField('budget', e.target.value)}
                placeholder="0"
                style={inputStyle(!!errors.budget)}
              />
            </Field>
          </div>

          <Field label="رقم الجوال *" error={errors.userPhone}>
            <input
              type="tel"
              inputMode="tel"
              value={form.userPhone}
              onChange={(e) => setField('userPhone', e.target.value)}
              placeholder="05xxxxxxxx"
              style={inputStyle(!!errors.userPhone)}
            />
          </Field>

          <Field label="تاريخ المناسبة (اختياري)">
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setField('eventDate', e.target.value)}
              style={inputStyle(false)}
            />
          </Field>

          <div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--rz-ink)' }}>
              المقاسات (سم) — اختياري
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 10,
                marginTop: 8,
              }}
            >
              {SIZE_FIELDS.map((f) => (
                <input
                  key={f.key}
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.label}
                  style={inputStyle(false)}
                />
              ))}
            </div>
          </div>

          <Field label="ملاحظات إضافية (اختياري)">
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              placeholder="تفاصيل أخرى تهمك..."
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </Field>

          {errors.submit && (
            <p style={{ margin: 0, color: 'var(--rz-primary)', fontWeight: 700, fontSize: 13 }}>{errors.submit}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              color: 'var(--rz-ivory)',
              border: 'none',
              borderRadius: 12,
              padding: '0.95rem',
              fontWeight: 800,
              fontSize: 15,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: submitting ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? <Loader2 size={19} className="spin" /> : <Send size={18} />}
            {submitting ? 'جاري النشر...' : 'نشر الطلب'}
          </button>
        </div>

        {requests.length > 0 && (
          <section style={{ marginTop: 22, marginBottom: 30 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: 'var(--rz-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Sparkles size={18} /> أحدث الطلبات
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--rz-white)',
                    border: '1px solid var(--rz-ivory)',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14.5 }}>{r.title}</strong>
                    <span style={{ fontSize: 13, color: 'var(--rz-primary)', fontWeight: 800 }}>
                      {Number(r.budget || 0).toLocaleString()} ريال
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--rz-muted)', fontWeight: 600 }}>
                    {r.color} · {r.userName || 'مشترية'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const inputStyle = (hasError) => ({
  width: '100%',
  background: 'var(--rz-ivory)',
  border: hasError ? '1px solid var(--rz-primary)' : '1px solid rgba(var(--rz-primary-rgb), 0.22)',
  borderRadius: 12,
  padding: '0.8rem 1rem',
  color: 'var(--rz-ink)',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
});

function Field({ label, error, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--rz-ink)' }}>{label}</span>
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--rz-primary)', fontWeight: 700 }}>{error}</span>}
    </label>
  );
}
