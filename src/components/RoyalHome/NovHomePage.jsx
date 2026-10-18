// src/components/RoyalHome/NovHomePage.jsx
// ROOZ NOVA — الصفحة الرئيسية (نسخة مرتبة واحترافية)
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
      {/* شريطا التنبيهات — مرفوعان قليلاً لعدم تغطية الشريطين الثابتين */}
      <div className="home-marquees-sticky" style={{ position: 'relative', zIndex: 30, marginTop: '2px' }}>
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
        {/* ===== الهيرو الملكي — مضغوط ومميز ===== */}
        <section className="nov-hero rz-hero nov-hero--compact">
          <div className="nov-hero-grid nov-hero-grid--compact">
            <img
              fetchPriority="high"
              src={LOGO_SRC}
              alt="شعار أناقة ROOZ"
              className="nov-hero-logo nov-hero-logo--lg"
            />
            <div>
              <h1 className="nov-hero-title">أناقة تليق بكم</h1>
              <p className="nov-hero-sub">
                فساتين وعبايات وإكسسوارات فاخرة في المملكة العربية السعودية —
                فخامة، ثقة، وتفاصيل تُعتنى بها.
              </p>
              <div className="nov-hero-cta nov-hero-cta--side">
                <button
                  type="button"
                  className="nov-btn nov-btn-haraj-gold"
                  onClick={() => navigate('/haraj')}
                >
                  <Flame size={15} strokeWidth={2.2} />
                  موقع الحراج — اضغط هنا
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== آراء العملاء (مرفوعة للأعلى ومكبّرة قليلاً) ===== */}
        <div className="nov-comments-wrap">
          <CommentsSection />
        </div>

        {/* ===== نقاط الثقة — صفين × اثنين، خلفية ذهبية فاتحة ===== */}
        <section className="rz-trust rz-trust--gold" aria-label="لماذا أناقة ROOZ">
          <button type="button" className="rz-trust-item" onClick={() => navigate('/faq')}>
            <span className="rz-trust-ico"><Truck size={15} /></span>
            <div>
              <h4>شحن سريع</h4>
              <p>لكل المناطق</p>
            </div>
          </button>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/terms')}>
            <span className="rz-trust-ico"><ShieldCheck size={15} /></span>
            <div>
              <h4>دفع آمن</h4>
              <p>حماية كاملة</p>
            </div>
          </button>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/faq')}>
            <span className="rz-trust-ico"><BadgeCheck size={15} /></span>
            <div>
              <h4>إرجاع 7 أيام</h4>
              <p>استبدال واضح</p>
            </div>
          </button>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/contact')}>
            <span className="rz-trust-ico"><Headphones size={15} /></span>
            <div>
              <h4>دعم دائم</h4>
              <p>تواصل بأي وقت</p>
            </div>
          </button>
        </section>

        {/* ===== الأسئلة الشائعة ===== */}
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
        <footer className="rz-footer rz-footer--compact rz-footer--home-tight" style={{ borderRadius: 16 }}>
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
                style={{ color: 'var(--rz-gold)', fontWeight: 800, textDecoration: 'underline' }}
              >
                شروط وأحكام الاستخدام
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* مودال «كيف أثبت التطبيق؟» — يبقى متاحاً من القائمة */}
      {showAddHelp && (
        <div className="nov-modal-overlay" onClick={() => setShowAddHelp(false)} role="presentation">
          <div className="nov-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button type="button" className="nov-modal-close" onClick={() => setShowAddHelp(false)} aria-label="إغلاق">
              <X size={18} />
            </button>
            <h3>كيف تضيف المتجر كتطبيق؟</h3>
            <ol>
              <li>افتح الموقع من متصفح الجوال (Safari أو Chrome).</li>
              <li>اضغط زر المشاركة أو القائمة ⋮.</li>
              <li>اختر «إضافة إلى الشاشة الرئيسية».</li>
              <li>أكد الاسم ثم أضف — سيظهر أيقونة المتجر مثل التطبيقات.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovHomePage;
