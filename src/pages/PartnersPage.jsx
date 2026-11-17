// src/pages/PartnersPage.jsx
// صفحة مستقلة: شركاؤنا — العنوان في المنتصف وعريض، والمحتوى نص للقراءة فقط.
// الإيميل والجوال فقط روابط تواصل (mailto / tel).
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { INFO_CONTACTS, INFO_PHONE_LOCAL, INFO_PHONE_TEL } from '../data/infoPages';

const PARTNERS = [
  { name: 'شركة الاتصالات السعودية (stc)', role: 'شريك البنية التحتية والاتصالات.' },
  { name: 'شركة علم (Elm)', role: 'شريك الحلول الرقمية والربط التقني.' },
  { name: 'شركة سبل (البريد السعودي)', role: 'شريك الخدمات اللوجستية والتوصيل.' },
  { name: 'شركة أمازون ويب سيرفيسز (AWS)', role: 'شريك الحوسبة السحابية واستضافة البيانات.' },
];

export default function PartnersPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="ip-page">
      <div className="ip-wrap">
        <button type="button" className="ip-back" onClick={() => navigate(-1)}>
          <ArrowRight size={16} /> رجوع
        </button>

        <header className="ip-header ip-header--center">
          <h1 className="ip-title">شركاؤنا</h1>
          <p className="ip-subtitle">شركاء النجاح والتشغيل</p>
        </header>

        <div className="ip-cards">
          <section className="ip-card">
            <p className="ip-text">
              نعتز بشراكاتنا الاستراتيجية والتقنية مع نخبة من المؤسسات الرائدة محلياً وعالمياً،
              والتي تسهم معنا في تقديم خدمات موثوقة ومستقرة بأعلى معايير الجودة لعملائنا:
            </p>
            <ul className="ip-list" style={{ marginTop: '0.5rem' }}>
              {PARTNERS.map((p) => (
                <li key={p.name}>
                  <strong>{p.name}</strong> – {p.role}
                </li>
              ))}
            </ul>
          </section>

          <section className="ip-card">
            <p className="ip-text">
              للتواصل بخصوص الشراكات الاستراتيجية والتجارية:
            </p>
            <div className="ip-contact">
              <p className="ip-contact-line">
                البريد:{' '}
                <a className="ip-link" href={`mailto:${INFO_CONTACTS.partners}`}>
                  {INFO_CONTACTS.partners}
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
