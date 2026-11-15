// e2e/privacy-repair.emulator.mjs
//
// إثبات حقيقي (محاكي Firestore + firestore.rules الفعلية) أن عمليات الإصلاح
// تعمل تحت القواعد الحقيقية: التنظيف، النقل للسجل الخاص، الحذف، الأرشفة،
// ومنع غير المالك. هذا اختبار محاكي — ليس اختبار إنتاج.
//
// التشغيل:
//   npm run test:privacy-repair
//   (= npx firebase-tools emulators:exec ... "npx vitest run --config vitest.emulator.config.mjs")
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { repairRecord, deleteRecord, runBatch } from '../src/utils/privacyRepair.js';
import { REVIEW_META, COMMENT_META } from '../src/utils/legacyPrivacy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-almusaymir';
const OWNER_EMAIL = 'f882771f@gmail.com';
const actor = { uid: 'owner-uid', email: OWNER_EMAIL };

let testEnv;
let odb;
let deps;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8') },
  });
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'reviews', 'r-leak'), { productId: 'p1', rating: 5, hidden: false, userEmail: 'leak@x.com', userId: 'u1' });
    await setDoc(doc(db, 'reviews', 'r-clean'), { productId: 'p1', rating: 4, hidden: false });
    await setDoc(doc(db, 'reviews', 'r-hidden'), { productId: 'p1', rating: 1, hidden: true, userEmail: 'h@x.com' });
    await setDoc(doc(db, 'reviews', 'r-other'), { productId: 'p1', rating: 5, hidden: false, userEmail: 'o@x.com' });
    await setDoc(doc(db, 'comments', 'c-leak'), { text: 'ok', status: 'approved', email: 'c@x.com' });
    await setDoc(doc(db, 'comments', 'c-clean'), { text: 'نظيف', status: 'approved' });
    await setDoc(doc(db, 'users', 'owner-uid'), { email: OWNER_EMAIL, role: 'owner' });
    await setDoc(doc(db, 'users', 'member-uid'), { email: 'm@e.com', role: 'user' });
  });
  odb = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true }).firestore();
  deps = { db: odb };
});

afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

describe('privacyRepair — تحت firestore.rules الحقيقية (محاكي)', () => {
  it('ينظّف تقييماً يحمل بريداً: يمسح الهوية من العام ويُبقي بقية الحقول', async () => {
    const res = await repairRecord(REVIEW_META, { id: 'r-leak', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'leak@x.com', userId: 'u1' } }, actor, deps);
    expect(res.status).toBe('cleaned');

    const after = (await getDoc(doc(odb, 'reviews', 'r-leak'))).data() || {};
    expect('userEmail' in after).toBe(false);
    expect('userId' in after).toBe(false);
    expect(after.productId).toBe('p1');
    expect(after.rating).toBe(5);
    expect(after.hidden).toBe(false);
  });

  it('ينقل البريد إلى review_private مع ownerUid الصحيح', async () => {
    const priv = await getDoc(doc(odb, 'review_private', 'r-leak'));
    expect(priv.exists()).toBe(true);
    expect(priv.data().userEmail).toBe('leak@x.com');
    expect(priv.data().ownerUid).toBe('owner-uid');
  });

  it('لا يتسرّب أي بريد من السجل المُنظَّف عبر استعلام list العام', async () => {
    const snap = await getDocs(query(collection(odb, 'reviews'), where('hidden', '==', false)));
    const cleaned = snap.docs.find((d) => d.id === 'r-leak');
    expect(cleaned).toBeTruthy();
    expect('userEmail' in cleaned.data()).toBe(false);
  });

  it('ينظّف تعليقاً يحمل بريداً وينقله إلى comment_private', async () => {
    const res = await repairRecord(COMMENT_META, { id: 'c-leak', data: { text: 'ok', status: 'approved', email: 'c@x.com' } }, actor, deps);
    expect(res.status).toBe('cleaned');
    const after = (await getDoc(doc(odb, 'comments', 'c-leak'))).data() || {};
    expect('email' in after).toBe(false);
    const priv = await getDoc(doc(odb, 'comment_private', 'c-leak'));
    expect(priv.exists()).toBe(true);
    expect(priv.data().email).toBe('c@x.com');
  });

  it('يتخطّى سجلاً سليماً بلا كتابة', async () => {
    const res = await repairRecord(REVIEW_META, { id: 'r-clean', data: { productId: 'p1', rating: 4, hidden: false } }, actor, deps);
    expect(res.status).toBe('skipped');
  });

  it('يؤرشف قبل أي تغيير (لا فقدان بيانات)', async () => {
    const snap = await getDocs(collection(odb, 'deleted_archive'));
    const archived = snap.docs.map((d) => d.data());
    expect(archived.some((a) => a.sourceId === 'r-leak' && a.sourceCollection === 'reviews')).toBe(true);
    expect(archived.some((a) => a.sourceId === 'r-leak' && a.payload?.userEmail === 'leak@x.com')).toBe(true);
  });

  it('يحذف سجلاً: أرشفة ثم حذف فعلي للمستند العام', async () => {
    const res = await deleteRecord(COMMENT_META, { id: 'c-clean', data: { text: 'نظيف', status: 'approved' } }, actor, deps);
    expect(res.status).toBe('deleted');
    expect((await getDoc(doc(odb, 'comments', 'c-clean'))).exists()).toBe(false);
    const snap = await getDocs(collection(odb, 'deleted_archive'));
    expect(snap.docs.some((d) => d.data().sourceId === 'c-clean')).toBe(true);
  });

  it('الدفعة تتابع رغم فشل عنصر وتُلخّص', async () => {
    const batch = await runBatch(
      [
        { id: 'r-hidden', meta: REVIEW_META, data: { productId: 'p1', rating: 1, hidden: true, userEmail: 'h@x.com' } },
        { id: 'missing-doc', meta: REVIEW_META, data: { productId: 'p1', rating: 3, hidden: false, userEmail: 'z@x.com' } },
      ],
      (rec) => repairRecord(rec.meta, { id: rec.id, data: rec.data }, actor, deps),
    );
    expect(batch.ok).toBe(1);
    expect(batch.failed).toBe(1);
    expect(batch.errors.some((e) => e.id === 'missing-doc')).toBe(true);
  });

  it('عضو عادي لا يستطيع تنظيف سجل غيره (القاعدة ترفض)', async () => {
    const mdb = testEnv.authenticatedContext('member-uid', { email: 'm@e.com', email_verified: true }).firestore();
    await expect(
      repairRecord(REVIEW_META, { id: 'r-other', data: { productId: 'p1', rating: 5, hidden: false, userEmail: 'o@x.com' } }, { uid: 'member-uid', email: 'm@e.com' }, { db: mdb }),
    ).rejects.toBeTruthy();
  });
});
