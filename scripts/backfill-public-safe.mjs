// scripts/backfill-public-safe.mjs
//
// خطة آمنة لإعادة إظهار المحتوى المنشور الخالي من البيانات الشخصية بعد إغلاق
// تسريبي reviews/comments. يعمل افتراضياً في وضع المعاينة (dry-run) ولا يكتب
// أي شيء. الكتابة تتطلب --apply صريحاً و CONFIRM_APPLY=yes معاً، ونسخة احتياطية.
//
// الأثر: شرط القراءة العامة صار resource.data.publicSafe == true. المستندات
// القديمة التي لا تحمل هذا الحقل لا تُقرأ علناً (وهو المقصود لإغلاق التسريب).
//
// لماذا يجب حذف الحقول الشخصية قبل وضع العلامة: قواعد Firestore تقيّم الاستعلام
// (list) لا كل مستند، ولا تستطيع فرض «غياب حقل» في where. فمستند يحمل
// publicSafe == true و userEmail معاً يبقى مقروءاً عبر استعلام المجموعة. لذلك
// لا نضع العلامة إلا بعد نقل الحقول الشخصية وحذفها من المستند العام.
//
// تنقية الحقول الفارغة: حقل الهوية قد يكون موجوداً بمفتاحه بقيمة فارغة ('' أو
// null) — كما يكتب نموذج التعليقات القديم email: '' دائماً. هذه القيمة لا تنقل
// بيانات شخصية، لكن وجود المفتاح نفسه يمنع القراءة المباشرة (get) لأن قاعدة
// hasNoPublicPII ترفض أي مستند يحمل مفتاح هوية. لذلك نحذف المفاتيح الفارغة
// المعروفة فقط من المستندات الآمنة (بعد النسخ الاحتياطي). لا تُحذف أي قيمة غير
// فارغة (تُنقل إلى المجموعة الخاصة) ولا أي حقل غير معروف.
//
// التشغيل (يتطلب صلاحية تجاوز القواعد: مالك/محرّر المشروع):
//   export FIREBASE_PROJECT_ID=<project>
//   export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
//   node scripts/backfill-public-safe.mjs                 # معاينة فقط (dry-run)
//   CONFIRM_APPLY=yes node scripts/backfill-public-safe.mjs --apply --backup-dir=./backup-2026-01-01
//
// للتجربة على المحاكي: اضبط FIRESTORE_EMULATOR_HOST (يكفي معه FIREBASE_PROJECT_ID).
//
// ملاحظة: لا يُشغَّل على الإنتاج إلا بموافقة صريحة من المالك.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT = process.env.FIREBASE_PROJECT_ID;
const TOKEN = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const APPLY = process.argv.includes('--apply');
const CONFIRMED = process.env.CONFIRM_APPLY === 'yes';
const BACKUP_DIR = (process.argv.find((a) => a.startsWith('--backup-dir=')) || '').split('=')[1] || '';
const BASE = EMULATOR
  ? `http://${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// كل حقول الهوية والاتصال والحقول الخاصة — لا نكتفي بـ userEmail.
export const IDENTITY_FIELDS = [
  'userEmail', 'email', 'contactEmail', 'phone', 'userPhone', 'phoneNumber',
  'mobile', 'whatsapp', 'userId', 'ownerUid', 'uid', 'nationalId', 'iban',
  'accountNumber', 'userName',
];

export const REVIEW_META = { name: 'reviews', privateName: 'review_private', required: ['productId', 'rating'] };
export const COMMENT_META = { name: 'comments', privateName: 'comment_private', required: ['text'] };

const log = [];
const record = (entry) => log.push({ at: new Date().toISOString(), ...entry });

function validateEnv() {
  if (!PROJECT) {
    console.error('✗ مطلوب FIREBASE_PROJECT_ID');
    process.exit(2);
  }
  if (!TOKEN && !EMULATOR) {
    console.error('✗ مطلوب GOOGLE_OAUTH_ACCESS_TOKEN (صلاحية تجاوز القواعد)، أو FIRESTORE_EMULATOR_HOST للتجربة');
    process.exit(2);
  }
  if (APPLY && !CONFIRMED) {
    console.error('✗ الكتابة تتطلب --apply و CONFIRM_APPLY=yes معاً');
    process.exit(2);
  }
  if (APPLY && !BACKUP_DIR) {
    console.error('✗ الكتابة تتطلب --backup-dir=<dir> لأخذ نسخة احتياطية قبل أي تعديل');
    process.exit(2);
  }
}

const authHeaders = { 'Content-Type': 'application/json' };
if (TOKEN) authHeaders.Authorization = `Bearer ${TOKEN}`;
// المحاكي يفرض القواعد على REST أيضاً؛ رمز owner يتجاوزها (تطوير فقط).
else if (EMULATOR) authHeaders.Authorization = 'Bearer owner';

export function toPlain(fields = {}) {
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

export function encodeValue(v) {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  return { stringValue: String(v) };
}

// الكتابة تُحدِّث الحقول المعطاة فقط (updateMask) — لا تستبدل المستند كاملاً.
// الحقول المطلوب حذفها تُمرَّر في نفس الـmask؛ تمريرها فارغة يحذفها من المستند.
export async function patchFields(collection, id, fields, deleteFields = []) {
  const paths = [...Object.keys(fields), ...deleteFields];
  const mask = paths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = {
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, encodeValue(v)])),
  };
  const res = await fetch(`${BASE}/${collection}/${id}?${mask}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${collection}/${id}: ${res.status} ${await res.text()}`);
}

export function pickPII(data) {
  const found = {};
  for (const f of IDENTITY_FIELDS) {
    const v = data[f];
    if (v !== undefined && v !== null && v !== '') found[f] = v;
  }
  return found;
}

// حقول هوية موجودة بمفتاحها لكن قيمتها فارغة (''/null). وجود المفتاح يمنع get
// عبر hasNoPublicPII، لكن لا قيمة شخصية فيه. نحذف المفتاح فقط.
export function blankIdentityFields(data) {
  return IDENTITY_FIELDS.filter((f) => data[f] === '' || data[f] === null);
}

// تصنيف رباعي. غير المؤكد لا يُوسم عاماً أبداً.
export function classify(docs, meta) {
  const buckets = {
    alreadyPublic: [], // منشور ومعتمد وخالٍ ويحمل العلامة أصلاً
    publicNoPII: [],   // منشور ومعتمد وخالٍ — يحتاج إضافة العلامة فقط
    publicWithPII: [], // منشور أو معتمد لكنه يحمل بيانات شخصية
    notPublic: [],     // مخفي أو معلّق أو مرفوض
    unknown: [],       // ناقص أو غير قابل للتصنيف
  };
  for (const doc of docs) {
    const { data } = doc;
    const missing = meta.required.filter((f) => data[f] === undefined || data[f] === null || data[f] === '');
    if (missing.length) { buckets.unknown.push({ ...doc, reason: `حقول ناقصة: ${missing.join(', ')}` }); continue; }
    if (data.status !== undefined && !['approved', 'pending', 'rejected'].includes(data.status)) {
      buckets.unknown.push({ ...doc, reason: `حالة غير معروفة: ${String(data.status)}` });
      continue;
    }
    const isHidden = data.hidden === true;
    const isApproved = !isHidden && data.status !== 'pending' && data.status !== 'rejected';
    if (!isApproved) {
      buckets.notPublic.push({ ...doc, reason: isHidden ? 'hidden' : (data.status || 'غير معتمد') });
      continue;
    }
    const pii = pickPII(data);
    const blanks = blankIdentityFields(data);
    if (data.publicSafe === true && Object.keys(pii).length === 0 && blanks.length === 0) {
      buckets.alreadyPublic.push(doc);
      continue;
    }
    if (Object.keys(pii).length > 0) { buckets.publicWithPII.push({ ...doc, pii, blanks }); continue; }
    buckets.publicNoPII.push({ ...doc, blanks });
  }
  return buckets;
}

// تجميع أعداد بأسماء الحقول فقط — لا قيم ولا معرّفات مستندات.
function tallyFields(rows, key) {
  const tally = {};
  for (const r of rows) {
    const value = r[key];
    const names = Array.isArray(value) ? value : Object.keys(value || {});
    for (const f of names) tally[f] = (tally[f] || 0) + 1;
  }
  return tally;
}

function tallyReasons(rows) {
  const tally = {};
  for (const r of rows) {
    const k = r.reason || 'غير محدد';
    tally[k] = (tally[k] || 0) + 1;
  }
  return tally;
}

// يطبع (اسم: عدد) فقط. لا قيم ولا معرّفات — فالمخرجات قابلة للمشاركة كما هي.
function printTally(label, tally) {
  const keys = Object.keys(tally);
  if (keys.length === 0) { console.log(`  ${label}: لا شيء`); return; }
  console.log(`  ${label}:`);
  for (const k of keys) console.log(`    - ${k}: ${tally[k]}`);
}

function report(meta, b) {
  const total = Object.values(b).reduce((n, arr) => n + arr.length, 0);
  console.log(`\n=== ${meta.name} ===`);
  console.log(`  إجمالي المستندات: ${total}`);
  console.log(`  1) منشور ومعتمد وخالٍ من البيانات الشخصية: ${b.publicNoPII.length} (يحتاج publicSafe فقط)`);
  console.log(`  2) منشور/معتمد لكنه يحمل بيانات شخصية: ${b.publicWithPII.length} (يحتاج فصلاً إلى ${meta.privateName})`);
  console.log(`  3) مخفي أو معلّق أو مرفوض: ${b.notPublic.length} (يُترك غير عام)`);
  console.log(`  4) ناقص أو غير قابل للتصنيف: ${b.unknown.length} (يُترك غير عام)`);
  console.log(`  (إضافة) سبق وسمه عاماً وخالياً: ${b.alreadyPublic.length} (لا تغيير)`);

  // تفصيل بالاسم فقط: ما سيُنقل، وما سيُحذف مفتاحه الفارغ، وأسباب عدم التصنيف.
  // التنقية تخصّ المستندات التي ستُعاد كتابتها فعلاً (وسم/فصل) — لا alreadyPublic.
  const pruneRows = [...b.publicNoPII, ...b.publicWithPII];
  printTally(`حقول شخصية ستُنقل إلى ${meta.privateName} (اسم الحقل: عدد المستندات)`, tallyFields(b.publicWithPII, 'pii'));
  printTally('حقل هوية فارغ سيُحذف مفتاحه فقط (اسم الحقل: عدد المستندات)', tallyFields(pruneRows, 'blanks'));
  printTally('غير قابل للتصنيف (السبب: عدد المستندات)', tallyReasons(b.unknown));
  return total;
}

async function backup(collection, docs) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `${collection}.json`);
  fs.writeFileSync(file, JSON.stringify(docs, null, 2));
  console.log(`  💾 نسخة احتياطية: ${file} (${docs.length} مستنداً)`);
  return file;
}

export function buildPrivateDoc(meta, r) {
  const priv = { ...r.pii };
  // reviews: الملكية تُلزَم على السجل الخاص (ownerUid == uid المُنشئ).
  if (meta.name === 'reviews') {
    priv.ownerUid = r.pii.ownerUid || r.data.ownerUid || r.pii.userId || r.data.userId || '';
    if (r.data.productId !== undefined) priv.productId = r.data.productId;
  }
  // comments: القاعدة تشترط publicSafe و status=='pending' عند إنشاء السجل الخاص.
  if (meta.name === 'comments') {
    priv.status = r.data.status || 'pending';
    priv.publicSafe = true;
  }
  return priv;
}

async function runCollection(meta) {
  const docs = await listAll(meta.name);
  const b = classify(docs, meta);
  report(meta, b);
  if (!APPLY) return b;

  const backupFile = await backup(meta.name, docs);
  record({ collection: meta.name, action: 'backup', file: backupFile, docs: docs.length });

  for (const r of b.publicNoPII) {
    // نحذف المفاتيح الفارغة المعروفة فقط (email:'' مثلاً) مع وضع العلامة.
    const prune = r.blanks || [];
    await patchFields(meta.name, r.id, { publicSafe: true }, prune);
    record({ collection: meta.name, id: r.id, action: 'tag', fields: ['publicSafe'], pruned: prune });
  }
  for (const r of b.publicWithPII) {
    const priv = buildPrivateDoc(meta, r);
    const prune = r.blanks || [];
    await patchFields(meta.privateName, r.id, priv);
    // تُنقل القيم غير الفارغة، وتُحذف المفاتيح الفارغة، ثم تُوضع العلامة.
    await patchFields(meta.name, r.id, { publicSafe: true }, [...Object.keys(r.pii), ...prune]);
    record({ collection: meta.name, id: r.id, action: 'split+tag', moved: Object.keys(r.pii), pruned: prune, kept: Object.keys(priv) });
  }
  for (const r of [...b.notPublic, ...b.unknown]) {
    record({ collection: meta.name, id: r.id, action: 'leave', reason: r.reason });
  }
  for (const r of b.alreadyPublic) {
    record({ collection: meta.name, id: r.id, action: 'noop' });
  }
  const prunedCount = [...b.publicNoPII, ...b.publicWithPII].filter((r) => (r.blanks || []).length > 0).length;
  console.log(`  ✓ طُبّق: ${b.publicNoPII.length} وسم فقط + ${b.publicWithPII.length} فصل بيانات + ${prunedCount} تنقية حقول فارغة`);
  return b;
}

async function main() {
  console.log(APPLY ? '⚠ وضع الكتابة (--apply)' : 'معاينة فقط (dry-run) — لا كتابة');
  if (EMULATOR) console.log(`  (محاكي Firestore: ${EMULATOR} — ليست بيانات إنتاج)`);
  await runCollection(REVIEW_META);
  await runCollection(COMMENT_META);
  if (APPLY) {
    const logFile = path.join(BACKUP_DIR, 'migration-log.json');
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    console.log(`\n📝 سجل الترحيل: ${logFile}`);
  } else {
    console.log('\nللتطبيق (بموافقة المالك): CONFIRM_APPLY=yes node scripts/backfill-public-safe.mjs --apply --backup-dir=<dir>');
  }
}

// يُشغَّل كبرنامج فقط، لا عند الاستيراد في الاختبارات.
const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  validateEnv();
  main().catch((e) => { console.error('✗', e.message); process.exit(1); });
}
