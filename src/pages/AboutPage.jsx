import React from 'react';
import {
  Star,
  HeartHandshake,
  Award,
  TrendingUp,
  Users,
  Building2,
  Handshake,
  ShieldCheck,
  Briefcase,
  CheckCircle,
  Target,
  Wallet,
  Globe,
  MapPin,
  CreditCard
} from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="about-container" dir="rtl">
      <style>{`
        .about-container {
          padding: 0.6rem 0.75rem 1.25rem;
          max-width: 720px;
          margin: 0 auto;
          min-height: calc(100vh - 70px);
          font-family: 'Tajawal', sans-serif;
          text-align: right;
        }

        .about-header {
          text-align: right;
          margin-bottom: 0.85rem;
          padding: 0.9rem 1rem;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--rz-white) 0%, var(--rz-ivory) 100%);
          border: 1px solid rgba(var(--rz-ink-rgb), 0.08);
          box-shadow: 0 4px 14px rgba(var(--rz-ink-rgb), 0.05);
        }

        .about-title {
          font-size: 1.35rem;
          font-weight: 900;
          color: var(--rz-ink);
          margin: 0 0 0.3rem;
          line-height: 1.3;
        }

        .about-subtitle {
          font-size: 0.8rem;
          color: var(--rz-muted);
          line-height: 1.55;
          margin: 0;
        }

        .section-title {
          font-size: 0.95rem;
          font-weight: 900;
          color: var(--rz-primary);
          margin: 0.85rem 0 0.4rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .about-card {
          background: var(--rz-white);
          border: 1px solid rgba(var(--rz-ink-rgb), 0.07);
          border-radius: 12px;
          padding: 0.7rem 0.85rem;
          box-shadow: 0 3px 12px rgba(var(--rz-ink-rgb), 0.04);
          margin-bottom: 0.45rem;
        }

        .about-card-content {
          color: var(--rz-muted);
          line-height: 1.55;
          font-size: 0.8rem;
          text-align: right;
        }

        .about-card-content ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .about-card-content li {
          position: relative;
          padding-right: 0.85rem;
          margin-bottom: 0.2rem;
        }

        .about-card-content li::before {
          content: '•';
          position: absolute;
          right: 0;
          color: var(--rz-primary);
          font-weight: 900;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.45rem;
          margin-top: 0.35rem;
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-box {
          background: var(--rz-ivory);
          border: 1px solid rgba(var(--rz-ink-rgb), 0.06);
          padding: 0.55rem 0.4rem;
          border-radius: 10px;
          text-align: center;
        }

        .stat-number {
          font-size: 1.15rem;
          font-weight: 900;
          color: var(--rz-primary);
          line-height: 1.2;
        }

        .stat-label {
          color: var(--rz-muted);
          font-size: 0.7rem;
          margin-top: 0.1rem;
        }

        .partners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.4rem;
          margin-top: 0.35rem;
        }

        .partner-box {
          background: var(--rz-ivory);
          border-radius: 9px;
          border: 1px solid rgba(var(--rz-ink-rgb), 0.06);
          padding: 0.5rem 0.6rem;
        }

        .partner-box--featured {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, rgba(var(--rz-primary-rgb), 0.12), var(--rz-white));
          border: 1px solid rgba(var(--rz-primary-rgb), 0.34);
          box-shadow: 0 6px 18px rgba(var(--rz-primary-rgb), 0.09);
        }

        .partner-box--featured .partner-name {
          color: var(--rz-primary);
          font-size: 0.86rem;
        }

        .partner-name {
          color: var(--rz-ink);
          font-weight: 800;
          font-size: 0.78rem;
        }

        .partner-type {
          color: var(--rz-muted);
          font-size: 0.7rem;
        }

        .security-card {
          border-color: rgba(var(--rz-primary-rgb), 0.25);
          background: linear-gradient(145deg, var(--rz-white), var(--rz-ivory));
        }

        .security-card p {
          margin: 0 0 0.55rem;
          color: var(--rz-ink);
          font-size: 0.8rem;
          line-height: 1.75;
        }

        .security-card .security-lead {
          font-weight: 800;
          color: var(--rz-primary);
        }

        .security-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 0.7rem;
          padding: 0.7rem 0.75rem;
          border-radius: 12px;
          background: rgba(var(--rz-primary-rgb), 0.1);
          border: 1px solid rgba(var(--rz-primary-rgb), 0.28);
          color: var(--rz-ink);
          font-size: 0.78rem;
          font-weight: 800;
          line-height: 1.7;
        }

        .security-notice svg {
          flex: 0 0 auto;
          color: var(--rz-primary);
          margin-top: 0.15rem;
        }

        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.45rem;
        }

        @media (max-width: 520px) {
          .two-col {
            grid-template-columns: 1fr;
          }
        }

        .footer {
          margin-top: 1rem;
          padding: 0.75rem 0.9rem;
          background: var(--rz-white);
          border-radius: 12px;
          border: 1px solid rgba(var(--rz-ink-rgb), 0.07);
          text-align: center;
          color: var(--rz-muted);
          font-size: 0.75rem;
        }

        .footer strong {
          font-size: 0.82rem;
          font-weight: 900;
          color: var(--rz-primary);
        }

        .owner-name {
          font-size: 0.88rem;
          font-weight: 900;
          color: var(--rz-primary);
          margin: 0.25rem 0 0.15rem;
        }
      `}</style>

      {/* هيدر مضغوط */}
      <div className="about-header">
        <h1 className="about-title">منصة المسيمير | ALMUSAYMIR</h1>
        <p className="about-subtitle">
          منصة سعودية فاخرة تجمع بين التجارة الإلكترونية والحراج والخدمات الرقمية، بهوية ملكية وإشراف نخبة من المختصين لتقديم تجربة راقية وآمنة.
        </p>
      </div>

      {/* الرؤية + الرسالة + القيم في صف مضغوط */}
      <h2 className="section-title"><Star size={16} /> رؤيتنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          أن نكون المنصة السعودية الأولى في التجارة الإلكترونية والحراج، بتجربة موثوقة وسهلة وأسعار منافسة لكل عميل في المملكة.
        </div>
      </div>

      <h2 className="section-title"><HeartHandshake size={16} /> رسالتنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          تقديم خدمات ومنتجات رقمية وواقعية بجودة عالية، مع دعم فني مستمر وشفافية كاملة واحترام تام لعملائنا.
        </div>
      </div>

      <h2 className="section-title"><Award size={16} /> قيمنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          <ul>
            <li>المصداقية</li>
            <li>الجودة</li>
            <li>الأمان</li>
            <li>السرعة</li>
            <li>خدمة العملاء</li>
          </ul>
        </div>
      </div>

      {/* لماذا تختارنا */}
      <h2 className="section-title"><TrendingUp size={16} /> لماذا تختار المسيمير | ALMUSAYMIR؟</h2>
      <div className="about-card">
        <div className="about-card-content">
          <ul>
            <li>متجر شامل يغطي كل احتياجاتك</li>
            <li>دعم فني مباشر عبر الواتساب</li>
            <li>خدمات رقمية احترافية</li>
            <li>حراج متكامل ومنظم</li>
            <li>إشراف نخبة من المختصين</li>
          </ul>
        </div>
      </div>

      {/* أرقامنا */}
      <h2 className="section-title"><Users size={16} /> أرقامنا</h2>
      <div className="about-card">
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-number">10K+</div>
            <div className="stat-label">عملاء</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">3K+</div>
            <div className="stat-label">إعلانات</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">500+</div>
            <div className="stat-label">خدمات رقمية</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">50+</div>
            <div className="stat-label">فريق عمل</div>
          </div>
        </div>
      </div>

      {/* الفريق */}
      <h2 className="section-title"><Building2 size={16} /> فريق العمل</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{ color: 'var(--rz-primary)', display: 'block', marginBottom: '0.25rem' }}>تحت إشراف نخبة من المختصين:</strong>
          <ul>
            <li>مدير المنصة</li>
            <li>فريق خدمة العملاء</li>
            <li>فريق البرمجة والتطوير</li>
            <li>فريق التصميم والهوية</li>
            <li>فريق التسويق</li>
            <li>فريق إدارة الحراج</li>
            <li>فريق الخدمات الرقمية</li>
            <li>فريق إدارة الفروع</li>
          </ul>
        </div>
      </div>

      {/* الشركاء */}
      <h2 className="section-title"><Handshake size={16} /> شركاؤنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{ color: 'var(--rz-primary)', display: 'block', marginBottom: '0.25rem' }}>شركاء سعوديون:</strong>
          <div className="partners-grid">
            <div className="partner-box partner-box--featured">
              <div className="partner-name">مكتب الدولي للمحاماة والاستشارة</div>
              <div className="partner-type">شريك قانوني واستشارات</div>
            </div>
            <div className="partner-box">
              <div className="partner-name">شركة النخبة للتقنية</div>
              <div className="partner-type">دعم تقني</div>
            </div>
            <div className="partner-box">
              <div className="partner-name">مؤسسة رؤية المستقبل</div>
              <div className="partner-type">تسويق إلكتروني</div>
            </div>
            <div className="partner-box">
              <div className="partner-name">شركة حفر الباطن الرقمية</div>
              <div className="partner-type">خدمات برمجية</div>
            </div>
          </div>

          <strong style={{ color: 'var(--rz-primary)', display: 'block', margin: '0.55rem 0 0.25rem' }}>شركاء عالميون:</strong>
          <div className="partners-grid">
            <div className="partner-box">
              <div className="partner-name">Global Soft Ltd</div>
              <div className="partner-type">حلول تقنية</div>
            </div>
            <div className="partner-box">
              <div className="partner-name">Bright Web Solutions</div>
              <div className="partner-type">تصميم مواقع</div>
            </div>
            <div className="partner-box">
              <div className="partner-name">Digital Bridge Co</div>
              <div className="partner-type">خدمات سحابية</div>
            </div>
          </div>
        </div>
      </div>

      {/* أمن البيانات والرقابة النظامية */}
      <h2 className="section-title"><ShieldCheck size={16} /> أمن وتشفير البيانات</h2>
      <div className="about-card security-card">
        <div className="about-card-content">
          <p className="security-lead">
            نحرص على حماية بيانات ورسائل المستخدمين والزوار باستخدام بروتوكولات أمنية
            موثوقة ومعايير صارمة لحماية المعلومات أثناء النقل والتخزين.
          </p>
          <p>
            نعمل على منع أي وصول غير مصرح به، ولا نشارك بياناتكم مع أي طرف خارجي
            إلا عند الحاجة النظامية أو وفقًا للأنظمة والتشريعات القانونية المعمول بها.
            نلتزم بالحفاظ على سرية معلوماتكم وتعزيز أمان الموقع بشكل مستمر.
          </p>
          <div className="security-notice" role="note">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              الموقع مراقب لحماية المستخدمين ومكافحة الاحتيال والإساءة.
              نرجو الالتزام بالأنظمة، وخافوا الله في أموال الناس وحقوقهم.
              أي إساءة أو محاولة احتيال قد تُوثّق وتُحال للجهات المختصة وفق النظام.
            </span>
          </div>
        </div>
      </div>

      {/* سياسات مختصرة في عمودين */}
      <div className="two-col">
        <div>
          <h2 className="section-title"><ShieldCheck size={16} /> سياسة الاستخدام</h2>
          <div className="about-card">
            <div className="about-card-content">
              <ul>
                <li>الالتزام بالقوانين السعودية</li>
                <li>عدم نشر محتوى مخالف</li>
                <li>احترام خصوصية المستخدمين</li>
              </ul>
            </div>
          </div>
        </div>
        <div>
          <h2 className="section-title"><Briefcase size={16} /> شروط البيع</h2>
          <div className="about-card">
            <div className="about-card-content">
              <ul>
                <li>مطابقة المنتج للوصف</li>
                <li>منع المنتجات الممنوعة</li>
                <li>الالتزام بسياسة الاسترجاع</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* الوسطاء + الشهادات + الأهداف */}
      <h2 className="section-title"><Users size={16} /> الوسطاء المعتمدون</h2>
      <div className="about-card">
        <div className="about-card-content">
          <ul>
            <li>وسيط رقم 1 – معتمد</li>
            <li>وسيط رقم 2 – معتمد</li>
            <li>وسيط رقم 3 – معتمد</li>
          </ul>
        </div>
      </div>

      <h2 className="section-title"><CheckCircle size={16} /> شهادات العملاء</h2>
      <div className="about-card">
        <div className="about-card-content">
          <ul>
            <li>«خدمة ممتازة وسرعة في الرد»</li>
            <li>«أفضل منصة تعاملت معها»</li>
            <li>«دعم فني سريع ومحترم»</li>
          </ul>
        </div>
      </div>

      <h2 className="section-title"><Target size={16} /> أهداف 2026</h2>
      <div className="about-card">
        <div className="about-card-content">
          <ul>
            <li>إطلاق تطبيق المسيمير</li>
            <li>توسيع الخدمات الرقمية</li>
            <li>إضافة نظام وسطاء متكامل</li>
            <li>افتتاح فروع جديدة</li>
          </ul>
        </div>
      </div>

      {/* طرق الدفع + خريطة الموقع */}
      <div className="two-col">
        <div>
          <h2 className="section-title"><Wallet size={16} /> طرق الدفع</h2>
          <div className="about-card">
            <div className="about-card-content">
              <ul>
                <li>التحويل البنكي</li>
                <li>المحافظ الرقمية</li>
                <li>الدفع عند الاستلام (لبعض الخدمات)</li>
              </ul>
            </div>
          </div>
        </div>
        <div>
          <h2 className="section-title"><Globe size={16} /> خريطة الموقع</h2>
          <div className="about-card">
            <div className="about-card-content">
              <ul>
                <li>الرئيسية · الحراج</li>
                <li>الخدمات الرقمية</li>
                <li>تسجيل الدخول · إنشاء حساب</li>
                <li>لوحة التحكم · من نحن · اتصل بنا</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* الموقع + الحسابات البنكية */}
      <h2 className="section-title"><MapPin size={16} /> موقعنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{ color: 'var(--rz-primary)' }}>المقر الرئيسي:</strong> حفر الباطن – طريق الملك فهد
        </div>
      </div>

      <h2 className="section-title"><CreditCard size={16} /> حساباتنا البنكية</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{ color: 'var(--rz-primary)' }}>الراجحي:</strong> ************
          <br />
          <strong style={{ color: 'var(--rz-primary)' }}>الأهلي:</strong> ************
          <br />
          <strong style={{ color: 'var(--rz-primary)' }}>الإنماء:</strong> ************
        </div>
      </div>

      {/* الفوتر */}
      <div className="footer">
        <strong>جميع الحقوق محفوظة © {new Date().getFullYear()}</strong>
        <p className="owner-name">صاحب موقع المسيمير | ALMUSAYMIR: الأستاذ / فهد بن حمود بن فهد الشمري</p>
        <p style={{ margin: 0 }}>المقر: حفر الباطن – طريق الملك فهد</p>
      </div>
    </div>
  );
};

export default AboutPage;
