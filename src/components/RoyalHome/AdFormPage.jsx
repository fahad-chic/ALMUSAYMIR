// src/components/RoyalHome/AdFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Check,
  Crown,
  MapPin,
  Shield,
  Loader2,
} from 'lucide-react';
import { db, auth } from '../../firebase/config';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { notifyOwner, buildAdOwnerNotice } from '../../utils/visitorNotify';
import { ensureFirebaseSession } from '../../utils/firebaseSession';
import { CITY_GROUPS } from '../../data/saudiCities';
import { watermarkDataUrl } from '../../utils/watermark';
import { extractMotionFrames } from '../../utils/motionPreview';
import { MAX_VIDEO_SECONDS, SIZE_FIELDS } from '../../utils/dressMeta';
const HARAJ_SECTIONS = [
  'أجهزة كهربائية',
  'غرف نوم',
  'سيارات',
  'ساعات',
  'شنط',
  'ملابس',
  'بيوت وعقارات',
  'وظائف',
  'أثاث',
  'أدوات منزلية',
  'إلكترونيات',
  'جوالات',
  'لابتوبات',
  'مستلزمات الأطفال',
  'مستلزمات نسائية',
  'مستلزمات رجالية',
  'أخرى',
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 2;
/*
 * ضغط الصورة على جهاز المستخدم وتحويلها إلى Data URL (Base64) صغير.
 * صورة الحراج تُخزَّن داخل وثيقة Firestore مباشرة (دون Firebase Storage —
 * الذي يتطلب ترقية/عقد دفع في باقة المشروع المجانية). الحجم الأقصى بعد
 * الضغط ~120KB، فيكفي تخزينها Text داخل قاعدة البيانات ويظل صندوقاً قياسياً.
 */
const MAX_DIM = 800;
const JPEG_QUALITY = 0.72;
const compressImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('تعذّر فتح الصورة'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl;
        try {
          dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        } catch {
          dataUrl = reader.result;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
const AdFormPage = () => {
  const navigate = useNavigate();
  const [harajUser, setHarajUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    publisherName: '',
    publisherPhone: '',
    category: 
    size: '',
    price: '',
    description: '',
    defects: '',
    condition: 'new',
    location: '',
    images: [null, null],
    video: null,
    isAuction: false,
    measurements: { bust: '', waist: '', hip: '', length: '' },
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  /*
   * التحقق من بيانات مستخدم الحراج.
   *
   * مهم:
   * localStorage يستخدم هنا للحفاظ على نظام تسجيل الحراج الموجود
   * في المشروع، وليس كوسيلة حماية Firestore بحد ذاتها.
   */
  useEffect(() => {
    let mounted = true;
    try {
      const stored = localStorage.getItem('harajUser');
      if (stored) {
        const parsedUser = JSON.parse(stored);
        if (
          parsedUser &&
          typeof parsedUser === 'object' &&
          !Array.isArray(parsedUser)
        ) {
          if (mounted) {
            setHarajUser(parsedUser);
          }
        } else {
          localStorage.removeItem('harajUser');
        }
      }
    } catch (error) {
      console.error('Error reading harajUser:', error);
      localStorage.removeItem('harajUser');
    } finally {
      if (mounted) {
        setCheckingUser(false);
      }
    }
    return () => {
      mounted = false;
    };
  }, []);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };
  const handleImageUpload = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setSubmitError('الملف المحدد ليس صورة صالحة.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setSubmitError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.');
      e.target.value = '';
      return;
    }
    const newImages = [...formData.images];
    newImages[index] = {
      file,
      preview: URL.createObjectURL(file),
    };
    setFormData((prev) => ({
      ...prev,
      images: newImages,
    }));
    setSubmitError('');
    e.target.value = '';
  };
  const removeImage = (index) => {
    const image = formData.images[index];
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }
    const newImages = [...formData.images];
    newImages[index] = null;
    setFormData((prev) => ({
      ...prev,
      images: newImages,
    }));
  };
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('video/')) {
      setSubmitError('الملف المحدد ليس مقطع فيديو صالحاً.');
      e.target.value = '';
      return;
    }
    setFormData((prev) => ({
      ...prev,
      video: { file, preview: URL.createObjectURL(file) },
    }));
    setSubmitError('');
    e.target.value = '';
  };
  const removeVideo = () => {
    if (formData.video?.preview) {
      URL.revokeObjectURL(formData.video.preview);
    }
    setFormData((prev) => ({ ...prev, video: null }));
  };
  const handleMeasurementChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: value },
    }));
  };
  const validateForm = () => {
    const newErrors = {};
    const name = formData.name.trim();
    const description = formData.description.trim();
    const location = formData.location.trim();
    const publisherName = (formData.publisherName || '').trim();
    const publisherPhone = String(formData.publisherPhone || '').replace(/\D/g, '');
    const price = Number(formData.price);
    if (!name) {
      newErrors.name = 'اسم السلعة مطلوب';
    } else if (name.length < 2) {
      newErrors.name = 'اسم السلعة قصير جدًا';
    }
    if (!formData.category) {
      newErrors.category = 'اختر الفئة';
    }
    if (!Number.isFinite(price) || price <= 0) {
      newErrors.price = 'السعر يجب أن يكون أكبر من صفر';
    }
    if (!location) {
      newErrors.location = 'الموقع مطلوب';
    }
    if (!description) {
      newErrors.description = 'وصف السلعة مطلوب';
    } else if (description.length < 5) {
      newErrors.description = 'يرجى كتابة وصف أوضح للسلعة';
    }
    const hasAtLeastOneImage = formData.images.some(Boolean);

    if (!publisherName) {
      setSubmitError('اكتب اسم المعلن كما سيظهر في الإعلان.');
      setSubmitting(false);
      return;
    }
    if (publisherPhone.length < 9 || publisherPhone.length > 15) {
      setSubmitError('أدخل رقم جوال المعلن بشكل صحيح (9–15 رقمًا). لا يُستخدم رقم الموقع.');
      setSubmitting(false);
      return;
    }
    if (!hasAtLeastOneImage) {
      newErrors.images = 'يجب إضافة صورة واحدة على الأقل';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmitForm = () => {
    setSubmitError('');
    if (validateForm()) {
      setStep(2);
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };
  const compressAllImages = async (onError) => {
    const dataUrls = [];
    for (let index = 0; index < formData.images.length; index += 1) {
      const image = formData.images[index];
      if (!image?.file) {
        continue;
      }
      try {
        const compressed = await compressImageToDataUrl(image.file);
        /*
         * علامة مائية شفافة تُطبَّق تلقائياً على صور الإعلانات
         * لحماية الإعلانات — وتبقى الصورة سليمة إن تعذّر رسم العلامة.
         */
        let finalUrl = compressed;
        try {
          finalUrl = await watermarkDataUrl(compressed);
        } catch {
          finalUrl = compressed;
        }
        dataUrls.push(finalUrl);
      } catch (err) {
        onError?.(err);
        throw err;
      }
    }
    return dataUrls;
  };
  const handleFinalSubmit = async () => {
    if (submitting) {
      return;
    }
    if (!agreed) {
      setSubmitError('يجب الموافقة على الشروط قبل نشر الإعلان.');
      return;
    }
    if (!harajUser) {
      setSubmitError('يجب تسجيل الدخول أولاً.');
      navigate('/haraj');
      return;
    }
    if (!validateForm()) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    let lastUploadError = null;
    try {
      await ensureFirebaseSession();
      const price = Number(formData.price);
      /*
       * نضغط الصور على جهاز المستخدم إلى Data URL صغير ثم نحفظها مباشرة
       * داخل وثيقة الإعلان في Firestore — لا نحتاج Firebase Storage إطلاقاً
       * (مقفلة في الباقة المجانية بلا بطاقة)، فيُنشر الإعلان بصوره فوراً.
       */
      const imageDataUrls = await compressAllImages((err) => {
        lastUploadError = err;
      });
      /*
       * "المنتج في الحركة": عند إرفاق مقطع قصير (٥ ثوانٍ) نستخرج إطارات
       * متتابعة ونحفظها كمعاينة حركة — الاختياري لا يعطّل النشر إن فشل.
       */
      let motionFrames = [];
      let motionDuration = 0;
      if (formData.video?.file) {
        try {
          const motion = await extractMotionFrames(formData.video.file);
          motionFrames = motion.frames;
          motionDuration = motion.duration;
        } catch (err) {
          lastUploadError = err;
          setSubmitError(err.message || 'تعذّر تجهيز الفيديو.');
          setSubmitting(false);
          return;
        }
      }
      const measurements = {
        bust: Number(formData.measurements.bust) || null,
        waist: Number(formData.measurements.waist) || null,
        hip: Number(formData.measurements.hip) || null,
        length: Number(formData.measurements.length) || null,
      };
      const initialAdData = {
        title: formData.name.trim(),
        category: formData.category,
        price,
        description: formData.description.trim(),
        condition: formData.condition,
        location: formData.location.trim(),
        city: formData.location.trim(),
        size: formData.size.trim(),
        defects: formData.defects.trim(),
        images: imageDataUrls,
        imageCount: imageDataUrls.length,
        measurements,
        motionFrames,
        motionDuration,
        /* فتح المزاد العلني تلقائياً لمدة ٤٨ ساعة (اختياري) */
        isAuction: !!formData.isAuction,
        auctionEndsAt: formData.isAuction
          ? new Date(Date.now() + 48 * 3600 * 1000)
          : null,
        currentBid: formData.isAuction ? price : null,
        bids: [],
        /*
         * active = يُنشر فوراً للعموم (بطلب المالك). صاحب الموقع يستطيع
         * حذف أي إعلان مخالف لاحقاً من غرفته.
         */
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userName:
          publisherName ||
          harajUser?.name ||
          harajUser?.userName ||
          '',
        userPhone: publisherPhone,
        userEmail:
          harajUser.email ||
          harajUser.userEmail ||
          '',
        userRegion:
          harajUser.region ||
          harajUser.userRegion ||
          '',
        /*
         * V3: userId = معرّف مصادقة Firebase (uid) لتفعيل ملكية الإعلان في
         * القواعد؛ والمعرّف القديم لنظام تسجيل حراج يُحفظ في harajUserId.
         */
        userId:
          auth?.currentUser?.uid ||
          harajUser.uid ||
          harajUser.userId ||
          harajUser.id ||
          '',
        harajUserId:
          harajUser.uid ||
          harajUser.userId ||
          harajUser.id ||
          '',
      };
      await addDoc(
        collection(db, 'haraj_ads'),
        initialAdData
      );
      setSubmitting(false);
      setSubmitted(true);
      // إرسال بيانات الناشر (الاسم والهاتف والمدينة) لغرفة صاحب الموقع
      // حتى يعرف من نشر الإعلان — تُعرض في إشعارات OwnerPrivateRoom فوراً.
      const notice = buildAdOwnerNotice(initialAdData);
      notifyOwner(notice.title, notice.body);
      /*
       * تنظيف روابط المعاينة المحلية.
       */
      formData.images.forEach((image) => {
        if (image?.preview) {
          URL.revokeObjectURL(image.preview);
        }
      });
    } catch (error) {
      console.error('Error publishing haraj ad:', error);
      /*
       * إعادة ضبط حالة الزر دائماً حتى في الأخطاء غير المتوقعة
       * حتى لا يبقى «جاري النشر...» عالقاً للأبد.
       */
      setSubmitting(false);
      const msg = String((lastUploadError && lastUploadError.message)
        || (error && error.message) || '');
      const isImageError = /صورة|image|تعذّ|canvas|readAsDataURL|DataURL/i.test(msg);
      setSubmitError(
        isImageError
          ? 'تعذّر تجهيز صورة الإعلان على جهازك. اختر صورة أخرى أصغر أو أعد المحاولة.'
          : 'حدث خطأ أثناء حفظ الإعلان. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.'
      );
    }
  };
  if (checkingUser) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Tajawal',
        }}
      >
        <div
          style={{
            color: 'var(--rz-primary)',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <Loader2 size={22} className="spin" />
          جاري التحقق...
        </div>
      </div>
    );
  }
  if (!harajUser) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'Tajawal',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background:
              'var(--rz-white)',
            border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
            borderRadius: 24,
            padding: '2rem',
            maxWidth: 400,
            width: '100%',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background:
                'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <Shield size={32} color="var(--rz-ink)" />
          </div>
          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--rz-ink)',
            }}
          >
            تسجيل الدخول مطلوب
          </h2>
          <p
            style={{
              margin: '0 0 1.5rem',
              fontSize: '0.95rem',
              color: 'var(--rz-ink)',
              lineHeight: 1.7,
            }}
          >
            يجب تسجيل الدخول أولاً لنشر إعلان جديد.
          </p>
          <button
            type="button"
            onClick={() => navigate('/haraj')}
            style={{
              background:
                'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
              border: 'none',
              borderRadius: 12,
              padding: '1rem 2rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--rz-white)',
              fontFamily: 'inherit',
            }}
          >
            العودة وتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'Tajawal',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background:
              'var(--rz-white)',
            border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
            borderRadius: 24,
            padding: '3rem 2rem',
            maxWidth: 500,
            width: '100%',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background:
                'linear-gradient(135deg, var(--rz-ink) 0%, var(--rz-ink) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <Check size={40} color="white" />
          </div>
          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--rz-ink)',
            }}
          >
            تم إرسال إعلانك بنجاح!
          </h2>
          <p
            style={{
              margin: '0 0 2rem',
              fontSize: '1rem',
              color: 'var(--rz-ink)',
              lineHeight: 1.8,
            }}
          >
            تم نشر إعلانك في حراج المسيمير الآن، وهو مرئي للجميع. يمكنك متابعته في صفحة الحراج.
          </p>
          <button
            type="button"
            onClick={() => navigate('/haraj')}
            style={{
              background:
                'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
              border: 'none',
              borderRadius: 12,
              padding: '1rem 2rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--rz-white)',
              fontFamily: 'inherit',
            }}
          >
            العودة للحراج
          </button>
        </div>
      </div>
    );
  }
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
        padding: '1.5rem',
        fontFamily: 'Tajawal',
      }}
    >
      <style>
        {`
          @keyframes chic-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: chic-spin 1s linear infinite;
          }
          .chic-image-remove {
            position: absolute;
            top: 6px;
            left: 6px;
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 50%;
            background: rgba(var(--rz-primary-rgb), 0.92);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            z-index: 2;
          }
          @media (max-width: 600px) {
            .chic-size-price-row {
              grid-template-columns: 1fr !important;
            }
            .chic-oath-percentages {
              flex-direction: column !important;
              gap: 0.75rem !important;
            }
          }
        `}
      </style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <button
          type="button"
          onClick={() =>
            step === 1 ? navigate('/haraj') : setStep(1)
          }
          style={{
            background: 'rgba(var(--rz-primary-rgb), 0.08)',
            border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
            borderRadius: 12,
            padding: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <ArrowRight size={20} color="var(--rz-primary)" />
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--rz-ink)',
          }}
        >
          {step === 1 ? 'إضافة إعلان جديد' : 'تأكيد النشر'}
        </h1>
      </div>
      {submitError && (
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto 1rem',
            padding: '1rem',
            background: 'rgba(var(--rz-primary-rgb), 0.06)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.4)',
            borderRadius: 12,
            color: 'var(--rz-ink)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
        >
          {submitError}
        </div>
      )}
      {step === 1 ? (
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              background:
                'var(--rz-white)',
              border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
              borderRadius: 24,
              padding: '2rem',
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                اسم السلعة *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="مثال: ساعة رولكس ذهبية"
                style={{
                  width: '100%',
                  background: 'var(--rz-ivory)',
                  border: errors.name
                    ? '1px solid var(--rz-primary)'
                    : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                  color: 'var(--rz-ink)',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <label style={{ display: 'block', marginTop: '0.85rem', marginBottom: 6, color: 'var(--rz-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
                اسم المعلن *
              </label>
              <input
                type="text"
                name="publisherName"
                value={formData.publisherName}
                onChange={handleChange}
                placeholder="اسمك كما يظهر للمشترين"
                style={{
                  width: '100%',
                  background: 'var(--rz-ivory)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                  color: 'var(--rz-ink)',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <label style={{ display: 'block', marginTop: '0.85rem', marginBottom: 6, color: 'var(--rz-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
                جوال المعلن *
              </label>
              <input
                type="tel"
                name="publisherPhone"
                inputMode="numeric"
                value={formData.publisherPhone}
                onChange={handleChange}
                placeholder="05xxxxxxxx"
                style={{
                  width: '100%',
                  background: 'var(--rz-ivory)',
                  border: '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                  color: 'var(--rz-ink)',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--rz-muted)' }}>
                يظهر رقمك للمشترين — لا يُستخدم رقم صاحب الموقع.
              </p>

              {errors.name && (
                <p
                  style={{
                    color: 'var(--rz-primary)',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {errors.name}
                </p>
              )}
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                الفئة *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{
                  width: '100%',
                  background: 'var(--rz-ivory)',
                  border: errors.category
                    ? '1px solid var(--rz-primary)'
                    : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                  color: formData.category ? 'var(--rz-ink)' : 'var(--rz-muted)',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">اختر الفئة</option>
                {HARAJ_SECTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p
                  style={{
                    color: 'var(--rz-primary)',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {errors.category}
                </p>
              )}
            </div>
            <div
              className="chic-size-price-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--rz-ink)',
                    marginBottom: '0.5rem',
                  }}
                >
                  المقاس (إن وجد)
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  placeholder="مثال: L, 42, كبير"
                  style={{
                    width: '100%',
                    background: 'var(--rz-ivory)',
                    border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
                    borderRadius: 12,
                    padding: '0.85rem 1rem',
                    color: 'var(--rz-ink)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--rz-ink)',
                    marginBottom: '0.5rem',
                  }}
                >
                  السعر (ريال) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  style={{
                    width: '100%',
                    background: 'var(--rz-ivory)',
                    border: errors.price
                      ? '1px solid var(--rz-primary)'
                      : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                    borderRadius: 12,
                    padding: '0.85rem 1rem',
                    color: 'var(--rz-ink)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.price && (
                  <p
                    style={{
                      color: 'var(--rz-primary)',
                      fontSize: '0.8rem',
                      margin: '0.25rem 0 0',
                    }}
                  >
                    {errors.price}
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                مقاسات المنتج (سم) — اختياري
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {SIZE_FIELDS.map((field) => (
                  <input
                    key={field.key}
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={formData.measurements[field.key]}
                    onChange={(e) => handleMeasurementChange(field.key, e.target.value)}
                    placeholder={field.label}
                    style={{
                      width: '100%',
                      background: 'var(--rz-ivory)',
                      border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
                      borderRadius: 12,
                      padding: '0.8rem 1rem',
                      color: 'var(--rz-ink)',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>
              <p style={{ color: 'var(--rz-muted)', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
                تُستخدم في «حاسبة المقاسات الذكية» ليرى المشتري نسبة ملاءمة المنتج له.
              </p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                الموقع *
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={18}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--rz-primary)',
                  }}
                />
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    background: 'var(--rz-ivory)',
                    border: errors.location
                      ? '1px solid var(--rz-primary)'
                      : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                    borderRadius: 12,
                    padding: '0.85rem 1rem',
                    paddingRight: '2.8rem',
                    color: formData.location ? 'var(--rz-ivory)' : 'var(--rz-muted)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">اختر المدينة</option>
                  {CITY_GROUPS.map((group) => (
                    <optgroup key={group.region} label={group.region}>
                      {group.cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {errors.location && (
                <p
                  style={{
                    color: 'var(--rz-primary)',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {errors.location}
                </p>
              )}
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                حالة السلعة
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { value: 'new', label: 'جديد' },
                  { value: 'used', label: 'مستخدمة' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        condition: option.value,
                      }))
                    }
                    style={{
                      flex: 1,
                      background:
                        formData.condition === option.value
                          ? 'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)'
                          : 'var(--rz-ivory)',
                      border:
                        formData.condition === option.value
                          ? 'none'
                          : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                      borderRadius: 12,
                      padding: '0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color:
                        formData.condition === option.value
                          ? 'var(--rz-white)'
                          : 'var(--rz-ink)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                صور السلعة *
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                }}
              >
                {[0, 1].map((index) => {
                  const image = formData.images[index];
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        minHeight: 150,
                        background: 'var(--rz-ivory)',
                        border: '2px dashed rgba(var(--rz-primary-rgb), 0.3)',
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}
                    >
                      {image?.preview ? (
                        <>
                          <img
                            src={image.preview}
                            alt={`معاينة الصورة ${index + 1}`}
                            style={{
                              width: '100%',
                              height: 150,
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                          <button
                            type="button"
                            className="chic-image-remove"
                            onClick={() => removeImage(index)}
                            aria-label="حذف الصورة"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <label
                          style={{
                            width: '100%',
                            height: '150px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Camera size={28} color="var(--rz-muted)" />
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--rz-muted)',
                            }}
                          >
                            {index === 0
                              ? 'الصورة الأولى *'
                              : 'الصورة الثانية'}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) =>
                              handleImageUpload(index, e)
                            }
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.images && (
                <p
                  style={{
                    color: 'var(--rz-primary)',
                    fontSize: '0.8rem',
                    margin: '0.5rem 0 0',
                  }}
                >
                  {errors.images}
                </p>
              )}
              <p
                style={{
                  color: 'var(--rz-muted)',
                  fontSize: '0.75rem',
                  margin: '0.5rem 0 0',
                }}
              >
                الحد الأقصى للصورة الواحدة 5 ميجابايت — تُضاف علامة مائية تلقائياً لحماية إعلانك.
              </p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                المنتج في الحركة (فيديو قصير حتى {MAX_VIDEO_SECONDS} ثوانٍ) — اختياري
              </label>
              {formData.video?.preview ? (
                <div style={{ position: 'relative' }}>
                  <video
                    src={formData.video.preview}
                    muted
                    loop
                    playsInline
                    autoPlay
                    style={{
                      width: '100%',
                      maxHeight: 240,
                      borderRadius: 12,
                      background: 'var(--rz-ink)',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                  <button
                    type="button"
                    className="chic-image-remove"
                    onClick={removeVideo}
                    aria-label="حذف الفيديو"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minHeight: 130,
                    background: 'var(--rz-ivory)',
                    border: '2px dashed rgba(var(--rz-primary-rgb), 0.3)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={28} color="var(--rz-muted)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--rz-muted)' }}>
                    أضف مقطعاً قصيراً يُظهر المنتج بوضوح
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
              <p style={{ color: 'var(--rz-muted)', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
                يُحوَّل الفيديو إلى إطارات متتابعة (معاينة حركة) تُخزَّن مع الإعلان — المدة حتى {MAX_VIDEO_SECONDS} ثوانٍ.
              </p>
            </div>
            <div
              style={{
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: 'rgba(var(--rz-primary-rgb), 0.06)',
                border: '1px solid rgba(var(--rz-primary-rgb), 0.18)',
                borderRadius: 12,
              }}
            >
              <input
                id="chic-auction-toggle"
                type="checkbox"
                checked={!!formData.isAuction}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isAuction: e.target.checked }))
                }
                style={{ width: 22, height: 22, accentColor: 'var(--rz-primary)', cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor="chic-auction-toggle" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--rz-ink)', cursor: 'pointer' }}>
                تفعيل المزاد العلني لمدة ٤٨ ساعة — يبدأ المزاد من سعرك ويصعد تلقائياً بأعلى مزايدة.
              </label>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                وصف السلعة *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="صف السلعة بالتفصيل..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--rz-ivory)',
                  border: errors.description
                    ? '1px solid var(--rz-primary)'
                    : '1px solid rgba(var(--rz-primary-rgb), 0.2)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                  color: 'var(--rz-ink)',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {errors.description && (
                <p
                  style={{
                    color: 'var(--rz-primary)',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {errors.description}
                </p>
              )}
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--rz-ink)',
                  marginBottom: '0.5rem',
                }}
              >
                عيوب السلعة (إن وجدت)
              </label>
              <textarea
                name="defects"
                value={formData.defects}
                onChange={handleChange}
                placeholder="اكتب أي عيوب موجودة..."
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--rz-ivory)',
                  border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                  color: 'var(--rz-ink)',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSubmitForm}
              style={{
                width: '100%',
                background:
                  'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
                border: 'none',
                borderRadius: 12,
                padding: '1rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--rz-white)',
                fontFamily: 'inherit',
              }}
            >
              متابعة
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              background:
                'var(--rz-white)',
              border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
              borderRadius: 24,
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background:
                  'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <Crown size={32} color="var(--rz-ink)" />
            </div>
            <div
              style={{
                background: 'var(--rz-ivory)',
                border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
                borderRadius: 16,
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '1.08rem',
                  fontWeight: 800,
                  color: 'var(--rz-ink)',
                  lineHeight: 2,
                  textAlign: 'right',
                }}
              >
                أقسم بالله العظيم، بأنني أنا المعلن ، وأتعهد أمام الله سبحانه وتعالى، في حال تم بيع السلعة سواء عن طريق الموقع، أو بسببه،سوف أدفع وأحوّل رسوم الموقع الى حسابات البنكية للموقع الرسمية والمتفق عليها كاملة وبدون نقص،ولا تـأخير وبمدة أقصاها  10 أيام من أستلام مبلغ المبايعة، كما أنني أعلم بأن نسبة الموقع هي:
              </p>
              <div
                className="chic-oath-percentages"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '2rem',
                  margin: '1.5rem 0',
                }}
              >
                <div
                  style={{
                    background: 'rgba(var(--rz-primary-rgb), 0.06)',
                    borderRadius: 12,
                    padding: '1rem 1.5rem',
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      color: 'var(--rz-ink)',
                    }}
                  >
                    1%
                  </p>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--rz-ink)',
                    }}
                  >
                    للسلع المستخدمة
                  </p>
                </div>
                <div
                  style={{
                    background: 'rgba(var(--rz-primary-rgb), 0.06)',
                    borderRadius: 12,
                    padding: '1rem 1.5rem',
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      color: 'var(--rz-ink)',
                    }}
                  >
                    2%
                  </p>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--rz-ink)',
                    }}
                  >
                    للسلع الجديدة
                  </p>
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  color: 'var(--rz-ink)',
                  lineHeight: 2,
                }}
              >
                وأن هذه النسبة في ذمتي، والله على ما أقول شهيد.
              </p>
            </div>
            <div
              style={{
                background: 'rgba(var(--rz-primary-rgb), 0.06)',
                borderRadius: 12,
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'right',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--rz-primary)',
                }}
              >
                ملخص الإعلان:
              </h3>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--rz-ink)',
                  lineHeight: 1.7,
                }}
              >
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>السلعة:</strong> {formData.name}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>الفئة:</strong> {formData.category}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>السعر:</strong>{' '}
                  {Number(formData.price).toLocaleString()} ريال
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>الموقع:</strong> {formData.location}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>الحالة:</strong>{' '}
                  {formData.condition === 'new'
                    ? 'جديد'
                    : 'مستخدمة'}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>عدد الصور:</strong>{' '}
                  {formData.images.filter(Boolean).length}
                </p>
              </div>
            </div>
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '1.25rem',
                background:
                  'linear-gradient(145deg, rgba(var(--rz-primary-rgb), 0.08) 0%, rgba(var(--rz-ink-rgb), 0.3) 100%)',
                border: '1px solid rgba(var(--rz-ink-rgb), 0.10)',
                borderRadius: 14,
                textAlign: 'right',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--rz-primary)',
                }}
              >
                إقرار وتعهد رسمي قبل النشر
              </p>

              <p
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.88rem',
                  lineHeight: 2,
                  color: 'var(--rz-ink)',
                }}
              >
                أقرّ وأتعهد بأنه في حال بيع السلعة المُعلَن عنها عبر منصة
                «المسيمير | ALMUSAYMIR»، فإن نسبة الموقع تكون في ذمّتي وألتزم بسدادها
                فور إتمام البيع، وهي:
              </p>

              <ul
                style={{
                  margin: '0 0 0.75rem',
                  paddingRight: '1.25rem',
                  fontSize: '0.88rem',
                  lineHeight: 2,
                  color: 'var(--rz-ink)',
                  fontWeight: 700,
                }}
              >
                <li>
                  سلعة <strong>جديدة</strong>: نسبة الموقع{' '}
                  <strong style={{ color: 'var(--rz-primary)' }}>2%</strong> من قيمة البيع
                </li>
                <li>
                  سلعة <strong>مستعملة</strong>: نسبة الموقع{' '}
                  <strong style={{ color: 'var(--rz-primary)' }}>1%</strong> من قيمة البيع
                </li>
              </ul>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  lineHeight: 2,
                  color: 'var(--rz-primary)',
                  borderTop: '1px solid rgba(var(--rz-primary-rgb), 0.15)',
                                                paddingTop: '0.75rem',
                            }}
                          >
                            <strong>تنبيه وإبراء للذمة:</strong> <br />
                            سداد نسبة الموقع أمانةٌ لازمة في ذمتك؛ قال تعالى: 
                            <strong>{" {يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ} "}</strong>. 
                            وإن <strong>تجاهل سداد هذا الحق أو المماطلة فيه</strong> يُعد نكثاً للعهد، ومحقاً لبركة مالك وكسبك؛ 
                            فحقوق العباد لا تسقط إلا بالأداء. 
                            <strong>فاتقِ الله وأبرِئ ذمتك قبل أن تقف خصيماً يوم القيامة.</strong>
                          </p>
                        </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(var(--rz-primary-rgb), 0.12)',
                borderRadius: 12,
                textAlign: 'right',
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setSubmitError('');
                }}
                style={{
                  width: 22,
                  height: 22,
                  accentColor: 'var(--rz-ink)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--rz-ink)',
                  fontWeight: 600,
                  lineHeight: 2,
                }}
              >
                أقر أنا المعلن بأن كافة البيانات، المقاسات، والصور والفيديوهات
                المدرجة في الإعلان حقيقية وعلى مسؤوليتي الشخصية، كما أتعهد
                وألتزم شرعاً ونظاماً بدفع عمولة الموقع المستحقة فور بيع
                السلعة، وهي (1% للسلع المستخدمة) أو (2% للسلع الجديدة)، وأوافق
                على{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/terms');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--rz-primary)',
                    fontWeight: 800,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  شروط وأحكام استخدام المسيمير | ALMUSAYMIR
                </button>{' '}
                وبنود الوساطة الآمنة والمزادات.
              </span>
            </label>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={!agreed || submitting}
              style={{
                width: '100%',
                background: agreed
                  ? 'linear-gradient(135deg, var(--rz-primary) 0%, var(--rz-primary) 100%)'
                  : 'rgba(var(--rz-primary-rgb), 0.12)',
                border: 'none',
                borderRadius: 12,
                padding: '1rem',
                cursor:
                  agreed && !submitting
                    ? 'pointer'
                    : 'not-allowed',
                fontSize: '1rem',
                fontWeight: 700,
                color: agreed ? 'var(--rz-white)' : 'var(--rz-muted)',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="spin" />
                  <span>جاري رفع الصور ونشر الإعلان...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span>نشر الإعلان الآن</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdFormPage;