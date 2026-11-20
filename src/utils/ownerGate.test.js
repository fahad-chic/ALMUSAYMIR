import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  OWNER_GATE_KEY,
  OWNER_GATE_TTL_MS,
  hasOwnerGateSession,
  saveOwnerGateSession,
  clearOwnerGateSession,
  ownerGateRemainingMs
} from './ownerGate'

const store = () => {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear()
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'sessionStorage', {
    value: store(),
    configurable: true,
    writable: true
  })
})

afterEach(() => {
  clearOwnerGateSession()
})

describe('جلسة بوابة الرمز — لا إعادة طلب أثناء الجلسة', () => {
  it('لا توجد جلسة في البداية', () => {
    expect(hasOwnerGateSession('uid-1')).toBe(false)
    expect(ownerGateRemainingMs()).toBe(0)
  })

  it('بعد نجاح الرمز تبقى الجلسة صالحة', () => {
    saveOwnerGateSession('uid-1')
    expect(hasOwnerGateSession('uid-1')).toBe(true)
    expect(ownerGateRemainingMs()).toBeGreaterThan(0)
  })

  it('غياب uid أثناء استعادة Firebase لا يُبطل الجلسة (سبب إعادة الرمز سابقاً)', () => {
    saveOwnerGateSession('uid-1')
    // أول تحميل: auth.currentUser ما زال null
    expect(hasOwnerGateSession(undefined)).toBe(true)
    expect(hasOwnerGateSession(null)).toBe(true)
    expect(hasOwnerGateSession('uid-1')).toBe(true)
  })

  it('uid مختلف يُبطل الجلسة (حساب آخر)', () => {
    saveOwnerGateSession('uid-1')
    expect(hasOwnerGateSession('uid-2')).toBe(false)
  })

  it('الخروج الصريح يُسقط الجلسة', () => {
    saveOwnerGateSession('uid-1')
    clearOwnerGateSession()
    expect(hasOwnerGateSession('uid-1')).toBe(false)
    expect(window.sessionStorage.getItem(OWNER_GATE_KEY)).toBe(null)
  })

  it('انتهاء المهلة الأمنية يُسقط الجلسة', () => {
    window.sessionStorage.setItem(
      OWNER_GATE_KEY,
      JSON.stringify({ uid: 'uid-1', expiresAt: Date.now() - 1 })
    )
    expect(hasOwnerGateSession('uid-1')).toBe(false)
  })

  it('المدة الافتراضية معقولة (30 دقيقة)', () => {
    saveOwnerGateSession('uid-1')
    expect(OWNER_GATE_TTL_MS).toBe(30 * 60 * 1000)
    expect(ownerGateRemainingMs()).toBeLessThanOrEqual(OWNER_GATE_TTL_MS)
  })

  it('سجل تالف لا يُسقط الصفحة', () => {
    window.sessionStorage.setItem(OWNER_GATE_KEY, 'not-json{')
    expect(hasOwnerGateSession('uid-1')).toBe(false)
  })
})
