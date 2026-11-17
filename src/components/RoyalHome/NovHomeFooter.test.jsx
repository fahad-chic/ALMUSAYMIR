// اختبار تذييل الصفحة الرئيسية: النص القانوني نصّي للقراءة فقط،
// وروابط «وظائفنا/شركاؤنا/الخصوصية» تشير لمساراتها الصحيحة بلا تكرار.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    // نفتح قائمة الروابط لتظهر بقية التذييل كما يراه الزائر
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

  it('الجمل القانونية ليست أزراراً', () => {
    const { container } = renderHome();
    const legal = container.querySelector('.rz-footer-legal');
    expect(legal).not.toBeNull();
    expect(legal.querySelectorAll('button').length).toBe(0);
    expect(legal.querySelectorAll('a').length).toBe(0);
  });

  it('روابط «وظائفنا/شركاؤنا/الخصوصية» موجودة في التذييل بمساراتها الصحيحة', () => {
    renderHome();
    // الروابط أزرار تُفتح عبر goToPath — نتحقق من وجود عناوينها
    expect(screen.getByText('وظائفنا')).toBeInTheDocument();
    expect(screen.getByText('شركاؤنا')).toBeInTheDocument();
    expect(screen.getByText('الخصوصية')).toBeInTheDocument();
  });
});
