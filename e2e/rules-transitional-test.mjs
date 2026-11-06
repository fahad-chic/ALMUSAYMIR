// e2e/rules-transitional-test.mjs — تدقيق حاجز القواعد الانتقالي على محاكي Firebase.
// الغرض: إثبات أن ملف firestore.rules.transitional يمنع كتابة أي PII جديد أثناء
// نافذة الترحيل، مع إبقاء القراءة العامة متوافقة مع العملاء القدامى (لا فلتر publicSafe).
//
// التشغيل:
//   npx firebase emulators:exec --only firestore --project trans-demo "node e2e/rules-transitional-test.mjs"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(__dirname, '..', 'firestore.rules.transitional'), 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId: 'trans-demo',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});

const results = [];
async function expectAllow(name, p) {
  try { await assertSucceeds(p); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, detail: e.message }); }
}
async function expectDeny(name, p) {
  try { await assertFails(p); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, detail: e.message }); }
}

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', 'm1'), { emailVerified: true, email: 'm1@x.com', role: 'user' });
  // بيانات الإنتاج قبل الترحيل: تعليق قديم يحمل بريداً فعلياً
  await setDoc(doc(db, 'comments', 'old-with-email'), { text: 'قديم', status: 'approved', email: 'leak@x.com' });
  await setDoc(doc(db, 'reviews', 'rev-old'), { productId: 'p1', rating: 5, text: 'قديم', userEmail: 'a@b.c' });
});

const guest = testEnv
  .authenticatedContext('g1', { firebase: { sign_in_provider: 'anonymous' } })
  .firestore();
const member = testEnv
  .authenticatedContext('m1', { email_verified: true, email: 'm1@x.com' })
  .firestore();

// 1) توافق خلفي: القراءة القديمة (بلا فلتر publicSafe) تنجح
await expectAllow('read: قائمة التعليقات بلا فلتر (عميل قديم)',
  getDocs(collection(guest, 'comments')));
await expectAllow('read: قائمة التقييمات بلا فلتر (عميل قديم)',
  getDocs(collection(guest, 'reviews')));

// 2) الحاجز: لا يدخل أي PII جديد
await expectAllow('write: تعليق جديد نظيف {text,pending}',
  addDoc(collection(guest, 'comments'), { text: 'جديد', status: 'pending', publicSafe: true, likes: 0 }));
await expectAllow('write: تعليق عميل قديم ببريد فارغ',
  addDoc(collection(guest, 'comments'), { text: 'قديم', name: 'ز', email: '', city: '', status: 'pending', likes: 0 }));
await expectDeny('write: تعليق ببريد غير فارغ مرفوض',
  addDoc(collection(guest, 'comments'), { text: 'تسريب', name: 'ز', email: 'leak@x.com', status: 'pending', likes: 0 }));
await expectDeny('write: تعليق بحقل هاتف مرفوض',
  addDoc(collection(guest, 'comments'), { text: 'تسريب', phone: '0555', status: 'pending', likes: 0 }));
await expectDeny('write: تقييم بحقل userEmail مرفوض',
  addDoc(collection(member, 'reviews'), { productId: 'p1', rating: 5, userEmail: 'a@b.c' }));
await expectAllow('write: تقييم نظيف من عضو',
  addDoc(collection(member, 'reviews'), { productId: 'p1', rating: 5, text: 'نظيف' }));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} فحصاً ناجحاً`);
if (failed.length) {
  console.log('الفاشلة:');
  for (const f of failed) console.log(`  - ${f.name} :: ${f.detail}`);
  console.log('\nOVERALL: FAIL');
} else {
  console.log('OVERALL: PASS');
}

await testEnv.cleanup();
process.exit(failed.length ? 1 : 0);
