import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import useStore from './store/useStore';
import { ROYAL_NAV, ROYAL_DRAWER } from './data/royalMenu';

// جولة إصلاحات التنقّل: /advertisements مالك/مشرف فقط، والمفضلة تشير
// لصفحة المفضلة الحقيقية، وصفر تكرار للمسارات داخل الدرج.

const setVerifiedMember = (email = 'user@example.com') => {
  vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
    callback({ uid: 'member-1', isAnonymous: false, email, emailVerified: true });
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

describe('حماية /advertisements — مالك/مشرف فقط', () => {
  beforeEach(() => {
    useStore.setState({
      user: null,
      userRole: null,
      guestSession: { active: false, phone: '', startedAt: null, expiresAt: null, warnedAt: null },
    });
  });

  it('يوجّه العضو العادي (user) إلى /unauthorized', async () => {
    setVerifiedMember('regular@example.com');

    renderAt('/advertisements');

    expect(await screen.findByText('غير مصرح لك بالدخول')).toBeInTheDocument();
    expect(screen.queryByText('إدارة الإعلانات')).toBeNull();
  });
});

describe('قائمة التنقل الملكية — لا روابط مكرّرة ولا مسارات إدارية للمستخدم', () => {
  it('لا يوجّه «العروض» إلى الصفحة الإدارية /advertisements', () => {
    const offersNav = ROYAL_NAV.find((i) => i.id === 'offers');
    expect(offersNav.path).not.toBe('/advertisements');

    for (const group of ROYAL_DRAWER) {
      for (const item of group.items) {
        if (item.label === 'العروض' || item.label === 'أريد مشاهدة العروض') {
          expect(item.path).not.toBe('/advertisements');
        }
      }
    }
  });

  it('مجموعة «استكشف الموقع» تحتوي روابط الصفحات الثلاث غير المكرّرة', () => {
    const explore = ROYAL_DRAWER.find((g) => g.id === 'explore');
    expect(explore).toBeDefined();
    expect(explore.label).toBe('استكشف الموقع');
    expect(explore.items.map((i) => i.path).sort()).toEqual(
      ['/careers', '/partners', '/privacy'].sort()
    );
  });

  it('«المفضلة» يشير لصفحة المفضلة الحقيقية لا للإعدادات', () => {
    const account = ROYAL_DRAWER.find((g) => g.id === 'account');
    const fav = account.items.find((i) => i.label === 'المفضلة');
    expect(fav.path).toBe('/favorites');
  });

  it('لا مسارات مكرّرة داخل أي مجموعة في الدرج', () => {
    for (const group of ROYAL_DRAWER) {
      const paths = group.items.map((i) => i.path);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('لا مسار مكرّر بين أي مجموعتين في الدرج (صفر تكرار)', () => {
    const seen = new Map();
    for (const group of ROYAL_DRAWER) {
      for (const item of group.items) {
        if (seen.has(item.path)) {
          throw new Error(
            `مسار مكرّر: ${item.path} في «${seen.get(item.path)}» و«${group.label}»`
          );
        }
        seen.set(item.path, group.label);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});
