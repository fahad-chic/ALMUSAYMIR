import { describe, it, expect, vi } from 'vitest';

// نُبدّل فقط طبقة Firestore وaudit — منطق الإصلاح النقي يُختبر كما هو.
const writes = { setDoc: [], updateDoc: [], deleteDoc: [], addDoc: [] };
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('../permissions/audit', () => ({ writeAuditLog: vi.fn(async () => {}) }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  doc: (_db, name, id) => ({ name, id }),
  serverTimestamp: () => '__TS__',
  deleteField: () => '__DEL__',
  getDoc: async () => ({ exists: () => false }),
  setDoc: async (ref, payload) => { writes.setDoc.push({ ref, payload }); },
  updateDoc: async (ref, patch) => { writes.updateDoc.push({ ref, patch }); },
  deleteDoc: async (ref) => { writes.deleteDoc.push(ref); },
  addDoc: async (ref, payload) => { writes.addDoc.push({ ref, payload }); return { id: 'arch' }; },
}));

import {
  planRepair,
  buildPrivatePayload,
  repairRecord,
  deleteRecord,
  runBatch,
  REVIEW_PRIVATE_KEYS,
} from './privacyRepair';
import { REVIEW_META, COMMENT_META } from './legacyPrivacy';

const reset = () => {
  writes.setDoc = []; writes.updateDoc = []; writes.deleteDoc = []; writes.addDoc = [];
};
const actor = { uid: 'owner-uid', email: 'owner@x.com' };

describe('privacyRepair — التخطيط النقي', () => {
  it('تقييم ببيانات شخصية: ينقل البريد للمجموعة الخاصة ويمسح الهوية من العام', () => {
    const plan = planRepair(REVIEW_META, {
      productId: 'p1', rating: 5, hidden: false, userEmail: 'a@b.com', userId: 'u9',
    }, actor);
    expect(plan.privatePayload.userEmail).toBe('a@b.com');
    expect(plan.privatePayload.userId).toBe('u9');
    expect(plan.privatePayload.ownerUid).toBe('owner-uid');
    expect(plan.privatePayload.productId).toBe('p1');
    // كل مفاتيح السجل الخاص ضمن المسموح في القواعد.
    for (const k of Object.keys(plan.privatePayload)) {
      expect(REVIEW_PRIVATE_KEYS).toContain(k);
    }
    expect(plan.publicStrip.sort()).toEqual(['userEmail', 'userId']);
  });

  it('تقييم سليم بلا هوية: لا نقل ولا مسح', () => {
    const plan = planRepair(REVIEW_META, { productId: 'p1', rating: 5, hidden: false }, actor);
    expect(plan.privatePayload).toBeNull();
    expect(plan.publicStrip).toEqual([]);
  });

  it('تقييم بمفتاح بريد فارغ: يُمسح المفتاح فقط (لا نقل)', () => {
    const plan = planRepair(REVIEW_META, { productId: 'p1', rating: 5, hidden: false, userEmail: '' }, actor);
    expect(plan.privatePayload).toBeNull();
    expect(plan.publicStrip).toEqual(['userEmail']);
  });

  it('تعليق ببريد: ينقل البريد ويُمسح من العام', () => {
    const plan = planRepair(COMMENT_META, { text: 'ok', status: 'approved', email: 'x@y.com' }, actor);
    expect(plan.privatePayload).toEqual({ email: 'x@y.com', createdAt: '__TS__' });
    expect(plan.publicStrip).toEqual(['email']);
  });

  it('تعليق ببريد فارغ: يُمسح المفتاح فقط', () => {
    const plan = planRepair(COMMENT_META, { text: 'ok', status: 'approved', email: '' }, actor);
    expect(plan.privatePayload).toBeNull();
    expect(plan.publicStrip).toEqual(['email']);
  });

  it('buildPrivatePayload للتعليق بلا بريد يُرجع null', () => {
    expect(buildPrivatePayload(COMMENT_META, { text: 'ok' }, actor)).toBeNull();
  });
});

describe('privacyRepair — التنفيذ (Firestore مُبدّل)', () => {
  it('repairRecord: يؤرشف أولاً ثم ينقل ثم يمسح', async () => {
    reset();
    const res = await repairRecord(
      REVIEW_META,
      { id: 'r1', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'a@b.com' } },
      actor,
    );
    expect(res.status).toBe('cleaned');
    expect(writes.addDoc).toHaveLength(1);
    expect(writes.addDoc[0].ref.name).toBe('deleted_archive');
    expect(writes.setDoc[0].ref).toMatchObject({ name: 'review_private', id: 'r1' });
    expect(writes.updateDoc[0].ref).toMatchObject({ name: 'reviews', id: 'r1' });
    expect(writes.updateDoc[0].patch).toEqual({ userEmail: '__DEL__' });
  });

  it('repairRecord: سجل سليم يُتخطّى بلا أي كتابة', async () => {
    reset();
    const res = await repairRecord(REVIEW_META, { id: 'r2', data: { productId: 'p1', rating: 5, hidden: false } }, actor);
    expect(res.status).toBe('skipped');
    expect(writes.addDoc).toHaveLength(0);
    expect(writes.updateDoc).toHaveLength(0);
  });

  it('deleteRecord: يؤرشف ثم يحذف العام', async () => {
    reset();
    const res = await deleteRecord(COMMENT_META, { id: 'c1', data: { text: 'x', status: 'approved' } }, actor);
    expect(res.status).toBe('deleted');
    expect(writes.addDoc[0].ref.name).toBe('deleted_archive');
    expect(writes.deleteDoc.some((r) => r.name === 'comments' && r.id === 'c1')).toBe(true);
  });

  it('runBatch: يتابع رغم فشل عنصر ويُلخّص', async () => {
    const seen = [];
    const summary = await runBatch(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      async (rec) => {
        if (rec.id === 'b') throw new Error('boom');
        seen.push(rec.id);
      },
      (i, n) => seen.push(`${i}/${n}`),
    );
    expect(summary.ok).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.errors[0].id).toBe('b');
    expect(seen).toContain('3/3');
  });
});
