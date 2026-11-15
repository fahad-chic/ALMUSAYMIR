import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// نُبدّل فقط طبقة Firestore وusePermissions — المكوّن والتصنيف الحقيقيان يُختبران.
const snapshotFor = (docs) => ({ docs: docs.map((d) => ({ id: d.id, data: () => d.data })) });

let reviewsDocs = [];
let commentsDocs = [];
let perms = { isOwner: true, can: () => false };

vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('../../permissions/usePermissions', () => ({
  default: () => ({ isOwner: perms.isOwner, can: perms.can }),
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

// يجلب قسم مجموعة بعينها لتفادي تطابق التسميات بين التقييمات والتعليقات.
const sectionFor = (heading) => screen.getByText(heading).closest('section');

describe('PrivacyAuditPanel — تدقيق خصوصية للقراءة فقط', () => {
  beforeEach(() => {
    reviewsDocs = [];
    commentsDocs = [];
    perms = { isOwner: true, can: () => false };
  });

  it('يعرض العنوان ويؤكد أنه للقراءة فقط', async () => {
    render(<PrivacyAuditPanel />);
    expect(screen.getByText('تدقيق خصوصية السجلات')).toBeTruthy();
    expect(screen.getAllByText(/قراءة فقط/).length).toBeGreaterThan(0);
  });

  it('لا يعرض أي زر ترحيل أو تعديل', async () => {
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.queryByText(/جارٍ قراءة/)).toBeNull());
    expect(screen.queryByText(/تطبيق|ترحيل الآن|--apply|احذف/)).toBeNull();
  });

  it('يُصنّف التقييمات: نظيف / تسريب بيانات شخصية / مخفي', async () => {
    reviewsDocs = [
      { id: 'r1', data: { productId: 'p1', rating: 5, hidden: false } },
      { id: 'r2', data: { productId: 'p1', rating: 4, hidden: false, userEmail: 'a@b.com' } },
      { id: 'r3', data: { productId: 'p1', rating: 2, hidden: true } },
    ];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('التقييمات (reviews)')).toBeTruthy());
    const sec = sectionFor('التقييمات (reviews)');
    expect(sec.textContent).toContain('userEmail (1)');
    expect(sec.textContent).toContain('منشور لكنه يحمل بيانات شخصية');
  });

  it('يخفي قسم التعليقات عمّن يملك التقييمات فقط (لا صلاحية تعليقات)', async () => {
    perms = { isOwner: false, can: (k) => k === 'MANAGE_REVIEWS' };
    commentsDocs = [{ id: 'c1', data: { text: 'نظيف', status: 'approved' } }];
    render(<PrivacyAuditPanel />);
    await waitFor(() => expect(screen.getByText('التقييمات (reviews)')).toBeTruthy());
    expect(screen.queryByText('التعليقات (comments)')).toBeNull();
  });
});
