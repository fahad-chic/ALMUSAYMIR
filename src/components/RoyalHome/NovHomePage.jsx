// src/components/RoyalHome/NovHomePage.jsx
// متجر المسيمير | ALMUSAYMIR — الصفحة الرئيسية (نسخة مرتبة واحترافية)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORE_HOME_PATH } from '../../data/royalMenu';
import { BRAND } from '../../data/brand';
import {
  Crown,
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
  Info,
  BriefcaseBusiness,
  Layers3,
  FileText,
  Users,
  Shield,
} from 'lucide-react';

import MarqueeBanner from './MarqueeBanner';
import CommentsSection from './CommentsSection';
import HomeOffersSlider from './HomeOffersSlider';
import Editable from '../Editable';
import useSiteContent from '../../store/useSiteContent';
import { MARQUEE_BANNERS, MARQUEE_BANNERS_2 } from './sectionsData';
import '../../styles/NovHome.css';

const LOGO_SRC = BRAND.LOGO;

const HERO_SUB_DEFAULT =
  'متجرك الشامل — إلكترونيات وجوالات وأجهزة منزلية وأزياء وخدمات، بجودة وثقة وأسعار منافسة.';
const HERO_TITLE_DEFAULT = BRAND.FULL;
const HARAJ_CTA_DEFAULT = 'موقع الحراج — اضغط هنا';
const FOOTER_TAG_DEFAULT = `${BRAND.FULL} — متجرك الشامل`;
const TRUST_DEFAULTS = [
  { id: 'trust-ship', title: 'شحن سريع', sub: 'لكل المناطق', path: '/faq' },
  { id: 'trust-return', title: 'إرجاع 7 أيام', sub: 'استبدال واضح', path: '/faq' },
  { id: 'trust-support', title: 'دعم دائم', sub: 'تواصل بأي وقت', path: '/contact' },
];

const FOOTER_LINKS = [
  {
    title: 'لماذا نحن',
    path: '/about',
    icon: Info,
    description:
      'نحن الوجهة الرائدة التي تجمع بين الابتكار والموثوقية في تقديم الحلول السوقية المتكاملة، حيث نلتزم بأعلى معايير الجودة والشفافية. نتميز ببيئة تقنية متطورة تضمن للمستخدمين والشركاء تجربة استثنائية وآمنة، مدعومة برؤية استراتيجية تواكب تطلعات السوق المحلي والعالمي وتصنع الفارق في تلبية احتياجاتكم.',
  },
  {
    title: 'وظائفنا',
    path: '/contact',
    icon: BriefcaseBusiness,
    description:
      'انضم إلى فريق عمل طموح يصنع المستقبل ويقود التغيير في قطاع التجارة الرقمية والخدمات. نحن نؤمن بأن رأس المال البشري هو ركيزة نجاحنا؛ لذا نوفر بيئة عمل محفزة، تنافسية، وحاضنة للإبداع والابتكار، مع تقديم فرص حقيقية للتطور المهني المستمر ومسارات وظيفية واعدة توافق تطلعات الكفاءات الوطنية والعالمية.',
  },
  {
    title: 'كل الأقسام',
    path: '/branches',
    icon: Layers3,
    description:
      'بوابة متكاملة مصممة خصيصاً لتلبية كافة تطلعاتكم واحتياجاتكم المتنوعة في مكان واحد. بفضل هيكلتنا المنظمة وتصنيفاتنا الدقيقة، نتيح لكم تنقلاً سلساً واستكشافاً فورياً لشريحة واسعة من القطاعات والخدمات، مما يضمن لكم الوصول إلى ما تبحثون عنه بكفاءة متناهية وسرعة فائقة.',
  },
  {
    title: 'الحراج',
    path: '/haraj',
    icon: StoreIcon,
    description:
      'المنصة التفاعلية الأكبر والسوق الرقمي الموثوق لعمليات البيع، الشراء، والمزايدة. نوفر مساحة حيوية وآمنة تتيح للمستخدمين عرض السلع والخدمات والتواصل المباشر مع المهتمين، مدعومة بأنظمة رقابية ذكية تضمن شفافية التعاملات وحفظ حقوق جميع الأطراف لتعزيز نمو وتدفق حركات البيع والشراء.',
  },
  {
    title: 'شروط الاستخدام',
    path: '/terms',
    icon: FileText,
    description:
      'تمثل هذه الشروط الإطار القانوني والتنظيمي الذي يضمن بيئة تعامل عادلة وآمنة لجميع رواد المنصة. نحرص من خلال هذه السياسات على توضيح الحقوق والالتزام بالأنظمة المرعية، مما يعزز الموثوقية ويضمن استمرارية تقديم خدماتنا بأعلى مستويات النزاهة والاحترافية.',
  },
  {
    title: 'شركاؤنا',
    path: '/branches',
    icon: Users,
    description:
      'نفخر ببناء تحالفات استراتيجية وثيقة تعزز ريادتنا في السوق، وتضم شبكة شركائنا النخبة 3 شركاء استراتيجيين داخل المملكة العربية السعودية: (شركة الاتصالات السعودية STC، مصرف الراجحي، وشركة علم)، الذين يساهمون في تحقيق مستهدفات رؤية 2030 وتعميق الأثر المحلي، بالإضافة إلى شريكين عالميين: (شركة Microsoft، وشركة Amazon Web Services - AWS) يرفدون عملياتنا بأحدث الخبرات والتقنيات الدولية لتقديم حلول بمعايير عالمية.',
  },
  {
    title: 'جميع المنتجات',
    path: STORE_HOME_PATH,
    icon: ShoppingBag,
    description:
      'تصفح مجموعتنا الشاملة والمنسقة بعناية لتلبي أرقى الأذواق والمتطلبات اليومية والتجارية. نضمن لكم تنوعاً فريداً وخيارات متعددة تجمع بين الجودة العالية والأسعار التنافسية، مستندين إلى شبكة توريد قوية تضمن توفر المنتجات ومطابقتها للمواصفات والمقاييس المعتمدة.',
  },
  {
    title: 'العروض',
    path: '/advertisements',
    icon: Sparkles,
    description:
      'فرصتكم الاستثمارية الكبرى للاستفادة من أقوى الخصومات والحملات الترويجية الحصرية. نلتزم بتقديم قيم مضافة حقيقية لعملائنا عبر باقات سعرية مدروسة ومزايا استثنائية متجددة، تمنحكم كفاءة الإنفاق وتجربة تسوق فريدة لا تُضاهى.',
  },
  {
    title: 'أضف إعلانك',
    path: '/haraj/post',
    icon: Plus,
    description:
      'المنصة المثالية لتوسيع نطاق أعمالك والوصول المباشر إلى جمهورك المستهدف. نضع بين يديك أدوات إعلانية متطورة وخطوات بسيطة تمكنك من صياغة ونشر إعلانك خلال ثوانٍ، لتضمن ظهوراً مميزاً يحقق أعلى معدلات التفاعل والانتشار لسلعك أو خدماتك.',
  },
  {
    title: 'تواصل معنا',
    path: '/contact',
    icon: Headphones,
    description:
      'فريق الدعم الفني وخدمة العملاء جاهز دائماً للوقوف على استفساراتكم وتقديم الدعم الفوري. نحن نضع عملائنا في مقدمة أولوياتنا، ونوفر قنوات اتصال متعددة ومباشرة لنضمن لكم تجربة مستخدم سلسة ومستدامة تلبي تطلعاتكم في أي وقت.',
  },
  {
    title: 'الخصوصية',
    path: '/terms',
    icon: Shield,
    description:
      'نلتزم بأعلى معايير الحماية والتشفير لضمان سرية وأمان بياناتكم الشخصية. تعد خصوصية المستخدم خطاً أحمر، ونطبق سياسات صارمة تتوافق مع الأنظمة التشريعية لحماية البيانات، مما يمنحكم الأمان الكامل والثقة المطلقة أثناء استخدام منصتنا والاستفادة من خدماتنا.',
  },
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
  const footerLinks = Array.isArray(siteLists['home.footer_links']) && siteLists['home.footer_links'].length
    ? siteLists['home.footer_links'].map((it, i) => ({
        ...(FOOTER_LINKS[i] || FOOTER_LINKS[0]),
        ...it,
      }))
    : FOOTER_LINKS;
  const [showAddHelp, setShowAddHelp] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);

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
              <Editable as="h1" className="nov-hero-title" contentKey="home.hero_title" defaultValue={HERO_TITLE_DEFAULT} />
              <Editable
                as="p"
                className="nov-hero-sub"
                contentKey="home.hero_sub"
                defaultValue={HERO_SUB_DEFAULT}
                multiline
                style={{ position: 'relative' }}
              />
              <div className="nov-hero-cta nov-hero-cta--side">
                <button
                  type="button"
                  className="nov-btn nov-btn-haraj-gold"
                  onClick={() => navigate('/haraj')}
                >
                  <Flame size={15} strokeWidth={2.2} />
                  <Editable contentKey="home.haraj_cta" defaultValue={HARAJ_CTA_DEFAULT} />
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
              <p className="rz-footer-tag" style={{ position: 'relative' }}>
                  <Editable contentKey="home.footer_tag" defaultValue={FOOTER_TAG_DEFAULT} />
              </p>
            </div>

            <button
              type="button"
              className="rz-footer-links-toggle"
              aria-expanded={footerOpen}
              onClick={() => setFooterOpen((value) => !value)}
            >
              <span><Info size={16} /> روابط الموقع</span>
              <ChevronDown size={17} className={footerOpen ? 'is-open' : ''} />
            </button>

            {footerOpen && (
              <div className="rz-footer-links-grid" aria-label="روابط ومعلومات الموقع">
                {footerLinks.map(({ title, path, icon: Icon }, i) => (
                  <button
                    type="button"
                    className="rz-footer-info-head"
                    key={title || i}
                    onClick={() => navigate(path)}
                    aria-label={`فتح صفحة ${title}`}
                  >
                    <span className="rz-footer-info-icon"><Icon size={16} /></span>
                    <Editable contentKey={`home.footer_links.${i}.title`} defaultValue={title} />
                    <span className="rz-footer-info-arrow" aria-hidden="true">←</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rz-footer-bottom rz-footer-bottom--center">
              <Editable
                contentKey="footer.copyright"
                defaultValue={`جميع الحقوق محفوظة © 2026 ${BRAND.FULL}`}
              />
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