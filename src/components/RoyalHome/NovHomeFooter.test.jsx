// اختبار تذييل الصفحة الرئيسية: النص القانوني نصّي للقراءة فقط،
// ولم يعد يحتوي قسم «روابط الموقع» (نُقل إلى قائمة الثلاث شرطات باسم «استكشف الموقع»).
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

  it('لا يحتوي التذييل قسم «روابط الموقع» بعد النقل', () => {
    const { container } = renderHome();
    expect(screen.queryByText('روابط الموقع')).toBeNull();
    expect(container.querySelector('.rz-footer-links-toggle')).toBeNull();
    expect(container.querySelector('.rz-footer-links-grid')).toBeNull();
    // روابط الصفحات لم تعد داخل التذييل
    expect(container.querySelector('.rz-footer-legal')?.textContent).not.toContain('وظائفنا');
  });
});
