import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import useStore from './store/useStore';

// أُلغي دخول الزوار نهائياً. حتى لو حُقنت جلسة زائر قديمة في المتجر، يجب
// ألا تمنح أي وصول: تبقى الصفحات المحمية على /login بلا حلقة توجيه.
describe('توجيه الزائر — جلسة الزائر ملغاة', () => {
  beforeEach(() => {
    useStore.setState({
      guestSession: {
        active: true,
        phone: 'زائر-9999',
        startedAt: Date.now(),
        expiresAt: Date.now() + 3600_000,
        warnedAt: null,
      },
      userRole: 'guest',
      user: null,
    });
  });

  it('يبقى على /login بجلسة زائر محقونة ولا يحوّل إلى /', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByPlaceholderText('example@mail.com')).toBeInTheDocument();
  });

  it('لا يمنح جلسة الزائر وصولاً للصفحة الرئيسية المحمية', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByPlaceholderText('example@mail.com')).toBeInTheDocument();
  });
});
