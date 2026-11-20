// اختبار دورة حياة جلسة الزائر: دقيقتان، تنبيه، إنهاء تلقائي.
// نستخدم مؤقّتات وهمية لتفادي انتظار دقيقتين حقيقيتين.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../firebase/config', () => ({ db: {}, auth: {} }));

const signOutMock = vi.fn(() => Promise.resolve());
const getAuthMock = vi.fn(() => ({ currentUser: null }));

vi.mock('firebase/auth', () => ({
  getAuth: (...a) => getAuthMock(...a),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInAnonymously: vi.fn(() => Promise.resolve()),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: (...a) => signOutMock(...a),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  addDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => 'doc'),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  where: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}));

vi.mock('../utils/firebaseSession', () => ({
  ensureFirebaseSession: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/kickLog', () => ({
  recordKick: vi.fn(),
  markManualSignOut: vi.fn(),
}));

import useStore from './useStore';

const EMPTY_GUEST = {
  active: false,
  phone: '',
  startedAt: null,
  expiresAt: null,
  warnedAt: null,
};

const resetGuest = () => {
  useStore.setState({
    guestSession: { ...EMPTY_GUEST },
    guestTimers: { warn: null, expire: null },
    guestWarning: false,
    guestExpired: false,
    user: null,
    userRole: null,
    isAuthenticated: false,
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  resetGuest();
  useStore.setState({ notifyOwners: vi.fn(() => Promise.resolve()) });
});

afterEach(() => {
  useStore.getState().endGuestSession?.('test-cleanup');
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('جلسة الزائر', () => {
  it('تبدأ بمدة دقيقتين وتبقى نشطة قبل الانتهاء', async () => {
    await useStore.getState().startGuestSession('0536667222');
    const s = useStore.getState().guestSession;
    expect(s.active).toBe(true);
    expect(s.expiresAt - s.startedAt).toBe(120000);
  });

  it('getGuestRemaining يعطي الوقت المتبقي بالمللي ثانية', async () => {
    await useStore.getState().startGuestSession('0536667222');
    expect(useStore.getState().getGuestRemaining()).toBeGreaterThan(115000);
    vi.advanceTimersByTime(60000);
    expect(useStore.getState().getGuestRemaining()).toBeLessThanOrEqual(60000);
  });

  it('يرفع تنبيه التحذير قبل الانتهاء (آخر 15 ثانية)', async () => {
    await useStore.getState().startGuestSession('0536667222');
    expect(useStore.getState().guestWarning).toBe(false);
    vi.advanceTimersByTime(106000);
    expect(useStore.getState().guestWarning).toBe(true);
  });

  it('ينتهي تلقائياً بعد دقيقتين ويضع إشارة الطرد', async () => {
    await useStore.getState().startGuestSession('0536667222');
    vi.advanceTimersByTime(120100);
    await Promise.resolve();
    const s = useStore.getState();
    expect(s.guestSession.active).toBe(false);
    expect(s.guestExpired).toBe(true);
    expect(s.guestWarning).toBe(false);
  });

  it('expireGuestSession آمن للاستدعاء المتكرر (لا يعمل مرتين)', async () => {
    await useStore.getState().startGuestSession('0536667222');
    const first = await useStore.getState().expireGuestSession('countdown');
    const second = await useStore.getState().expireGuestSession('countdown');
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
  });

  it('acknowledgeGuestExpired يستهلك الإشارة مرة واحدة', async () => {
    await useStore.getState().startGuestSession('0536667222');
    await useStore.getState().expireGuestSession('countdown');
    expect(useStore.getState().guestExpired).toBe(true);
    useStore.getState().acknowledgeGuestExpired();
    expect(useStore.getState().guestExpired).toBe(false);
  });

  it('endGuestSession اليدوي يوقف المؤقّتات ويُنهي الجلسة', async () => {
    await useStore.getState().startGuestSession('0536667222');
    await useStore.getState().endGuestSession('manual');
    expect(useStore.getState().guestSession.active).toBe(false);
  });

  it('لا يُسقط جلسة عضو حقيقي دخل أثناء جلسة الزائر', async () => {
    await useStore.getState().startGuestSession('0536667222');
    // عضو حقيقي سجّل دخوله للتو
    getAuthMock.mockReturnValue({ currentUser: { uid: 'u1', isAnonymous: false } });
    useStore.setState({ isAuthenticated: true, userRole: 'user', user: { uid: 'u1' } });
    await useStore.getState().expireGuestSession('timer');
    const s = useStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.guestExpired).toBe(false);
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
