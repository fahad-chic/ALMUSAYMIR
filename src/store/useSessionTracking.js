// src/store/useSessionTracking.js — تتبّع الجلسات الحيّة (نبضة دورية)
//
// وثيقة واحدة لكل عضو موثّق في مجموعة `sessions/{uid}` تُحدَّث بنبضة كل دقيقة
// لتُظهر «من متصل الآن». هذا مراقبة فقط — لا يمنح أي قدرة تنفيذية، والكتابة
// مقصورة على صاحب الجلسة نفسه (تفرضها قواعد Firestore على /sessions).
import { create } from 'zustand';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// الجلسة تُعتبر منتهية إن تجاوزت آخر نبضة هذه المدة (ثانيتان ونصف النبضة).
export const SESSION_STALE_MS = 150000;
export const HEARTBEAT_INTERVAL_MS = 60000;

export const SESSIONS_COLLECTION = 'sessions';

/** يبني حمولة النبضة (نقيّة — قابلة للاختبار). */
export const buildSessionPayload = ({ uid, role, userAgent } = {}) => ({
  uid: String(uid || ''),
  role: String(role || 'user'),
  userAgent: String(userAgent || '').slice(0, 300),
});

/** هل الجلسة حيّة الآن؟ (نقيّة) */
export const isSessionLive = (session, now = Date.now()) => {
  const seen = session?.lastSeenAt;
  const ms = typeof seen?.toMillis === 'function' ? seen.toMillis() : Number(seen || 0);
  return ms > 0 && now - ms < SESSION_STALE_MS;
};

const useSessionTracking = create((set) => ({
  sessions: {},
  setSessions: (sessions) => set({ sessions }),
}));

let heartbeatTimer = null;
let unsubscribe = null;
let currentUid = null;

const writeBeat = async (uid, role) => {
  if (!db || !uid) return;
  try {
    await setDoc(
      doc(db, SESSIONS_COLLECTION, uid),
      { ...buildSessionPayload({ uid, role, userAgent: navigator?.userAgent }), lastSeenAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // المراقبة غير حرجة — لا نُفشل أي إجراء بسبب فشل النبضة
  }
};

/**
 * يبدأ تتبّع جلسة العضو: نبضة فورية ثم دورية، ومستمع لحظي لقائمة الجلسات.
 * يُستدعى مرة واحدة من App عند تأكيد جلسة موثّقة.
 */
export const startSessionTracking = (uid, role) => {
  if (!db || !uid) return () => {};
  if (currentUid === uid && heartbeatTimer) return () => {};

  stopSessionTracking();
  currentUid = uid;

  writeBeat(uid, role);
  heartbeatTimer = setInterval(() => writeBeat(uid, role), HEARTBEAT_INTERVAL_MS);

  unsubscribe = onSnapshot(
    doc(db, SESSIONS_COLLECTION, uid),
    () => {},
    () => {}
  );

  return () => stopSessionTracking();
};

export const stopSessionTracking = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (unsubscribe) unsubscribe();
  heartbeatTimer = null;
  unsubscribe = null;
  currentUid = null;
};

export default useSessionTracking;
