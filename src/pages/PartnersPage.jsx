// src/pages/PartnersPage.jsx
// صفحة مستقلة: شركاؤنا — العنوان في المنتصف وعريض، والمحتوى نص للقراءة فقط.
// الإيميل والجوال فقط روابط تواصل (mailto / tel).
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  INFO_PARTNERS,
  INFO_CONTACTS,
  INFO_PHONE_LOCAL,
  INFO_PHONE_TEL,
} from '../data/infoPages';

export default function PartnersPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="ip-page">
      <div className="ip-wrap">
        <button type="button" className="ip-back" onClick={() => navigate(-1)}>
          <ArrowRight size={16} /> رجوع
        </button>

        <header className="ip-header ip-header--center">
          <h1 className="ip-title">{INFO_PARTNERS.title}</h1>
          <p className="ip-subtitle">{INFO_PARTNERS.lead}</p>
        </header>

        <div className="ip-cards">
          <section className="ip-card">
            <p className="ip-text">{INFO_PARTNERS.body}</p>
            <ul className="ip-list" style={{ marginTop: '0.5rem' }}>
              {INFO_PARTNERS.list.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="ip-card">
            <p className="ip-text">{INFO_PARTNERS.contact}</p>
            <div className="ip-contact">
              <p className="ip-contact-line">
                <a className="ip-link" href={`mailto:${INFO_CONTACTS.partners}`}>
                  {INFO_CONTACTS.partners}
                </a>
                {' — '}
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
