// src/pages/CareersPage.jsx
// صفحة مستقلة: وظائفنا — نص للقراءة فقط (بلا أزرار تنقّل).
// الإيميل والجوال فقط روابط تواصل (mailto / tel).
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { INFO_CONTACTS, INFO_PHONE_LOCAL, INFO_PHONE_TEL } from '../data/infoPages';

export default function CareersPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="ip-page">
      <div className="ip-wrap">
        <button type="button" className="ip-back" onClick={() => navigate(-1)}>
          <ArrowRight size={16} /> رجوع
        </button>

        <header className="ip-header">
          <h1 className="ip-title">
            <BriefcaseBusiness size={18} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
            وظائفنا
          </h1>
          <p className="ip-subtitle">انضم إلى فريق عملنا</p>
        </header>

        <div className="ip-cards">
          <section className="ip-card">
            <p className="ip-text">
              نبحث دائماً عن الكفاءات الطموحة والمواهب المبدعة التي تسعى لصناعة أثر حقيقي في
              بيئة عمل احترافية ومحفزة. نؤمن بأن استثمارنا الحقيقي يبدأ من فريق العمل، ونحرص
              على توفير فرص التطور المهني والنمو المستمر وفق أعلى المعايير.
            </p>
          </section>

          <section className="ip-card">
            <h2 className="ip-card-title">آلية التقديم</h2>
            <p className="ip-text">
              للتقديم على الفرص الوظيفية المتاحة أو الانضمام إلى قاعدة بيانات الكفاءات لدينا،
              يرجى إرسال السيرة الذاتية مع ذكر المسمى الوظيفي في عنوان الرسالة إلى:
            </p>
            <div className="ip-contact">
              <p className="ip-contact-line">
                البريد:{' '}
                <a className="ip-link" href={`mailto:${INFO_CONTACTS.careers}`}>
                  {INFO_CONTACTS.careers}
                </a>
              </p>
              <p className="ip-contact-line">
                الجوال:{' '}
                <a className="ip-link" href={`tel:${INFO_PHONE_TEL}`}>
                  {INFO_PHONE_LOCAL}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
