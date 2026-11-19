// src/components/RoyalHome/NovHomePage.jsx
// متجر المسيمير | ALMUSAYMIR — الصفحة الرئيسية (نسخة مرتبة واحترافية)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '../../data/brand';
import {
  Plus,
  Minus,
  X,
  Flame,
  Truck,
  BadgeCheck,
  Headphones,
  ChevronDown,
} from 'lucide-react';

import MarqueeBanner from './MarqueeBanner';
import CommentsSection from './CommentsSection';
import HomeOffersSlider from './HomeOffersSlider';
import Editable from '../Editable';
import useSiteContent from '../../store/useSiteContent';
import { MARQUEE_BANNERS, MARQUEE_BANNERS_2 } from './sectionsData';
import {
  INFO_CAREERS,
  INFO_PARTNERS,
  INFO_PRIVACY,
  INFO_CONTACTS,
  INFO_PHONE_LOCAL,
  INFO_PHONE_TEL,
  INFO_LEGAL_LINES,
} from '../../data/infoPages';
import '../../styles/NovHome.css';

const LOGO_SRC = BRAND.LOGO;

const HERO_SUB_DEFAULT =
  'متجرك الشامل — إلكترونيات وجوالات وأجهزة منزلية وأزياء وخدمات، بجودة وثقة وأسعار منافسة.';
const HARAJ_CTA_DEFAULT = 'موقع الحراج — اضغط هنا';
const COPYRIGHT_DEFAULT = 'جميع الحقوق محفوظة © 2026';
const TRUST_DEFAULTS = [
  { id: 'trust-ship', title: 'شحن سريع', sub: 'لكل المناطق', path: '/faq' },
  { id: 'trust-return', title: 'إرجاع 7 أيام', sub: 'استبدال واضح', path: '/faq' },
  { id: 'trust-support', title: 'دعم دائم', sub: 'تواصل بأي وقت', path: '/contact' },
];

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
  const siteLists = useSiteContent((s) => s.lists);
  const trustItems = Array.isArray(siteLists['home.trust']) && siteLists['home.trust'].length
    ? siteLists['home.trust']
    : TRUST_DEFAULTS;
  const [showAddHelp, setShowAddHelp] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);

  return (
    <div className="ch-root" dir="rtl">
      <div className="nov-top-logo">
        <img
          fetchPriority="high"
          src={LOGO_SRC}
          alt={`شعار ${BRAND.FULL}`}
          className="nov-hero-logo nov-hero-logo--top"
        />
      </div>

      <div className="nov-home">
        <Editable
          as="p"
          className="nov-lead-under-logo"
          contentKey="home.hero_sub"
          defaultValue={HERO_SUB_DEFAULT}
          multiline
        />

        <div className="home-marquees-sticky" style={{ position: 'relative', zIndex: 30, marginTop: 0 }}>
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

        <div className="nov-haraj-standalone">
          <button
            type="button"
            className="nov-btn nov-btn-haraj-gold"
            onClick={() => navigate('/haraj')}
          >
            <Flame size={15} strokeWidth={2.2} />
            <Editable contentKey="home.haraj_cta" defaultValue={HARAJ_CTA_DEFAULT} />
          </button>
        </div>

        <div id="offers" style={{ scrollMarginTop: '90px' }}>
          <HomeOffersSlider />
        </div>

        <div className="nov-comments-wrap">
          <CommentsSection />
        </div>

        <section className="rz-trust rz-trust--gold" aria-label={`لماذا ${BRAND.AR}`}>
          {trustItems.map((item, i) => {
            const Icon = [Truck, BadgeCheck, Headphones][i % 3];
            return (
              <button
                type="button"
                className="rz-trust-item"
                key={item.id || i}
                onClick={() => navigate(item.path || '/faq')}
              >
                <span className="rz-trust-ico"><Icon size={15} /></span>
                <div>
                  <Editable as="h4" contentKey={`home.trust.${i}.title`} defaultValue={item.title} />
                  <Editable as="p" contentKey={`home.trust.${i}.sub`} defaultValue={item.sub} />
                </div>
              </button>
            );
          })}
        </section>

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

        <footer className="rz-footer rz-footer--compact rz-footer--home-tight">
          <div className="rz-footer-inner">
            {/* الأقسام الثلاثة — نص قراءة فقط، محاذاة يمين، خط صغير عريض مع النص تحته */}
            <div className="rz-footer-info" aria-label="معلومات الموقع">
              <section className="rz-footer-info-block">
                <h4 className="rz-footer-info-title">{INFO_CAREERS.title}</h4>
                <p className="rz-footer-info-text">{INFO_CAREERS.lead}</p>
                <p className="rz-footer-info-text">{INFO_CAREERS.body}</p>
                <p className="rz-footer-info-text">{INFO_CAREERS.apply}</p>
                <p className="rz-footer-info-text">
                  <a className="rz-footer-info-link" href={`mailto:${INFO_CONTACTS.careers}`}>
                    {INFO_CONTACTS.careers}
                  </a>
                </p>
              </section>

              <section className="rz-footer-info-block">
                <h4 className="rz-footer-info-title">{INFO_PARTNERS.title}</h4>
                <p className="rz-footer-info-text">{INFO_PARTNERS.lead}</p>
                <p className="rz-footer-info-text">{INFO_PARTNERS.body}</p>
                <ul className="rz-footer-info-list">
                  {INFO_PARTNERS.list.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>

              <section className="rz-footer-info-block">
                <h4 className="rz-footer-info-title">{INFO_PRIVACY.title}</h4>
                <p className="rz-footer-info-text">{INFO_PRIVACY.lead}</p>
                <p className="rz-footer-info-text">{INFO_PRIVACY.intro}</p>
                {INFO_PRIVACY.sections.map((s) => (
                  <p className="rz-footer-info-text" key={s.title}>
                    <b>{s.title}:</b> {s.body}
                  </p>
                ))}
                <p className="rz-footer-info-text">
                  {INFO_PRIVACY.contact}{' '}
                  <a className="rz-footer-info-link" href={`mailto:${INFO_CONTACTS.privacy}`}>
                    {INFO_CONTACTS.privacy}
                  </a>
                  {' — '}
                  <a className="rz-footer-info-link" href={INFO_PHONE_TEL}>
                    {INFO_PHONE_LOCAL}
                  </a>
                </p>
              </section>
            </div>

            {/* النص القانوني — آخر شيء، محاذاة وسط، كل جملة في سطر */}
            <div className="rz-footer-bottom rz-footer-legal" aria-label="معلومات قانونية">
              {INFO_LEGAL_LINES.map((line) => (
                <span className="rz-footer-legal-line" key={line}>{line}</span>
              ))}
              <Editable
                contentKey="footer.copyright_line"
                defaultValue={COPYRIGHT_DEFAULT}
                className="rz-footer-legal-line"
              />
            </div>
          </div>
        </footer>
      </div>

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