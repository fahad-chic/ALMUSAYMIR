// src/pages/PrivacyPage.jsx
// صفحة مستقلة: الخصوصية — نص للقراءة فقط (بلا أزرار تنقّل).
// الإيميل والجوال فقط روابط تواصل (mailto / tel).
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { INFO_CONTACTS, INFO_PHONE_LOCAL, INFO_PHONE_TEL, INFO_PHONE2_LOCAL, INFO_PHONE2_TEL } from '../data/infoPages';

const SECTIONS = [
  {
    title: '1) جمع المعلومات',
    body:
      'نقوم بجمع البيانات الأساسية التي تقدمها طواعية عند التواصل معنا أو استخدام خدماتنا ' +
      '(مثل الاسم، البريد الإلكتروني، ورقم الجوال) لغرض تقديم الخدمة وتحسين تجربة الاستخدام فقط.',
  },
  {
    title: '2) حماية البيانات ومشاركتها',
    body:
      'تُحفظ جميع البيانات في خوادم آمنة ومشفّرة، ولا نقوم ببيع أو تأجير أو مشاركة معلوماتك ' +
      'الشخصية مع أي طرف ثالث إلا في حدود ما يتطلبه تنفيذ الخدمة أو بناءً على طلب رسمي من ' +
      'الجهات المختصة.',
  },
  {
    title: '3) ملفات تعريف الارتباط (Cookies)',
    body:
      'يستخدم الموقع ملفات تعريف الارتباط لتحسين سرعة التصفح وتخصيص المحتوى بما يتناسب مع ' +
      'تفضيلات المستخدم.',
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="ip-page">
      <div className="ip-wrap">
        <button type="button" className="ip-back" onClick={() => navigate(-1)}>
          <ArrowRight size={16} /> رجوع
        </button>

        <header className="ip-header">
          <h1 className="ip-title">
            <ShieldCheck size={18} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
            الخصوصية
          </h1>
          <p className="ip-subtitle">سياسة الخصوصية وحماية البيانات</p>
        </header>

        <div className="ip-cards">
          <section className="ip-card">
            <p className="ip-text">
              نلتزم بحماية خصوصية زوارنا وعملائنا والحفاظ على سرية بياناتهم الشخصية وفق نظام
              حماية البيانات الشخصية المعمول به في المملكة العربية السعودية.
            </p>
          </section>

          {SECTIONS.map((s) => (
            <section className="ip-card ip-section" key={s.title}>
              <h2 className="ip-card-title">{s.title}</h2>
              <p className="ip-text">{s.body}</p>
            </section>
          ))}

          <section className="ip-card">
            <h2 className="ip-card-title">4) التواصل والاستفسارات</h2>
            <p className="ip-text">
              في حال وجود أي استفسار حول سياسة الخصوصية أو رغبتك في تحديث بياناتك أو حذفها،
              يرجى التواصل معنا عبر:
            </p>
            <div className="ip-contact">
              <p className="ip-contact-line">
                البريد:{' '}
                <a className="ip-link" href={`mailto:${INFO_CONTACTS.privacy}`}>
                  {INFO_CONTACTS.privacy}
                </a>
              </p>
              <p className="ip-contact-line">
                الجوال / واتساب:{' '}
                <a className="ip-link" href={`tel:${INFO_PHONE_TEL}`}>
                  {INFO_PHONE_LOCAL}
                </a>
              </p>
              <p className="ip-contact-line">
                أو{' '}
                <a className="ip-link" href={`tel:${INFO_PHONE2_TEL}`}>
                  {INFO_PHONE2_LOCAL}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
