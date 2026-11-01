// src/components/owner/MonitoringPanel.jsx — لوحة المراقبة والتدقيق (Phase 1)
//
// كل قسم يُعرض فقط لمن يملك صلاحيته (تحقق من القواعد خادمياً أيضاً — لا يكفي
// إخفاء القسم في الواجهة). البيانات كلها حقيقية من Firestore / واجهة الخادم:
//   - الجلسات الحيّة        : sessions            → TRACK_EMPLOYEE_LIVE_SESSIONS
//   - محاولات الدخول الفاشلة : /api/auth-events    → TRACK_FAILED_LOGINS
//   - سجل عناوين IP         : /api/auth-events    → VIEW_USER_IP_HISTORY
//   - سجل التدقيق           : audit_logs          → VIEW_SYSTEM_AUDIT_LOGS
//   - سجل التغييرات (Mutations): audit_logs        → FIREBASE_MUTATION_LOGS
//   - أرشيف المحذوفات       : deleted_archive     → RECOVER_DELETED_ITEMS_ARCHIVE
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from 'firebase/firestore';
import { Radio, ShieldAlert, Globe, ScrollText, Database, ArchiveRestore, BellRing, Users } from 'lucide-react';
import { db } from '../../firebase';
import { isSessionLive } from '../../store/useSessionTracking';
import { fetchFailedLogins, fetchIpHistory } from '../../utils/authEvents';
import { restoreArchived } from '../../utils/archive';
import { writeAuditLog } from '../../permissions/audit';

const fmtTime = (value) => {
  if (!value) return '—';
  try {
    const ms = typeof value?.toMillis === 'function'
      ? value.toMillis()
      : value?.seconds
        ? value.seconds * 1000
        : typeof value === 'number'
          ? value * 1000
          : Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toLocaleString('ar-SA') : '—';
  } catch {
    return '—';
  }
};

const Section = ({ icon: Icon, title, children, count }) => (
  <section className="royal-surface royal-border border rounded-2xl p-5 space-y-3">
    <header className="flex items-center gap-2">
      <Icon className="text-[var(--rz-primary)]" size={20} />
      <h3 className="font-bold royal-text">{title}</h3>
      {typeof count === 'number' && (
        <span className="text-xs royal-muted">({count})</span>
      )}
    </header>
    {children}
  </section>
);

const Empty = ({ text = 'لا توجد بيانات' }) => (
  <p className="text-sm royal-muted">{text}</p>
);

const Row = ({ children }) => (
  <div className="text-sm royal-text border-t royal-border pt-2 mt-2 leading-6">
    {children}
  </div>
);

const MonitoringPanel = ({ can, showToast }) => {
  const [sessions, setSessions] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [ipHistory, setIpHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [archive, setArchive] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [harajProfiles, setHarajProfiles] = useState([]);

  const canSessions = can('TRACK_EMPLOYEE_LIVE_SESSIONS');
  const canFailed = can('TRACK_FAILED_LOGINS');
  const canIp = can('VIEW_USER_IP_HISTORY');
  const canAudit = can('VIEW_SYSTEM_AUDIT_LOGS');
  const canMutations = can('FIREBASE_MUTATION_LOGS');
  const canArchive = can('RECOVER_DELETED_ITEMS_ARCHIVE');

  useEffect(() => {
    if (!db || !canSessions) return undefined;
    const unsub = onSnapshot(
      collection(db, 'sessions'),
      (snap) => setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setSessions([])
    );
    return () => unsub();
  }, [canSessions]);

  useEffect(() => {
    if (!canFailed) return;
    let alive = true;
    fetchFailedLogins('', 100).then((items) => alive && setFailedLogins(items)).catch(() => {});
    return () => { alive = false; };
  }, [canFailed]);

  useEffect(() => {
    if (!canIp) return;
    let alive = true;
    fetchIpHistory('', 100).then((items) => alive && setIpHistory(items)).catch(() => {});
    return () => { alive = false; };
  }, [canIp]);

  useEffect(() => {
    if (!db || (!canAudit && !canMutations)) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150)),
      (snap) => setAuditLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setAuditLogs([])
    );
    return () => unsub();
  }, [canAudit, canMutations]);

  useEffect(() => {
    if (!db || !canArchive) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'deleted_archive'), orderBy('deletedAt', 'desc'), limit(100)),
      (snap) => setArchive(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setArchive([])
    );
    return () => unsub();
  }, [canArchive]);

  // سجل أمني عام (محاولات حراج ثانٍ، إيقاف/فتح التسجيل، محاولات دخول بأرقام
  // الغير…) — يُقرأ بصلاحية VIEW_SYSTEM_AUDIT_LOGS (نفس قاعدة security_logs).
  useEffect(() => {
    if (!db || !canAudit) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(150)),
      (snap) => setSecurityLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setSecurityLogs([])
    );
    return () => unsub();
  }, [canAudit]);

  // ملفات حراج — تُقرأ للمسجّلين؛ نستخدمها لعرض الحسابات المرتبطة للمالك.
  useEffect(() => {
    if (!db || !canAudit) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'haraj_users'), limit(500)),
      (snap) => setHarajProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setHarajProfiles([])
    );
    return () => unsub();
  }, [canAudit]);

  const handleRestore = async (item) => {
    if (!window.confirm(`استعادة العنصر ${item.sourceId} إلى ${item.sourceCollection}؟`)) return;
    try {
      await restoreArchived(item.id, item, { uid: null, email: null });
      showToast?.('تمت الاستعادة بنجاح');
    } catch (e) {
      showToast?.(e?.message || 'تعذّرت الاستعادة', 'error');
      await writeAuditLog({
        action: 'RECOVER_DELETED_ITEM_FAILED',
        permissionKey: 'RECOVER_DELETED_ITEMS_ARCHIVE',
        targetType: item.sourceCollection,
        targetId: item.sourceId,
        result: 'denied',
        details: e?.message || 'فشل',
        severity: 'high',
      });
    }
  };

  const liveSessions = sessions.filter((s) => isSessionLive(s));
  const mutationLogs = auditLogs.filter(
    (l) => l.result === 'success' && /DELETE|UPDATE|CREATE|BAN|RESTORE|APPROVE|GRANT|REVOKE|TRANSFER|SUSPEND/.test(String(l.action || ''))
  );

  // ===== مراقبة الحسابات/الملفات المرتبطة (قراءة فقط — القرار للمالك) =====
  // تجميع ملفات الحراج حسب رقم الجوال أو البريد. التكرار هنا مؤشر مراجعة لا
  // حظر تلقائي (لا يُحظر أحد تلقائياً). لا نستخدم IP أو بصمة الجهاز لأن ذلك
  // يحتاج أساساً نظامياً وسياسة خصوصية معلنة (غير متوفرين) — انظر التقرير.
  const norm = (v) => String(v || '').trim().toLowerCase();
  const groupDuplicates = (keyFn) => {
    const map = new Map();
    for (const p of harajProfiles) {
      const k = keyFn(p);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    }
    return [...map.entries()].filter(([, arr]) => arr.length > 1);
  };
  const phoneDupes = groupDuplicates((p) => (p.phone ? String(p.phone) : null));
  const emailDupes = groupDuplicates((p) => norm(p.email) || null);

  const harajSecurityLogs = securityLogs.filter((l) =>
    /haraj|registration/.test(String(l.type || ''))
  );

  return (
    <div className="space-y-5">
      {canSessions && (
        <Section icon={Radio} title="الجلسات الحيّة" count={liveSessions.length}>
          {liveSessions.length === 0 ? <Empty text="لا أحد متصل الآن" /> : liveSessions.map((s) => (
            <Row key={s.id}>
              <b>{s.role}</b> · <span className="font-mono text-xs">{s.uid}</span><br />
              آخر ظهور: {fmtTime(s.lastSeenAt)}
            </Row>
          ))}
        </Section>
      )}

      {canFailed && (
        <Section icon={ShieldAlert} title="محاولات الدخول الفاشلة" count={failedLogins.length}>
          {failedLogins.length === 0 ? <Empty /> : failedLogins.map((f, i) => (
            <Row key={`${f.created_at}-${i}`}>
              <b>{f.email}</b> · IP: <span className="font-mono text-xs">{f.ip}</span><br />
              {f.reason || 'سبب غير محدد'} — {fmtTime(f.created_at)}
            </Row>
          ))}
        </Section>
      )}

      {canIp && (
        <Section icon={Globe} title="سجل عناوين IP" count={ipHistory.length}>
          {ipHistory.length === 0 ? <Empty /> : ipHistory.map((h, i) => (
            <Row key={`${h.created_at}-${i}`}>
              <b>{h.email}</b> · IP: <span className="font-mono text-xs">{h.ip}</span><br />
              {h.event} — {fmtTime(h.created_at)}
            </Row>
          ))}
        </Section>
      )}

      {canAudit && (
        <Section icon={ScrollText} title="سجل التدقيق" count={auditLogs.length}>
          {auditLogs.length === 0 ? <Empty /> : auditLogs.slice(0, 60).map((l) => (
            <Row key={l.id}>
              <b>{l.action}</b> — {l.result} {l.permissionKey ? `(${l.permissionKey})` : ''}<br />
              <span className="font-mono text-xs">{l.actorEmail || l.actorUid || '—'}</span>
              {l.targetId ? <> → {l.targetId}</> : null} — {fmtTime(l.timestamp)}
            </Row>
          ))}
        </Section>
      )}

      {canMutations && (
        <Section icon={Database} title="سجل التغييرات (Mutations)" count={mutationLogs.length}>
          {mutationLogs.length === 0 ? <Empty /> : mutationLogs.slice(0, 60).map((l) => (
            <Row key={l.id}>
              <b>{l.action}</b> — {l.targetType || ''} {l.targetId || ''}<br />
              <span className="font-mono text-xs">{l.actorEmail || l.actorUid || '—'}</span> — {fmtTime(l.timestamp)}
            </Row>
          ))}
        </Section>
      )}

      {canArchive && (
        <Section icon={ArchiveRestore} title="أرشيف المحذوفات" count={archive.length}>
          {archive.length === 0 ? <Empty /> : archive.map((a) => (
            <Row key={a.id}>
              <b>{a.sourceCollection}</b> / <span className="font-mono text-xs">{a.sourceId}</span>
              {a.restored ? ' (مُستعاد)' : ''}<br />
              حُذف: {fmtTime(a.deletedAt)}
              {!a.restored && (
                <button
                  type="button"
                  onClick={() => handleRestore(a)}
                  className="mr-3 gold-button px-3 py-1 rounded-lg text-xs font-bold"
                >
                  استعادة
                </button>
              )}
            </Row>
          ))}
        </Section>
      )}

      {canAudit && (
        <Section icon={Users} title="حسابات وملفات حراج مرتبطة" count={phoneDupes.length + emailDupes.length}>
          <p className="text-xs royal-muted leading-6">
            مؤشرات مراجعة فقط — لا حظر تلقائي. القرار لصاحب الموقع. التطابق
            برقم موثق أو بريد مؤكد، ولا نستخدم IP/بصمة الجهاز.
          </p>

          {phoneDupes.length === 0 && emailDupes.length === 0 ? (
            <Empty text="لا توجد ملفات حراج مكررة" />
          ) : (
            <>
              {phoneDupes.map(([phone, arr]) => (
                <Row key={`ph-${phone}`}>
                  <b className="text-[var(--rz-primary)]">تطابق رقم جوال (مؤكد)</b>: {phone}
                  <div className="mt-1 space-y-1">
                    {arr.map((p) => (
                      <div key={p.id} className="font-mono text-xs royal-muted">
                        {p.name || '—'} · {p.email || 'بلا بريد'} · uid: {p.authUid || p.id}
                      </div>
                    ))}
                  </div>
                </Row>
              ))}
              {emailDupes.map(([email, arr]) => (
                <Row key={`em-${email}`}>
                  <b className="text-[var(--rz-primary)]">تطابق بريد</b>: {email}
                  <div className="mt-1 space-y-1">
                    {arr.map((p) => (
                      <div key={p.id} className="font-mono text-xs royal-muted">
                        {p.name || '—'} · {p.phone || '—'} · uid: {p.authUid || p.id}
                      </div>
                    ))}
                  </div>
                </Row>
              ))}
            </>
          )}
        </Section>
      )}

      {canAudit && (
        <Section icon={BellRing} title="تنبيهات أمنية (حراج/التسجيل)" count={harajSecurityLogs.length}>
          {harajSecurityLogs.length === 0 ? <Empty /> : harajSecurityLogs.slice(0, 60).map((l) => (
            <Row key={l.id}>
              <b>{l.type}</b>
              {l.severity ? ` — ${l.severity}` : ''}<br />
              {l.details}<br />
              <span className="font-mono text-xs">{l.actorEmail || l.actorUid || '—'}</span> — {fmtTime(l.timestamp)}
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
};

export default MonitoringPanel;
