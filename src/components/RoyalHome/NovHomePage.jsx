// src/components/RoyalHome/NovHomePage.jsx
// متجر المسيمير | ALMUSAYMIR — الصفحة الرئيسية (نسخة مرتبة واحترافية)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORE_HOME_PATH } from '../../data/royalMenu';
import { BRAND } from '../../data/brand';
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
  BadgeCheck,
  Headphones,
  ChevronDown,
} from 'lucide-react';

import MarqueeBanner from './MarqueeBanner';
import CommentsSection from './CommentsSection';
import HomeOffersSlider from './HomeOffersSlider';
import { MARQUEE_BANNERS, MARQUEE_BANNERS_2 } from './sectionsData';
import '../../styles/NovHome.css';

const LOGO_SRC = BRAND.LOGO;

const FAQ_ITEMS = [
  { q: 'ما مدة الشحن؟', a: 'الشحن لجميع مناطق المملكة، ويستغرق عادة من 2 إلى 5 أيام عمل حسب المدينة.' },
  { q: 'هل يمكنني الإرجاع؟', a: 'نعم، يمكن الاستبدال أو الإرجاع خلال 7 أيام من الاستلام بشرط سلامة المنتج والتغليف.' },
  { q: 'كيف أضيف إعلاناً في الحراج؟', a: 'افتح «الحراج» ثم اضغط «أضف إعلانك»، وأكمل الخطوات وأرفق الصور ثم انشر.' },
  { q: 'كيف أتواصل مع الدعم؟', a: 'من صفحة «تواصل معنا» أو عبر واتساب وأرقام التواصل الظاهرة في الموقع.' },
  { q: 'هل يمكنني استبدال المقاس؟', a: 'نعم، الاستبدال متاح خلال 7 أيام من الاستلام بشرط أن يكون المنتج بحالته الأصلية.' },
  { q: 'كيف أثبت المتجر على هاتفي؟', a: 'من متصفح الجوال اختر «إضافة إلى الشاشة الرئيسية» ليظهر المتجر كتطبيق.' },
  { q: 'هل الشحن يشمل جميع المناطق؟', a: 'نعم، نوصل لجميع مناطق المملكة العربية السعودية.' },
];

const NovHomePage = () => {
  const navigate = useNavigate();
  const [showAddHelp, setShowAddHelp] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);
  const [footerLinksOpen, setFooterLinksOpen] = useState(false);

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
          label={`عروض ${BRAND.AR}`}
        />
      </div>

      <div className="nov-home">
        {/* ===== شريط العروض المتحرك — تحت الترويسة مباشرة ===== */}
        <HomeOffersSlider />

        {/* ===== الهيرو الملكي — مضغوط ومميز ===== */}
        <section className="nov-hero rz-hero nov-hero--compact">
          <div className="nov-hero-grid nov-hero-grid--compact">
            <img
              fetchPriority="high"
              src={LOGO_SRC}
              alt={`شعار ${BRAND.FULL}`}
              className="nov-hero-logo nov-hero-logo--lg"
            />
            <div>
              <h1 className="nov-hero-title">{BRAND.FULL}</h1>
              <p className="nov-hero-sub">
                متجرك الشامل — إلكترونيات وجوالات وأجهزة منزلية وأزياء
                وخدمات، بجودة وثقة وأسعار منافسة.
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
        <section className="rz-trust rz-trust--gold" aria-label={`لماذا ${BRAND.AR}`}>
          <button type="button" className="rz-trust-item" onClick={() => navigate('/faq')}>
            <span className="rz-trust-ico"><Truck size={15} /></span>
            <div>
              <h4>شحن سريع</h4>
              <p>لكل المناطق</p>
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

        {/* ===== التذييل الملكي — مختصر، بلا تكرار لروابط الترويسة =====
            روابط الأقسام/الحراج/الحساب موجودة في القائمة العلوية ودرج (+)،
            لذا تُطوى هنا داخل زر واحد بدل تكرارها في أربعة أعمدة. */}
        <footer className="rz-footer rz-footer--compact rz-footer--home-tight">
          <div className="rz-footer-inner">
            <div className="rz-footer-top">
              <img src={LOGO_SRC} alt={`شعار ${BRAND.FULL}`} className="rz-footer-logo" loading="lazy" />
              <p className="rz-footer-tag">{BRAND.FULL} — متجرك الشامل</p>
            </div>

            <div className="rz-footer-fold">
              <button
                type="button"
                className="rz-footer-fold-head"
                aria-expanded={footerLinksOpen}
                onClick={() => setFooterLinksOpen((v) => !v)}
              >
                <span>روابط سريعة</span>
                <span aria-hidden="true">
                  {footerLinksOpen ? <Minus size={15} /> : <Plus size={15} />}
                </span>
              </button>

              {footerLinksOpen && (
                <div className="rz-footer-fold-body">
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate(STORE_HOME_PATH); }}>جميع المنتجات</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/branches'); }}>كل الأقسام</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/advertisements'); }}>العروض</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/haraj'); }}>الحراج</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/haraj/post'); }}>أضف إعلانك</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/faq'); }}>الأسئلة الشائعة</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>تواصل معنا</a>
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>شروط الاستخدام</a>
                </div>
              )}
            </div>

            <div className="rz-footer-bottom rz-footer-bottom--center">
              جميع الحقوق محفوظة © 2026 {BRAND.FULL}
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
