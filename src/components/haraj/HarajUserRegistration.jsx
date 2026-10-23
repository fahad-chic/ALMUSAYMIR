// src/components/haraj/HarajUserRegistration.jsx
import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Check, Crown } from 'lucide-react';
import { db, auth } from '../../firebase/config';
import { SAUDI_CITIES, CITY_GROUPS } from '../../data/saudiCities';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';



const HarajUserRegistration = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    region: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'الاسم مطلوب';
    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^[\d\s+]+$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }
    if (!formData.region) newErrors.region = 'اختر المنطقة';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !agreed) return;

    setSubmitting(true);
    setErrors({});

    try {
      if (!db) throw new Error('db unavailable');

      const phone = formData.phone.replace(/[\s\-()+]/g, '').trim();

      // منع تكرار رقم الجوال
      const dupQuery = query(
        collection(db, 'haraj_users'),
        where('phone', '==', phone),
        limit(1)
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        setErrors({ phone: 'هذا الرقم مسجّل مسبقاً. استخدم تسجيل الدخول.' });
        setSubmitting(false);
        return;
      }

      // لا دخول مجهول: حراج محمي بحاجز توثيق البريد، فالجلسة حقيقية موجودة
      // سلفاً. نتحقق فقط ونرفض بأمان إن غابت.
      if (!auth?.currentUser?.emailVerified) {
        setErrors({ phone: 'يلزم توثيق بريدك قبل إنشاء حساب حراج.' });
        setSubmitting(false);
        return;
      }

      // حفظ المستخدم في Firestore (حساب حقيقي)
      const ref = await addDoc(collection(db, 'haraj_users'), {
        name: formData.name.trim(),
        phone,
        email: formData.email.trim(),
        region: formData.region,
        createdAt: serverTimestamp(),
      });

      const userData = {
        uid: ref.id,
        name: formData.name.trim(),
        phone,
        email: formData.email.trim(),
        region: formData.region,
        registeredAt: new Date().toISOString(),
      };

      localStorage.setItem('harajUser', JSON.stringify(userData));

      setSubmitting(false);
      onSuccess(userData);
    } catch (err) {
      console.error('haraj registration error:', err);
      setErrors({ phone: 'تعذّر إنشاء الحساب حالياً. تحقق من الاتصال وحاول مرة أخرى.' });
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(var(--rz-ink-rgb), 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
    }}>
      <div style={{
        background: 'linear-gradient(180deg, var(--rz-ink) 0%, var(--rz-ink) 100%)',
        border: '1px solid rgba(var(--rz-primary-rgb), 0.3)',
        borderRadius: 24,
        width: '100%',
        maxWidth: 480,
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
          padding: '1.5rem',
          textAlign: 'center',
          borderRadius: '24px 24px 0 0',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'rgba(var(--rz-ink-rgb), 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} color="white" />
          </button>

          <div style={{
            width: 64,
            height: 64,
            background: 'rgba(var(--rz-ink-rgb), 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Crown size={32} color="var(--rz-ink)" />
          </div>

          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--rz-ink)',
            fontFamily: 'Tajawal, sans-serif',
          }}>
            تسجيل مستخدم الحراج
          </h2>
          <p style={{
            margin: '0.5rem 0 0',
            fontSize: '0.85rem',
            color: 'rgba(var(--rz-ink-rgb), 0.7)',
            fontFamily: 'Tajawal, sans-serif',
          }}>
            للتواصل مع المعلن بالشكل الصحيح
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--rz-ivory)',
              marginBottom: '0.5rem',
              fontFamily: 'Tajawal',
            }}>
              <User size={16} color="var(--rz-primary)" />
              الاسم الحقيقي *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="أدخل اسمك الحقيقي"
              style={{
                width: '100%',
                background: 'rgba(var(--rz-ink-rgb), 0.3)',
                border: errors.name ? '1px solid var(--rz-primary)' : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                color: 'var(--rz-ivory)',
                fontSize: '0.95rem',
                fontFamily: 'Tajawal',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.name && (
              <p style={{ color: 'var(--rz-error)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--rz-ivory)',
              marginBottom: '0.5rem',
              fontFamily: 'Tajawal',
            }}>
              <Phone size={16} color="var(--rz-primary)" />
              رقم الهاتف الحقيقي *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="05xxxxxxxx"
              dir="ltr"
              style={{
                width: '100%',
                background: 'rgba(var(--rz-ink-rgb), 0.3)',
                border: errors.phone ? '1px solid var(--rz-primary)' : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                color: 'var(--rz-ivory)',
                fontSize: '0.95rem',
                fontFamily: 'Tajawal',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'right',
              }}
            />
            {errors.phone && (
              <p style={{ color: 'var(--rz-error)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--rz-ivory)',
              marginBottom: '0.5rem',
              fontFamily: 'Tajawal',
            }}>
              <Mail size={16} color="var(--rz-primary)" />
              البريد الإلكتروني *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              dir="ltr"
              style={{
                width: '100%',
                background: 'rgba(var(--rz-ink-rgb), 0.3)',
                border: errors.email ? '1px solid var(--rz-primary)' : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                color: 'var(--rz-ivory)',
                fontSize: '0.95rem',
                fontFamily: 'Tajawal',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'left',
              }}
            />
            {errors.email && (
              <p style={{ color: 'var(--rz-error)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{errors.email}</p>
            )}
          </div>

          {/* Region */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--rz-ivory)',
              marginBottom: '0.5rem',
              fontFamily: 'Tajawal',
            }}>
              <MapPin size={16} color="var(--rz-primary)" />
              المنطقة *
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              style={{
                width: '100%',
                background: 'rgba(var(--rz-ink-rgb), 0.3)',
                border: errors.region ? '1px solid var(--rz-primary)' : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                color: formData.region ? 'var(--rz-ivory)' : 'var(--rz-muted)',
                fontSize: '0.95rem',
                fontFamily: 'Tajawal',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">اختر مدينتك</option>
              {CITY_GROUPS.map((group) => (
                <optgroup key={group.region} label={group.region}>
                  {group.cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.region && (
              <p style={{ color: 'var(--rz-error)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{errors.region}</p>
            )}
          </div>

          {/* Agreement */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'rgba(var(--rz-ink-rgb), 0.2)',
            borderRadius: 12,
          }}>
            <div
              onClick={() => setAgreed(!agreed)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: agreed ? 'linear-gradient(135deg, var(--rz-ink) 0%, var(--rz-ink) 100%)' : 'transparent',
                border: agreed ? 'none' : '2px solid rgba(var(--rz-primary-rgb), 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              {agreed && <Check size={16} color="white" />}
            </div>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--rz-muted)',
              fontFamily: 'Tajawal, sans-serif',
              lineHeight: 1.6,
            }}>
              أوافق على أن بياناتي صحيحة وأنني المسؤول عن أي معلومة خاطئة
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!agreed || submitting}
            style={{
              width: '100%',
              background: agreed 
                ? 'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)'
                : 'rgba(var(--rz-primary-rgb), 0.2)',
              border: 'none',
              borderRadius: 12,
              padding: '1rem',
              cursor: agreed ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: 700,
              color: agreed ? 'var(--rz-white)' : 'var(--rz-muted)',
              fontFamily: 'Tajawal, sans-serif',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {submitting ? (
              <span>جاري التسجيل...</span>
            ) : (
              <>
                <Check size={20} />
                <span>تسجيل</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HarajUserRegistration;
