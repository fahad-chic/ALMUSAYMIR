// scripts/preflight-indexes.mjs — فحص قبل النشر (قراءة-فقط، بلا شبكة، بلا كتابة).
// يفشل (exit 1) إذا وُجد أي فهرس مركّب أحادي الحقل — وهو ما يرفضه Firestore بـ
// HTTP 400 "this index is not necessary, configure using single field indexes".
// يتحقق أيضًا من أنك على الفرع الصحيح، ومن أن حالة Git نظيفة، ويقارن مع الإنتاج اختياريًا.
//
// الاستخدام (من جذر المشروع، على الفرع الصحيح):
//   node scripts/preflight-indexes.mjs
//   node scripts/preflight-indexes.mjs --expect-branch fix/reviews-privacy
// وللمقارنة مع الإنتاج (اختياري):
//   npx firebase-tools firestore:indexes --project <PROJECT> > /tmp/prod.json
//   node scripts/preflight-indexes.mjs --prod /tmp/prod.json
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const arg = (name, def = null) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
};

const filePath = arg('--file', 'firestore.indexes.json');
const prodPath = arg('--prod', null);
const expectBranch = arg('--expect-branch', null);

let hardFail = false;
const fail = (m) => { hardFail = true; console.log('   \u2717 ' + m); };
const ok = (m) => console.log('   \u2713 ' + m);

// ---------- 1) حالة Git ----------
console.log('\n[1] حالة Git');
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  console.log(`   الفرع  : ${branch}`);
  console.log(`   الالتزام: ${sha}`);
  console.log(`   نظيف   : ${dirty ? 'لا (توجد تغييرات غير مُثبّتة)' : 'نعم'}`);
  if (expectBranch && branch !== expectBranch) fail(`الفرع الحالي "${branch}" \u2260 المتوقع "${expectBranch}"`);
  else if (expectBranch) ok('الفرع مطابق للمتوقع');
} catch {
  console.log('   (تعذّر قراءة Git — استمرار فحص الملف)');
}

// ---------- 2) فحص الملف الثابت ----------
console.log(`\n[2] فحص الملف: ${filePath}`);
if (!existsSync(filePath)) {
  fail('الملف غير موجود في المسار الحالي — تأكّد أنك في جذر المشروع');
} else {
  const d = JSON.parse(readFileSync(filePath, 'utf8'));
  const idx = d.indexes || [];
  const single = idx.filter((x) => (x.fields || []).length === 1);
  const multi = idx.filter((x) => (x.fields || []).length > 1);
  console.log(`   إجمالي الفهارس: ${idx.length} (متعددة الحقول: ${multi.length} \u00b7 أحادية: ${single.length})`);
  if (single.length) {
    fail(`يوجد ${single.length} فهرس مركّب أحادي الحقل (يُفشل النشر بـ 400):`);
    single.forEach((x) => console.log(`       - ${x.collectionGroup}: ${x.fields.map((f) => f.fieldPath).join(', ')}`));
  } else {
    ok('لا يوجد أي فهرس مركّب أحادي الحقل — النشر لن يفشل بهذا السبب');
  }
}

// ---------- 3) المقارنة مع الإنتاج (اختياري) ----------
if (prodPath) {
  console.log(`\n[3] مقارنة مع الإنتاج: ${prodPath}`);
  if (!existsSync(prodPath)) fail('ملف الإنتاج غير موجود');
  else {
    const lastOrder = (fs) => { let o = 'ASCENDING'; for (const f of fs) if (f.order) o = f.order; return o; };
    const canon = (x) => {
      let fs = (x.fields || []).map((f) => ({ p: f.fieldPath, o: f.order || f.arrayConfig || null }));
      const last = fs[fs.length - 1];
      if (last && last.p === '__name__') fs = fs.slice(0, -1);
      fs = fs.filter((f) => f.p !== '__name__');
      return { cg: x.collectionGroup, sc: x.queryScope || 'COLLECTION', fs: [...fs, { p: '__name__', o: lastOrder(fs) }] };
    };
    const key = (c) => JSON.stringify(c);
    const f = JSON.parse(readFileSync(filePath, 'utf8')).indexes || [];
    const p = JSON.parse(readFileSync(prodPath, 'utf8')).indexes || [];
    const fk = new Set(f.map((x) => key(canon(x))));
    const pk = new Set(p.map((x) => key(canon(x))));
    const toAdd = f.filter((x) => !pk.has(key(canon(x))));
    const prodOnly = p.filter((x) => !fk.has(key(canon(x))));
    console.log(`   سيُضيفها النشر: ${toAdd.length}`);
    toAdd.forEach((x) => console.log(`       + ${x.collectionGroup}: ${x.fields.map((q) => q.fieldPath).join(', ')}`));
    console.log(`   في الإنتاج وليست في الملف (قد يُعرض حذفها — تُرفض): ${prodOnly.length}`);
    prodOnly.forEach((x) => console.log(`       ! ${x.collectionGroup}: ${x.fields.map((q) => q.fieldPath).join(', ')}`));
    if (prodOnly.length) fail('توجد فهارس إنتاجية غير موجودة في الملف — لا تنشر (أو ارفض الحذف)');
    else ok('لا فهرس إنتاجي سيُحذف أو يتغيّر');
  }
}

console.log(`\nالنتيجة: ${hardFail ? 'أوقف — لا تنشر' : 'جاهز للنشر (بعد موافقة المالك)'}\n`);
process.exit(hardFail ? 1 : 0);
