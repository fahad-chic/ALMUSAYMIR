import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// نُبدّل فقط طبقة Firestore وusePermissions وprivacyRepair — المكوّن الحقيقي يُختبر.
const snapshotFor = (docs) => ({ docs: docs.map((d) => ({ id: d.id, data: () => d.data })) });

let reviewsDocs = [];
let commentsDocs = [];
let perms = { isOwner: true, can: () => false };
const calls = { repair: [], del: [], batch: [] };

vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'o1', email: 'o@x.com' } }) }));
vi.mock('../../permissions/usePermissions', () => ({
  default: () => ({ isOwner: perms.isOwner, can: perms.can }),
}));
vi.mock('../../utils/toast', () => ({ default: Object.assign(() => {}, { success: () => {}, error: () => {} }) }));
vi.mock('../../utils/privacyRepair', () => ({
  repairRecord: async (meta, rec) => { calls.repair.push({ meta: meta.name, id: rec.id }); return { status: 'cleaned', moved: true, stripped: ['userEmail'] }; },
  deleteRecord: async (meta, rec) => { calls.del.push({ meta: meta.name, id: rec.id }); return { status: 'deleted' }; },
  runBatch: async (recs, worker) => { calls.batch.push(recs.length); for (const r of recs) await worker(r); return { total: recs.length, ok: recs.length, failed: 0, errors: [] }; },
}));
vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  limit: (n) => ({ n }),
  query: (ref) => ref,
  onSnapshot: (ref, onNext) => {
    if (ref.name === 'reviews') onNext(snapshotFor(reviewsDocs));
    if (ref.name === 'comments') onNext(snapshotFor(commentsDocs));
    return () => {};
  },
}));

import PrivacyAuditPanel from './PrivacyAuditPanel';

describe('PrivacyAuditPanel — لوحة تدقيق وإصلاح', () => {
  beforeEach(() => {
    reviewsDocs = [];
    commentsDocs = [];
    perms = { isOwner: true, can: () => false };
    calls.repair = []; calls.del = []; calls.batch = [];
  });

  it('يعرض العنوان وبوكسات التصنيف', async () => {
    render(<PrivacyAuditPanel />);
    expect(screen.getByText('تدقيق وإصلاح الخصوصية')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('التقييمات (reviews)')).toBeTruthy());
    expect(screen.getAllByText('منشور لكنه يحمل بيانات شخصية').length).toBeGreaterThan(0);
  });

  it('يعرض السجلات المتسرّبة مع إخفاء جزئي للقيمة', async () => {
    reviewsDocs = [{ id: 'r1', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'leak@x.com' } }];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('r1')).toBeTruthy());
    expect(screen.getByText(/l\*\*\*@x\.com/)).toBeTruthy();
    expect(screen.queryByText('leak@x.com')).toBeNull();
  });

  it('التنظيف يفتح تأكيداً ثم ينفّذ بعد الموافقة', async () => {
    reviewsDocs = [{ id: 'r1', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'leak@x.com' } }];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('تنظيف ونقل للخاص')).toBeTruthy());
    fireEvent.click(screen.getByText('تنظيف ونقل للخاص'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(calls.repair).toHaveLength(0);
    fireEvent.click(screen.getByText('تنظيف'));
    await waitFor(() => expect(calls.repair).toEqual([{ meta: 'reviews', id: 'r1' }]));
  });

  it('الحذف يفتح تأكيداً ثم ينفّذ بعد الموافقة', async () => {
    reviewsDocs = [{ id: 'r1', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'leak@x.com' } }];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('حذف')).toBeTruthy());
    fireEvent.click(screen.getByText('حذف'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(calls.del).toHaveLength(0);
    fireEvent.click(screen.getAllByText('حذف').at(-1));
    await waitFor(() => expect(calls.del).toEqual([{ meta: 'reviews', id: 'r1' }]));
  });

  it('زر «ترحيل كل المتسرّب» يعالج كل السجلات الخطر/غير المصنّفة', async () => {
    reviewsDocs = [
      { id: 'r1', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'a@x.com' } },
      { id: 'r2', data: { productId: 'p1', rating: 4, hidden: false, userEmail: 'b@x.com' } },
    ];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('ترحيل كل المتسرّب')).toBeTruthy());
    fireEvent.click(screen.getByText('ترحيل كل المتسرّب'));
    fireEvent.click(screen.getByText('ترحيل الكل'));
    await waitFor(() => expect(calls.batch).toContain(2));
  });

  it('يخفي قسم التعليقات عمّن يملك التقييمات فقط', async () => {
    perms = { isOwner: false, can: (k) => k === 'MANAGE_REVIEWS' };
    commentsDocs = [{ id: 'c1', data: { text: 'نظيف', status: 'approved' } }];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('التقييمات (reviews)')).toBeTruthy());
    expect(screen.queryByText('التعليقات (comments)')).toBeNull();
  });
});
