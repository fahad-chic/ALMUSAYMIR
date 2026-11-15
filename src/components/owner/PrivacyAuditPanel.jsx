// src/components/owner/PrivacyAuditPanel.jsx — تدقيق خصوصية السجلات (قراءة فقط)
//
// الغرض: إتاحة "معاينة ترحيل" بيانات reviews/comments القديمة من داخل غرفة
// المالك — بلا حاجة إلى كمبيوتر أو gcloud أو أي مفتاح سري. يعمل من الجوال.
//
// ⚠ للقراءة فقط: لا يكتب ولا يعدّل ولا يحذف أي مستند. لا يوجد فيه أي زر ترحيل.
//    أي ترحيل فعلي يحتاج موافقة المالك الصريحة + أداة منفصلة.
//
// المصدر: يقرأ المجموعتين العامتين (reviews/comments) والخاصتين
// (review_private/comment_private) لأن المالك يملك قراءتها بحكم القواعد.
// يُدمج السجل العام مع وجود نظيره الخاص لتصنيفه بدقة.
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { ShieldCheck, RefreshCw, AlertTriangle, EyeOff, HelpCircle, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase';
import usePermissions from '../../permissions/usePermissions';
import {
  classify,
  REVIEW_META,
  COMMENT_META,
} from '../../utils/legacyPrivacy';

// سقف قراءة معقول: يكفي للتصنيف التشغيلي بلا استهلاك كبير على الجوال.
const SCAN_LIMIT = 1000;

const Bucket = ({ icon: Icon, tone, label, count, hint }) => (
  <div
    className="rounded-xl border p-3 flex items-start gap-3"
    style={{ borderColor: 'rgba(var(--rz-primary-rgb), .28)' }}
  >
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

const Tally = ({ title, tally }) => {
  const keys = Object.keys(tally || {});
  if (!keys.length) return null;
  return (
    <div className="text-xs royal-muted leading-relaxed">
      <span className="font-bold">{title}: </span>
      {keys.map((k) => `${k} (${tally[k]})`).join(' · ')}
    </div>
  );
};

const CollectionReport = ({ meta, buckets }) => {
  const total = Object.values(buckets).reduce((n, a) => n + a.length, 0);
  const piiFields = {};
  for (const r of buckets.publicWithPII) {
    for (const f of Object.keys(r.pii || {})) piiFields[f] = (piiFields[f] || 0) + 1;
  }
  return (
    <section className="royal-surface royal-border border rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-black text-base">
          {meta.name === 'reviews' ? 'التقييمات (reviews)' : 'التعليقات (comments)'}
        </h3>
        <span className="text-xs royal-muted">إجمالي: {total}</span>
      </header>

      <div className="grid gap-2">
        <Bucket
          icon={CheckCircle2}
          tone="rgb(22,120,72)"
          label="منشور وخالٍ من البيانات الشخصية"
          count={buckets.publicClean.length}
          hint="سليم — لا يحتاج أي إجراء."
        />
        <Bucket
          icon={AlertTriangle}
          tone="rgb(176,58,42)"
          label="منشور لكنه يحمل بيانات شخصية"
          count={buckets.publicWithPII.length}
          hint={`خطر ظهور عبر استعلام القائمة. يحتاج فصل البيانات إلى ${meta.privateName}.`}
        />
        <Bucket
          icon={EyeOff}
          tone="rgb(118,109,114)"
          label="مخفي أو معلّق أو مرفوض"
          count={buckets.notPublic.length}
          hint="غير ظاهر للعامة — لا تسريب."
        />
        <Bucket
          icon={HelpCircle}
          tone="rgb(150,110,30)"
          label="ناقص أو غير قابل للتصنيف"
          count={buckets.unknown.length}
          hint="محجوب تلقائياً عن العامة — يُترك بلا تغيير."
        />
      </div>

      {Object.keys(piiFields).length > 0 && (
        <Tally title="حقول شخصية في سجلات منشورة (اسم الحقل: عدد السجلات)" tally={piiFields} />
      )}
    </section>
  );
};

const PrivacyAuditPanel = () => {
  const { isOwner, can } = usePermissions();
  const canSeeReviews = isOwner || can('MANAGE_REVIEWS');
  const canSeeComments = isOwner || can('HARAJ_COMMENT_EDIT') || can('HARAJ_COMMENT_DELETE');

  const [reviews, setReviews] = useState(null);
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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

  const reviewBuckets = useMemo(
    () => (reviews ? classify(reviews, REVIEW_META) : null),
    [reviews],
  );
  const commentBuckets = useMemo(
    () => (comments ? classify(comments, COMMENT_META) : null),
    [comments],
  );

  const loading = reviews === null || comments === null;

  return (
    <div className="space-y-4" key={reloadKey}>
      <header className="royal-surface royal-border border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} style={{ color: 'var(--rz-primary)' }} />
          <h2 className="font-black text-lg">تدقيق خصوصية السجلات</h2>
        </div>
        <p className="text-sm royal-muted leading-relaxed">
          معاينة <b>قراءة فقط</b> لبيانات التقييمات والتعليقات القديمة. لا يُكتب أو
          يُعدّل أو يُحذف أي شيء من هذه الصفحة. الغرض: معرفة كم سجلاً يحتاج ترحيلاً
          قبل أي إجراء.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg"
            style={{ background: 'rgba(var(--rz-primary-rgb), .12)', color: 'var(--rz-primary)' }}
          >
            <RefreshCw size={14} /> تحديث العرض
          </button>
          <span className="text-xs royal-muted">
            يُحدَّث تلقائياً لحظياً — الزر لإعادة القراءة فقط.
          </span>
        </div>
        {error && <p className="text-xs" style={{ color: 'rgb(176,58,42)' }}>{error}</p>}
      </header>

      {loading && (
        <p className="text-sm royal-muted text-center py-6">جارٍ قراءة البيانات…</p>
      )}

      {!loading && canSeeReviews && reviewBuckets && (
        <CollectionReport meta={REVIEW_META} buckets={reviewBuckets} />
      )}
      {!loading && canSeeComments && commentBuckets && (
        <CollectionReport meta={COMMENT_META} buckets={commentBuckets} />
      )}
      {!loading && !canSeeReviews && !canSeeComments && (
        <p className="text-sm royal-muted text-center py-6">
          لا تملك صلاحية قراءة هذه المجموعات.
        </p>
      )}

      <footer className="text-xs royal-muted leading-relaxed px-1">
        ملاحظة: الأرقام أعلاه للتصنيف التشغيلي فقط (سقف {SCAN_LIMIT} سجل لكل مجموعة).
        السجلات «غير القابلة للتصنيف» تبقى محجوبة عن العامة تلقائياً. أي ترحيل فعلي
        يتطلّب موافقة المالك الصريحة وتُنفَّذ أداة منفصلة.
      </footer>
    </div>
  );
};

export default PrivacyAuditPanel;
