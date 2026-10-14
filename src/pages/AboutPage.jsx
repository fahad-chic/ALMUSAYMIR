import React from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Users,
  Award,
  MessageCircle,
  ShieldCheck,
  Star,
  TrendingUp,
  HeartHandshake,
  Building2,
  CreditCard,
  CheckCircle,
  Briefcase,
  Handshake,
  Target,
  HelpCircle,
  Wallet,
  Globe
} from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="about-container">
      <style>{`
        .about-container {
          padding: 0.7rem;
          max-width: 1180px;
          margin: 0 auto;
          min-height: calc(100vh - 70px);
          font-family: 'Tajawal', sans-serif;
        }

        .about-header {
          text-align: center;
          margin-bottom: 1rem;
          padding: 1.4rem 1rem;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--rz-white) 0%, var(--rz-ivory) 100%);
          border: 1px solid rgba(var(--rz-ink-rgb), 0.10);
          box-shadow: 0 6px 18px rgba(var(--rz-ink-rgb), 0.06);
        }

        .about-title {
          font-size: 1.7rem;
          font-weight: 900;
          color: var(--rz-ink);
          margin-bottom: 0.4rem;
        }

        .about-subtitle {
          font-size: 0.85rem;
          color: var(--rz-muted);
          max-width: 650px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--rz-primary);
          margin: 1.2rem 0 0.7rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .about-card {
          background: var(--rz-white);
          border: 1px solid rgba(var(--rz-ink-rgb), 0.08);
          border-radius: 14px;
          padding: 1rem;
          box-shadow: 0 6px 18px rgba(var(--rz-ink-rgb), 0.06);
          margin-bottom: 0.8rem;
        }

        .about-card-title {
          font-size: 1rem;
          font-weight: 800;
          color: var(--rz-ink);
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .about-card-content {
          color: var(--rz-muted);
          line-height: 1.6;
          font-size: 0.82rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.7rem;
          margin-top: 0.7rem;
        }

        .stat-box {
          background: var(--rz-ivory);
          border: 1px solid rgba(var(--rz-ink-rgb), 0.08);
          padding: 0.8rem;
          border-radius: 12px;
          text-align: center;
        }

        .stat-number {
          font-size: 1.4rem;
          font-weight: 900;
          color: var(--rz-primary);
        }

        .stat-label {
          color: var(--rz-muted);
          font-size: 0.75rem;
        }

        .partners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.6rem;
          margin-top: 0.6rem;
        }

        .partner-box {
          background: var(--rz-ivory);
          border-radius: 10px;
          border: 1px solid rgba(var(--rz-ink-rgb), 0.08);
          padding: 0.7rem;
        }

        .partner-name {
          color: var(--rz-ink);
          font-weight: 800;
          font-size: 0.85rem;
        }

        .partner-type {
          color: var(--rz-muted);
          font-size: 0.75rem;
        }

        .footer {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--rz-white);
          border-radius: 14px;
          border: 1px solid rgba(var(--rz-ink-rgb), 0.08);
          text-align: center;
          color: var(--rz-muted);
          font-size: 0.8rem;
        }

        .footer strong {
          font-size: 0.9rem;
          font-weight: 900;
          color: var(--rz-primary);
        }

        .owner-name {
          font-size: 1rem;
          font-weight: 900;
          color: var(--rz-primary);
          margin-top: 0.4rem;
        }
      `}</style>

      {/* هيدر */}
      <div className="about-header">
        <h1 className="about-title"> منصة أناقة ROOZ</h1>
        <div className="about-subtitle">
          منصة سعودية فاخرة تجمع بين التجارة الإلكترونية، الحراج، والخدمات الرقمية،  
          تعمل بهوية ملكية وبإشراف نخبة من المختصين لتقديم تجربة راقية وآمنة لعملائنا.
        </div>
      </div>

      {/* رؤيتنا */}
      <h2 className="section-title"><Star /> رؤيتنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          أن نكون المنصة السعودية الأولى في مجال الأناقة، التجارة الإلكترونية، والحراج،  
          مع تقديم تجربة فاخرة، موثوقة، وسهلة الاستخدام لكل عميل في المملكة.
        </div>
      </div>

      {/* رسالتنا */}
      <h2 className="section-title"><HeartHandshake /> رسالتنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          تقديم خدمات ومنتجات رقمية وواقعية بجودة عالية،  
          مع دعم فني مستمر، وشفافية كاملة في التعامل، واحترام كامل لعملائنا.
        </div>
      </div>

      {/* قيمنا */}
      <h2 className="section-title"><Award /> قيمنا</h2>
      <div className="about-card">
        <div className="about-card-content">
           المصداقية  
          <br/> الجودة  
          <br/> الأمان  
          <br/> السرعة  
          <br/> خدمة العملاء  
        </div>
      </div>

      {/* لماذا تختارنا */}
      <h2 className="section-title"><TrendingUp /> لماذا تختار أناقة ROOZ؟</h2>
      <div className="about-card">
        <div className="about-card-content">
          • منصة سعودية بهوية ملكية  
          <br/>• دعم فني مباشر عبر الواتساب  
          <br/>• خدمات رقمية احترافية  
          <br/>• حراج متكامل ومنظم  
          <br/>• إشراف نخبة من المختصين  
        </div>
      </div>

      {/* أرقامنا */}
      <h2 className="section-title"><Users /> أرقامنا</h2>
      <div className="about-card">
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-number">+10K</div>
            <div className="stat-label">عملاء</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">+3K</div>
            <div className="stat-label">إعلانات</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">+500</div>
            <div className="stat-label">خدمات رقمية</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">+50</div>
            <div className="stat-label">فريق عمل</div>
          </div>
        </div>
      </div>

      {/* وظائفنا */}
      <h2 className="section-title"><Building2 /> وظائفنا وفريق العمل</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{color:'var(--rz-primary)'}}>تحت إشراف نخبة من المختصين:</strong>
          <br/>• مدير المنصة  
          <br/>• فريق خدمة العملاء  
          <br/>• فريق البرمجة والتطوير  
          <br/>• فريق التصميم والهوية  
          <br/>• فريق التسويق  
          <br/>• فريق إدارة الحراج  
          <br/>• فريق الخدمات الرقمية  
          <br/>• فريق إدارة الفروع  
        </div>
      </div>

      {/* شركاؤنا */}
      <h2 className="section-title"><Handshake /> شركاؤنا</h2>
      <div className="about-card">
        <div className="about-card-content">

          <strong style={{color:'var(--rz-primary)'}}>شركاء سعوديون:</strong>
          <div className="partners-grid">
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

          <strong style={{color:'var(--rz-primary)', marginTop:'0.7rem', display:'block'}}>شركاء عالميون:</strong>
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

      {/* سياسة الاستخدام */}
      <h2 className="section-title"><ShieldCheck /> سياسة الاستخدام</h2>
      <div className="about-card">
        <div className="about-card-content">
          • الالتزام بالقوانين السعودية  
          <br/>• عدم نشر محتوى مخالف أو مسيء  
          <br/>• عدم استخدام المنصة في أي نشاط غير قانوني  
          <br/>• احترام خصوصية المستخدمين  
        </div>
      </div>

      {/* شروط البيع */}
      <h2 className="section-title"><Briefcase /> شروط البيع</h2>
      <div className="about-card">
        <div className="about-card-content">
          • يجب أن تكون المنتجات مطابقة للوصف  
          <br/>• يمنع بيع المنتجات الممنوعة نظاميًا  
          <br/>• يجب الالتزام بسياسة الاسترجاع  
          <br/>• يجب أن يكون البائع موثوقًا  
        </div>
      </div>

      {/* الوسطاء المعتمدين */}
      <h2 className="section-title"><Users /> الوسطاء المعتمدين</h2>
      <div className="about-card">
        <div className="about-card-content">
          • وسيط رقم 1 – معتمد  
          <br/>• وسيط رقم 2 – معتمد  
          <br/>• وسيط رقم 3 – معتمد  
        </div>
      </div>

      {/* شهادات العملاء */}
      <h2 className="section-title"><CheckCircle /> شهادات العملاء</h2>
      <div className="about-card">
        <div className="about-card-content">
          “خدمة ممتازة وسرعة في الرد”  
          <br/>“أفضل منصة تعاملت معها”  
          <br/>“دعم فني سريع ومحترم”  
        </div>
      </div>

      {/* أهداف 2026 */}
      <h2 className="section-title"><Target /> أهداف 2026</h2>
      <div className="about-card">
        <div className="about-card-content">
          • إطلاق تطبيق ROOZ  
          <br/>• توسيع الخدمات الرقمية  
          <br/>• إضافة نظام وسطاء متكامل  
          <br/>• افتتاح فروع جديدة  
        </div>
      </div>

      {/* طرق الدفع */}
      <h2 className="section-title"><Wallet /> طرق الدفع</h2>
      <div className="about-card">
        <div className="about-card-content">
          • التحويل البنكي  
          <br/>• الدفع عبر المحافظ الرقمية  
          <br/>• الدفع عند الاستلام (لبعض الخدمات)  
        </div>
      </div>

      {/* خريطة الموقع */}
      <h2 className="section-title"><Globe /> خريطة الموقع</h2>
      <div className="about-card">
        <div className="about-card-content">
          • الرئيسية  
          <br/>• الحراج  
          <br/>• الخدمات الرقمية  
          <br/>• تسجيل الدخول  
          <br/>• إنشاء حساب  
          <br/>• لوحة التحكم  
          <br/>• من نحن  
          <br/>• اتصل بنا  
        </div>
      </div>

      {/* موقعنا */}
      <h2 className="section-title"><MapPin /> موقعنا</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{color:'var(--rz-primary)'}}>المقر الرئيسي:</strong>
          <br/>حفر الباطن – طريق الملك فهد  
        </div>
      </div>

      {/* حساباتنا البنكية */}
      <h2 className="section-title"><CreditCard /> حساباتنا البنكية</h2>
      <div className="about-card">
        <div className="about-card-content">
          <strong style={{color:'var(--rz-primary)'}}>حساب الراجحي:</strong>
          <br/>************  
          <br/><br/>
          <strong style={{color:'var(--rz-primary)'}}>حساب الأهلي:</strong>
          <br/>************  
          <br/><br/>
          <strong style={{color:'var(--rz-primary)'}}>حساب الإنماء:</strong>
          <br/>************  
        </div>
      </div>

      {/* الفوتر */}
      <div className="footer">
        <strong>جميع الحقوق محفوظة © {new Date().getFullYear()}</strong>
        <p className="owner-name">صاحب موقع أناقة ROOZ: الأستاذ / فهد بن حمود بن فهد الشمري</p>
        <p>المقر: حفر الباطن – طريق الملك فهد</p>
      </div>
    </div>
  );
};

export default AboutPage;
