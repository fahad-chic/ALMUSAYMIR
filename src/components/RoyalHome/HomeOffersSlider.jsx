// src/components/RoyalHome/HomeOffersSlider.jsx
// شريط عروض متحرك — 6 مواضع ثابتة.
// الحركة مستمرة بلا توقف: الصورة تدخل من اليمين، تتوقف 5 ثوانٍ في المنتصف،
// ثم تخرج يساراً وتبدأ التالية، وبعد السادسة تعود للأولى (حلقة لا نهائية).
// عند غياب صورة الموضع يظهر اسم الموقع بدلاً منها، وعند حذفها يعود الاسم.
//
// زر «إدارة العروض» يظهر لصاحب الموقع فقط (userRole === 'owner').
// الإخفاء عن غيره واجهي فقط؛ الحفظ في Firestore تحت settings/homeOffers.
// الصور تُضغط على الجهاز ولا تستخدم Firebase Storage.
import { useRef, useState } from 'react';
import { Pencil, X, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../../data/brand';
import useOffers, {
  OFFER_SLOTS,
  setOfferImage,
  clearOfferImage,
} from '../../store/useOffers';
import '../../styles/home-offers-slider.css';

/** نص الشريحة البديل عند غياب الصورة */
const FallbackText = () => (
  <div className="hos-fallback">
    <span className="hos-fallback-ar">{BRAND.AR}</span>
    <span className="hos-fallback-line" aria-hidden="true" />
    <span className="hos-fallback-en">{BRAND.EN}</span>
  </div>
);

const HomeOffersSlider = () => {
  const { userRole } = useAuth();
  const slots = useOffers((s) => s.slots);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(-1);
  const inputRefs = useRef([]);

  const isOwner = userRole === 'owner';

  const handlePick = async (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy >= 0) return;

    setBusy(index);
    try {
      await setOfferImage(index, file);
    } catch (err) {
      alert(err?.message || 'تعذر رفع الصورة');
    } finally {
      setBusy(-1);
    }
  };

  const handleClear = async (index) => {
    if (busy >= 0) return;
    setBusy(index);
    try {
      await clearOfferImage(index);
    } catch (err) {
      alert(err?.message || 'تعذر حذف الصورة');
    } finally {
      setBusy(-1);
    }
  };

  return (
    <div className="hos-wrap" dir="rtl">
      <div className="hos-frame">
        <div className="hos-stage">
          {Array.from({ length: OFFER_SLOTS }, (_, i) => {
            const slot = slots[i];
            const delay = `${-(OFFER_SLOTS - 1 - i) * 6.5}s`;
            return (
              <div
                key={i}
                className={`hos-slide${slot ? '' : ' hos-slide--text'}`}
                style={{ animationDelay: delay }}
                aria-hidden={i !== 0}
              >
                {slot ? (
                  <img
                    src={slot.url}
                    alt={`${BRAND.FULL} — عرض ${i + 1}`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                ) : (
                  <FallbackText />
                )}
              </div>
            );
          })}
        </div>

        <div className="hos-dots" aria-hidden="true">
          {Array.from({ length: OFFER_SLOTS }, (_, i) => (
            <span
              key={i}
              className="hos-dot"
              style={{ animationDelay: `${-(OFFER_SLOTS - 1 - i) * 6.5}s` }}
            />
          ))}
        </div>

        {isOwner && (
          <button
            type="button"
            className="hos-manage"
            onClick={() => setOpen(true)}
            aria-label="تعديل وإدارة العروض"
          >
            <Pencil size={12} strokeWidth={2.6} aria-hidden="true" />
            إدارة العروض
          </button>
        )}
      </div>

      {isOwner && open && (
        <div
          className="hos-modal-overlay"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="hos-modal"
            role="dialog"
            aria-modal="true"
            aria-label="إدارة صور العروض"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hos-modal-head">
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Pencil size={16} aria-hidden="true" />
                إدارة العروض — 6 مواضع
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
              >
                <X size={17} />
              </button>
            </div>

            <p className="hos-modal-hint">
              اختر صورة من جهازك لأي موضع فتُضغط وتظهر في الشريط بدل اسم الموقع،
              بلا رسوم وبدون Firebase Storage. حذف الصورة يعيد اسم الموقع.
              الحد قبل الضغط 5 ميجابايت.
            </p>

            <div className="hos-grid">
              {Array.from({ length: OFFER_SLOTS }, (_, i) => {
                const slot = slots[i];
                const isBusy = busy === i;
                return (
                  <div className="hos-slot" key={i}>
                    <div className="hos-slot-preview">
                      <span className="hos-slot-num">{i + 1}</span>
                      {slot ? (
                        <img src={slot.url} alt={`عرض ${i + 1}`} loading="lazy" />
                      ) : (
                        <span className="hos-slot-empty">{BRAND.EN}</span>
                      )}
                    </div>

                    <div className="hos-slot-actions">
                      <label className={isBusy ? 'is-busy' : ''}>
                        <Upload size={13} aria-hidden="true" />
                        {isBusy ? '...' : slot ? 'استبدال' : 'إضافة'}
                        <input
                          ref={(el) => {
                            inputRefs.current[i] = el;
                          }}
                          type="file"
                          accept="image/*"
                          disabled={isBusy}
                          onChange={(e) => handlePick(i, e)}
                        />
                      </label>

                      {slot && (
                        <button
                          type="button"
                          className="hos-danger"
                          onClick={() => handleClear(i)}
                          disabled={isBusy}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeOffersSlider;
