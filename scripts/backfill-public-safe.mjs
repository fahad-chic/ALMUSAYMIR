// scripts/backfill-public-safe.mjs
//
// خطة آمنة لإعادة إظهار المحتوى المنشور الخالي من البيانات الشخصية بعد إغلاق
// تسريبي reviews/comments. يعمل افتراضياً في وضع المعاينة (dry-run) ولا يكتب
// أي شيء. الكتابة تتطلب --apply صريحاً و CONFIRM_APPLY=yes.
//
// الأثر: شرط القراءة العامة صار resource.data.publicSafe == true. المستندات
// القديمة التي لا تحمل هذا الحقل لا تُقرأ علناً (وهو المقصود لإغلاق التسريب).
// هذا السكربت يعيد إظهار ما يجوز إظهاره فقط:
//   - approved + بلا بيانات شخصية  => إضافة publicSafe: true فقط.
//   - approved + يحمل بيانات شخصية => نقل الحقول الشخصية إلى
//     review_private/comment_private ثم إضافة publicSafe: true.
//   - hidden / غير approved         => تُترك كما هي (تبقى غير عامة).
//
// التشغيل (يتطلب صلاحية تجاوز القواعد: مالك/محرّر المشروع):
//   export FIREBASE_PROJECT_ID=<project>
//   export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
//   node scripts/backfill-public-safe.mjs            # معاينة فقط
//   CONFIRM_APPLY=yes node scripts/backfill-public-safe.mjs --apply
//
// ملاحظة: لا يُشغَّل على الإنتاج إلا بموافقة صريحة من المالك.

const PROJECT = process.env.FIREBASE_PROJECT_ID;
const TOKEN = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
const APPLY = process.argv.includes('--apply');
const CONFIRMED = process.env.CONFIRM_APPLY === 'yes';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const REVIEW_PII = ['userEmail', 'userId', 'ownerUid'];
const COMMENT_PII = ['email'];

if (!PROJECT) {
  console.error('✗ مطلوب FIREBASE_PROJECT_ID');
  process.exit(2);
}
if (!TOKEN) {
  console.error('✗ مطلوب GOOGLE_OAUTH_ACCESS_TOKEN (صلاحية تجاوز القواعد)');
  process.exit(2);
}
if (APPLY && !CONFIRMED) {
  console.error('✗ الكتابة تتطلب --apply و CONFIRM_APPLY=yes معاً');
  process.exit(2);
}

const authHeaders = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const toPlain = (fields = {}) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Object.values(v)[0]]));

async function listAll(collection) {
  const out = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) throw new Error(`${collection}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const d of body.documents || []) {
      out.push({ id: d.name.split('/').pop(), data: toPlain(d.fields) });
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return out;
}

async function patchFields(collection, id, fields) {
  const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const body = {
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v }])
    ),
  };
  const res = await fetch(`${BASE}/${collection}/${id}?${mask}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${collection}/${id}: ${res.status} ${await res.text()}`);
}

function classify(docs, piiFields) {
  const buckets = { safe: [], needsSplit: [], skip: [] };
  for (const { id, data } of docs) {
    const isHidden = data.hidden === true;
    const isApproved = data.status === undefined ? !isHidden : data.status === 'approved';
    if (isHidden || !isApproved) { buckets.skip.push({ id, data }); continue; }
    if (data.publicSafe === true) { buckets.skip.push({ id, data }); continue; }
    const pii = piiFields.filter((f) => data[f] !== undefined && data[f] !== null && data[f] !== '');
    if (pii.length) buckets.needsSplit.push({ id, data, pii });
    else buckets.safe.push({ id, data });
  }
  return buckets;
}

function report(name, b, privateCollection) {
  console.log(`\n=== ${name} ===`);
  console.log(`  إجمالي المستندات: ${b.safe.length + b.needsSplit.length + b.skip.length}`);
  console.log(`  غير ظاهرة حالياً (hidden/غير معتمد/لديها publicSafe): ${b.skip.length}`);
  console.log(`  قابلة للإظهار بلا بيانات شخصية (تُضاف publicSafe فقط): ${b.safe.length}`);
  console.log(`  قابلة للإظهار بعد نقل البيانات الشخصية إلى ${privateCollection}: ${b.needsSplit.length}`);
  for (const r of b.needsSplit.slice(0, 5)) {
    console.log(`    - ${r.id}: ستنقل الحقول ${r.pii.join(', ')}`);
  }
}

async function runCollection(name, piiFields, privateCollection, buildPrivate) {
  const docs = await listAll(name);
  const b = classify(docs, piiFields);
  report(name, b, privateCollection);
  if (!APPLY) return b;

  for (const r of b.safe) {
    await patchFields(name, r.id, { publicSafe: true });
  }
  for (const r of b.needsSplit) {
    await patchFields(privateCollection, r.id, buildPrivate(r));
    await patchFields(name, r.id, { publicSafe: true });
  }
  console.log(`  ✓ طُبّق: ${b.safe.length} بلا تغيير بيانات + ${b.needsSplit.length} مع فصل البيانات`);
  return b;
}

async function main() {
  console.log(APPLY ? '⚠ وضع الكتابة (--apply)' : 'معاينة فقط (dry-run) — لا كتابة');
  await runCollection('reviews', REVIEW_PII, 'review_private', (r) => ({
    ownerUid: r.data.ownerUid || '',
    userEmail: r.data.userEmail || '',
    ...(r.data.userId ? { userId: r.data.userId } : {}),
  }));
  await runCollection('comments', COMMENT_PII, 'comment_private', (r) => ({
    email: r.data.email || '',
    status: r.data.status || 'pending',
    publicSafe: true,
  }));
  if (!APPLY) console.log('\nللتطبيق (بموافقة المالك): CONFIRM_APPLY=yes node scripts/backfill-public-safe.mjs --apply');
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
