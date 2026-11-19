import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  const docs = (rows) => ({
    docs: rows.map((r) => ({ id: r.id, data: () => r }))
  })
  return {
    db: {},
    auth: {
      currentUser: { uid: 'owner-uid', email: 'owner@example.com' },
      onAuthStateChanged: (cb) => {
        cb({ uid: 'owner-uid', email: 'owner@example.com' })
        return () => {}
      },
      signOut: vi.fn()
    },
    COLLECTIONS: { USERS: 'users', MESSAGES: 'messages', ORDERS: 'orders' },
    collection: (_db, name) => ({ name }),
    query: (ref) => ref,
    where: () => ({}),
    orderBy: () => ({}),
    getDocs: async (ref) => {
      if (ref.name === 'haraj_ads') {
        return docs([{ id: 'a1', title: 'عباية مطرزة', status: 'active' }])
      }
      return docs([])
    },
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
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
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

describe('الرجوع خطوة واحدة — نفس القسم السابق', () => {
  it('كل قسم يُدفَع كمدخل تاريخ (لا replace)، و«رجوع» يعيد القسم السابق', async () => {
    window.history.replaceState({}, '', '/owner-private-room?tab=overview')
    render(
      <BrowserRouter>
        <OwnerPrivateRoom />
      </BrowserRouter>
    )

    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })
    const before = window.history.length

    fireEvent.click(await screen.findByRole('button', { name: /الإعلانات النشطة/ }))

    await waitFor(
      () => expect(window.location.search).toContain('tab=ads'),
      { timeout: 4000 }
    )
    expect(window.history.length).toBeGreaterThan(before)

    window.history.back()

    await waitFor(
      () => expect(window.location.search).toContain('tab=overview'),
      { timeout: 4000 }
    )
    // القسم السابق عاد فعلياً في الواجهة
    expect(await screen.findByRole('button', { name: /إجمالي المستخدمين/ })).toBeTruthy()
  })
})
