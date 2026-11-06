// scripts/compare-indexes.mjs — مقارنة قراءة-فقط بين فهارس الإنتاج ومحتوى firestore.indexes.json.
// لا يكتب ولا ينشر شيئًا. يقارن "spec" الملف مع "spec" الإنتاج (كلاهما بصيغة firebase).
// يساعد على رؤية ما سيُنشئه النشر وما قد يُعرض حذفه (يُرفض دائمًا بلا --force).
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

// مفتاح مقارنة بنيوي (لا يعتمد على الترتيب ولا على أسماء الموارد)
const idxKey = (x) =>
  JSON.stringify({
    cg: x.collectionGroup,
    scope: x.queryScope || 'COLLECTION',
    fields: (x.fields || []).map((f) => ({
      p: f.fieldPath,
      o: f.order || null,
      a: f.arrayConfig || null,
    })),
  });
const foKey = (x) =>
  JSON.stringify({
    cg: x.collectionGroup,
    p: x.fieldPath,
    idx: (x.indexes || []).map((i) => ({ s: i.queryScope || null, o: i.order || null, a: i.arrayConfig || null })),
  });

const file = load(filePath);
const prod = load(prodPath);

const fileKeys = new Set(file.indexes.map(idxKey));
const prodKeys = new Set(prod.indexes.map(idxKey));

const willCreate = file.indexes.filter((x) => !prodKeys.has(idxKey(x)));
const inProdNotInFile = prod.indexes.filter((x) => !fileKeys.has(idxKey(x)));
const unchanged = file.indexes.filter((x) => prodKeys.has(idxKey(x)));

const fileFoKeys = new Set(file.fieldOverrides.map(foKey));
const prodFoKeys = new Set(prod.fieldOverrides.map(foKey));
const foToCreate = file.fieldOverrides.filter((x) => !prodFoKeys.has(foKey(x)));
const foInProdNotInFile = prod.fieldOverrides.filter((x) => !fileFoKeys.has(foKey(x)));

const fmt = (x) =>
  `${x.collectionGroup} [${(x.fields || []).map((f) => `${f.fieldPath}:${f.order || f.arrayConfig || '?'}`).join(', ')}]`;
const fmtFo = (x) => `${x.collectionGroup}.${x.fieldPath} (${(x.indexes || []).length} override)`;

console.log(`\nملف: ${filePath}  (فهارس: ${file.indexes.length} · overrides: ${file.fieldOverrides.length})`);
console.log(`إنتاج: ${prodPath}  (فهارس: ${prod.indexes.length} · overrides: ${prod.fieldOverrides.length})\n`);

console.log(`1) سيُضيفها النشر (في الملف وليست في الإنتاج): ${willCreate.length}`);
willCreate.forEach((x) => console.log('   + ' + fmt(x)));

console.log(`\n2) في الإنتاج وليست في الملف (قد يُعرض حذفها — تُرفض): ${inProdNotInFile.length}`);
inProdNotInFile.forEach((x) => console.log('   ! ' + fmt(x)));

console.log(`\n3) موجودة في الطرفين (لا تغيير): ${unchanged.length}`);
unchanged.forEach((x) => console.log('   = ' + fmt(x)));

console.log(`\n4) fieldOverrides — سيُضيفها: ${foToCreate.length} · في الإنتاج وليست في الملف: ${foInProdNotInFile.length}`);
foToCreate.forEach((x) => console.log('   + ' + fmtFo(x)));
foInProdNotInFile.forEach((x) => console.log('   ! ' + fmtFo(x)));

console.log('\nخلاصة: النشر بلا --force سيُنشئ (1) و(4-إضافة) فقط، ولن يحذف (2) و(4-حذف) بلا موافقة صريحة.\n');
