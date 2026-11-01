// src/components/owner/MaintenancePanel.jsx — وضع الصيانة (TOGGLE_MAINTENANCE_MODE)
//
// يكتب settings/maintenance {enabled}. الفرض الفعلي على مستوى الخادم: عند
// التفعيل تُرفض كل كتابات المحتوى من غير المالك في قواعد Firestore
// (canWriteDuringMaintenance) — أي أن هذا المفتاح ليس تجميلياً.
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Wrench, ShieldCheck, AlertTriangle } from 'lucide-react';
import { db, auth } from '../../firebase';
import { writeAuditLog } from '../../permissions/audit';

const MaintenancePanel = ({ showToast }) => {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!db) return undefined;
    const unsub = onSnapshot(
      doc(db, 'settings', 'maintenance'),
      (snap) => {
        setEnabled(snap.exists() ? snap.data().enabled === true : false);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return () => unsub();
  }, []);

  const toggle = async () => {
    if (!db || busy) return;
    const next = !enabled;
    setBusy(true);
    try {
      await setDoc(
        doc(db, 'settings', 'maintenance'),
        {
          enabled: next,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || null,
        },
        { merge: true }
      );
      await writeAuditLog({
        action: next ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
        permissionKey: 'TOGGLE_MAINTENANCE_MODE',
        targetType: 'settings',
        targetId: 'maintenance',
        result: 'success',
        severity: 'high',
      });
      showToast?.(next ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
    } catch (e) {
      await writeAuditLog({
        action: 'MAINTENANCE_TOGGLE_FAILED',
        permissionKey: 'TOGGLE_MAINTENANCE_MODE',
        targetType: 'settings',
        targetId: 'maintenance',
        result: 'denied',
        details: e?.message || 'فشل',
        severity: 'high',
      });
      showToast?.('تعذّر تغيير وضع الصيانة', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Wrench className="text-[var(--rz-primary)]" size={22} />
        <h2 className="text-lg font-bold royal-text">وضع الصيانة</h2>
      </header>

      <div className="royal-surface royal-border border rounded-2xl p-5 space-y-3">
        <p className="text-sm royal-muted leading-7">
          عند التفعيل تُجمَّد كل عمليات الإنشاء (نشر إعلان، رسالة، تقييم، تعليق…)
          على مستوى خادم Firebase لكل من ليس المالك. المالك يواصل العمل عادةً.
          القراءة تبقى متاحة حتى لا ينكسر العرض.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold royal-text">
            {enabled ? (
              <>
                <AlertTriangle className="text-[var(--rz-primary)]" size={18} />
                <span>الصيانة مُفعّلة الآن</span>
              </>
            ) : (
              <>
                <ShieldCheck className="text-[var(--rz-primary)]" size={18} />
                <span>الموقع يعمل عادةً</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={toggle}
            disabled={!loaded || busy}
            aria-pressed={enabled}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition disabled:opacity-50 ${
              enabled ? 'bg-[var(--rz-primary)]' : 'bg-gray-400'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
};

export default MaintenancePanel;
