// اختبار حيّ لقائمة الحراج: يثبت أن الصفحة تشترك في haraj_ads عبر
// onSnapshot (بثّ لحظي) لا عبر getDocs (جلب لمرة واحدة)، وأن أي تغيير
// في المجموعة يُحدّث القائمة المعروضة فوراً، وأن الاشتراك يُلغى عند
// إزالة الصفحة.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onSnapshot } from 'firebase/firestore';
import { AuthProvider } from '../../context/AuthContext';
import RoyalHarajPage from './RoyalHarajPage';

const makeAd = (id, title) => ({
  id,
  data: () => ({
    title,
    price: 100,
    status: 'active',
    userId: 'seller-1',
    createdAt: { toMillis: () => Date.now() },
  }),
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/haraj']}>
      <AuthProvider>
        <RoyalHarajPage />
      </AuthProvider>
    </MemoryRouter>
  );

describe('قائمة الحراج — بثّ لحظي (onSnapshot)', () => {
  let snapCallback;
  let unsubscribe;

  beforeEach(() => {
    snapCallback = null;
    unsubscribe = vi.fn();
    localStorage.setItem(
      'harajUser',
      JSON.stringify({ name: 'عضو', phone: '0500000000' })
    );
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext) => {
      snapCallback = onNext;
      return unsubscribe;
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.mocked(onSnapshot).mockClear();
  });

  it('يشترك في haraj_ads عبر onSnapshot (لا getDocs)', async () => {
    await act(async () => {
      renderPage();
    });

    expect(onSnapshot).toHaveBeenCalled();
    expect(snapCallback).toBeTypeOf('function');
  });

  it('يعرض إعلاناً يصل لاحقاً عبر البثّ بلا إعادة تحميل', async () => {
    await act(async () => {
      renderPage();
    });

    expect(screen.queryByText('دراجة هوائية')).toBeNull();

    await act(async () => {
      snapCallback({
        docs: [makeAd('a1', 'دراجة هوائية')],
      });
    });

    expect(await screen.findByText('دراجة هوائية')).toBeInTheDocument();
  });

  it('يحدّث القائمة عند وصول إعلان جديد بعد عرض قائمة أولى', async () => {
    await act(async () => {
      renderPage();
    });

    await act(async () => {
      snapCallback({ docs: [makeAd('a1', 'إعلان أول')] });
    });
    expect(await screen.findByText('إعلان أول')).toBeInTheDocument();

    await act(async () => {
      snapCallback({
        docs: [makeAd('a2', 'إعلان ثانٍ'), makeAd('a1', 'إعلان أول')],
      });
    });

    expect(await screen.findByText('إعلان ثانٍ')).toBeInTheDocument();
    expect(screen.getByText('إعلان أول')).toBeInTheDocument();
  });

  it('يُلغي الاشتراك عند إزالة الصفحة', async () => {
    let view;
    await act(async () => {
      view = renderPage();
    });

    await act(async () => {
      view.unmount();
    });

    expect(unsubscribe).toHaveBeenCalled();
  });
});
