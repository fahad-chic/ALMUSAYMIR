// functions/api/auth-events.test.js — اختبار فرض الصلاحيات على الخادم (Cloudflare Function)
//
// السبب: TRACK_FAILED_LOGINS و VIEW_USER_IP_HISTORY لا يمكن فرضهما بقواعد Firestore
// (بياناتهما في D1)، فيُفرضان داخل الدالة: تحقق من رمز Firebase ID Token عبر REST
// ثم قراءة rbac/{uid} خادمياً. هذا الاختبار يشغّل منطق الدالة الحقيقي (onRequest)
// ويستبدل فقط نداءات الشبكة الخارجية (identitytoolkit/firestore REST) — وهي بالضبط
// الحدود الخارجية، فالمُختبَر هو منطق التخويل الفعلي لا واجهة وهمية.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from './auth-events';

const OWNER_EMAIL = 'f882771f@gmail.com';

const T = {
  owner: 'tok-owner-000000000000000000000000',
  adminA: 'tok-adminA-00000000000000000000000',
  adminB: 'tok-adminB-00000000000000000000000',
  user: 'tok-user-0000000000000000000000000',
};

const ACTORS = {
  [T.owner]: { email: OWNER_EMAIL, uid: 'uid-owner' },
  [T.adminA]: { email: 'admin-a@example.com', uid: 'uid-admin-a' },
  [T.adminB]: { email: 'admin-b@example.com', uid: 'uid-admin-b' },
  [T.user]: { email: 'user@example.com', uid: 'uid-user' },
};

// منح rbac: adminA يملك VIEW_USER_IP_HISTORY، والبقية لا.
const GRANTS = {
  'uid-admin-a': { VIEW_USER_IP_HISTORY: true },
  'uid-admin-b': {},
  'uid-user': {},
};

const jsonRes = (obj, ok = true) => ({ ok, json: async () => obj });

const makeDb = () => {
  const rows = [];
  const makeStmt = (sql) => ({
    bind: () => ({
      all: async () => ({ results: sql.includes('ip_history') ? rows : [] }),
      run: async () => ({}),
    }),
    all: async () => ({ results: [] }),
    run: async () => ({}),
  });
  return { prepare: (sql) => makeStmt(sql), _rows: rows };
};

const makeRequest = (method, path, { token, body } = {}) => ({
  method,
  url: `https://example.com${path}`,
  headers: {
    get: (name) => {
      const n = String(name).toLowerCase();
      if (n === 'authorization') return token ? `Bearer ${token}` : '';
      if (n === 'cf-connecting-ip') return '203.0.113.7';
      if (n === 'user-agent') return 'vitest';
      return null;
    },
  },
  json: async () => body || {},
});

beforeEach(() => {
  const env = {
    DB: makeDb(),
    FIREBASE_WEB_API_KEY: 'fake-web-key',
    VITE_FIREBASE_PROJECT_ID: 'demo-project',
    OWNER_EMAILS: OWNER_EMAIL,
  };
  globalThis.__ENV__ = env;

  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('accounts:lookup')) {
      const parsed = JSON.parse(opts.body || '{}');
      const actor = ACTORS[parsed.idToken];
      return jsonRes(actor ? { users: [{ email: actor.email, localId: actor.uid }] } : {});
    }
    if (u.includes('/documents/rbac/')) {
      const auth = String(opts.headers?.Authorization || '');
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const actor = ACTORS[token];
      const grants = actor ? GRANTS[actor.uid] || {} : {};
      const fields = { grants: { mapValue: { fields: Object.fromEntries(
        Object.entries(grants).map(([k, v]) => [k, { booleanValue: v }])
      ) } } };
      return jsonRes({ fields });
    }
    return jsonRes({}, false);
  });
});

const call = async (request) => {
  const res = await onRequest({ request, env: globalThis.__ENV__ });
  return { status: res.status, body: await res.json() };
};

describe('auth-events: فرض الصلاحيات خادمياً', () => {
  it('المالك يقرأ سجل عناوين IP (مسموح)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=ip_history', { token: T.owner }));
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('مشرف يملك VIEW_USER_IP_HISTORY يقرأ السجل (مسموح)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=ip_history', { token: T.adminA }));
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('مشرف بلا الصلاحية يُرفض (403)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=ip_history', { token: T.adminB }));
    expect(r.status).toBe(403);
    expect(r.body.success).toBe(false);
  });

  it('مستخدم عادي يُرفض (403)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=ip_history', { token: T.user }));
    expect(r.status).toBe(403);
  });

  it('بلا رمز هوية يُرفض (401)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=ip_history'));
    expect(r.status).toBe(401);
  });

  it('محاولات الدخول الفاشلة للمالك فقط: مشرف مصرّح يُرفض (403)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=failed_logins', { token: T.adminA }));
    expect(r.status).toBe(403);
  });

  it('محاولات الدخول الفاشلة: المالك يقرأ (200)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=failed_logins', { token: T.owner }));
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('تسجيل محاولة دخول فاشلة لا يتطلب مصادقة (200)', async () => {
    const r = await call(makeRequest('POST', '/api/auth-events', {
      body: { action: 'login_failed', email: 'x@example.com', reason: 'wrong-password' },
    }));
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('رموز غير معروفة تُرفض (401)', async () => {
    const r = await call(makeRequest('GET', '/api/auth-events?type=ip_history', { token: 'tok-unknown-000000000000000000000' }));
    expect(r.status).toBe(401);
  });
});
