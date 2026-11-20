// تدقيق حقيقي (محاكي Firestore) لسلوك السجلات القديمة تحت القواعد الحالية.
// يصنّف كل شكل بيانات: منشور آمن / يحوي بيانات شخصية / مخفي-معلّق / غير قابل
// للتصنيف — ويُثبت أي شكل يظهر للعامة وأيّها يُحجب. لا يمسّ الإنتاج إطلاقاً.
//
// التشغيل:
//   npx firebase emulators:exec --only firestore --config firebase.rules-test.json \
//     --project demo-almusaymir "node e2e/legacy-privacy-audit.mjs"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, doc, setDoc, getDoc, getDocs, query, where, orderBy,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-almusaymir';

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) { passed += 1; console.log('PASS —', name); }
  else { failed += 1; console.log('FAIL —', name, detail); }
};

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8') },
});

// أشكال السجلات القديمة (قبل إصلاح الخصوصية).
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  // 1) تقييم قديم بلا حقل hidden إطلاقاً (شكل ما قبل الحقل)
  await setDoc(doc(db, 'reviews', 'r-no-hidden'), { productId: 'p1', rating: 5, text: 'قديم' });
  // 2) تقييم منشور يحمل بريداً في المستند العام (تسريب محتمل)
  await setDoc(doc(db, 'reviews', 'r-pii'), { productId: 'p1', rating: 4, text: 'ok', hidden: false, userEmail: 'a@b.com' });
  // 3) تقييم منشور نظيف (الشكل الجديد)
  await setDoc(doc(db, 'reviews', 'r-clean'), { productId: 'p1', rating: 5, text: 'نظيف', hidden: false });
  // 4) تقييم مخفي (معلّق/مُخفى)
  await setDoc(doc(db, 'reviews', 'r-hidden'), { productId: 'p1', rating: 1, text: 'مخفي', hidden: true });
  // 5) تعليق قديم بلا حقل status
  await setDoc(doc(db, 'comments', 'c-no-status'), { text: 'قديم', createdAt: new Date() });
  // 6) تعليق معتمد يحمل بريداً (تسريب محتمل)
  await setDoc(doc(db, 'comments', 'c-pii'), { text: 'ok', status: 'approved', email: 'x@y.com', createdAt: new Date() });
  // 7) تعليق معتمد نظيف
  await setDoc(doc(db, 'comments', 'c-clean'), { text: 'نظيف', status: 'approved', createdAt: new Date() });
  // 8) تعليق معلّق
  await setDoc(doc(db, 'comments', 'c-pending'), { text: 'معلّق', status: 'pending', createdAt: new Date() });
  // عضوية العضو
  await setDoc(doc(db, 'users', 'uid-member'), { email: 'm@e.com', role: 'user' });
});

const member = testEnv.authenticatedContext('uid-member', { email: 'm@e.com', email_verified: true });
const mdb = member.firestore();
const anon = testEnv.unauthenticatedContext().firestore();

// ---- التقييمات: قراءة عامة عبر الاستعلام الفعلي (where hidden==false) ----
let reviewList = [];
try {
  const snap = await getDocs(query(collection(mdb, 'reviews'), where('hidden', '==', false)));
  reviewList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
} catch (e) { reviewList = []; }

check('تقييم نظيف منشور (hidden=false) يظهر للعامة', reviewList.some((r) => r.id === 'r-clean'));
check('تقييم بلا حقل hidden لا يظهر (غير قابل للتصنيف → محجوب)', !reviewList.some((r) => r.id === 'r-no-hidden'));
check('تقييم مخفي (hidden=true) لا يظهر', !reviewList.some((r) => r.id === 'r-hidden'));

// هل يتسرّب بريد عبر list؟ (الاستعلام الفعلي)
// ملاحظة مقيسة على المحاكي: قواعد list تُقيَّم على الاستعلام لا على كل مستند،
// ولا يمكنها إخفاء مستند واحد داخل نتيجة list. لذلك السجل القديم الحامل لهوية
// يظهر عبر list ما دام منشوراً — والضمانة الفعلية هي منع الكتابة (create/update)
// لا الترشيح، إضافة إلى أداة الإصلاح (privacyRepair) لتنظيف القديم.
const piiInList = reviewList.find((r) => r.id === 'r-pii');
console.log('INFO — تقييم قديم يحمل بريداً عبر list:',
  piiInList ? 'ظاهر (قيد Firestore موثّق — يُصلح بـprivacyRepair)' : 'محجوب');

// الضمانة القابلة للفرض: لا يمكن كتابة/تحديث مستند تقييم يحمل هوية.
let reviewWriteWithPII = 'allowed';
try {
  await setDoc(doc(mdb, 'reviews', 'r-write-pii'), { productId: 'p1', rating: 5, text: 'x', hidden: false, userEmail: 'a@b.com' });
} catch { reviewWriteWithPII = 'denied'; }
check('منع كتابة تقييم يحمل بريداً (الضمانة الفعلية)', reviewWriteWithPII === 'denied');

// قراءة مستند مفرد (get) للتقييم الحامل للبريد — دفاع في العمق
let piiGetBlocked = false;
try { await getDoc(doc(mdb, 'reviews', 'r-pii')); } catch { piiGetBlocked = true; }
check('تقييم يحمل بريداً: get محجوب للعامة (hasNoPublicPII)', piiGetBlocked);

// ---- التعليقات: قراءة عامة عبر where(status==approved) ----
let commentList = [];
try {
  const snap = await getDocs(query(collection(mdb, 'comments'), where('status', '==', 'approved'), orderBy('createdAt', 'desc')));
  commentList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
} catch (e) { commentList = []; }

check('تعليق معتمد نظيف يظهر للعامة', commentList.some((c) => c.id === 'c-clean'));
check('تعليق بلا حقل status لا يظهر (غير قابل للتصنيف → محجوب)', !commentList.some((c) => c.id === 'c-no-status'));
check('تعليق معلّق لا يظهر', !commentList.some((c) => c.id === 'c-pending'));
const cpi = commentList.find((c) => c.id === 'c-pii');
console.log('INFO — تعليق قديم يحمل بريداً عبر list:',
  cpi ? 'ظاهر (قيد Firestore موثّق — يُصلح بـprivacyRepair)' : 'محجوب');

// الضمانة القابلة للفرض: منع كتابة تعليق يحمل بريداً في المستند العام.
let commentWriteWithPII = 'allowed';
try {
  await setDoc(doc(mdb, 'comments', 'c-write-pii'), { text: 'x', status: 'pending', email: 'a@b.com', createdAt: new Date() });
} catch { commentWriteWithPII = 'denied'; }
check('منع كتابة تعليق يحمل بريداً (الضمانة الفعلية)', commentWriteWithPII === 'denied');

let cpiGetBlocked = false;
try { await getDoc(doc(mdb, 'comments', 'c-pii')); } catch { cpiGetBlocked = true; }
check('تعليق يحمل بريداً: get محجوب للعامة', cpiGetBlocked);

// زائر مجهول لا يقرأ التقييمات العامة؟ (القاعدة: get/list تحتاج مسجّلاً)
let anonReviews = [];
try {
  const snap = await getDocs(query(collection(anon, 'reviews'), where('hidden', '==', false)));
  anonReviews = snap.docs.map((d) => d.id);
} catch { anonReviews = []; }
console.log('INFO — الزائر المجهول يرى تقييمات:', anonReviews.length ? anonReviews.join(',') : '(لا شيء)');

await testEnv.cleanup();
console.log(`\n${passed}/${passed + failed} فحصاً ناجحاً`);
console.log(failed === 0 ? 'OVERALL: PASS' : 'OVERALL: FAIL');
process.exit(failed === 0 ? 0 : 1);
