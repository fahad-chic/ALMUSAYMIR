// src/components/owner/RegistrationPanel.jsx — بوابة التسجيل (BLOCK_USER_REGISTRATION)
//
// يكتب settings/registrationGate {blocked, reason}. الفرض الفعلي على مستوى
// الخادم: عند blocked=true تُرفض كتابة users/{uid} في قواعد Firestore
// (registrationBlocked)، فيبقى أي حساب جديد بلا وثيقة عضوية ولا يفتح الموقع
// (isSignedIn تشترط العضوية). الحسابات القائمة تستمر بالدخول.
// الافتراضي مفتوح (blocked=false) — لا يُوقف التسجيل إلا كزر طوارئ.
// كل إغلاق/فتح يُسجَّل في audit_logs و security_logs ويُرسل تنبيه للمالك
// (actor/timestamp/target/result + السبب).
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { db, auth } from '../../firebase';
import { writeAuditLog } from '../../permissions/audit';

const RegistrationPanel = ({ showToast }) => {
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!db) return undefined;
    const unsub = onSnapshot(
      doc(db, 'settings', 'registrationGate'),
      (snap) => {
        setBlocked(snap.exists() ? snap.data().blocked === true : false);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return () => unsub();
  }, []);

  const toggle = async () => {
    if (!db || busy) return;
    const next = !blocked;

    if (next && !reason.trim()) {
      showToast?.('اكتب سبب الإيقاف أولاً', 'error');
      return;
    }

    setBusy(true);
    const actor = auth.currentUser?.email || auth.currentUser?.uid || null;
    const cleanReason = next ? reason.trim() : '';
    try {
      await setDoc(
        doc(db, 'settings', 'registrationGate'),
        {
          blocked: next,
          reason: cleanReason,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || null,
          updatedByEmail: actor,
        },
        { merge: true }
      );

      // سجل التدقيق الموحّد (actor/timestamp/target/result + السبب).
      await writeAuditLog({
        action: next ? 'REGISTRATION_BLOCKED' : 'REGISTRATION_REOPENED',
        permissionKey: 'BLOCK_USER_REGISTRATION',
        targetType: 'settings',
        targetId: 'registrationGate',
        result: 'success',
        details: next
          ? `إيقاف التسجيل — السبب: ${cleanReason}`
          : 'إعادة فتح التسجيل',
        severity: 'high',
      });

      // سجل أمني (يقرأه المالك في المراقبة) + تنبيه فوري لغرفته.
      try {
        await addDoc(collection(db, 'security_logs'), {
          type: next ? 'registration_blocked' : 'registration_reopened',
          details: next
            ? `أوقف ${actor} التسجيل — السبب: ${cleanReason}`
            : `أعاد ${actor} فتح التسجيل`,
          severity: next ? 'high' : 'info',
          actorEmail: actor,
          timestamp: serverTimestamp(),
        });
      } catch {
        /* السجل الأمني إضافي — لا يُفشل العملية */
      }

      try {
        await addDoc(collection(db, 'notifications'), {
          title: next ? 'تم إيقاف التسجيل' : 'تم فتح التسجيل',
          body: next
            ? `بواسطة ${actor} — السبب: ${cleanReason}`
            : `بواسطة ${actor}`,
          read: false,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } catch {
        /* التنبيه إضافي */
      }

      setReason('');
      showToast?.(next ? 'تم إيقاف التسجيل مؤقتاً' : 'تم إعادة فتح التسجيل');
    } catch (e) {
      await writeAuditLog({
        action: 'REGISTRATION_TOGGLE_FAILED',
        permissionKey: 'BLOCK_USER_REGISTRATION',
        targetType: 'settings',
        targetId: 'registrationGate',
        result: 'denied',
        details: e?.message || 'فشل',
        severity: 'high',
      });
      showToast?.('تعذّر تغيير حالة التسجيل', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <UserX className="text-[var(--rz-primary)]" size={22} />
        <h2 className="text-lg font-bold royal-text">بوابة التسجيل</h2>
      </header>

      <div className="royal-surface royal-border border rounded-2xl p-5 space-y-3">
        <p className="text-sm royal-muted leading-7">
          زر طوارئ فقط. التسجيل <b>مفتوح افتراضياً</b>. عند الإيقاف تُرفض وثيقة
          العضوية (users) لأي حساب جديد على مستوى خادم Firebase، فلا يُفتح له
          الموقع. لا تُحذف بيانات المستخدمين الحاليين ولا يُعطَّل دخولهم.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold royal-text">
            {blocked ? (
              <>
                <AlertTriangle className="text-[var(--rz-primary)]" size={18} />
                <span>التسجيل متوقف مؤقتاً</span>
              </>
            ) : (
              <>
                <UserCheck className="text-[var(--rz-primary)]" size={18} />
                <span>التسجيل مفتوح (الافتراضي)</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={toggle}
            disabled={!loaded || busy}
            aria-pressed={blocked}
            aria-label={blocked ? 'إعادة فتح التسجيل' : 'إيقاف التسجيل'}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition disabled:opacity-50 ${
              blocked ? 'bg-[var(--rz-primary)]' : 'bg-gray-400'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                blocked ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            blocked
              ? 'سبب الإيقاف الحالي (يظهر في السجل)'
              : 'سبب الإيقاف (مطلوب عند الإيقاف — مثال: هجوم تسجيلات وهمية)'
          }
          className="w-full rounded-lg border royal-border bg-[var(--rz-ivory)] px-3 py-2 text-sm royal-text"
        />
      </div>
    </section>
  );
};

export default RegistrationPanel;

