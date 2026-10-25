// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Firebase mocks for tests
const mockCollection = vi.fn(() => ({
  id: 'mock-collection',
  path: 'mock/path',
}));

const mockAddDoc = vi.fn(() => Promise.resolve({ id: 'mock-id' }));
const mockServerTimestamp = vi.fn(() => ({ seconds: Date.now() }));
const mockOnSnapshot = vi.fn(() => vi.fn());
const mockQuery = vi.fn((ref) => ref);
const mockOrderBy = vi.fn((ref) => ref);
const mockLimit = vi.fn((ref) => ref);

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  addDoc: mockAddDoc,
  serverTimestamp: mockServerTimestamp,
  onSnapshot: mockOnSnapshot,
  query: mockQuery,
  orderBy: mockOrderBy,
  limit: mockLimit,
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(() => Promise.resolve()),
}));

// Firebase Auth mocks
const mockSignInWithEmailAndPassword = vi.fn(() =>
  Promise.resolve({
    user: {
      uid: 'member-1',
      email: 'user@example.com',
      emailVerified: false,
      getIdToken: vi.fn(() => Promise.resolve('mock-id-token')),
    },
  })
);
const mockSignOut = vi.fn(() => Promise.resolve());
const mockOnAuthStateChanged = vi.fn((auth, callback) => {
  callback(null);
  return vi.fn();
});
const mockSendEmailVerification = vi.fn(() => Promise.resolve());

globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () =>
      Promise.resolve({
        success: false,
        error: 'الرمز السري غير صحيح',
      }),
  })
);

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  sendEmailVerification: mockSendEmailVerification,
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(() => Promise.resolve({ user: { email: 'test@test.com' } })),
}));

// Firebase config mock
vi.mock('./firebase/config', () => ({
  auth: {},
  db: {},
}));