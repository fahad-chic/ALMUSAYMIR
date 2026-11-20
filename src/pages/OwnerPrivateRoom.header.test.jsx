import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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

vi.mock('../utils/kickLog', () => ({ markManualSignOut: vi.fn() }))

vi.mock('../firebase', () => {
  const snap = { docs: [], empty: true, size: 0, forEach: () => {} }
  const q = () => ({})
  return {
    auth: { currentUser: { uid: 'owner-uid', email: 'owner@example.com' } },
    db: {},
    COLLECTIONS: new Proxy({}, { get: (_t, k) => String(k) }),
    collection: q, doc: q, query: q, where: q, orderBy: q,
    getDocs: vi.fn(async () => snap),
    addDoc: vi.fn(async () => ({ id: 'x' })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    onSnapshot: vi.fn(() => () => {}),
    serverTimestamp: () => new Date(),
    Timestamp: { now: () => new Date() }
  }
})

vi.mock('../components/owner/OwnerGatekeeper', () => ({
  default: ({ onPassed }) => (
    <button type="button" onClick={onPassed}>اجتياز البوابة</button>
  )
}))

import OwnerPrivateRoom from './OwnerPrivateRoom'
import { PERMISSION_ROUTES } from '../permissions/permissionRoutes'
import { DEFERRED_PERMISSION_KEYS } from '../permissions/catalog'

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (q) => ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false
    })
  }
})

beforeEach(() => {
  window.sessionStorage.setItem(
    OWNER_GATE_KEY,
    JSON.stringify({ uid: 'owner-uid', expiresAt: Date.now() + 30 * 60 * 1000 })
  )
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

const renderRoom = (url = '/owner-private-room') => {
  window.history.replaceState({}, '', url)
  return render(
    <BrowserRouter>
      <OwnerPrivateRoom />
    </BrowserRouter>
  )
}

describe('الترويسة — ثابتة وكاملة ومصغّرة', () => {
  it('عنصر header موجود ومثبّت أعلى الصفحة (sticky)', async () => {
    const { container } = renderRoom()
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })
    const header = container.querySelector('header')
    expect(header).toBeTruthy()
    expect(header.className).toContain('sticky')
    expect(header.className).toContain('top-0')
  })

  it('تحمل الاسم الكامل للموقع لا عنواناً مختصراً فقط', async () => {
    renderRoom()
    expect(await screen.findByText(/المسيمير \| ALMUSAYMIR/)).toBeTruthy()
  })
})

describe('الصلاحيات — كل مفتاح له مكان عمل حقيقي واحد', () => {
  it('لا مسار صلاحية ميت: كل قيمة في PERMISSION_ROUTES مسار مطلق', async () => {
    const routes = Object.values(PERMISSION_ROUTES)
    expect(routes.length).toBeGreaterThan(0)
    for (const r of routes) {
      expect(r.startsWith('/')).toBe(true)
    }
  })

  it('لا مسار صلاحية يشير إلى تبويب غير موجود في الغرفة', async () => {
    const dead = Object.entries(PERMISSION_ROUTES).filter(([, path]) => {
      const m = path.match(/\?tab=([a-zA-Z0-9_-]+)/)
      return m && !['center', 'overview', 'live', 'monitoring', 'users', 'security',
        'registration', 'maintenance', 'ads', 'comments', 'categories', 'banners',
        'sitecontent', 'orders', 'privacy', 'reports', 'reviews', 'broadcast',
        'messages', 'permissions'].includes(m[1])
    })
    expect(dead).toEqual([])
  })

  it('المفاتيح المؤجلة لا تُعرض كزر تنقّل (لا زر ميت)', async () => {
    for (const key of DEFERRED_PERMISSION_KEYS) {
      expect(PERMISSION_ROUTES[key]).toBeUndefined()
    }
  })
})
