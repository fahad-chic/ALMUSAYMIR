// ❌ ثم إعادة فتح نموذج الحراج: الصورة المختارة تبقى معروضة بلا رفع جديد.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../firebase/config', () => ({
  db: {},
  auth: { currentUser: { uid: 'u1', email: 'sara@example.com' }, onAuthStateChanged: () => () => {} }
}))

vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  addDoc: async () => ({}),
  serverTimestamp: () => 0
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'sara@example.com', emailVerified: true, displayName: 'سارة' },
    isAuthenticated: true,
    loading: false
  })
}))

vi.mock('../../utils/visitorNotify', () => ({
  notifyOwner: () => {},
  buildAdOwnerNotice: () => ({ title: '', body: '' })
}))

vi.mock('../../utils/firebaseSession', () => ({ ensureFirebaseSession: async () => {} }))
vi.mock('../../utils/watermark', () => ({ watermarkDataUrl: async (u) => u }))
vi.mock('../../utils/motionPreview', () => ({ extractMotionFrames: async () => [] }))
vi.mock('../../utils/compressImage', () => ({
  compressImageToDataUrl: async () => 'data:image/jpeg;base64,COMPRESSED'
}))

import AdFormPage from './AdFormPage'
import { clearImageDraft, saveImageDraft } from '../../utils/imageDraft'

const DRAFT = 'data:image/jpeg;base64,DRAFTED'

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
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={['/haraj/post']}>
      <AdFormPage />
    </MemoryRouter>
  )

describe('نموذج الحراج — مسودة الصورة تعيش داخل الجلسة', () => {
  it('صورة محفوظة في الجلسة تظهر معاينة فوراً بلا رفع جديد', async () => {
    saveImageDraft('haraj-ad-image-0', DRAFT)
    renderForm()
    const preview = await screen.findByAltText('معاينة الصورة 1')
    expect(preview.getAttribute('src')).toBe(DRAFT)
  })

  it('إغلاق النموذج وإعادة فتحه في نفس الجلسة لا يطلب الصورة مرة أخرى', async () => {
    saveImageDraft('haraj-ad-image-0', DRAFT)
    renderForm()
    await screen.findByAltText('معاينة الصورة 1')
    cleanup()
    // إعادة الفتح تحاكي ❌ ثم العودة: الجلسة نفسها، والنموذج جديد
    renderForm()
    expect((await screen.findByAltText('معاينة الصورة 1')).getAttribute('src')).toBe(DRAFT)
  })

  it('حذف الصورة يمسح المسودة فلا تعود بعد ❌', async () => {
    saveImageDraft('haraj-ad-image-0', DRAFT)
    renderForm()
    await screen.findByAltText('معاينة الصورة 1')
    fireEvent.click(screen.getByLabelText('حذف الصورة'))
    await waitFor(() => expect(screen.queryByAltText('معاينة الصورة 1')).toBe(null))
    cleanup()
    renderForm()
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByAltText('معاينة الصورة 1')).toBe(null)
    clearImageDraft('haraj-ad-image-0')
  })
})
