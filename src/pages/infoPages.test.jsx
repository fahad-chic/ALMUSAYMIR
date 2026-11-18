// اختبار صفحات المحتوى المستقلة: وظائفنا / شركاؤنا / الخصوصية.
// شرط أساسي: المحتوى نصّي للقراءة فقط — لا أزرار ولا روابط تنقّل داخلياً.
// الاستثناء الوحيد: روابط التواصل (mailto: / tel:).
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import CareersPage from './CareersPage';
import PartnersPage from './PartnersPage';
import PrivacyPage from './PrivacyPage';

const renderPage = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// كل رابط يجب أن يكون mailto أو tel فقط (لا رابط تنقّل داخلي).
const assertOnlyContactLinks = (container) => {
  const anchors = Array.from(container.querySelectorAll('a'));
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    expect(href.startsWith('mailto:') || href.startsWith('tel:')).toBe(true);
  }
  return anchors;
};

describe('CareersPage (/careers)', () => {
  it('يعرض العنوان والعنوان الفرعي', () => {
    renderPage(<CareersPage />);
    expect(screen.getByText('وظائفنا')).toBeInTheDocument();
    expect(screen.getByText('انضم إلى فريق عملنا')).toBeInTheDocument();
  });

  it('يعرض بريد التوظيف كرابط mailto', () => {
    const { container } = renderPage(<CareersPage />);
    const mail = container.querySelector('a[href="mailto:kal6667222@gmail.com"]');
    expect(mail).not.toBeNull();
    expect(mail.textContent).toContain('kal6667222@gmail.com');
  });

  it('يعرض الجوال كرابط tel بصيغة محلية 05xxxxxxxx', () => {
    const { container } = renderPage(<CareersPage />);
    const tel = container.querySelector('a[href^="tel:"]');
    expect(tel).not.toBeNull();
    expect(tel.getAttribute('href')).toBe('tel:+966536667222');
    expect(tel.textContent).toBe('0536667222');
  });

  it('لا يحتوي أي روابط تنقّل داخلية (عدا زر الرجوع)', () => {
    const { container } = renderPage(<CareersPage />);
    assertOnlyContactLinks(container);
  });
});

describe('PartnersPage (/partners)', () => {
  it('يعرض العنوان والعنوان الفرعي', () => {
    renderPage(<PartnersPage />);
    expect(screen.getByText('شركاؤنا')).toBeInTheDocument();
    expect(screen.getByText('شركاء النجاح والتشغيل')).toBeInTheDocument();
  });

  it('يعرض الشركاء الأربعة', () => {
    renderPage(<PartnersPage />);
    expect(screen.getByText(/stc/)).toBeInTheDocument();
    expect(screen.getByText(/Elm/)).toBeInTheDocument();
    expect(screen.getByText(/سبل/)).toBeInTheDocument();
    expect(screen.getByText(/AWS/)).toBeInTheDocument();
  });

  it('بريد الشراكات رابط mailto فقط', () => {
    const { container } = renderPage(<PartnersPage />);
    expect(
      container.querySelector('a[href="mailto:kal6667222@gmail.com"]')
    ).not.toBeNull();
    assertOnlyContactLinks(container);
  });
});

describe('PrivacyPage (/privacy)', () => {
  it('يعرض العنوان والعنوان الفرعي', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByText('الخصوصية')).toBeInTheDocument();
    expect(screen.getByText('سياسة الخصوصية وحماية البيانات')).toBeInTheDocument();
  });

  it('يعرض الأقسام الأربعة', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByText(/1\) جمع المعلومات/)).toBeInTheDocument();
    expect(screen.getByText(/2\) حماية البيانات ومشاركتها/)).toBeInTheDocument();
    expect(screen.getByText(/3\) ملفات تعريف الارتباط/)).toBeInTheDocument();
    expect(screen.getByText(/4\) التواصل والاستفسارات/)).toBeInTheDocument();
  });

  it('بريد الخصوصية رابط mailto فقط', () => {
    const { container } = renderPage(<PrivacyPage />);
    expect(
      container.querySelector('a[href="mailto:kal6667222@gmail.com"]')
    ).not.toBeNull();
    assertOnlyContactLinks(container);
  });
});

describe('الصفحات الثلاث: لا أزرار تنقّل غير زر الرجوع', () => {
  it('لا يوجد أي <button> يحمل مساراً أو onClick تنقّل داخل النص', () => {
    for (const Page of [CareersPage, PartnersPage, PrivacyPage]) {
      const { container, unmount } = renderPage(<Page />);
      const buttons = Array.from(container.querySelectorAll('button'));
      // زر واحد فقط: «رجوع».
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toContain('رجوع');
      unmount();
    }
  });
});
