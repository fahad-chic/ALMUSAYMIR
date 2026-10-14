// src/components/RoyalHome/RoyalHomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Gem,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Store,
  Home,
} from 'lucide-react';

import MarqueeBanner from './MarqueeBanner';
import CommentsSection from './CommentsSection';
import { MARQUEE_BANNERS, MARQUEE_BANNERS_2, ROYAL_SECTIONS } from './sectionsData';
import { CONTACT_INFO } from '../../utils/constants';
import OwnerEditBadge from '../OwnerEditBadge';
import '../../styles/RoyalHome.css';
import '../../styles/ChicHome.css';

const LOGO_SRC = '/assets/logo.png';

const SECTION_ICONS = {
  dresses: Sparkles,
  'wedding-dresses': Crown,
  'girls-dresses': Sparkles,
  abayas: Store,
  bags: ShoppingBag,
  shoes: Sparkles,
  'used-dresses': Sparkles,
  perfumes: Sparkles,
  'golden-mothers': Crown,
  jewelry: Gem,
  'home-products': Home,
  haraj: ShoppingBag,
};

const GoldDivider = () => (
  <div className="ch-divider" aria-hidden="true" style={{ margin: '0.25rem 0' }}>
    <span className="ch-divider-line" />
    <Gem size={9} strokeWidth={1.8} className="ch-divider-gem" />
    <span className="ch-divider-line" />
  </div>
);

const RoyalHomePage = () => {
  const navigate = useNavigate();
  const [showAddHelp, setShowAddHelp] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [sectionsPanelOpen, setSectionsPanelOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const catalogSections = ROYAL_SECTIONS.filter((s) => !s.isAction);
  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('يرجى إدخال بريد صحيح');
      return;
    }
    setEmailStatus('تم الاشتراك بنجاح');
    setEmail('');
  };

  const openBranch = (branch) => {
    if (branch?.catalogId) {
      navigate(`/catalog/${branch.catalogId}`, {
        state: { branchId: branch.id, branchName: branch.name },
      });
    }
  };

  return (
    <div className="ch-root" dir="rtl">
      <div className="home-marquees-sticky">
        <style>{`
          .home-marquees-sticky {
            position: sticky;
            top: calc(var(--rooz-top-offset, 0px) + var(--rooz-header-h, 68px));
            z-index: 90;
            margin-bottom: 0.45rem;
          }
          @media (max-width: 900px) {
            .home-marquees-sticky {
              top: calc(var(--rooz-top-offset, 0px) + var(--rooz-header-h, 52px));
              margin-bottom: 0.35rem;
            }
          }
          .rh-icon-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.45rem;
            max-width: 920px;
            margin: 0.25rem auto 0;
            padding: 0 0.4rem;
          }
          .rh-icon-card {
            background: linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory));
            border: 1.5px solid rgba(var(--rz-primary-rgb), 0.42);
            border-radius: 14px;
            padding: 0.65rem 0.4rem;
            text-align: center;
            box-shadow: 0 3px 12px rgba(var(--rz-ink-rgb), 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            min-height: 88px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            overflow: hidden;
          }
          .rh-icon-card:active {
            transform: scale(0.97);
          }
          .rh-icon-card h4 {
            margin: 0;
            font-size: 0.78rem;
            font-weight: 800;
            color: var(--rz-ink);
            line-height: 1.3;
            word-break: break-word;
            overflow-wrap: anywhere;
            max-width: 100%;
            padding: 0 2px;
          }
          .rh-icon-card p {
            margin: 0;
            font-size: 0.62rem;
            color: var(--rz-muted);
            line-height: 1.35;
            word-break: break-word;
            overflow-wrap: anywhere;
            max-width: 100%;
            padding: 0 2px;
          }
          .rh-icon-btn {
            margin-top: 0.2rem;
            background: linear-gradient(135deg, var(--rz-primary), var(--rz-primary));
            color: var(--rz-ink);
            border: none;
            border-radius: 7px;
            padding: 0.22rem 0.45rem;
            font-size: 0.62rem;
            font-weight: 800;
            cursor: pointer;
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }
          @media (max-width: 520px) {
            .rh-icon-row {
              gap: 0.35rem;
            }
            .rh-icon-card {
              padding: 0.5rem 0.3rem;
              min-height: 82px;
              border-radius: 12px;
            }
            .rh-icon-card h4 { font-size: 0.7rem; }
            .rh-icon-card p { font-size: 0.58rem; }
          }
        `}</style>

        <MarqueeBanner
          banners={MARQUEE_BANNERS}
          editableKeys={['marquee1', 'marquee2', 'marquee3']}
        />

        <MarqueeBanner
          banners={MARQUEE_BANNERS_2}
          editableKeys={['marquee4', 'marquee5', 'marquee6']}
          label="عروض ROOZ"
          barBg="linear-gradient(90deg, var(--rz-ink) 0%, var(--rz-ink) 50%, var(--rz-ink) 100%)"
        />
      </div>

      <section
        className="ch-hero"
        style={{
          paddingTop: '0.25rem',
          paddingBottom: '0.1rem',
        }}
      >
        <div
          className="ch-hero-logo-wrap ch-rise"
          style={{
            marginTop: '0.45rem',
            marginBottom: '0.2rem',
          }}
        >
          <img
            fetchPriority="high"
            src={LOGO_SRC}
            alt="شعار أناقة ROOZ"
            className="ch-hero-logo"
            style={{
              width: '118px',
              height: 'auto',
            }}
          />
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <h1
            className="ch-hero-title ch-gold-gloss ch-rise"
            style={{
              color: 'var(--rz-ink)',
              fontSize: 'clamp(0.98rem, 3vw, 1.35rem)',
              fontWeight: 800,
              fontFamily: "'Tajawal', 'Amiri', serif",
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              border: '2.2px double var(--rz-primary)',
              borderRadius: '50px',
              padding: '3px 11px',
              boxShadow: 'inset 0 0 3px rgba(var(--rz-primary-rgb), 0.2), 0 1px 3px rgba(var(--rz-ink-rgb), 0.05)',
              backgroundColor: 'transparent',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ color: 'var(--rz-primary)', fontSize: '0.8em', fontWeight: 'bold' }}>®</span>
            أنــآقـة تليق بـكم
            <span style={{ color: 'var(--rz-primary)', fontSize: '0.8em', fontWeight: 'bold' }}>®</span>
          </h1>
        </div>
      </section>

      <GoldDivider />

      <div className="rh-icon-row">
        <div className="rh-icon-card">
          <Crown size={18} color="var(--rz-primary)" strokeWidth={1.7} />
          <h4>لأنكم تستاهلون</h4>
          <p>مسابقة ذهب عيار 21 قريباً</p>
        </div>

        <div className="rh-icon-card">
          <Smartphone size={18} color="var(--rz-primary)" strokeWidth={1.7} />
          <h4>أضف للمتجر</h4>
          <p>ثبّته كتطبيق على هاتفك</p>
          <button
            type="button"
            className="rh-icon-btn"
            onClick={() => setShowAddHelp(true)}
          >
            <Plus size={11} />
            كيف؟
          </button>
        </div>

        <div className="rh-icon-card">
          <Mail size={18} color="var(--rz-primary)" strokeWidth={1.7} />
          <h4>عروضنا توصلك</h4>
          <p>اشترك ليصلك الجديد</p>

          <form onSubmit={handleSubscribe} style={{ marginTop: 3, width: '100%' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="بريدك"
              style={{
                width: '100%',
                fontSize: '0.58rem',
                padding: '0.22rem 0.3rem',
                borderRadius: 6,
                border: '1px solid rgba(var(--rz-primary-rgb), 0.35)',
                background: 'var(--rz-white)',
                textAlign: 'center',
                marginBottom: 2,
                fontFamily: 'inherit'
              }}
            />

            <button
              type="submit"
              className="rh-icon-btn"
              style={{
                width: '100%',
                justifyContent: 'center'
              }}
            >
              اشترك
            </button>
          </form>

          {emailStatus && (
            <span
              style={{
                fontSize: '0.55rem',
                color: emailStatus.includes('نجاح') ? 'var(--rz-ink)' : 'var(--rz-primary)'
              }}
            >
              {emailStatus}
            </span>
          )}
        </div>
      </div>

      <GoldDivider />

      {/* ====== أقسام المتجر داخل زر واحد منسدل ====== */}
      <section className="rh-sections" style={{ padding: '0.35rem 0.65rem 0.45rem', maxWidth: 1100, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => setSectionsPanelOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0.7rem 0.9rem',
            borderRadius: 14,
            border: '1.5px solid var(--rz-primary)',
            background: 'linear-gradient(145deg, var(--rz-ivory), var(--rz-ivory))',
            color: 'var(--rz-ink)',
            fontWeight: 900,
            fontSize: '0.92rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(var(--rz-primary-rgb), 0.15)',
            marginBottom: sectionsPanelOpen ? 10 : 0,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            أقسام متجر أناقة ROOZ
            <span style={{
              background: 'var(--rz-primary)', color: 'var(--rz-white)', fontSize: '0.68rem',
              fontWeight: 900, padding: '2px 8px', borderRadius: 999,
            }}>{catalogSections.length}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
            {sectionsPanelOpen ? 'إخفاء' : 'عرض'}
            {sectionsPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>

        {sectionsPanelOpen && (
        <div className="rh-grid" style={{ gap: '0.55rem' }}>
          {catalogSections.map((section) => {
            const Icon = SECTION_ICONS[section.id] || Sparkles;
            const isOpen = expandedId === section.id;
            const branches = Array.isArray(section.branches) ? section.branches : [];
            return (
              <div
                key={section.id}
                className="rh-card"
                style={{ cursor: 'default' }}
              >
                <div className="rh-card-top">
                  <OwnerEditBadge to="/admin" label="تعديل" />
                  <div
                    className="rh-card-icon"
                    style={{ background: `linear-gradient(145deg, ${section.color || 'var(--rz-primary)'}, var(--rz-primary))` }}
                  >
                    <Icon size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="rh-card-name">{section.title}</h3>
                    <p className="rh-card-meta">{branches.length} فرع</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : section.id)}
                    aria-expanded={isOpen}
                    style={{
                      flex: '0 0 auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0.4rem 0.65rem',
                      borderRadius: 10,
                      border: '1.5px solid rgba(var(--rz-primary-rgb), 0.45)',
                      background: isOpen ? 'rgba(var(--rz-primary-rgb), 0.35)' : 'var(--rz-ivory)',
                      color: 'var(--rz-ink)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    الفروع
                  </button>
                </div>

                {isOpen && branches.length > 0 && (
                  <div className="rh-card-branches">
                    {branches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        className="rh-branch-btn"
                        onClick={() => openBranch(branch)}
                      >
                        <span>{branch.name}</span>
                        <ArrowLeft size={14} color="var(--rz-primary)" />
                      </button>
                    ))}
                  </div>
                )}

                {!isOpen && branches.length > 0 && (
                  <div className="rh-card-foot">
                    <span className="rh-card-cta">اضغط «الفروع» لعرض التخصصات</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      <GoldDivider />

      <CommentsSection />

      <GoldDivider />

      <footer
        className="ch-footer"
        style={{
          paddingTop: '0.6rem',
          paddingBottom: '0.5rem'
        }}
      >
        <div className="ch-footer-in" style={{ gap: '0.55rem' }}>
          <div>
            <div
              className="ch-footer-brand"
              style={{ marginBottom: '0.2rem' }}
            >
              <img
                src={LOGO_SRC}
                alt="شعار أناقة ROOZ"
                className="ch-footer-logo"
                loading="lazy"
                style={{ width: '32px' }}
              />
              <h3
                className="ch-footer-name ch-ink-gloss"
                style={{ fontSize: '0.82rem' }}
              >
                أناقة ROOZ
              </h3>
            </div>

            <p
              className="ch-footer-text"
              style={{
                fontSize: '0.68rem',
                lineHeight: 1.35,
                marginBottom: '0.25rem'
              }}
            >
              منصة راقية للإعلانات المميزة في المملكة — فخامة وثقة.
            </p>

            <div className="ch-social">
              <a
                href={CONTACT_INFO.SNAPCHAT}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="سناب شات"
              >
                <Ghost size={13} />
              </a>

              <a
                href={`https://wa.me/${CONTACT_INFO.PHONE_1}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="واتساب"
              >
                <Phone size={13} />
              </a>

              <a
                href={`mailto:${CONTACT_INFO.EMAIL}`}
                aria-label="البريد"
              >
                <Mail size={13} />
              </a>
            </div>
          </div>

          <div>
            <h4
              className="ch-footer-head"
              style={{
                fontSize: '0.75rem',
                marginBottom: '0.15rem'
              }}
            >
              تواصل معنا
            </h4>

            <div
              className="ch-footer-contact"
              style={{
                fontSize: '0.68rem',
                gap: '0.15rem'
              }}
            >
              <a href={`mailto:${CONTACT_INFO.EMAIL}`}>
                {CONTACT_INFO.EMAIL}
                <Mail size={10} className="ch-ci" />
              </a>

              <a href={`tel:+${CONTACT_INFO.PHONE_1}`}>
                +{CONTACT_INFO.PHONE_1}
                <Phone size={10} className="ch-ci" />
              </a>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.15rem'
                }}
              >
                المملكة العربية السعودية
                <MapPin size={10} className="ch-ci" />
              </span>
            </div>
          </div>
        </div>

        <div
          className="ch-footer-bottom"
          style={{
            fontSize: '0.62rem',
            marginTop: '0.4rem'
          }}
        >
          جميع الحقوق محفوظة © 2026 أناقة ROOZ
        </div>
      </footer>

      {showAddHelp && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddHelp(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(var(--rz-ink-rgb), 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6000,
            padding: 14
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg,var(--rz-ivory),var(--rz-ivory))',
              border: '1px solid rgba(var(--rz-primary-rgb), 0.45)',
              borderRadius: 16,
              padding: '1.2rem 1rem',
              maxWidth: 340,
              width: '100%',
              textAlign: 'right',
              boxShadow: '0 18px 45px rgba(var(--rz-ink-rgb), 0.35)',
              fontFamily: 'Tajawal,sans-serif'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: '0.6rem'
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--rz-ink)'
                }}
              >
                كيف تضيف المتجر لشاشة هاتفك؟
              </h3>

              <button
                type="button"
                onClick={() => setShowAddHelp(false)}
                aria-label="إغلاق"
                style={{
                  background: 'rgba(var(--rz-ink-rgb), 0.06)',
                  border: 'none',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  flex: '0 0 30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--rz-ink)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <ol
              style={{
                margin: 0,
                paddingRight: '1.1rem',
                fontSize: '0.82rem',
                color: 'var(--rz-ink)',
                lineHeight: 1.7
              }}
            >
              <li>افتح الموقع في المتصفح</li>
              <li>اضغط قائمة المشاركة أو القائمة</li>
              <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
              <li>أكد الإضافة</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowAddHelp(false)}
              style={{
                marginTop: '0.9rem',
                width: '100%',
                background: 'linear-gradient(135deg,var(--rz-primary),var(--rz-primary))',
                color: 'var(--rz-white)',
                border: 'none',
                borderRadius: 10,
                padding: '0.5rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Ghost = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />
    <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
  </svg>
);

export default RoyalHomePage;