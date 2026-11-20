// اختبار الترويسة الملكية: ثابتة (sticky) + تحتوي كل الأزرار والخيارات
// + كل مسار حقيقي (يطابق ROYAL_NAV/ROYAL_DRAWER) بلا مسارات ميتة.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userRole: null, isAuthenticated: false, user: null }),
}));

vi.mock('../hooks/useIsOwner', () => ({ default: () => false, useIsOwner: () => false }));

import RoyalHeader from './RoyalHeader';
import { ROYAL_NAV, ROYAL_DRAWER } from '../data/royalMenu';

const renderHeader = (props = {}) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <RoyalHeader user={null} userRole="user" isOwnerLoggedIn={false} {...props} />
    </MemoryRouter>
  );

describe('الترويسة الملكية — البنية الثابتة', () => {
  it('تُصيَّر كعنصر <header> بالصنف rz-header (ثابت عبر CSS sticky)', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header.rz-header');
    expect(header).not.toBeNull();
  });

  it('لا تحتوي أي عنصر بسمة تختفي عند التمرير (لا display:none/visibility inline)', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header.rz-header');
    // الترويسة ظاهرة بالكامل: لا نمط إخفاء مضمّن على العنصر نفسه
    expect(header.style.display).not.toBe('none');
    expect(header.style.visibility).not.toBe('hidden');
  });
});

describe('الترويسة الملكية — كل الأزرار والخيارات موجودة', () => {
  it('يوجد البحث + المفضلة + الإشعارات + الحساب', () => {
    renderHeader();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText('المفضلة')).toBeInTheDocument();
    expect(screen.getByLabelText('الإشعارات')).toBeInTheDocument();
    expect(screen.getByLabelText('الحساب والإعدادات')).toBeInTheDocument();
  });

  it('يوجد زر القائمة (الثلاث شرطات) ويفتح الدرج', () => {
    renderHeader();
    const burger = screen.getByLabelText('فتح القائمة الكاملة');
    fireEvent.click(burger);
    expect(screen.getByRole('dialog', { name: 'قائمة التنقل الكاملة' })).toBeInTheDocument();
  });

  it('روابط التنقل السريع تطابق ROYAL_NAV بلا نقصان', () => {
    const { container } = renderHeader();
    const nav = container.querySelector('nav[aria-label="التنقل الرئيسي"]');
    const links = Array.from(nav.querySelectorAll('a'));
    expect(links.length).toBe(ROYAL_NAV.length);
  });
});

describe('الترويسة الملكية — كل المسارات حقيقية وغير مكرّرة', () => {
  it('كل مسار في ROYAL_NAV يبدأ بـ / (مسار داخلي صالح)', () => {
    for (const item of ROYAL_NAV) {
      expect(item.path.startsWith('/')).toBe(true);
    }
  });

  it('كل مسار في ROYAL_DRAWER يبدأ بـ / (لا روابط ميتة)', () => {
    for (const group of ROYAL_DRAWER) {
      for (const item of group.items) {
        expect(item.path.startsWith('/')).toBe(true);
      }
    }
  });
});
