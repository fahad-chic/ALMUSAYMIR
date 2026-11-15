import { describe, it, expect } from 'vitest';
import {
  classify,
  isPublic,
  pickPII,
  blankIdentityFields,
  tallyFields,
  tallyReasons,
  buildReport,
  REVIEW_META,
  COMMENT_META,
} from './legacyPrivacy';

const r = (id, data) => ({ id, data });
const c = (id, data) => ({ id, data });

describe('legacyPrivacy — نموذج main الفعلي', () => {
  it('التقييم مرئي للعامة فقط عند hidden == false (مساواة صارمة)', () => {
    expect(isPublic({ hidden: false }, REVIEW_META)).toBe(true);
    expect(isPublic({}, REVIEW_META)).toBe(false);
    expect(isPublic({ hidden: true }, REVIEW_META)).toBe(false);
  });

  it('التعليق مرئي للعامة فقط عند status == approved', () => {
    expect(isPublic({ status: 'approved' }, COMMENT_META)).toBe(true);
    expect(isPublic({ status: 'approved', email: '' }, COMMENT_META)).toBe(true);
    // البريد لا يغيّر رؤية list، لكنه يُصنّف خطراً في classify.
    expect(isPublic({ status: 'approved', email: 'a@b.com' }, COMMENT_META)).toBe(true);
    expect(isPublic({ status: 'pending' }, COMMENT_META)).toBe(false);
    expect(isPublic({}, COMMENT_META)).toBe(false);
  });

  it('pickPII يلتقط القيم غير الفارغة فقط', () => {
    expect(pickPII({ userEmail: 'a@b.com', email: '', phone: null })).toEqual({ userEmail: 'a@b.com' });
    expect(pickPII({ text: 'ok' })).toEqual({});
  });

  it('blankIdentityFields يلتقط المفاتيح الفارغة فقط', () => {
    expect(blankIdentityFields({ email: '', userName: null, phone: '05' }).sort()).toEqual(['email', 'userName']);
  });

  it('تصنيف التقييمات: نظيف / تسريب / مخفي / غير قابل للتصنيف', () => {
    const b = classify([
      r('clean', { productId: 'p1', rating: 5, text: 'نظيف', hidden: false }),
      r('pii', { productId: 'p1', rating: 4, hidden: false, userEmail: 'a@b.com' }),
      r('hidden', { productId: 'p1', rating: 1, hidden: true }),
      r('missing', { rating: 5, hidden: false }),
    ], REVIEW_META);
    expect(b.publicClean.map((d) => d.id)).toEqual(['clean']);
    expect(b.publicWithPII.map((d) => d.id)).toEqual(['pii']);
    expect(b.publicWithPII[0].pii).toEqual({ userEmail: 'a@b.com' });
    expect(b.notPublic.map((d) => d.id)).toEqual(['hidden']);
    expect(b.unknown.map((d) => d.id)).toEqual(['missing']);
  });

  it('تصنيف التعليقات: معتمد نظيف / معتمد ببريد / معلّق / بلا status', () => {
    const b = classify([
      c('clean', { text: 'نظيف', status: 'approved' }),
      c('pii', { text: 'ok', status: 'approved', email: 'x@y.com' }),
      c('pending', { text: 'معلّق', status: 'pending' }),
      c('nostatus', { text: 'قديم' }),
    ], COMMENT_META);
    expect(b.publicClean.map((d) => d.id)).toEqual(['clean']);
    expect(b.publicWithPII.map((d) => d.id)).toEqual(['pii']);
    expect(b.notPublic.map((d) => d.id).sort()).toEqual(['nostatus', 'pending']);
  });

  it('حالة تعليق غير معروفة تُعدّ غير قابلة للتصنيف', () => {
    const b = classify([c('weird', { text: 'ok', status: 'archived' })], COMMENT_META);
    expect(b.unknown.map((d) => d.id)).toEqual(['weird']);
  });

  it('tallyFields و tallyReasons يعطيان أعداداً بأسماء الحقول فقط', () => {
    expect(tallyFields([{ pii: { email: 1, phone: 1 } }, { pii: { email: 1 } }], 'pii'))
      .toEqual({ email: 2, phone: 1 });
    expect(tallyReasons([{ reason: 'hidden' }, { reason: 'hidden' }, { reason: 'x' }]))
      .toEqual({ hidden: 2, x: 1 });
  });

  it('buildReport لا يحوي أي قيمة شخصية أو معرّف مستند', () => {
    const b = classify([
      r('SECRET-ID', { productId: 'p1', rating: 4, hidden: false, userEmail: 'leak@example.com' }),
    ], REVIEW_META);
    const out = buildReport(REVIEW_META, b);
    expect(out).toContain('reviews');
    expect(out).not.toContain('leak@example.com');
    expect(out).not.toContain('SECRET-ID');
  });
});
