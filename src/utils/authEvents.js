// src/utils/authEvents.js — عميل أحداث المصادقة (محاولات فاشلة + سجل IP)
//
// يسجّل محاولات الدخول الفاشلة وسجل عناوين IP على الخادم عبر /api/auth-events.
// عنوان IP يُقرأ خادمياً (cf-connecting-ip) — لا يُرسَل من المتصفح ولا يُزور.
// كل الدوال «أفضل جهد»: فشل الشبكة لا يكسر تجربة الدخول.
import { auth } from '../firebase';

const ENDPOINT = '/api/auth-events';

const post = async (payload) => {
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // غير حرج
  }
};

/** يسجّل محاولة دخول فاشلة (يُستدعى عند خطأ signInWithEmailAndPassword). */
export const recordFailedLogin = (email, reason) =>
  post({ action: 'login_failed', email: String(email || '').trim().toLowerCase(), reason: reason || '' });

/** يسجّل نجاح دخول العضو الحالي ويحدّث سجل IP (يتطلب رمز الهوية). */
export const recordLoginSuccess = async () => {
  try {
    const current = auth?.currentUser;
    if (!current) return;
    const token = await current.getIdToken();
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'login_success' }),
    });
  } catch {
    // غير حرج
  }
};

/** يجلب محاولات الدخول الفاشلة (للمالك فقط). */
export const fetchFailedLogins = async (email = '', limit = 100) => {
  const current = auth?.currentUser;
  if (!current) return [];
  const token = await current.getIdToken();
  const qs = new URLSearchParams({ type: 'failed_logins', limit: String(limit) });
  if (email) qs.set('email', email);
  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.items) ? data.items : [];
};

/** يجلب سجل عناوين IP (للمالك فقط). */
export const fetchIpHistory = async (email = '', limit = 100) => {
  const current = auth?.currentUser;
  if (!current) return [];
  const token = await current.getIdToken();
  const qs = new URLSearchParams({ type: 'ip_history', limit: String(limit) });
  if (email) qs.set('email', email);
  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.items) ? data.items : [];
};
