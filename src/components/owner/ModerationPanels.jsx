// src/components/owner/ModerationPanels.jsx — لوحات المراجعة المشتركة
// تُستخدم من غرفة المالك ومن غرفة المشرف معاً (لا نسخ مكررة).
// كل عملية تُمرّ عبر requirePerm (يرفض محلياً + يسجّل) ثم تُفرض خادمياً بقواعد
// Firestore (reports/reviews) — الواجهة لا تمنح أي قدرة بذاتها.
import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Flag, Star } from 'lucide-react';
import { db, auth } from '../../firebase';
import usePermissions from '../../permissions/usePermissions';
import { requirePerm } from '../../permissions/rbacService';
import { writeAuditLog } from '../../permissions/audit';

const safeNumber = (value, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatNumber = (value) => safeNumber(value).toLocaleString('ar-SA');

const formatDate = (value) => {
  if (!value) return '';
  try {
    const date = value?.seconds
      ? new Date(value.seconds * 1000)
      : value?.toDate
        ? value.toDate()
        : new Date(value);
    return Number.isFinite(date?.getTime?.())
      ? date.toLocaleString('ar-SA')
      : '';
  } catch {
    return '';
  }
};

const EmptyState = ({ icon: Icon, text }) => (
  <div className="text-center py-8 royal-muted">
    <Icon size={30} className="mx-auto mb-2 opacity-40" />
    <p className="text-sm font-medium">{text}</p>
  </div>
);

export const REPORTS_PERM = 'MANAGE_REPORTS';

export const ReportsPanel = ({ reports = [], onChanged }) => {
  const { can } = usePermissions();
  const canManage = can(REPORTS_PERM);
  const [busyId, setBusyId] = useState('');
  const [noteFor, setNoteFor] = useState('');
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');

  const setStatus = async (report, status) => {
    if (!canManage) { setError('لا تملك صلاحية إدارة البلاغات'); return; }
    setBusyId(report.id);
    setError('');
    try {
      await requirePerm(can, REPORTS_PERM, 'تغيير حالة بلاغ', report.id);
      await updateDoc(doc(db, 'reports', report.id), {
        status,
        handledBy: auth?.currentUser?.email || null,
        handledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        action: 'REPORT_STATUS_CHANGE', permissionKey: REPORTS_PERM,
        targetType: 'reports', targetId: report.id, result: 'success',
        details: `تغيير حالة البلاغ إلى ${status}`, severity: 'medium',
      });
      if (onChanged) onChanged();
    } catch (e) {
      setError(e?.message || 'تعذر تحديث البلاغ');
    } finally {
      setBusyId('');
    }
  };

  const saveNote = async (report) => {
    const note = noteText.trim();
    if (!note) { setError('اكتب سبب المعالجة أولاً'); return; }
    if (!canManage) { setError('لا تملك صلاحية إدارة البلاغات'); return; }
    setBusyId(report.id);
    setError('');
    try {
      await requirePerm(can, REPORTS_PERM, 'إضافة ملاحظة بلاغ', report.id);
      await updateDoc(doc(db, 'reports', report.id), {
        resolutionNote: note,
        handledBy: auth?.currentUser?.email || null,
        handledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        action: 'REPORT_NOTE', permissionKey: REPORTS_PERM,
        targetType: 'reports', targetId: report.id, result: 'success',
        details: `إضافة سبب المعالجة: ${note}`, severity: 'medium',
      });
      setNoteFor('');
      setNoteText('');
      if (onChanged) onChanged();
    } catch (e) {
      setError(e?.message || 'تعذر حفظ الملاحظة');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold royal-text">البلاغات</h2>
          <p className="text-xs royal-muted mt-1 font-medium">
            {formatNumber(reports.length)} بلاغ
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-[10px] bg-[var(--rz-primary)]/10 text-[var(--rz-ink)] border border-[var(--rz-primary)]/25 font-bold">
          {canManage ? 'إدارة' : 'مشاهدة فقط'}
        </span>
      </div>

      {error && (
        <p className="text-xs font-bold text-[var(--rz-primary)] bg-[var(--rz-primary)]/10 border border-[var(--rz-primary)]/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {reports.map(report => (
          <div key={report.id} className="royal-surface rounded-xl p-4 border royal-border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                report.status === 'pending'
                  ? 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
                  : report.status === 'resolved'
                    ? 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
                    : 'bg-[var(--rz-primary)]/10 text-[var(--rz-primary)]'
              }`}>
                {report.status === 'pending'
                  ? 'قيد المراجعة'
                  : report.status === 'resolved'
                    ? 'تم الحل'
                    : report.status === 'rejected' ? 'مرفوض' : (report.status || 'جديد')}
              </span>
              <span className="text-xs royal-muted font-medium">
                {formatDate(report.createdAt)}
              </span>
            </div>

            <p className="royal-text font-medium">
              {report.reason || report.description || 'بلاغ'}
            </p>
            <p className="text-xs royal-muted mt-1 font-medium">
              على الإعلان: {String(report.adId || '').slice(0, 8) || '—'}
            </p>
            {report.resolutionNote && (
              <p className="text-xs royal-muted mt-2 font-medium">
                سبب المعالجة: {report.resolutionNote}
              </p>
            )}

            {canManage && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={busyId === report.id}
                  onClick={() => setStatus(report, 'resolved')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--rz-ink)]/12 text-[var(--rz-ink)] border border-[var(--rz-ink)]/35 hover:bg-[var(--rz-ink)]/20 disabled:opacity-50">
                  تم الحل
                </button>
                <button type="button" disabled={busyId === report.id}
                  onClick={() => setStatus(report, 'rejected')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--rz-primary)]/12 text-[var(--rz-primary)] border border-[var(--rz-primary)]/35 hover:bg-[var(--rz-primary)]/20 disabled:opacity-50">
                  مرفوض
                </button>
                <button type="button" disabled={busyId === report.id}
                  onClick={() => { setNoteFor(noteFor === report.id ? '' : report.id); setNoteText(report.resolutionNote || ''); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--rz-gold)]/15 text-[var(--rz-slate)] border border-[var(--rz-gold)]/45 hover:bg-[var(--rz-gold)]/25 disabled:opacity-50">
                  سبب المعالجة
                </button>
              </div>
            )}

            {canManage && noteFor === report.id && (
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="اكتب سبب المعالجة…" maxLength={300}
                  className="flex-1 rounded-lg border border-[var(--rz-primary)]/30 px-3 py-2 text-xs royal-text" />
                <button type="button" disabled={busyId === report.id}
                  onClick={() => saveNote(report)}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-[var(--rz-primary)] text-[var(--rz-ivory)] disabled:opacity-50">
                  حفظ
                </button>
              </div>
            )}
          </div>
        ))}

        {reports.length === 0 && (
          <EmptyState icon={Flag} text="لا توجد بلاغات" />
        )}
      </div>
    </div>
  );
};

export const REVIEWS_PERM = 'MANAGE_REVIEWS';

export const ReviewsPanel = ({ reviews = [], onChanged }) => {
  const { can } = usePermissions();
  const canManage = can(REVIEWS_PERM);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const setHidden = async (review, hidden) => {
    if (!canManage) { setError('لا تملك صلاحية إدارة التقييمات'); return; }
    let reason = '';
    if (hidden) {
      reason = (window.prompt('سبب إخفاء التقييم؟') || '').trim();
      if (!reason) return;
    }
    setBusyId(review.id);
    setError('');
    try {
      await requirePerm(can, REVIEWS_PERM, hidden ? 'إخفاء تقييم' : 'إعادة تقييم', review.id);
      await updateDoc(doc(db, 'reviews', review.id), {
        hidden,
        publicSafe: !hidden,
        moderationReason: hidden ? reason : '',
        moderatedBy: auth?.currentUser?.email || null,
        moderatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        action: hidden ? 'REVIEW_HIDE' : 'REVIEW_RESTORE', permissionKey: REVIEWS_PERM,
        targetType: 'reviews', targetId: review.id, result: 'success',
        details: hidden ? `إخفاء تقييم مخالف: ${reason}` : 'إعادة إظهار تقييم',
        severity: 'medium',
      });
      if (onChanged) onChanged();
    } catch (e) {
      setError(e?.message || 'تعذر تحديث التقييم');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold royal-text">تقييمات العملاء</h2>
          <p className="text-xs royal-muted mt-1 font-medium">
            {formatNumber(reviews.length)} تقييم
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-[10px] bg-[var(--rz-primary)]/10 text-[var(--rz-ink)] border border-[var(--rz-primary)]/25 font-bold">
          {canManage ? 'إدارة' : 'مشاهدة فقط'}
        </span>
      </div>

      {error && (
        <p className="text-xs font-bold text-[var(--rz-primary)] bg-[var(--rz-primary)]/10 border border-[var(--rz-primary)]/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="royal-surface rounded-xl p-4 border royal-border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1 text-[var(--rz-gold)]">
                {Array.from({ length: Number(review.rating) || 0 }).map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </span>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                review.hidden
                  ? 'bg-[var(--rz-primary)]/12 text-[var(--rz-primary)]'
                  : 'bg-[var(--rz-ink)]/10 text-[var(--rz-ink)]'
              }`}>
                {review.hidden ? 'مخفي' : 'ظاهر'}
              </span>
            </div>
            <p className="royal-text font-medium">
              {review.text || review.comment || 'بدون نص'}
            </p>
            <p className="text-xs royal-muted mt-1 font-medium">
              {review.userName || review.userEmail || 'عميل'} — {formatDate(review.createdAt)}
            </p>
            {review.hidden && review.moderationReason && (
              <p className="text-xs royal-muted mt-2 font-medium">
                سبب الإخفاء: {review.moderationReason}
              </p>
            )}

            {canManage && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {review.hidden ? (
                  <button type="button" disabled={busyId === review.id}
                    onClick={() => setHidden(review, false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--rz-ink)]/12 text-[var(--rz-ink)] border border-[var(--rz-ink)]/35 hover:bg-[var(--rz-ink)]/20 disabled:opacity-50">
                    إعادة الإظهار
                  </button>
                ) : (
                  <button type="button" disabled={busyId === review.id}
                    onClick={() => setHidden(review, true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--rz-primary)]/12 text-[var(--rz-primary)] border border-[var(--rz-primary)]/35 hover:bg-[var(--rz-primary)]/20 disabled:opacity-50">
                    إخفاء التقييم
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {reviews.length === 0 && (
          <EmptyState icon={Star} text="لا توجد تقييمات" />
        )}
      </div>
    </div>
  );
};
