// جلسة رمز واحدة: استعادة Firebase تمرّ بحالة `null` عابرة — لا تُسقط الجلسة
// ولا تُعيد طلب الرمز. الإسقاط يحدث فقط عند حساب مسجّل ببريد غير مصرّح.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { OWNER_GATE_KEY } from '../utils/ownerGate'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, userRole: null, isAuthenticated: false, loading: false })
}))

vi.mock('../permissions/usePermissions', () => ({
  default: () => ({ can: () => true, ready: true })
}))

vi.mock('../utils/ownerEmails', () => ({
  OWNER_EMAIL_SET: new Set(['owner@example.com']),
  OWNER_EMAILS: ['owner@example.com'],
  isOwnerEmail: (email) => email === 'owner@example.com'
}))

// متحكّم يدوي في onAuthStateChanged لمحاكاة استعادة الجلسة
const authController = vi.hoisted(() => ({ listeners: [], signOut: null }))

vi.mock('../firebase', () => {
  const docs = (rows) => ({ docs: rows.map((r) => ({ id: r.id, data: () => r })) })
  return {
    db: {},
    auth: {
      currentUser: null,
      onAuthStateChanged: (cb) => {
        authController.listeners.push(cb)
        return () => {
          authController.listeners = authController.listeners.filter((l) => l !== cb)
        }
      },
      signOut: (...args) => authController.signOut(...args)
    },
    COLLECTIONS: { USERS: 'users', MESSAGES: 'messages', ORDERS: 'orders' },
    collection: (_db, name) => ({ name }),
    query: (ref) => ref,
    where: () => ({}),
    orderBy: () => ({}),
    getDocs: async () => docs([]),
    onSnapshot: () => () => {},
    doc: () => ({}),
    addDoc: async () => ({}),
    updateDoc: async () => {},
    deleteDoc: async () => {},
    serverTimestamp: () => 0,
    Timestamp: { now: () => 0 },
    getDoc: async () => ({ exists: () => false, data: () => ({}) }),
    setDoc: async () => {},
    arrayUnion: () => []
  }
})

import OwnerPrivateRoom from './OwnerPrivateRoom'

const emit = async (user) => {
  for (const cb of [...authController.listeners]) {
    await act(async () => {
      await cb(user)
    })
  }
}
const readSession = () => {
  const raw = window.sessionStorage.getItem(OWNER_GATE_KEY)
  return raw ? JSON.parse(raw) : null
}

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (q) => ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false
    })
  }
})

beforeEach(() => {
  authController.listeners = []
  authController.signOut = vi.fn(async () => {})
  window.sessionStorage.setItem(
    OWNER_GATE_KEY,
    JSON.stringify({ uid: 'owner-uid', expiresAt: Date.now() + 30 * 60 * 1000 })
  )
  window.history.replaceState({}, '', '/owner-private-room')
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/')
})

const renderRoom = () =>
  render(
    <BrowserRouter>
      <OwnerPrivateRoom />
    </BrowserRouter>
  )

describe('رمز واحد لكل جلسة — الاستعادة لا تُعيد الطلب', () => {
  it('حالة null العابرة أثناء الاستعادة لا تمسح جلسة الرمز', async () => {
    renderRoom()
    await emit(null)
    expect(readSession()).not.toBe(null)
    expect(readSession().expiresAt).toBeGreaterThan(Date.now())
  })

  it('بعد الاستعادة يفتح المالك الغرفة بلا شاشة رمز', async () => {
    renderRoom()
    await emit(null)
    await emit({ uid: 'owner-uid', email: 'owner@example.com', emailVerified: true })
    expect((await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })).length)
      .toBeGreaterThan(0)
    expect(screen.queryByLabelText(/الرمز السري/)).toBe(null)
  })

  it('حساب مسجّل ببريد غير مصرّح يُسقط الجلسة ويُخرج', async () => {
    renderRoom()
    await emit({ uid: 'intruder', email: 'intruder@example.com', emailVerified: true })
    expect(readSession()).toBe(null)
    expect(authController.signOut).toHaveBeenCalled()
  })
})
