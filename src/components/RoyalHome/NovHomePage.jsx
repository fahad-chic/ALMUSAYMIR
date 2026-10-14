// src/components/RoyalHome/NovHomePage.jsx
// ROOZ NOVA — الصفحة الرئيسية بالتصميم الجديد كلياً
// نفس المسارات/الربط/البيانات، لكن بهيكل وتخطيط مختلف تماماً:
// هيرو عريض + شريط مزايا + شبكة أقسام تفاعلية + شريط حراج.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORE_HOME_PATH } from '../../data/royalMenu';
import {
  Crown,
  Gem,
  Mail,
  Smartphone,
  Plus,
  Minus,
  X,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Flame,
  Truck,
  ShieldCheck,
  BadgeCheck,
  Headphones,
  ChevronDown,
} from 'lucide-react';

import MarqueeBanner from './MarqueeBanner';
import CommentsSection from './CommentsSection';
import { MARQUEE_BANNERS, MARQUEE_BANNERS_2 } from './sectionsData';
import '../../styles/NovHome.css';

const LOGO_SRC = '/assets/logo.png';


const FAQ_ITEMS = [
  { q: 'كيف أتتبع طلبي؟', a: 'بعد تسجيل الدخول، افتح «ملفي الشخصي» ثم «طلباتي» لعرض حالة كل طلب ومراحل الشحن.' },
  { q: 'ما مدة الشحن؟', a: 'الشحن لجميع مناطق المملكة، ويستغرق عادة من 2 إلى 5 أيام عمل حسب المدينة.' },
  { q: 'هل يمكنني الإرجاع؟', a: 'نعم، يمكن الاستبدال أو الإرجاع خلال 7 أيام من الاستلام بشرط سلامة المنتج والتغليف.' },
  { q: 'كيف أضيف إعلاناً في الحراج؟', a: 'افتح «الحراج» ثم اضغط «أضف إعلانك»، وأكمل الخطوات وأرفق الصور ثم انشر.' },
  { q: 'كيف أتواصل مع الدعم؟', a: 'من صفحة «تواصل معنا» أو عبر واتساب وأرقام التواصل الظاهرة في الموقع.' },
  { q: 'هل الدفع آمن؟', a: 'نعم، جميع عمليات الدفع مشفّرة ومحمية وفق أعلى معايير الأمان المعتمدة.' },
  { q: 'هل يمكنني استبدال المقاس؟', a: 'نعم، الاستبدال متاح خلال 7 أيام من الاستلام بشرط أن يكون المنتج بحالته الأصلية.' },
  { q: 'كيف أثبت المتجر على هاتفي؟', a: 'من متصفح الجوال اختر «إضافة إلى الشاشة الرئيسية» ليظهر المتجر كتطبيق.' },
  { q: 'هل الشحن يشمل جميع المناطق؟', a: 'نعم، نوصل لجميع مناطق المملكة العربية السعودية.' },
  { q: 'ما طرق الدفع المتاحة؟', a: 'تتوفر عدة طرق دفع آمنة حسب ما يظهر عند إتمام الطلب.' },
];

const NovHomePage = () => {
  const navigate = useNavigate();
  const [showAddHelp, setShowAddHelp] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [discoverPicked, setDiscoverPicked] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('يرجى إدخال بريد صحيح');
      return;
    }
    setEmailStatus('تم الاشتراك بنجاح');
    setEmail('');
  };

  return (
    <div className="ch-root" dir="rtl">
      <div className="home-marquees-sticky">
        <MarqueeBanner
          banners={MARQUEE_BANNERS}
          editableKeys={['marquee1', 'marquee2', 'marquee3']}
        />
        <MarqueeBanner
          banners={MARQUEE_BANNERS_2}
          editableKeys={['marquee4', 'marquee5', 'marquee6']}
          label="عروض ROOZ"
        />
      </div>

      <div className="nov-home">
        {/* ===== الهيرو الملكي ===== */}
        <section className="nov-hero rz-hero">
          <div className="nov-hero-grid">
            <img
              fetchPriority="high"
              src={LOGO_SRC}
              alt="شعار أناقة ROOZ"
              className="nov-hero-logo"
            />
            <div>
              <span className="nov-hero-kicker">
                <Gem size={13} strokeWidth={2} />
                أناقة تفوق الخيال
              </span>
              <h1 className="nov-hero-title">أناقة تليق بكم</h1>
              <p className="nov-hero-sub">
                فساتين وعبايات وإكسسوارات فاخرة في المملكة العربية السعودية —
                فخامة، ثقة، وتفاصيل تُعتنى بها.
              </p>
              <div className="nov-hero-cta">
                <button
                  type="button"
                  className="nov-btn nov-btn-primary"
                  onClick={() => navigate(STORE_HOME_PATH)}
                >
                  <ShoppingBag size={16} />
                  تصفّح المتجر
                </button>
                <button
                  type="button"
                  className="nov-btn nov-btn-ghost"
                  onClick={() => navigate('/haraj')}
                >
                  <Flame size={16} />
                  موقع الحراج
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== نقاط الثقة ===== */}
        <section className="rz-trust" aria-label="لماذا أناقة ROOZ">
          <button type="button" className="rz-trust-item" onClick={() => navigate('/faq')}>
            <span className="rz-trust-ico"><Truck size={16} /></span>
            <h4>شحن سريع</h4>
            <p>لجميع مناطق المملكة</p>
          </button>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/terms')}>
            <span className="rz-trust-ico"><ShieldCheck size={16} /></span>
            <h4>دفع آمن</h4>
            <p>حماية وتشفير كامل</p>
          </button>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/faq')}>
            <span className="rz-trust-ico"><BadgeCheck size={16} /></span>
            <h4>إرجاع خلال 7 أيام</h4>
            <p>سياسة استبدال واضحة</p>
          </button>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/contact')}>
            <span className="rz-trust-ico"><Headphones size={16} /></span>
            <h4>دعم ومساندة</h4>
            <p>تواصل معنا في أي وقت</p>
          </button>
        </section>

        {/* ===== اكتشفي ROOZ (تفاعلي) ===== */}
        {!discoverPicked && (
          <section className="rz-discover" aria-label="اكتشفي ROOZ">
            <div className="rz-discover-head">
              <h2><Sparkles size={18} /> ماذا تبحثين عنه اليوم؟</h2>
              <button
                type="button"
                className="rz-discover-skip"
                onClick={() => setDiscoverPicked(true)}
                aria-label="إخفاء"
              >
                <X size={15} />
              </button>
            </div>
            <div className="rz-discover-grid">
              <button type="button" className="rz-discover-card" onClick={() => navigate(STORE_HOME_PATH)}>
                <ShoppingBag size={18} /><span>أريد التسوق</span>
              </button>
              <button type="button" className="rz-discover-card" onClick={() => navigate('/advertisements')}>
                <Flame size={18} /><span>أريد مشاهدة العروض</span>
              </button>
              <button type="button" className="rz-discover-card" onClick={() => navigate('/haraj')}>
                <StoreIcon size={18} /><span>أريد تصفح الحراج</span>
              </button>
              <button type="button" className="rz-discover-card" onClick={() => navigate('/haraj/post')}>
                <Plus size={18} /><span>أريد إضافة إعلان</span>
              </button>
              <button type="button" className="rz-discover-card" onClick={() => navigate('/settings')}>
                <Crown size={18} /><span>أريد الوصول إلى حسابي</span>
              </button>
            </div>
          </section>
        )}

        {/* ===== شريط المزايا ===== */}
        <section className="nov-features">
          <div className="nov-feature">
            <span className="nov-feature-ico">
              <Crown size={18} strokeWidth={1.9} />
            </span>
            <h4>لأنكم تستاهلون</h4>
            <p>مسابقة ذهب عيار 21 قريباً</p>
          </div>

          <div className="nov-feature">
            <span className="nov-feature-ico">
              <Smartphone size={18} strokeWidth={1.9} />
            </span>
            <h4>أضف للمتجر</h4>
            <p>ثبّته كتطبيق على هاتفك</p>
            <button
              type="button"
              className="nov-mini-btn"
              onClick={() => setShowAddHelp(true)}
            >
              <Plus size={12} />
              كيف؟
            </button>
          </div>

          <div className="nov-feature">
            <span className="nov-feature-ico">
              <Mail size={18} strokeWidth={1.9} />
            </span>
            <h4>عروضنا توصلك</h4>
            <p>اشترك ليصلك الجديد</p>
            <form onSubmit={handleSubscribe}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك"
              />
              <button type="submit" className="nov-mini-btn">
                اشترك
              </button>
            </form>
            {emailStatus && (
              <span
                className="nov-feature-status"
                style={{ color: emailStatus.includes('نجاح') ? '#1E293B' : '#1E293B' }}
              >
                {emailStatus}
              </span>
            )}
          </div>
        </section>

        {/* أقسام المتجر نُقلت إلى قائمة الثلاث شرطات في الترويسة لتقصير الصفحة */}

        {/* ===== شريط حراج ===== */}
        <section className="nov-haraj">
          <div>
            <h3>موقع الحراج الرسمي</h3>
            <p>بيع واشترِ بثقة داخل منصة أناقة ROOZ</p>
          </div>
          <button
            type="button"
            className="nov-btn nov-btn-primary"
            onClick={() => navigate('/haraj')}
          >
            <Flame size={16} />
            دخول الحراج
          </button>
        </section>

        <CommentsSection />

        {/* ===== الأسئلة الشائعة — طيّ كامل بزر + / − ===== */}
        <section className="rz-faq" aria-label="الأسئلة الشائعة">
          <button
            type="button"
            className="rz-faq-toggle"
            aria-expanded={faqSectionOpen}
            onClick={() => setFaqSectionOpen((v) => !v)}
          >
            <span className="rz-faq-toggle-title">الأسئلة الشائعة</span>
            <span className="rz-faq-toggle-badge">{FAQ_ITEMS.length} سؤال</span>
            <span className="rz-faq-toggle-plus" aria-hidden="true">
              {faqSectionOpen ? <Minus size={16} /> : <Plus size={16} />}
            </span>
          </button>
          {faqSectionOpen && (
            <div className="rz-faq-list">
              {FAQ_ITEMS.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div className="rz-faq-item" key={item.q}>
                    <button
                      type="button"
                      className="rz-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown size={16} className={isOpen ? 'is-open' : ''} />
                    </button>
                    {isOpen && <div className="rz-faq-a">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== الفوتر الملكي ===== */}
        <footer className="rz-footer rz-footer--compact" style={{ borderRadius: 16 }}>
          <div className="rz-footer-inner">
            <div className="rz-footer-top">
              <img src={LOGO_SRC} alt="شعار أناقة ROOZ" className="rz-footer-logo" loading="lazy" />
              <p className="rz-footer-tag">ROOZ — أناقة تفوق الخيال</p>
            </div>

            <div className="rz-footer-cols">
              <div className="rz-footer-col">
                <h4>متجر أناقةROOZ</h4>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate(STORE_HOME_PATH); }}>جميع المنتجات</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/branches'); }}>الكتالوجات</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/advertisements'); }}>العروض</a>
              </div>
              <div className="rz-footer-col">
                <h4>الحراج</h4>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/haraj'); }}>الحراج الرئيسي</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/haraj/post'); }}>أضف إعلانك</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/wanted-dress'); }}>الفستان المطلوب</a>
              </div>
              <div className="rz-footer-col">
                <h4>الحساب</h4>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/settings'); }}>ملفي الشخصي</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/chat'); }}>رسائلي</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/notifications'); }}>إشعاراتي</a>
              </div>
              <div className="rz-footer-col">
                <h4>المساعدة</h4>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/faq'); }}>الأسئلة الشائعة</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>تواصل معنا</a>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>شروط الاستخدام</a>
              </div>
            </div>

            <div className="rz-footer-bottom">
              جميع الحقوق محفوظة © 2026 أناقة ROOZ
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); navigate('/terms'); }}
                style={{ color: '#B8A47A', fontWeight: 800, textDecoration: 'underline' }}
              >
                شروط وأحكام الاستخدام
              </a>
            </div>
          </div>
        </footer>
      </div>

      {showAddHelp && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddHelp(false)}
          className="nov-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32,42,58,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6000,
            padding: 14,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg,#FFFFFF,#E8E2D6)',
              border: '1px solid rgba(30,41,59,0.4)',
              borderRadius: 18,
              padding: '1.2rem 1rem',
              maxWidth: 340,
              width: '100%',
              textAlign: 'right',
              boxShadow: '0 18px 45px rgba(32,42,58,0.35)',
              fontFamily: 'Tajawal,sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#202A3A' }}>
                كيف تضيف المتجر لشاشة هاتفك؟
              </h3>
              <button
                type="button"
                onClick={() => setShowAddHelp(false)}
                aria-label="إغلاق"
                style={{
                  background: 'rgba(32,42,58,0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  flex: '0 0 30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#1E293B',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <ol style={{ margin: 0, paddingRight: '1.1rem', fontSize: '0.82rem', color: '#202A3A', lineHeight: 1.7 }}>
              <li>افتح الموقع في المتصفح</li>
              <li>اضغط قائمة المشاركة أو القائمة</li>
              <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
              <li>أكد الإضافة</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowAddHelp(false)}
              className="nov-btn nov-btn-primary"
              style={{ marginTop: '0.9rem', width: '100%', justifyContent: 'center' }}
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovHomePage;