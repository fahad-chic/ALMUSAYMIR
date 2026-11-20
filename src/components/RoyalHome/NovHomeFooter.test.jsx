// اختبار تذييل الصفحة الرئيسية: أقسام وظائفنا/شركاؤنا/الخصوصية نصّية للقراءة فقط
// (عدا روابط التواصل mailto/tel)، والنص القانوني في الوسط آخر شيء، كل جملة في سطر.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ userRole: null, isAuthenticated: false, user: null }),
}));

vi.mock('../../hooks/useIsOwner', () => ({ default: () => false, useIsOwner: () => false }));

import NovHomePage from './NovHomePage';

const renderHome = () =>
  render(
    <MemoryRouter>
      <NovHomePage />
    </MemoryRouter>
  );

describe('تذييل الرئيسية — النص القانوني', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('يعرض الجمل القانونية الأربع كنص قراءة فقط', () => {
    renderHome();
    expect(
      screen.getByText('تم التطوير والتشغيل وفق أعلى معايير الأمان وحماية البيانات والخصوصية')
    ).toBeInTheDocument();
    expect(
      screen.getByText('نخضع للأنظمة واللوائح المعمول بها في المملكة العربية السعودية')
    ).toBeInTheDocument();
    expect(
      screen.getByText('موقعنا : المملكة العربية السعودية - حفر الباطن')
    ).toBeInTheDocument();
    expect(screen.getByText('جميع الحقوق محفوظة © 2026')).toBeInTheDocument();
  });

  it('الجمل القانونية ليست أزراراً ولا روابط', () => {
    const { container } = renderHome();
    const legal = container.querySelector('.rz-footer-legal');
    expect(legal).not.toBeNull();
    expect(legal.querySelectorAll('button').length).toBe(0);
    expect(legal.querySelectorAll('a').length).toBe(0);
  });

  it('لا يحتوي التذييل قسم «روابط الموقع» القديم', () => {
    const { container } = renderHome();
    expect(screen.queryByText('روابط الموقع')).toBeNull();
    expect(container.querySelector('.rz-footer-links-toggle')).toBeNull();
    expect(container.querySelector('.rz-footer-links-grid')).toBeNull();
  });

  it('يعرض الأقسام الثلاثة يميناً: وظائفنا / شركاؤنا / الخصوصية بعناوين صغيرة عريضة', () => {
    const { container } = renderHome();
    const info = container.querySelector('.rz-footer-info');
    expect(info).not.toBeNull();
    const titles = Array.from(info.querySelectorAll('.rz-footer-info-title')).map((el) => el.textContent);
    expect(titles).toEqual(['وظائفنا', 'شركاؤنا', 'الخصوصية']);
  });

  it('الأقسام الثلاثة نصّية: لا أزرار إطلاقاً، والروابط الوحيدة mailto/tel', () => {
    const { container } = renderHome();
    const info = container.querySelector('.rz-footer-info');
    expect(info.querySelectorAll('button').length).toBe(0);
    for (const a of Array.from(info.querySelectorAll('a'))) {
      const href = a.getAttribute('href') || '';
      expect(href.startsWith('mailto:') || href.startsWith('tel:')).toBe(true);
    }
  });

  it('النص القانوني آخر عنصر داخل التذييل ومحاذاته وسط', () => {
    const { container } = renderHome();
    const inner = container.querySelector('.rz-footer-inner');
    const children = Array.from(inner.children);
    expect(children[children.length - 1].classList.contains('rz-footer-legal')).toBe(true);
  });
});
