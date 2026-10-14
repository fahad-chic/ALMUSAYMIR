// src/pages/TermsPage.jsx
// صفحة مستقلة: شروط وأحكام استخدام منصة "أناقة ROOZ"
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ScrollText, ShieldCheck } from 'lucide-react';

const TERMS_SECTIONS = [
  {
    title: '1. شروط الحساب والتوثيق الإلزامي',
    items: [
      'يشترط على كافة الزوار التسجيل الإلزامي في الموقع عبر البريد الإلكتروني والتحقق بواسطة رمز (OTP) لضمان جدية وموثوقية الحسابات.',
      'يمنح الموقع وسام "مستخدم موثق" للحسابات التي تجتاز التحقق من الهوية، وهو إجراء اختياري لرفع موثوقية الإعلانات.',
    ],
  },
  {
    title: '2. طبيعة الخدمات والأدوات الذكية',
    items: [
      'متجر أناقة ROOZ: يوفر الموقع فساتين حفلات وأعراس (جديدة ومستخدمة بعناية) يتم بيعها وشحنها مباشرة من إدارة الموقع.',
      'منصة الحراج والإعلانات: يوفر الموقع مساحة وميزات ذكية (مثل المزادات، طلب فستان، حاسبة المقاسات، والقوائم المنسدلة للتصنيفات) للمستخدمين لعرض فساتينهم الخاصة، وهنا يقتصر دور الموقع على كوننا منصة وسيطة.',
    ],
  },
  {
    title: '3. رسوم وعمولات الموقع (سياسة البيع)',
    intro:
      'يلتزم المعلن/البائع بدفع العمولات المستحقة للموقع فور إتمام عملية البيع عبر المنصة كالتالي:',
    items: [
      'رسوم السلع المستخدمة: يتم احتساب رسوم بنسبة 1% من إجمالي قيمة الفستان عند إعلان سلعة مستخدمة وتم بيعها بنجاح.',
      'رسوم السلع الجديدة: يتم احتساب رسوم بنسبة 2% من إجمالي قيمة الفستان عند إعلان سلعة جديدة وتم بيعها بنجاح.',
      'تعتبر هذه الرسوم أمانة في ذمة البائع ويجب سدادها فوراً، وفي حال استخدام خدمة "الوساطة الآمنة" يتم استقطاعها تلقائياً قبل تحويل الأموال للبائع.',
    ],
  },
  {
    title: '4. سياسة خدمة "الوساطة الآمنة"',
    items: [
      'يتيح الموقع خدمة الوساطة لحماية الأموال؛ حيث يحتفظ الموقع بمبلغ الشراء حتى تأكيد المشتري استلام الفستان ومطابقته للمواصفات خلال 24 ساعة من الاستلام، وفي حال تبين وجود غش يحق للمشتري استرداد ماله وفق مراجعة الإدارة.',
    ],
  },
  {
    title: '5. سياسة النشر والإعلانات (قسم الحراج)',
    items: [
      'يجب أن تكون الفساتين المعروضة حقيقية ومملوكة للمعلن، ويمنع نشر صور وهمية، ويلتزم المعلن بوصف حالة الفستان عبر حاسبة المقاسات والفيديو بدقة.',
      'يحق لإدارة الموقع حذف أي إعلان أو إلغاء مزاد يثبت عدم جديته أو وجود شكاوى احتيال ضده دون سابق إنذار.',
    ],
  },
  {
    title: '6. إخلاء المسؤولية',
    items: [
      'إدارة "أناقة ROOZ" لا تتحمل مسؤولية جودة أو مطابقة الفساتين المعروضة في "قسم الحراج" للواقع خارج إطار المعاملات الموثقة بخدمة الوساطة الآمنة، ويتحمل الأطراف مسؤولية الاتفاق المباشر.',
    ],
  },
  {
    title: '7. حقوق الملكية الفكرية وتعديل الشروط',
    items: [
      'كافة محتويات الموقع من تصاميم، أدوات ذكية، نصوص، وشعار "أناقة ROOZ" الرسمي هي حقوق محفوظة للموقع. ويحق للإدارة تعديل الشروط في أي وقت وتصبح نافذة فور نشرها.',
    ],
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      className="terms-page"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, var(--rz-ivory) 0%, var(--rz-ivory) 55%, var(--rz-ivory) 100%)',
        fontFamily: 'Tajawal, sans-serif',
        color: 'var(--rz-ink)',
        padding: '1.25rem',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--rz-white)',
            border: '1px solid var(--rz-ivory)',
            borderRadius: 12,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--rz-ink)',
            marginBottom: 18,
            fontFamily: 'inherit',
          }}
        >
          <ArrowRight size={18} /> رجوع
        </button>

        <header
          style={{
            background: 'var(--rz-white)',
            border: '1px solid var(--rz-ivory)',
            borderRadius: 22,
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            boxShadow: '0 10px 34px rgba(var(--rz-ink-rgb), 0.08)',
          }}
        >
          <div
            style={{
              width: 66,
              height: 66,
              margin: '0 auto 12px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, var(--rz-primary), var(--rz-primary))',
              boxShadow: '0 10px 24px rgba(var(--rz-primary-rgb), 0.30)',
            }}
          >
            <ScrollText size={30} color="var(--rz-ivory)" />
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(1.3rem, 4vw, 1.85rem)', fontWeight: 900, color: 'var(--rz-primary)' }}>
            شروط وأحكام استخدام منصة &quot;أناقة ROOZ&quot;
          </h1>
          <p style={{ margin: 0, lineHeight: 2, color: 'var(--rz-muted)', fontWeight: 600 }}>
            مرحباً بكم في &quot;أناقة ROOZ&quot;. تُطبق هذه الشروط والأحكام على كافة
            المستخدمين والزوار للموقع. استخدامك للموقع يعني موافقتك الكاملة على
            هذه الشروط.
          </p>
        </header>

        <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          {TERMS_SECTIONS.map((section) => (
            <section
              key={section.title}
              style={{
                background: 'var(--rz-white)',
                border: '1px solid var(--rz-ivory)',
                borderRadius: 18,
                padding: '1.25rem 1.35rem',
                boxShadow: '0 6px 22px rgba(var(--rz-ink-rgb), 0.06)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: 'var(--rz-primary)',
                  borderInlineStart: '4px solid var(--rz-primary)',
                  paddingInlineStart: 10,
                }}
              >
                {section.title}
              </h2>
              {section.intro && (
                <p style={{ margin: '0 0 10px', lineHeight: 2, fontWeight: 600 }}>
                  {section.intro}
                </p>
              )}
              <ul style={{ margin: 0, paddingInlineStart: '1.25rem', display: 'grid', gap: 10 }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ lineHeight: 2, fontSize: '0.95rem' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer
          style={{
            marginTop: 16,
            marginBottom: 30,
            background: 'rgba(var(--rz-primary-rgb), 0.06)',
            border: '1px solid rgba(var(--rz-primary-rgb), 0.16)',
            borderRadius: 16,
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={20} color="var(--rz-primary)" />
          <span>للاستفسارات أو الشكاوى، يرجى التواصل مع فريق دعم &quot;أناقة ROOZ&quot;.</span>
        </footer>
      </div>
    </div>
  );
}
