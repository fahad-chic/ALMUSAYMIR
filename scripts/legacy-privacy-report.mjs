// scripts/legacy-privacy-report.mjs
//
// معاينة (قراءة فقط) لسجلات reviews/comments القديمة وفق نموذج الخصوصية
// الفعلي على main. **لا يكتب أي شيء إطلاقاً** — لا وسم ولا فصل بيانات ولا
// حذف. مهمّته إظهار الأعداد والتصنيف فقط ليتّخذ المالك قرار الترحيل.
//
// التصنيف:
//   1) منشور وخالٍ من البيانات الشخصية      — سليم، لا يحتاج شيئاً
//   2) منشور لكنه يحمل بيانات شخصية         — خطر تسريب عبر list، يحتاج فصلاً
//   3) مخفي/معلّق/مرفوض                     — غير عام (لا تسريب)
//   4) ناقص أو غير قابل للتصنيف             — يُترك غير عام (محجوب تلقائياً)
//
// الخصوصية: التقرير يطبع أعداداً وأسماء حقول فقط — لا قيم ولا معرّفات مستندات،
// لذا يمكن مشاركته كما هو.
//
// التشغيل (يحتاج صلاحية قراءة تجاوز القواعد على مشروع الإنتاج):
//   export FIREBASE_PROJECT_ID=<project-id>
//   export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
//   node scripts/legacy-privacy-report.mjs
//
// للتجربة على المحاكي (لا يمسّ الإنتاج):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-almusaymir \
//     node scripts/legacy-privacy-report.mjs
//
// ⚠ هذه الأداة تقرأ فقط. لا يوجد فيها أي مسار كتابة (لا --apply).

import {
  classify,
  buildReport,
  REVIEW_META,
  COMMENT_META,
} from '../src/utils/legacyPrivacy.js';

const PROJECT = process.env.FIREBASE_PROJECT_ID;
const TOKEN = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;

if (!PROJECT) {
  console.error('✗ مطلوب FIREBASE_PROJECT_ID');
  process.exit(2);
}
if (!TOKEN && !EMULATOR) {
  console.error('✗ مطلوب GOOGLE_OAUTH_ACCESS_TOKEN (قراءة تجاوز القواعد)، أو FIRESTORE_EMULATOR_HOST للتجربة');
  process.exit(2);
}

const BASE = EMULATOR
  ? `http://${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const authHeaders = { 'Content-Type': 'application/json' };
if (TOKEN) authHeaders.Authorization = `Bearer ${TOKEN}`;
else authHeaders.Authorization = 'Bearer owner';

function toPlain(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    const val = Object.values(v)[0];
    if (val && typeof val === 'object' && 'fields' in val) out[k] = toPlain(val.fields);
    else out[k] = val;
  }
  return out;
}

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

async function run(meta) {
  const docs = await listAll(meta.name);
  const buckets = classify(docs, meta);
  console.log(buildReport(meta, buckets));
}

console.log('معاينة للقراءة فقط (dry-run) — لا كتابة ولا تعديل.');
if (EMULATOR) console.log(`  (محاكي Firestore: ${EMULATOR} — ليست بيانات إنتاج)`);
else console.log(`  (مشروع: ${PROJECT})`);

await run(REVIEW_META);
await run(COMMENT_META);

console.log('\nلا يوجد في هذه الأداة أي مسار كتابة. أي ترحيل يلزمه موافقة المالك صراحةً.');
