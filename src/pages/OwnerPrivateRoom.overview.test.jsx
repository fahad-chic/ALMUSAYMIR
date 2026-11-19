import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
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

// Firebase: بيانات حقيقية الشكل لقياس ربط الأرقام بالقوائم
vi.mock('../firebase', () => {
  const docs = (rows) => ({
    docs: rows.map((r) => ({ id: r.id, data: () => r }))
  })
  const users = [
    { id: 'u1', displayName: 'سارة العتيبي', email: 'sara@example.com', role: 'user' },
    { id: 'u2', displayName: 'خالد الحربي', email: 'khaled@example.com', role: 'admin' }
  ]
  const ads = [{ id: 'a1', title: 'عباية مطرزة', status: 'active', userId: 'u1' }]
  const messages = [
    { id: 'm1', senderId: 'u1', receiverId: 'u2', text: 'هل المقاس متوفر؟' }
  ]
  const chats = [
    {
      id: 'postdeploy_chat_9f8e7d6c5b4a3210',
      adTitle: 'عباية مطرزة',
      buyerKey: 'u1',
      sellerKey: 'u2',
      lastMessage: 'تم'
    }
  ]
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
      if (ref.name === 'users') return docs(users)
      if (ref.name === 'haraj_ads') return docs(ads)
      if (ref.name === 'messages') return docs(messages)
      if (ref.name === 'chats') return docs(chats)
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

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

beforeEach(() => {
  // جلسة رمز صالحة: ندخل الغرفة مباشرة كما لو أدخل المالك الرمز
  window.sessionStorage.setItem(
    OWNER_GATE_KEY,
    JSON.stringify({ uid: 'owner-uid', expiresAt: Date.now() + 30 * 60 * 1000 })
  )
})

const renderRoom = (url = '/owner-private-room') => {
  // activeTab الأولي يُقرأ من window.location — نضبطه قبل الرندر
  window.history.replaceState({}, '', url)
  return render(
    <BrowserRouter>
      <OwnerPrivateRoom />
    </BrowserRouter>
  )
}

describe('نظرة عامة — كل رقم يفتح مكان العمل الحقيقي', () => {
  it('الضغط على «إجمالي المستخدمين» يفتح قائمة المستخدمين بأسمائهم', async () => {
    renderRoom('/owner-private-room?tab=overview')
    const card = await screen.findByRole('button', { name: /إجمالي المستخدمين/ })
    fireEvent.click(card)
    expect(await screen.findByText('سارة العتيبي')).toBeTruthy()
    expect(await screen.findByText('خالد الحربي')).toBeTruthy()
  })

  it('الضغط على «الرسائل» يفتح الرسائل ويعرض أسماء لا معرفات خام', async () => {
    renderRoom('/owner-private-room?tab=overview')
    const card = await screen.findByRole('button', { name: /^الرسائل/ })
    fireEvent.click(card)
    expect((await screen.findAllByText(/الرسائل الخاصة/)).length).toBeGreaterThan(0)
    // اسم مفهوم بدل postdeploy_chat_… (يظهر كمشترٍ ومرسل)
    expect((await screen.findAllByText(/سارة العتيبي/)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/postdeploy_chat_/)).toBe(null)
  })

  it('الضغط على «الإعلانات النشطة» يفتح قائمة الإعلانات', async () => {
    renderRoom('/owner-private-room?tab=overview')
    const card = await screen.findByRole('button', { name: /الإعلانات النشطة/ })
    fireEvent.click(card)
    expect(await screen.findByText(/عباية مطرزة/)).toBeTruthy()
  })

  it('بطاقات «ملخص سريع» قابلة للضغط أيضاً', async () => {
    renderRoom('/owner-private-room?tab=overview')
    const mini = await screen.findByRole('button', { name: /^المستخدمون/ })
    expect(mini).toBeTruthy()
    fireEvent.click(mini)
    await waitFor(async () => {
      expect(await screen.findByText('سارة العتيبي')).toBeTruthy()
    })
  })
})

describe('جلسة الرمز — لا إعادة طلب داخل الجلسة', () => {
  it('الغرفة تفتح مباشرة بجلسة صالحة (لا شاشة رمز)', async () => {
    renderRoom()
    expect((await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/الرمز السري/)).toBe(null)
  })

  it('زر ❌ لا يُسقط جلسة الرمز', async () => {
    renderRoom()
    await screen.findAllByRole('heading', { name: /غرفة صاحب الموقع/ })
    const close = document.querySelector('.owner-room-close')
    if (close) fireEvent.click(close)
    const rec = JSON.parse(window.sessionStorage.getItem(OWNER_GATE_KEY))
    expect(rec.expiresAt).toBeGreaterThan(Date.now())
  })
})
