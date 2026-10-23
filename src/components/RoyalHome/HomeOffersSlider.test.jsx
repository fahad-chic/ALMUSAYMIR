// اختبار حقيقي لمكوّن شريط العروض: يتحقق من بنية الشريط (6 مواضع) ومن أن
// زر «إدارة العروض» يظهر لصاحب الموقع فقط ويُحجب عن الزائر.
// يُستبدل سياق المصادقة فقط (AuthContext) لأن الدور يأتي من Firebase الحقيقي
// ولا يمكن محاكاته في jsdom؛ المكوّن والمخزن يعملان بكودهما الفعلي.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeOffersSlider from './HomeOffersSlider';
import useOffers, { OFFER_SLOTS } from '../../store/useOffers';

const authState = { userRole: null };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ userRole: authState.userRole }),
}));

describe('HomeOffersSlider', () => {
  beforeEach(() => {
    authState.userRole = null;
    useOffers.getState().setSlots(null);
  });

  it('يعرض 6 شرائح و6 نقاط بغضّ النظر عن الدور', () => {
    render(<HomeOffersSlider />);
    expect(document.querySelectorAll('.hos-slide')).toHaveLength(OFFER_SLOTS);
    expect(document.querySelectorAll('.hos-dot')).toHaveLength(OFFER_SLOTS);
  });

  it('يعرض اسم الموقع البديل في المواضع الفارغة', () => {
    render(<HomeOffersSlider />);
    expect(document.querySelectorAll('.hos-fallback')).toHaveLength(OFFER_SLOTS);
    expect(screen.getAllByText(/المسيمير/).length).toBeGreaterThan(0);
  });

  it('يحجب زر الإدارة عن الزائر', () => {
    authState.userRole = 'guest';
    render(<HomeOffersSlider />);
    expect(document.querySelector('.hos-manage')).toBeNull();
  });

  it('يحجب زر الإدارة عن العضو العادي', () => {
    authState.userRole = 'user';
    render(<HomeOffersSlider />);
    expect(document.querySelector('.hos-manage')).toBeNull();
  });

  it('يظهر زر الإدارة للمالك ويفتح نافذة المواضع الستة', () => {
    authState.userRole = 'owner';
    render(<HomeOffersSlider />);

    const btn = document.querySelector('.hos-manage');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('إدارة العروض');

    fireEvent.click(btn);
    expect(document.querySelector('.hos-modal')).not.toBeNull();
    expect(document.querySelectorAll('.hos-slot')).toHaveLength(OFFER_SLOTS);
    // لا مواضع مملوءة → أزرار «إضافة» فقط وبلا زر حذف
    expect(screen.getAllByText('إضافة')).toHaveLength(OFFER_SLOTS);
    expect(document.querySelectorAll('.hos-danger')).toHaveLength(0);
  });

  it('يعرض زر «حذف» للمواضع المملوءة فقط عند المالك', () => {
    authState.userRole = 'owner';
    const slots = Array.from({ length: OFFER_SLOTS }, () => null);
    slots[0] = { url: 'https://example.test/a.jpg', path: 'home_offers/a.jpg' };
    slots[3] = { url: 'https://example.test/b.jpg', path: 'home_offers/b.jpg' };
    useOffers.getState().setSlots(slots);

    render(<HomeOffersSlider />);
    fireEvent.click(document.querySelector('.hos-manage'));

    expect(document.querySelectorAll('.hos-danger')).toHaveLength(2);
    expect(screen.getAllByText('استبدال')).toHaveLength(2);
    expect(screen.getAllByText('إضافة')).toHaveLength(OFFER_SLOTS - 2);
  });

  it('يعرض الصور المملوءة داخل الشرائح بدل الاسم البديل', () => {
    const slots = Array.from({ length: OFFER_SLOTS }, () => null);
    slots[0] = { url: 'https://example.test/a.jpg', path: '' };
    useOffers.getState().setSlots(slots);

    render(<HomeOffersSlider />);
    const imgs = document.querySelectorAll('.hos-slide img');
    expect(imgs).toHaveLength(1);
    expect(document.querySelectorAll('.hos-fallback')).toHaveLength(OFFER_SLOTS - 1);
  });
});
