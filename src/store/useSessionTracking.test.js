// src/store/useSessionTracking.test.js — اختبارات نبضة الجلسة (بناء الحمولة + الحيوية)
import { describe, it, expect } from 'vitest';
import {
  buildSessionPayload,
  isSessionLive,
  SESSION_STALE_MS,
  SESSIONS_COLLECTION,
} from './useSessionTracking';

describe('useSessionTracking — حمولة النبضة', () => {
  it('تبني الحقول المتوافقة مع قاعدة sessions (uid/role/userAgent)', () => {
    const p = buildSessionPayload({ uid: 'u1', role: 'owner', userAgent: 'UA' });
    expect(p).toEqual({ uid: 'u1', role: 'owner', userAgent: 'UA' });
    expect(SESSIONS_COLLECTION).toBe('sessions');
  });

  it('تقصّ الـ userAgent الطويل وتضع قيماً افتراضية', () => {
    const p = buildSessionPayload({ uid: 'u1', userAgent: 'x'.repeat(500) });
    expect(p.userAgent.length).toBe(300);
    expect(p.role).toBe('user');
  });
});

describe('isSessionLive — حيوية الجلسة', () => {
  it('جلسة حديثة تُعد حيّة', () => {
    const now = Date.now();
    expect(isSessionLive({ lastSeenAt: { toMillis: () => now - 1000 } }, now)).toBe(true);
  });

  it('جلسة قديمة تتجاوز المدة تُعد منتهية', () => {
    const now = Date.now();
    expect(isSessionLive({ lastSeenAt: { toMillis: () => now - SESSION_STALE_MS - 1 } }, now)).toBe(false);
  });

  it('تقبل أيضاً طابعاً رقمياً (مللي ثانية) وترفض الفارغ', () => {
    const now = Date.now();
    expect(isSessionLive({ lastSeenAt: now - 1000 }, now)).toBe(true);
    expect(isSessionLive({}, now)).toBe(false);
    expect(isSessionLive(null, now)).toBe(false);
  });
});
