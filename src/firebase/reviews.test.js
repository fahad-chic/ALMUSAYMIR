// اختبار وحدة لطبقة التقييمات في العميل: يثبت أن المستند العام لا يحمل بيانات
// شخصية، وأن استعلام القراءة العامة يعكس شرط القاعدة (hidden == false)، وأن
// البيانات الشخصية تُكتب في review_private/{docId} فقط.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const addDoc = vi.fn();
const setDoc = vi.fn();
const getDocs = vi.fn();
const updateDoc = vi.fn();
const collection = vi.fn((_db, name) => ({ name }));
const doc = vi.fn((_db, name, id) => ({ name, id }));
const query = vi.fn((...parts) => parts);
const where = vi.fn((field, op, value) => ({ type: 'where', field, op, value }));
const orderBy = vi.fn((field, dir) => ({ type: 'orderBy', field, dir }));
const serverTimestamp = vi.fn(() => 'TS');
const getDoc = vi.fn(() => Promise.resolve({ exists: () => false }));

vi.mock('firebase/firestore', () => ({
  addDoc: (...a) => addDoc(...a),
  setDoc: (...a) => setDoc(...a),
  getDocs: (...a) => getDocs(...a),
  updateDoc: (...a) => updateDoc(...a),
  deleteDoc: vi.fn(),
  collection: (...a) => collection(...a),
  doc: (...a) => doc(...a),
  query: (...a) => query(...a),
  where: (...a) => where(...a),
  orderBy: (...a) => orderBy(...a),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: () => serverTimestamp(),
  getDoc: (...a) => getDoc(...a),
  writeBatch: vi.fn(),
}));

import { auth } from './config';
import { addReview, getReviews } from './firestore';

describe('reviews — خصوصية المستند العام', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = { uid: 'member-1' };
    addDoc.mockResolvedValue({ id: 'rev-9' });
    setDoc.mockResolvedValue(undefined);
    getDocs.mockResolvedValue({ docs: [] });
  });

  it('addReview يكتب المستند العام بلا أي بيانات شخصية وhidden==false', async () => {
    await addReview('p1', { rating: 5, text: 'ممتاز', userEmail: 'me@x.com', userId: 'member-1' });

    const publicData = addDoc.mock.calls[0][1];
    expect(publicData).toEqual({
      productId: 'p1',
      rating: 5,
      text: 'ممتاز',
      hidden: false,
      createdAt: 'TS',
    });
    expect(publicData.userEmail).toBeUndefined();
    expect(publicData.userId).toBeUndefined();
    expect(publicData.ownerUid).toBeUndefined();
  });

  it('addReview يكتب البيانات الشخصية في review_private/{docId} بمعرّف الجلسة', async () => {
    await addReview('p1', { rating: 4, text: 'جيد', userEmail: 'me@x.com', userName: 'أنا' });

    const [ref, data] = setDoc.mock.calls[0];
    expect(ref).toEqual({ name: 'review_private', id: 'rev-9' });
    expect(data.ownerUid).toBe('member-1');
    expect(data.userEmail).toBe('me@x.com');
    expect(data.userName).toBe('أنا');
  });

  it('addReview يرفض تقييماً خارج المدى 1..5', async () => {
    const res = await addReview('p1', { rating: 9 });
    expect(res.success).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('getReviews يستعلم where(hidden==false) — يعكس شرط القاعدة', async () => {
    await getReviews('p1');

    const whereCalls = where.mock.calls;
    expect(whereCalls.some((c) => c[0] === 'hidden' && c[1] === '==' && c[2] === false)).toBe(true);
    expect(whereCalls.some((c) => c[0] === 'productId' && c[2] === 'p1')).toBe(true);
  });
});
