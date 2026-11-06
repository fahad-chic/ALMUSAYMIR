// scripts/compare-indexes.mjs — مقارنة قراءة-فقط بين فهارس الإنتاج ومحتوى firestore.indexes.json.
// لا يكتب ولا ينشر شيئًا.
//
// مشكلة يجب معالجتها: `firebase firestore:indexes` يعيد حقل `__name__` الضمني في كل فهرس
// (لأنه يعكس ما يخزّنه الـAPI)، بينما ملف المشروع لا يذكره، فيبدوان مختلفين بنيويًا وهما متطابقان.
// الحل: نوحّد الطرفين إلى تمثيل قانوني واحد مطابق لِـ processIndex في firebase-tools:
//   - حقل `__name__` في النهاية يُعتبر ضمنيًا فقط إذا طابق ترتيبه ترتيب آخر حقل صريح.
//   - أعد إلحاق `__name__` بترتيب آخر حقل صريح للطرفين، فيتطابقان.
//   - إن اختلف ترتيب `__name__` المُصرَّح عن الضمني، أو ورد __name__ في غير النهاية، فهو فرق حقيقي ولا يُتجاهل.
// لا نتجاهل أي فرق آخر: المجموعة، الحقول، الترتيب، queryScope، apiScope، density، multikey.
//
// الاستخدام:
//   1) صدّر فهارس الإنتاج (قراءة فقط):
//        npx firebase-tools firestore:indexes --project anaqa-chic-4e437 > /tmp/prod-indexes.json
//   2) شغّل المقارنة:
//        node scripts/compare-indexes.mjs firestore.indexes.json /tmp/prod-indexes.json
import { readFileSync } from 'node:fs';

const [filePath, prodPath] = process.argv.slice(2);
if (!filePath || !prodPath) {
  console.error('الاستخدام: node scripts/compare-indexes.mjs <file.indexes.json> <prod-indexes.json>');
  process.exit(2);
}

const load = (p) => {
  const d = JSON.parse(readFileSync(p, 'utf8'));
  return { indexes: d.indexes || [], fieldOverrides: d.fieldOverrides || [] };
};

// ترتيب آخر حقل صريح (نفس lastIndexFieldOrder في firebase-tools)
const lastExplicitOrder = (fields) => {
  let order = 'ASCENDING';
  for (const f of fields) if (f.order) order = f.order;
  return order;
};

// توحيد فهرس واحد إلى تمثيل قانوني موحّد.
const canonicalIndex = (x) => {
  const raw = (x.fields || []).map((f) => ({
    fieldPath: f.fieldPath,
    order: f.order || null,
    arrayConfig: f.arrayConfig || null,
  }));

  let fields = raw;
  let anomaly = null;
  const last = fields[fields.length - 1];

  if (last && last.fieldPath === '__name__') {
    const implicit = lastExplicitOrder(fields.slice(0, -1));
    if (last.order === implicit) {
      fields = fields.slice(0, -1); // ضمني ومطابق → احذفه
    } else {
      anomaly = `__name__ مُصرَّح=${last.order} لكن الضمني=${implicit}`; // فرق حقيقي
    }
  }

  const explicit = fields.filter((f) => f.fieldPath !== '__name__');
  const strayName = fields.filter((f) => f.fieldPath === '__name__');
  if (strayName.length > 0) {
    // __name__ في غير النهاية → لا نوحّده، بل نُبقيه فرقًا حقيقيًا
    anomaly = anomaly || '__name__ في غير النهاية';
  }

  const canonical =
    strayName.length > 0
      ? fields
      : [...explicit, { fieldPath: '__name__', order: lastExplicitOrder(explicit), arrayConfig: null }];

  return {
    cg: x.collectionGroup,
    scope: x.queryScope || 'COLLECTION',
    apiScope: x.apiScope || null,
    density: x.density || null,
    multikey: x.multikey === true,
    fields: canonical,
    anomaly,
  };
};

const idxKey = (c) =>
  JSON.stringify({
    cg: c.cg,
    scope: c.scope,
    apiScope: c.apiScope,
    density: c.density,
    multikey: c.multikey,
    fields: c.fields,
  });

const foKey = (x) =>
  JSON.stringify({
    cg: x.collectionGroup,
    p: x.fieldPath,
    idx: (x.indexes || []).map((i) => ({
      s: i.queryScope || null,
      a: i.apiScope || null,
      d: i.density || null,
      o: i.order || null,
      arr: i.arrayConfig || null,
    })),
  });

const file = load(filePath);
const prod = load(prodPath);

const fileC = file.indexes.map(canonicalIndex);
const prodC = prod.indexes.map(canonicalIndex);

const fileKeys = new Map(fileC.map((c) => [idxKey(c), c]));
const prodKeys = new Map(prodC.map((c) => [idxKey(c), c]));

const willCreate = fileC.filter((c) => !prodKeys.has(idxKey(c)));
const inProdNotInFile = prodC.filter((c) => !fileKeys.has(idxKey(c)));
const unchanged = fileC.filter((c) => prodKeys.has(idxKey(c)));
const anomalies = [...fileC, ...prodC].filter((c) => c.anomaly);

const fileFoKeys = new Set(file.fieldOverrides.map(foKey));
const prodFoKeys = new Set(prod.fieldOverrides.map(foKey));
const foToCreate = file.fieldOverrides.filter((x) => !prodFoKeys.has(foKey(x)));
const foInProdNotInFile = prod.fieldOverrides.filter((x) => !fileFoKeys.has(foKey(x)));

const fmtFields = (c) =>
  c.fields.map((f) => `${f.fieldPath}:${f.order || f.arrayConfig || '?'}`).join(', ');
const fmt = (c) => `${c.cg} [${fmtFields(c)}]` + (c.scope !== 'COLLECTION' ? ` (${c.scope})` : '');
const fmtFo = (x) => `${x.collectionGroup}.${x.fieldPath} (${(x.indexes || []).length} override)`;

console.log(`\nملف: ${filePath}  (فهارس: ${file.indexes.length} · overrides: ${file.fieldOverrides.length})`);
console.log(`إنتاج: ${prodPath}  (فهارس: ${prod.indexes.length} · overrides: ${prod.fieldOverrides.length})`);
console.log('ملاحظة: __name__ الضمني يُوحَّد على الطرفين ولا يُحسب فرقًا.');

console.log(`\n1) سيُضيفها النشر (في الملف وليست في الإنتاج): ${willCreate.length}`);
willCreate.forEach((c) => console.log('   + ' + fmt(c)));

console.log(`\n2) في الإنتاج وليست في الملف (قد يُعرض حذفها — تُرفض): ${inProdNotInFile.length}`);
inProdNotInFile.forEach((c) => console.log('   ! ' + fmt(c)));

console.log(`\n3) مشتركة بلا تغيير: ${unchanged.length}`);
unchanged.forEach((c) => console.log('   = ' + fmt(c)));

console.log(`\n4) fieldOverrides — سيُضيفها: ${foToCreate.length} · غير المطابقة: ${foInProdNotInFile.length}`);
foToCreate.forEach((x) => console.log('   + ' + fmtFo(x)));
foInProdNotInFile.forEach((x) => console.log('   ! ' + fmtFo(x)));

if (anomalies.length) {
  console.log(`\n⚠️  فروق __name__ حقيقية (لا تُتجاهل): ${anomalies.length}`);
  anomalies.forEach((c) => console.log(`   ⚠ ${c.cg} [${fmtFields(c)}] ${c.anomaly}`));
}

const ok = inProdNotInFile.length === 0 && foInProdNotInFile.length === 0 && anomalies.length === 0;
console.log(`\nخلاصة: ${ok ? 'آمن — إضافة فقط بلا --force' : 'يوجد فرق حقيقي — راجع قبل النشر'}\n`);
process.exit(ok ? 0 : 1);
