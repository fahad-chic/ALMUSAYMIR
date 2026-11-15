// إثبات حيّ على محاكي Firestore الحقيقي أن استعلام قائمة الحراج
// (where status==active + orderBy createdAt desc) يبثّ التحديثات عبر
// onSnapshot: نضيف إعلاناً بعد بدء الاشتراك فيظهر في اللقطة التالية بلا
// أي استعلام يدوي. يطابق الاستعلام المستخدم فعلاً في RoyalHarajPage.
//
// التشغيل:
//   npx firebase emulators:exec --only firestore --config firebase.rules-test.json \
//     --project demo-almusaymir "node e2e/haraj-live-audit.mjs"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  addDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-almusaymir';

let passed = 0;
let failed = 0;
const check = (name, cond) => {
  if (cond) {
    passed += 1;
    console.log('PASS —', name);
  } else {
    failed += 1;
    console.log('FAIL —', name);
  }
};

const waitFor = (predicate, timeout = 8000) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) return resolve(true);
      if (Date.now() - started > timeout) return reject(new Error('timeout'));
      setTimeout(tick, 100);
    };
    tick();
  });

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8') },
});

// بذرة إعلان نشط واحد + وثيقة عضوية بصلاحيات متجاوزة القواعد (تهيئة فقط).
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const seed = ctx.firestore();
  await addDoc(collection(seed, 'haraj_ads'), {
    title: 'إعلان بذرة',
    price: 100,
    status: 'active',
    userId: 'uid-member',
    createdAt: new Date(),
  });
  await setDoc(doc(seed, 'users', 'uid-member'), {
    email: 'member@example.com',
    role: 'user',
  });
});

// عضو موثّق (القاعدة تسمح بالقراءة للمسجّل الموثّق غير المحظور).
const member = testEnv.authenticatedContext('uid-member', {
  email: 'member@example.com',
  email_verified: true,
});
const db = member.firestore();

const adsQuery = query(
  collection(db, 'haraj_ads'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc')
);

let latest = [];
let subError = null;
const unsub = onSnapshot(
  adsQuery,
  (snap) => {
    latest = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  (error) => {
    subError = error;
  }
);

try {
  await waitFor(() => latest.length > 0 || subError);
  check('الاشتراك المرتّب يعمل على المحاكي (لا فهرس مفقود)', !subError);
  check('اللقطة الأولية تحمل الإعلان النشط', latest.some((a) => a.title === 'إعلان بذرة'));

  const before = latest.length;

  // إعلان نشط جديد — يجب أن يظهر عبر البثّ بلا استعلام يدوي.
  await addDoc(collection(db, 'haraj_ads'), {
    title: 'إعلان بثّ حيّ',
    price: 500,
    status: 'active',
    userId: 'uid-member',
    createdAt: serverTimestamp(),
  });

  await waitFor(() => latest.some((a) => a.title === 'إعلان بثّ حيّ'));
  check('إعلان جديد يظهر عبر onSnapshot فوراً', latest.some((a) => a.title === 'إعلان بثّ حيّ'));
  check('عدد الإعلانات النشطة ازداد', latest.length > before);

  // إعلان غير نشط — يجب ألا يظهر (شرط status == 'active').
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await addDoc(collection(ctx.firestore(), 'haraj_ads'), {
      title: 'إعلان مخفي',
      price: 1,
      status: 'pending',
      userId: 'seed-user',
      createdAt: new Date(),
    });
  });
  await new Promise((r) => setTimeout(r, 1200));
  check('الإعلان غير النشط لا يظهر في القائمة', !latest.some((a) => a.title === 'إعلان مخفي'));
} finally {
  unsub();
  await testEnv.cleanup();
}

console.log(`\n${passed}/${passed + failed} فحصاً ناجحاً`);
console.log(failed === 0 ? 'OVERALL: PASS' : 'OVERALL: FAIL');
process.exit(failed === 0 ? 0 : 1);
