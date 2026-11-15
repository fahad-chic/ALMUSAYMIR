// src/components/owner/PrivacyAuditPanel.jsx — لوحة تدقيق وإصلاح خصوصية السجلات
//
// لوحة دائمة في غرفة المالك تعمل من الجوال: تعرض تصنيف سجلات reviews/comments،
// وتتيح تنظيف السجلات التي تحمل بيانات شخصية، وترحيل المتسرّب إلى المجموعات
// الخاصة، وحذف أي سجل — كل ذلك مع تأكيد صريح قبل كل إجراء.
//
// أمان:
//  - كل عملية كتابة تمرّ بقواعد Firestore الفعلية (لا قدرة إضافية في الواجهة).
//  - الأرشفة قبل أي تغيير (لا فقدان بيانات) — عبر privacyRepair.
//  - كل إجراء يُسجَّل في audit_logs.
//  - الإجراءات التدميرية تحتاج تأكيداً صريحاً (نافذة تأكيد).
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import {
  ShieldCheck, RefreshCw, AlertTriangle, EyeOff, HelpCircle, CheckCircle2,
  Trash2, Eraser, ArrowLeftRight, Loader2,
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import usePermissions from '../../permissions/usePermissions';
import toast from '../../utils/toast';
import { classify, REVIEW_META, COMMENT_META } from '../../utils/legacyPrivacy';
import { repairRecord, deleteRecord, runBatch } from '../../utils/privacyRepair';

const SCAN_LIMIT = 1000;

// إخفاء جزئي للقيمة الشخصية في العرض (المالك يراها كاملة في السجل الخاص عند الحاجة).
const maskValue = (v) => {
  const s = String(v ?? '');
  if (!s) return '—';
  if (s.includes('@')) {
    const [a, b] = s.split('@');
    return `${a.slice(0, 1)}***@${b}`;
  }
  if (/^\+?\d[\d\s-]{5,}$/.test(s)) return `${s.slice(0, 3)}****${s.slice(-2)}`;
  return `${s.slice(0, 2)}***`;
};

const Bucket = ({ icon: Icon, tone, label, count, hint }) => (
  <div className="rounded-xl border p-3 flex items-start gap-3" style={{ borderColor: 'rgba(var(--rz-primary-rgb), .28)' }}>
    <Icon size={20} style={{ color: tone, flexShrink: 0, marginTop: 2 }} />
    <div className="min-w-0">
      <div className="flex items-baseline gap-2">
        <b className="text-lg" style={{ color: tone }}>{count}</b>
        <span className="font-bold text-sm">{label}</span>
      </div>
      {hint && <p className="text-xs royal-muted leading-relaxed mt-1">{hint}</p>}
    </div>
  </div>
);

// نافذة تأكيد صريحة قبل أي إجراء تدميري.
const ConfirmDialog = ({ open, title, body, confirmLabel, danger, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(24,19,22,.55)' }}
    >
      <div className="royal-surface royal-border border rounded-2xl p-5 w-full max-w-md space-y-3" style={{ background: 'var(--rz-ivory)' }}>
        <h3 className="font-black text-lg flex items-center gap-2">
          <AlertTriangle size={20} style={{ color: danger ? 'rgb(176,58,42)' : 'var(--rz-primary)' }} />
          {title}
        </h3>
        <p className="text-sm leading-relaxed">{body}</p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 font-bold px-4 py-2.5 rounded-xl text-white"
            style={{ background: danger ? 'rgb(176,58,42)' : 'var(--rz-primary)' }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 font-bold px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(var(--rz-primary-rgb), .12)', color: 'var(--rz-primary)' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

const RecordRow = ({ meta, record, onRepair, onDelete, busy }) => {
  const data = record.data || {};
  const piiKeys = Object.keys(record.pii || {});
  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'rgba(176,58,42,.35)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono royal-muted" dir="ltr">{record.id}</span>
        <span className="text-xs font-bold" style={{ color: 'rgb(176,58,42)' }}>
          {piiKeys.length} حقل شخصي
        </span>
      </div>
      <div className="text-xs royal-muted space-y-0.5">
        {piiKeys.map((k) => (
          <div key={k} dir="ltr" className="font-mono">{k}: {maskValue(data[k])}</div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRepair(meta, record)}
          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
          style={{ background: 'rgba(var(--rz-primary-rgb), .12)', color: 'var(--rz-primary)' }}
        >
          <Eraser size={14} /> تنظيف ونقل للخاص
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(meta, record)}
          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 text-white"
          style={{ background: 'rgb(176,58,42)' }}
        >
          <Trash2 size={14} /> حذف
        </button>
      </div>
    </div>
  );
};

const CollectionSection = ({ meta, buckets, onRepair, onRepairAll, onDelete, busy, progress }) => {
  const total = Object.values(buckets).reduce((n, a) => n + a.length, 0);
  const risky = [...buckets.publicWithPII, ...buckets.unknown];
  return (
    <section className="royal-surface royal-border border rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-black text-base">{meta.name === 'reviews' ? 'التقييمات (reviews)' : 'التعليقات (comments)'}</h3>
        <span className="text-xs royal-muted">إجمالي: {total}</span>
      </header>

      <div className="grid gap-2">
        <Bucket icon={CheckCircle2} tone="rgb(22,120,72)" label="منشور وخالٍ من البيانات الشخصية" count={buckets.publicClean.length} hint="سليم — لا يحتاج إجراء." />
        <Bucket icon={AlertTriangle} tone="rgb(176,58,42)" label="منشور لكنه يحمل بيانات شخصية" count={buckets.publicWithPII.length} hint="خطر ظهور عبر استعلام القائمة — نظّفه أو احذفه." />
        <Bucket icon={EyeOff} tone="rgb(118,109,114)" label="مخفي أو معلّق أو مرفوض" count={buckets.notPublic.length} hint="غير ظاهر للعامة." />
        <Bucket icon={HelpCircle} tone="rgb(150,110,30)" label="ناقص أو غير قابل للتصنيف" count={buckets.unknown.length} hint="محجوب تلقائياً؛ يمكن تنظيفه للاحتياط." />
      </div>

      {risky.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm">السجلات التي تحتاج معالجة ({risky.length})</h4>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRepairAll(meta, risky)}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 text-white"
              style={{ background: 'var(--rz-primary)' }}
            >
              <ArrowLeftRight size={14} /> ترحيل كل المتسرّب
            </button>
          </div>
          {progress && <p className="text-xs royal-muted">{progress}</p>}
          <div className="grid gap-2">
            {risky.map((rec) => (
              <RecordRow key={rec.id} meta={meta} record={rec} onRepair={onRepair} onDelete={onDelete} busy={busy} />
            ))}
          </div>
        </div>
      )}

      {risky.length === 0 && (
        <p className="text-sm" style={{ color: 'rgb(22,120,72)' }}>✓ لا سجلات متسرّبة في هذه المجموعة.</p>
      )}
    </section>
  );
};

const PrivacyAuditPanel = () => {
  const { isOwner, can } = usePermissions();
  const { user } = useAuth();
  const canSeeReviews = isOwner || can('MANAGE_REVIEWS');
  const canSeeComments = isOwner || can('HARAJ_COMMENT_EDIT') || can('HARAJ_COMMENT_DELETE');

  const [reviews, setReviews] = useState(null);
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [confirm, setConfirm] = useState(null);

  const actor = useMemo(
    () => ({ uid: user?.uid || null, email: user?.email || null }),
    [user],
  );

  useEffect(() => {
    if (!db) return undefined;
    const subs = [];
    const safe = (label, fn) => (snap) => {
      try { fn(snap); } catch (e) { console.error('privacy audit:', label, e); }
    };
    const fail = (label) => (err) => {
      console.error('privacy audit subscription:', label, err);
      setError('تعذّر قراءة بعض المجموعات — تأكد من صلاحيتك ثم أعد المحاولة.');
    };
    subs.push(onSnapshot(
      query(collection(db, 'reviews'), limit(SCAN_LIMIT)),
      safe('reviews', (s) => setReviews(s.docs.map((d) => ({ id: d.id, data: d.data() })))),
      fail('reviews'),
    ));
    subs.push(onSnapshot(
      query(collection(db, 'comments'), limit(SCAN_LIMIT)),
      safe('comments', (s) => setComments(s.docs.map((d) => ({ id: d.id, data: d.data() })))),
      fail('comments'),
    ));
    return () => subs.forEach((u) => u && u());
  }, [reloadKey]);

  const reviewBuckets = useMemo(() => (reviews ? classify(reviews, REVIEW_META) : null), [reviews]);
  const commentBuckets = useMemo(() => (comments ? classify(comments, COMMENT_META) : null), [comments]);

  const loading = reviews === null || comments === null;

  const doRepair = async (meta, record) => {
    setBusy(true);
    try {
      const res = await repairRecord(meta, record, actor);
      if (res.status === 'skipped') toast('لا يحتاج هذا السجل تنظيفاً.');
      else toast.success(`تم التنظيف${res.moved ? ' ونُقلت البيانات للخاص' : ''} — أُرشف قبل التغيير.`);
    } catch (e) {
      console.error('repair failed', e);
      toast.error(`تعذّر التنظيف: ${e?.message || 'خطأ غير متوقّع'}`);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const doDelete = async (meta, record) => {
    setBusy(true);
    try {
      await deleteRecord(meta, record, actor);
      toast.success('تم الحذف — أُرشف قبل الحذف ويمكن استعادته.');
    } catch (e) {
      console.error('delete failed', e);
      toast.error(`تعذّر الحذف: ${e?.message || 'خطأ غير متوقّع'}`);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const doRepairAll = async (meta, records) => {
    setBusy(true);
    setProgress('');
    try {
      const summary = await runBatch(
        records,
        (rec) => repairRecord(meta, rec, actor),
        (i, n) => setProgress(`جارٍ المعالجة… ${i}/${n}`),
      );
      setProgress('');
      if (summary.failed === 0) toast.success(`تم ترحيل/تنظيف ${summary.ok} سجلاً.`);
      else toast.error(`نجح ${summary.ok} وفشل ${summary.failed} — راجع السجلات المتبقية.`);
    } catch (e) {
      console.error('repair all failed', e);
      toast.error(`تعذّر الترحيل: ${e?.message || 'خطأ غير متوقّع'}`);
    } finally {
      setBusy(false);
      setProgress('');
      setConfirm(null);
    }
  };

  const askRepairOne = (meta, record) => setConfirm({
    title: 'تنظيف السجل',
    body: 'سيُنسخ السجل إلى الأرشيف، ثم تُنقل حقول الهوية إلى المجموعة الخاصة، وتُمسح من المستند العام. لا يُحذف السجل العام. متابعة؟',
    confirmLabel: 'تنظيف',
    danger: false,
    run: () => doRepair(meta, record),
  });

  const askDeleteOne = (meta, record) => setConfirm({
    title: 'حذف السجل',
    body: 'سيُنسخ السجل كاملاً إلى الأرشيف ثم يُحذف نهائياً من القاعدة. يمكن استعادته من الأرشيف لاحقاً. متابعة؟',
    confirmLabel: 'حذف',
    danger: true,
    run: () => doDelete(meta, record),
  });

  const askRepairAll = (meta, records) => setConfirm({
    title: `ترحيل ${records.length} سجلاً`,
    body: 'سيُعالَج كل سجل: أرشفة، نقل الهوية للخاص، ومسحها من العام. العملية تتتابع رغم أي فشل فردي وتُظهر ملخّصاً. متابعة؟',
    confirmLabel: 'ترحيل الكل',
    danger: false,
    run: () => doRepairAll(meta, records),
  });

  return (
    <div className="space-y-4">
      <header className="royal-surface royal-border border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} style={{ color: 'var(--rz-primary)' }} />
          <h2 className="font-black text-lg">تدقيق وإصلاح الخصوصية</h2>
        </div>
        <p className="text-sm royal-muted leading-relaxed">
          اعرض السجلات المصنّفة، ونظّف ما يحمل بيانات شخصية، ورحّل المتسرّب إلى
          المجموعات الخاصة، أو احذف أي سجل. كل إجراء يُؤرشف أولاً ويُسجَّل في سجل
          التدقيق. تظهر الأرقام محدّثة لحظياً بعد كل عملية.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg"
            style={{ background: 'rgba(var(--rz-primary-rgb), .12)', color: 'var(--rz-primary)' }}
          >
            <RefreshCw size={14} /> تحديث
          </button>
          {busy && (
            <span className="inline-flex items-center gap-1 text-xs royal-muted">
              <Loader2 size={14} className="animate-spin" /> {progress || 'جارٍ التنفيذ…'}
            </span>
          )}
        </div>
        {error && <p className="text-xs" style={{ color: 'rgb(176,58,42)' }}>{error}</p>}
      </header>

      {loading && <p className="text-sm royal-muted text-center py-6">جارٍ قراءة البيانات…</p>}

      {!loading && canSeeReviews && reviewBuckets && (
        <CollectionSection
          meta={REVIEW_META}
          buckets={reviewBuckets}
          onRepair={askRepairOne}
          onRepairAll={askRepairAll}
          onDelete={askDeleteOne}
          busy={busy}
          progress={progress}
        />
      )}
      {!loading && canSeeComments && commentBuckets && (
        <CollectionSection
          meta={COMMENT_META}
          buckets={commentBuckets}
          onRepair={askRepairOne}
          onRepairAll={askRepairAll}
          onDelete={askDeleteOne}
          busy={busy}
          progress={progress}
        />
      )}
      {!loading && !canSeeReviews && !canSeeComments && (
        <p className="text-sm royal-muted text-center py-6">لا تملك صلاحية قراءة هذه المجموعات.</p>
      )}

      <footer className="text-xs royal-muted leading-relaxed px-1">
        ملاحظة: العرض يقرأ حتى {SCAN_LIMIT} سجل لكل مجموعة. الأرشفة قبل كل تغيير
        تحفظ نسخة كاملة في deleted_archive. السجلات «غير القابلة للتصنيف» تبقى
        محجوبة عن العامة تلقائياً حتى لو تُركت بلا إجراء.
      </footer>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={() => confirm?.run()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default PrivacyAuditPanel;
