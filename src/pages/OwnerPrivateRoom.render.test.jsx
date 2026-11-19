import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// رندر حقيقي للمكوّن: يكشف أي ReferenceError (TDZ) لا يكشفه الفحص الساكن.
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    userRole: 'owner',
    user: { uid: 'u1', email: 'owner@example.com', emailVerified: true },
    isAuthenticated: true,
  }),
}));
vi.mock('../permissions/usePermissions', () => ({ default: () => ({ ready: true, can: () => true }) }));
vi.mock('../utils/ownerEmails', () => ({
  OWNER_EMAIL_SET: new Set(['owner@example.com']),
  OWNER_EMAILS: ['owner@example.com'],
  isOwnerEmail: () => true,
}));
vi.mock('../utils/kickLog', () => ({ markManualSignOut: vi.fn() }));
vi.mock('../firebase', async () => {
  const snap = { docs: [], empty: true, size: 0, forEach: () => {} };
  const q = () => ({});
  return {
    auth: { currentUser: { uid: 'u1', email: 'owner@example.com' } },
    db: {},
    COLLECTIONS: new Proxy({}, { get: (_t, k) => String(k) }),
    collection: q, doc: q, query: q, where: q, orderBy: q,
    getDocs: vi.fn(async () => snap),
    addDoc: vi.fn(async () => ({ id: 'x' })),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    onSnapshot: vi.fn(() => () => {}),
    serverTimestamp: () => new Date(),
    Timestamp: { now: () => new Date() },
  };
});
vi.mock('../components/owner/OwnerGatekeeper', () => ({
  default: ({ onPassed }) => (
    <button type="button" onClick={onPassed}>اجتياز البوابة</button>
  ),
}));

import OwnerPrivateRoom from './OwnerPrivateRoom';

beforeAll(() => {
  // jsdom لا يوفّر matchMedia — ليست مشكلة في المنتج.
  if (!window.matchMedia) {
    window.matchMedia = (q) => ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
    });
  }
});

describe('غرفة صاحب الموقع — لا انهيار TDZ عند الرندر', () => {
  it('تُرندر بجلسة مالك دون ReferenceError وتصل إلى شاشة البوابة', async () => {
    sessionStorage.setItem('rooz_owner_gate_ok', JSON.stringify({
      uid: 'u1', expiresAt: Date.now() + 600000,
    }));
    render(
      <MemoryRouter initialEntries={['/owner-private-room']}>
        <OwnerPrivateRoom />
      </MemoryRouter>
    );
    // وصل للغرفة كاملة ⇒ لم يُصطدم بـ TDZ في tabs.
    expect(await screen.findByText(/غرفة صاحب موقع المسيمير/)).toBeTruthy();
  });

  it('تبويب غير موجود في الرابط لا يُسقط الصفحة (يُعاد للمركز)', async () => {
    sessionStorage.setItem('rooz_owner_gate_ok', JSON.stringify({
      uid: 'u1', expiresAt: Date.now() + 600000,
    }));
    render(
      <MemoryRouter initialEntries={['/owner-private-room?tab=does-not-exist']}>
        <OwnerPrivateRoom />
      </MemoryRouter>
    );
    expect(await screen.findByText(/غرفة صاحب موقع المسيمير/)).toBeTruthy();
  });
});
