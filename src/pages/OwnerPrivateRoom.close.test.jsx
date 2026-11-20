import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { OWNER_GATE_KEY } from '../utils/ownerGate'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'owner-uid', email: 'owner@example.com', emailVerified: true },
    userRole: 'owner',
    isAuthenticated: true,
    loading: false
  })
}))
vi.mock('../permissions/usePermissions', () => ({
  default: () => ({ can: () => true, ready: true })
}))
vi.mock('../utils/ownerEmails', () => ({
  OWNER_EMAIL_SET: new Set(['owner@example.com']),
  OWNER_EMAILS: ['owner@example.com'],
  isOwnerEmail: () => true
}))
vi.mock('../firebase', () => {
  const docs = (rows) => ({ docs: rows.map((r) => ({ id: r.id, data: () => r })) })
  return {
    db: {},
    auth: {
      currentUser: { uid: 'owner-uid', email: 'owner@example.com' },
      onAuthStateChanged: (cb) => { cb({ uid: 'owner-uid', email: 'owner@example.com' }); return () => {} },
      signOut: vi.fn(() => Promise.resolve())
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
  window.sessionStorage.setItem(
    OWNER_GATE_KEY,
    JSON.stringify({ uid: 'owner-uid', expiresAt: Date.now() + 30 * 60 * 1000 })
  )
})

const open = (tab = 'overview') => {
  window.history.replaceState({}, '', `/owner-private-room${tab === 'overview' ? '' : `?tab=${tab}`}`)
  return render(
    <BrowserRouter>
      <OwnerPrivateRoom />
    </BrowserRouter>
  )
}

const gateStillValid = () => {
  const raw = window.sessionStorage.getItem(OWNER_GATE_KEY)
  if (!raw) return false
  return JSON.parse(raw).expiresAt > Date.now()
}

describe('لا تكرار في المركز الرئيسي', () => {
  it('«نظرة عامة» هي المدخل الوحيد: لا «المركز الرئيسي» ولا اختصار مكرر', async () => {
    open('overview')
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })

    const body = document.body.textContent || ''
    // التبويب الفارغ «المركز الرئيسي» أُدمج في «نظرة عامة» — لا أثر له
    expect(body).not.toMatch(/المركز الرئيسي/)
    // الاختصارات المكررة (نظرة عامة/رسالة البث) لم تعد تُصيَّر
    expect(body).not.toMatch(/نظرة عامة \/ الإحصائيات/)
    expect(body).not.toMatch(/رسالة البث/)
  })
})

describe('زر ❌ في غرفة المالك', () => {
  it('❌ لا يطلب الرمز مرة أخرى ولا يُسقط الجلسة', async () => {
    open('overview')
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })

    const close = document.querySelector('.owner-room-close')
    expect(close).toBeTruthy()
    fireEvent.click(close)

    await waitFor(() => {
      expect(/الرمز السري/.test(document.body.textContent || '')).toBe(false)
    })
    expect(gateStillValid()).toBe(true)
  })

  it('إعادة الدخول بعد ❌ لا تطلب الرمز (الجلسة باقية)', async () => {
    const { unmount } = open('users')
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })
    fireEvent.click(document.querySelector('.owner-room-close'))
    await waitFor(() => expect(/الرمز السري/.test(document.body.textContent || '')).toBe(false))
    unmount()
    cleanup()

    // دخول جديد للغرفة بنفس الجلسة
    open('overview')
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })
    expect(/الرمز السري/.test(document.body.textContent || '')).toBe(false)
    expect(gateStillValid()).toBe(true)
  })

  it('الخروج الصريح وحده يُسقط الجلسة', async () => {
    open('overview')
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })

    const logout = screen.getByRole('button', { name: /تسجيل الخروج/ })
    fireEvent.click(logout)

    await waitFor(() => {
      expect(window.sessionStorage.getItem(OWNER_GATE_KEY)).toBe(null)
    })
  })
})
