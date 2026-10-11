import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import useStore from './store/useStore';

// انحدار: الزائر الجديد الذي يفتح /login مباشرةً كان يُحوَّل إلى "/" لأن
// ensureFirebaseSession يُنشئ جلسة Firebase مجهولة (isAnonymous) فتصبح
// isAuthenticated=true، فيرى LoginRoute أنه "مُسجّل" ويطرده. الإصلاح يميّز
// الجلسة المجهولة فلا تُحسب تسجيل دخول حقيقي، مع بقاء تحويل المسجّل الحقيقي.
const setAnonymousSession = () => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback({ uid: 'anon-1', isAnonymous: true, email: null });
    return vi.fn();
  });
};

const setRealMemberSession = () => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback({ uid: 'member-1', isAnonymous: false, email: 'user@example.com' });
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

describe('مسار /login مع الجلسة المجهولة (إصلاح انحدار)', () => {
  beforeEach(() => {
    useStore.setState({
      user: null,
      userRole: null,
      guestSession: { active: false, phone: '', startedAt: null, expiresAt: null, warnedAt: null },
    });
  });

  it('يعرض نموذج الدخول للزائر الجديد بجلسة Firebase مجهولة بدل تحويله إلى /', async () => {
    setAnonymousSession();

    renderAt('/login');

    expect(await screen.findByText('دخول الزوار المؤقت')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example@mail.com')).toBeInTheDocument();
  });

  it('يبقي تحويل العضو المسجّل الحقيقي من /login إلى الصفحة الرئيسية', async () => {
    setRealMemberSession();

    renderAt('/login');

    await waitFor(() =>
      expect(screen.queryByText('دخول الزوار المؤقت')).toBeNull()
    );
  });
});
