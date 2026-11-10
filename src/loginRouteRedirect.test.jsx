import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import useStore from './store/useStore';

// حاجز ملكية البريد: لا جلسة مجهولة ولا دخول زوار. /login يبقى متاحاً
// لغير الموثّق، ويُحوَّل العضو الموثّق البريد إلى الرئيسية. الجلسة المجهولة
// (isAnonymous) لم تعد تُنشأ إطلاقاً، ويُعامل صاحبها كغير مسجّل.
const setAnonymousSession = () => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback({ uid: 'anon-1', isAnonymous: true, email: null, emailVerified: false });
    return vi.fn();
  });
};

const setRealMemberSession = () => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback({
      uid: 'member-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailVerified: true,
    });
    return vi.fn();
  });
};

const setUnverifiedMemberSession = () => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback({
      uid: 'member-2',
      isAnonymous: false,
      email: 'user@example.com',
      emailVerified: false,
    });
    return vi.fn();
  });
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );

describe('حاجز ملكية البريد على /login', () => {
  beforeEach(() => {
    useStore.setState({
      user: null,
      userRole: null,
      guestSession: { active: false, phone: '', startedAt: null, expiresAt: null, warnedAt: null },
    });
  });

  it('يعرض نموذج الدخول للجلسة المجهولة (لا تُحسب تسجيل دخول حقيقي)', async () => {
    setAnonymousSession();

    renderAt('/login');

    expect(await screen.findByPlaceholderText('example@mail.com')).toBeInTheDocument();
  });

  it('يبقي تحويل العضو الموثّق البريد من /login إلى الصفحة الرئيسية', async () => {
    setRealMemberSession();

    renderAt('/login');

    await waitFor(() =>
      expect(screen.queryByPlaceholderText('example@mail.com')).toBeNull()
    );
  });

  it('يعرض نموذج الدخول للعضو غير الموثّق (لا يُحوَّل إلى الرئيسية)', async () => {
    setUnverifiedMemberSession();

    renderAt('/login');

    expect(await screen.findByPlaceholderText('example@mail.com')).toBeInTheDocument();
  });

  // جلسة مجهولة (زائر) بلا جلسة زائر نشطة — أي بعد إعادة تحميل الصفحة،
  // إذ تُصفَّر جلسة الزائر من التخزين. كان المسار المحمي يعرض شاشة «تفعيل
  // البريد» بلا بريد (شاشة بلا معنى). الآن يُعاد الزائر إلى /login.
  it('يعيد الزائر المجهول من مسار محمي إلى /login بدل شاشة تفعيل البريد الفارغة', async () => {
    setAnonymousSession();

    renderAt('/about');

    expect(await screen.findByPlaceholderText('example@mail.com')).toBeInTheDocument();
    expect(screen.queryByText('تفعيل البريد مطلوب')).toBeNull();
  });
});
