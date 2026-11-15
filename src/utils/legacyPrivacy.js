// تصنيف سجلات reviews/comments القديمة وفق نموذج الخصوصية الفعلي على main.
// لا يكتب شيئاً ولا يقرأ الإنتاج — منطق خالص يُختبر بوحدة، ويُستهلك من
// scripts/legacy-privacy-report.mjs (معاينة للقراءة فقط).
//
// نموذج main:
//   reviews  : عام إذا hidden !== true. حقل الهوية ممنوع في المستند العام
//              (hasNoPublicPII) لكن list لا يفرضه، فتسريب السجل القديم ممكن.
//   comments : عام إذا status === 'approved' وبلا بريد غير فارغ (email == '').

export const IDENTITY_FIELDS = [
  'userEmail', 'email', 'contactEmail', 'phone', 'userPhone', 'phoneNumber',
  'mobile', 'whatsapp', 'userId', 'ownerUid', 'uid', 'nationalId', 'iban',
  'accountNumber', 'userName', 'moderatedBy',
];

export const REVIEW_META = {
  name: 'reviews',
  privateName: 'review_private',
  required: ['productId', 'rating'],
  gate: 'hidden',
};

export const COMMENT_META = {
  name: 'comments',
  privateName: 'comment_private',
  required: ['text'],
  gate: 'status',
};

const isEmpty = (v) => v === undefined || v === null || v === '';

export const pickPII = (data = {}) => {
  const found = {};
  for (const f of IDENTITY_FIELDS) {
    const v = data[f];
    if (!isEmpty(v)) found[f] = v;
  }
  return found;
};

// مفاتيح هوية موجودة لكن قيمتها فارغة — وجود المفتاح يمنع get عبر
// hasNoPublicPII، لكن لا قيمة شخصية فيه (تُحذف المفاتيح الفارغة فقط).
export const blankIdentityFields = (data = {}) =>
  IDENTITY_FIELDS.filter((f) => data[f] === '' || data[f] === null);

// هل السجل مرئي للعامة عبر list وفق القاعدة الفعلية؟
// قواعد list تستخدم مساواة صارمة على حقل البوابة (rules are not filters):
//   reviews  : resource.data.hidden == false
//   comments : resource.data.status == 'approved'  (البريد لا يؤثر على list)
export const isPublic = (data = {}, meta) => {
  if (meta.name === 'reviews') return data.hidden === false;
  if (meta.name === 'comments') return data.status === 'approved';
  return false;
};

// تصنيف رباعي (زائد «سليم منشور مسبقاً»). غير المؤكد لا يُعدّ عاماً.
export const classify = (docs = [], meta) => {
  const buckets = {
    publicClean: [],
    publicWithPII: [],
    notPublic: [],
    unknown: [],
  };
  for (const doc of docs) {
    const { data = {} } = doc;
    const missing = meta.required.filter((f) => isEmpty(data[f]));
    if (missing.length) {
      buckets.unknown.push({ ...doc, reason: `حقول ناقصة: ${missing.join(', ')}` });
      continue;
    }
    if (meta.name === 'comments' && data.status !== undefined
        && !['approved', 'pending', 'rejected'].includes(data.status)) {
      buckets.unknown.push({ ...doc, reason: `حالة غير معروفة: ${String(data.status)}` });
      continue;
    }
    if (!isPublic(data, meta)) {
      let why;
      if (meta.name === 'reviews') {
        why = data.hidden === true ? 'hidden' : 'بلا حقل hidden (غير مرئي)';
      } else {
        why = data.status === undefined ? 'بلا حقل status (غير مرئي)'
          : data.status !== 'approved' ? data.status : 'غير مرئي';
      }
      buckets.notPublic.push({ ...doc, reason: why });
      continue;
    }
    const pii = pickPII(data);
    const blanks = blankIdentityFields(data);
    if (Object.keys(pii).length > 0) {
      buckets.publicWithPII.push({ ...doc, pii, blanks });
      continue;
    }
    buckets.publicClean.push({ ...doc, blanks });
  }
  return buckets;
};

export const tallyFields = (rows = [], key) => {
  const tally = {};
  for (const r of rows) {
    const value = r[key];
    const names = Array.isArray(value) ? value : Object.keys(value || {});
    for (const f of names) tally[f] = (tally[f] || 0) + 1;
  }
  return tally;
};

export const tallyReasons = (rows = []) => {
  const tally = {};
  for (const r of rows) {
    const k = r.reason || 'غير محدد';
    tally[k] = (tally[k] || 0) + 1;
  }
  return tally;
};

// تقرير نصّي بأعداد فقط (بلا قيم أو معرّفات) — قابل للمشاركة كما هو.
export const buildReport = (meta, buckets) => {
  const total = Object.values(buckets).reduce((n, arr) => n + arr.length, 0);
  const lines = [];
  lines.push(`\n=== ${meta.name} ===`);
  lines.push(`  إجمالي المستندات: ${total}`);
  lines.push(`  1) منشور وخالٍ من البيانات الشخصية: ${buckets.publicClean.length} (لا يحتاج شيئاً)`);
  lines.push(`  2) منشور لكنه يحمل بيانات شخصية: ${buckets.publicWithPII.length} (خطر تسريب — يحتاج فصلاً إلى ${meta.privateName})`);
  lines.push(`  3) مخفي أو معلّق أو مرفوض: ${buckets.notPublic.length} (يُترك غير عام)`);
  lines.push(`  4) ناقص أو غير قابل للتصنيف: ${buckets.unknown.length} (يُترك غير عام)`);
  const tally = (label, t) => {
    const keys = Object.keys(t);
    if (!keys.length) { lines.push(`  ${label}: لا شيء`); return; }
    lines.push(`  ${label}:`);
    for (const k of keys) lines.push(`    - ${k}: ${t[k]}`);
  };
  tally('حقول شخصية في السجلات العامة (اسم الحقل: عدد المستندات)', tallyFields(buckets.publicWithPII, 'pii'));
  tally('مفاتيح هوية فارغة (تُحذف فقط)', tallyFields([...buckets.publicClean, ...buckets.publicWithPII], 'blanks'));
  tally('غير قابل للتصنيف (السبب: عدد المستندات)', tallyReasons(buckets.unknown));
  return lines.join('\n');
};
