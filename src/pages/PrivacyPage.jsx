// src/pages/PrivacyPage.jsx
// صفحة مستقلة: الخصوصية — نص للقراءة فقط (بلا أزرار تنقّل).
// الإيميل والجوال فقط روابط تواصل (mailto / tel).
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import {
  INFO_PRIVACY,
  INFO_CONTACTS,
  INFO_PHONE_LOCAL,
  INFO_PHONE_TEL,
  INFO_PHONE2_LOCAL,
  INFO_PHONE2_TEL,
} from '../data/infoPages';

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
            {INFO_PRIVACY.title}
          </h1>
          <p className="ip-subtitle">{INFO_PRIVACY.lead}</p>
        </header>

        <div className="ip-cards">
          <section className="ip-card">
            <p className="ip-text">{INFO_PRIVACY.intro}</p>
          </section>

          {INFO_PRIVACY.sections.map((s) => (
            <section className="ip-card ip-section" key={s.title}>
              <h2 className="ip-card-title">{s.title}</h2>
              <p className="ip-text">{s.body}</p>
            </section>
          ))}

          <section className="ip-card">
            <h2 className="ip-card-title">{INFO_PRIVACY.contact}</h2>
            <div className="ip-contact">
              <p className="ip-contact-line">
                <a className="ip-link" href={`mailto:${INFO_CONTACTS.privacy}`}>
                  {INFO_CONTACTS.privacy}
                </a>
              </p>
              <p className="ip-contact-line">
                الجوال / واتساب:{' '}
                <a className="ip-link" href={INFO_PHONE_TEL}>
                  {INFO_PHONE_LOCAL}
                </a>
              </p>
              <p className="ip-contact-line">
                أو{' '}
                <a className="ip-link" href={INFO_PHONE2_TEL}>
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
