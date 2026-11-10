// scripts/validate-indexes.mjs — فحص مسبق (preflight) لملف firestore.indexes.json.
// يمنع أخطاء النشر الشائعة قبل الوصول إلى Firebase:
//   1) JSON صالح بنية صحيحة.
//   2) لا فهارس مكرّرة (نفس المجموعة + نفس الحقول + نفس الاتجاهات).
//   3) لا فهارس مركّبة أحادية الحقل (Firestore يرفضها/لا معنى لها).
//   4) كل فهرس مركّب يحمل حقلاً واحداً على الأقل باتجاه غير ASCENDING
//      (وإلا غطّاه الفهرس التلقائي المفرد).
//   5) فهرس reviews المطلوب للاستعلام العام موجود بترتيب Firebase نفسه.
//   6) queryScope صالح، وكل حقل يحمل order أو arrayConfig (لا الاثنين معاً).
//
// التشغيل: node scripts/validate-indexes.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'firestore.indexes.json');

const errors = [];
const warnings = [];

let doc;
try {
  doc = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (err) {
  console.error(`FAIL: JSON غير صالح في ${FILE}: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(doc.indexes)) {
  errors.push('المفتاح "indexes" مفقود أو ليس مصفوفة.');
}

const VALID_ORDERS = new Set(['ASCENDING', 'DESCENDING']);
const VALID_SCOPES = new Set(['COLLECTION', 'COLLECTION_GROUP']);

const seen = new Map();
const indexes = Array.isArray(doc.indexes) ? doc.indexes : [];

indexes.forEach((idx, i) => {
  const where = `indexes[${i}] (${idx.collectionGroup || '?'})`;

  if (!idx.collectionGroup) errors.push(`${where}: collectionGroup مفقود.`);
  if (!VALID_SCOPES.has(idx.queryScope)) {
    errors.push(`${where}: queryScope غير صالح (${idx.queryScope}).`);
  }
  if (!Array.isArray(idx.fields) || idx.fields.length === 0) {
    errors.push(`${where}: fields فارغ.`);
    return;
  }

  let hasNonAscending = false;
  idx.fields.forEach((f, j) => {
    const fw = `${where}.fields[${j}]`;
    if (!f.fieldPath) errors.push(`${fw}: fieldPath مفقود.`);
    const hasOrder = f.order !== undefined;
    const hasArray = f.arrayConfig !== undefined;
    if (hasOrder && hasArray) {
      errors.push(`${fw}: يحمل order و arrayConfig معاً (غير مسموح).`);
    } else if (!hasOrder && !hasArray) {
      errors.push(`${fw}: يفتقد order و arrayConfig.`);
    }
    if (hasOrder && !VALID_ORDERS.has(f.order)) {
      errors.push(`${fw}: order غير صالح (${f.order}).`);
    }
    if (hasArray && f.arrayConfig !== 'CONTAINS') {
      errors.push(`${fw}: arrayConfig غير صالح (${f.arrayConfig}).`);
    }
    if (f.order && f.order !== 'ASCENDING') hasNonAscending = true;
  });

  if (idx.fields.length < 2) {
    errors.push(`${where}: فهرس مركّب بأقل من حقلين (${idx.fields.length}).`);
  }
  if (idx.fields.length >= 2 && !hasNonAscending) {
    warnings.push(
      `${where}: كل الحقول ASCENDING — قد يغطّيه الفهرس التلقائي المفرد.`
    );
  }

  const key = `${idx.collectionGroup}|${idx.fields
    .map((f) => `${f.fieldPath}:${f.order || f.arrayConfig}`)
    .join(',')}`;
  if (seen.has(key)) {
    errors.push(`${where}: فهرس مكرّر مع ${seen.get(key)}.`);
  } else {
    seen.set(key, where);
  }
});

// الفهرس المطلوب لاستعلام التقييمات العام (getReviews): ترتيب Firebase نفسه.
const REQUIRED = {
  collectionGroup: 'reviews',
  queryScope: 'COLLECTION',
  fields: [
    'hidden:ASCENDING',
    'productId:ASCENDING',
    'createdAt:DESCENDING',
  ],
};
const requiredKey = `${REQUIRED.collectionGroup}|${REQUIRED.fields.join(',')}`;
if (!seen.has(requiredKey)) {
  errors.push(
    `الفهرس المطلوب مفقود: ${REQUIRED.collectionGroup} ` +
      `[${REQUIRED.fields.join(', ')}] scope=${REQUIRED.queryScope}.`
  );
}

warnings.forEach((w) => console.warn(`  warn: ${w}`));

if (errors.length) {
  console.error(`FAIL: ${errors.length} مشكلة في ${FILE}:`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(
  `OK: ${indexes.length} فهرس صالح (لا تكرار، لا أحادي الحقل، فهرس reviews المطلوب موجود).`
);
