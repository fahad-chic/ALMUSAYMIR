import React, { useEffect, useState } from 'react';
import { Languages, Moon, Sun } from 'lucide-react';

const AppearanceControls = () => {
  const [dark, setDark] = useState(() => localStorage.getItem('almusaymir_theme') === 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('almusaymir_language') || 'ar');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.body.classList.toggle('alm-dark', dark);
    localStorage.setItem('almusaymir_theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const isEnglish = language === 'en';
    document.documentElement.lang = isEnglish ? 'en' : 'ar';
    document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
    document.body.dataset.language = language;
    localStorage.setItem('almusaymir_language', language);
  }, [language]);

  return (
    <div className="alm-appearance-controls" aria-label="إعدادات المظهر واللغة">
      <button type="button" onClick={() => setDark((value) => !value)} aria-label={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'} title={dark ? 'الوضع النهاري' : 'الوضع الليلي'}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
        <span>{dark ? 'نهاري' : 'ليلي'}</span>
      </button>
      <button type="button" onClick={() => setLanguage((value) => (value === 'ar' ? 'en' : 'ar'))} aria-label="تغيير اللغة">
        <Languages size={16} />
        <span>{language === 'ar' ? 'English' : 'العربية'}</span>
      </button>
      <style>{`
        .alm-appearance-controls {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-inline: 10px;
        }
        .alm-appearance-controls button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 32px;
          padding: 5px 9px;
          border: 1px solid rgba(var(--rz-primary-rgb), .28);
          border-radius: 999px;
          background: rgba(var(--rz-white-rgb), .72);
          color: var(--rz-ink);
          font: 800 11px Tajawal, sans-serif;
          cursor: pointer;
        }
        .alm-appearance-controls button:hover {
          background: rgba(var(--rz-primary-rgb), .12);
          transform: translateY(-1px);
        }
        @media (max-width: 720px) {
          .alm-appearance-controls { margin: 6px 0; }
          .alm-appearance-controls span { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AppearanceControls;
