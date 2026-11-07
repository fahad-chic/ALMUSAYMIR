import { describe, it, expect } from 'vitest';
import {
  IDENTITY_FIELDS,
  REVIEW_META,
  COMMENT_META,
  pickPII,
  blankIdentityFields,
  classify,
  buildPrivateDoc,
  toPlain,
  encodeValue,
} from './backfill-public-safe.mjs';

// مساعد: يبني مستنداً بصيغة { id, data } كما يفعل listAll.
const doc = (id, data) => ({ id, data });

describe('pickPII — يكشف القيم غير الفارغة فقط', () => {
  it('يتجاهل الحقل الفارغ والـnull والمفقود', () => {
    expect(pickPII({ email: '', phone: null, name: 'س' })).toEqual({});
  });

  it('يجمع الحقول ذات القيمة', () => {
    expect(pickPII({ email: 'a@b.c', phone: '0500000000' })).toEqual({ email: 'a@b.c', phone: '0500000000' });
  });
});

describe('blankIdentityFields — المفاتيح الفارغة فقط', () => {
  it('يرصد المفتاح الفارغ والـnull من قائمة الهوية', () => {
    expect(blankIdentityFields({ email: '', phone: null, name: 'س', text: '' })).toEqual(['email', 'phone']);
  });

  it('لا يرصد قيمة حقيقية ولا حقلاً غير معروف', () => {
    expect(blankIdentityFields({ email: 'a@b.c', text: '', note: '' })).toEqual([]);
  });

  it('لا يرصد إلا مفاتيح ضمن قائمة الهوية', () => {
    const data = Object.fromEntries(IDENTITY_FIELDS.map((f) => [f, '']));
    data.text = '';
    expect(blankIdentityFields(data).sort()).toEqual([...IDENTITY_FIELDS].sort());
  });
});

describe('classify — comments', () => {
  it('تعليق معتمد ببريد فارغ => آمن لكنه يحتاج تنقية المفتاح', () => {
    const b = classify([doc('c1', { text: 'س', status: 'approved', email: '' })], COMMENT_META);
    expect(b.publicNoPII).toHaveLength(1);
    expect(b.publicNoPII[0].blanks).toEqual(['email']);
    expect(b.publicWithPII).toHaveLength(0);
  });

  it('تعليق معتمد ببريد حقيقي => فصل بيانات شخصية', () => {
    const b = classify([doc('c2', { text: 'س', status: 'approved', email: 'a@b.c' })], COMMENT_META);
    expect(b.publicWithPII).toHaveLength(1);
    expect(b.publicWithPII[0].pii).toEqual({ email: 'a@b.c' });
    expect(b.publicNoPII).toHaveLength(0);
  });

  it('تعليق معتمد بلا أي حقل هوية => آمن بلا تنقية', () => {
    const b = classify([doc('c3', { text: 'س', status: 'approved' })], COMMENT_META);
    expect(b.publicNoPII).toHaveLength(1);
    expect(b.publicNoPII[0].blanks).toEqual([]);
  });

  it('المعلّق والمرفوض والمخفي => غير عام', () => {
    const b = classify(
      [
        doc('p', { text: 'س', status: 'pending' }),
        doc('r', { text: 'س', status: 'rejected' }),
        doc('h', { text: 'س', status: 'approved', hidden: true }),
      ],
      COMMENT_META,
    );
    expect(b.notPublic).toHaveLength(3);
    expect(b.publicNoPII).toHaveLength(0);
  });

  it('نقص حقل مطلوب => غير قابل للتصنيف', () => {
    const b = classify([doc('x', { status: 'approved' })], COMMENT_META);
    expect(b.unknown).toHaveLength(1);
    expect(b.unknown[0].reason).toContain('text');
  });

  it('حالة غير معروفة => غير قابل للتصنيف', () => {
    const b = classify([doc('x', { text: 'س', status: 'weird' })], COMMENT_META);
    expect(b.unknown).toHaveLength(1);
    expect(b.unknown[0].reason).toContain('weird');
  });

  it('موسوم مسبقاً ونظيف => alreadyPublic', () => {
    const b = classify([doc('t', { text: 'س', status: 'approved', publicSafe: true })], COMMENT_META);
    expect(b.alreadyPublic).toHaveLength(1);
  });

  it('موسوم مسبقاً لكنه يحمل بريداً فارغاً => يحتاج تنقية لا noop', () => {
    const b = classify([doc('t', { text: 'س', status: 'approved', publicSafe: true, email: '' })], COMMENT_META);
    expect(b.alreadyPublic).toHaveLength(0);
    expect(b.publicNoPII).toHaveLength(1);
    expect(b.publicNoPII[0].blanks).toEqual(['email']);
  });
});

describe('classify — reviews', () => {
  it('تقييم معتمد خالٍ => آمن', () => {
    const b = classify([doc('r1', { productId: 'p', rating: 5, status: 'approved' })], REVIEW_META);
    expect(b.publicNoPII).toHaveLength(1);
  });

  it('تقييم ببريد => فصل بيانات شخصية', () => {
    const b = classify([doc('r2', { productId: 'p', rating: 4, userEmail: 'a@b.c' })], REVIEW_META);
    expect(b.publicWithPII).toHaveLength(1);
    expect(b.publicWithPII[0].pii).toEqual({ userEmail: 'a@b.c' });
  });

  it('تقييم ناقص (بلا rating) => غير قابل للتصنيف', () => {
    const b = classify([doc('r3', { productId: 'p' })], REVIEW_META);
    expect(b.unknown).toHaveLength(1);
  });
});

describe('buildPrivateDoc', () => {
  it('comments: يضيف status وpublicSafe للسجل الخاص', () => {
    const r = { pii: { email: 'a@b.c' }, data: { status: 'approved' } };
    expect(buildPrivateDoc(COMMENT_META, r)).toEqual({ email: 'a@b.c', status: 'approved', publicSafe: true });
  });

  it('reviews: يلزم ownerUid من السجل أو الحقل', () => {
    const r = { pii: { userEmail: 'a@b.c' }, data: { productId: 'p', ownerUid: 'u1' } };
    const priv = buildPrivateDoc(REVIEW_META, r);
    expect(priv.ownerUid).toBe('u1');
    expect(priv.productId).toBe('p');
  });
});

describe('toPlain / encodeValue — ترميز Firestore', () => {
  it('يفكّ تغليف الحقول', () => {
    expect(toPlain({ email: { stringValue: 'a@b.c' }, n: { integerValue: '5' }, b: { booleanValue: true } }))
      .toEqual({ email: 'a@b.c', n: '5', b: true });
  });

  it('يفكّ الحقول المتداخلة', () => {
    expect(toPlain({ nested: { mapValue: { fields: { x: { stringValue: 'y' } } } } })).toEqual({ nested: { x: 'y' } });
  });

  it('يرمّز القيم', () => {
    expect(encodeValue(true)).toEqual({ booleanValue: true });
    expect(encodeValue(5)).toEqual({ integerValue: '5' });
    expect(encodeValue('x')).toEqual({ stringValue: 'x' });
  });
});
