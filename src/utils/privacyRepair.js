// src/utils/privacyRepair.js — إصلاح تسريبات reviews/comments (كتابة حقيقية)
//
// يبني على المصنّف النقي في legacyPrivacy.js. كل عملية هنا:
//   1) تؤرشف المستند كاملاً في deleted_archive قبل أي تغيير (لا فقدان بيانات)،
//   2) ثم إمّا تنقل الحقول الشخصية إلى المجموعة الخاصة، أو تمسحها من العام،
//   3) أو تحذف المستند العام + الخاص.
//
// القيود آتية من firestore.rules (مُثبتة على المحاكي في e2e/privacy-repair-audit.mjs):
//   review_private  create: hasAll(['ownerUid']) + hasOnly([...6 حقول]) + ownerUid == uid
//   comment_private create: hasOnly(['email','createdAt']) + email غير فارغ
//   reviews  update: hasNoPublicPII(النتيجة)  → لا يبقى أي حقل هوية
//   comments update: get('email','') == ''     → يُحذف البريد من العام
//   delete: المالك يستطيع حذف العام والخاص
// لذلك: حقول الهوية التي لا يقبلها السجل الخاص (مثل moderatedBy/phone في
// التعليقات) تُنقل للأرشيف ثم تُمسح من العام — لا تُترك ولا تُفقد.
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { addDoc } from 'firebase/firestore';
import { ARCHIVE_COLLECTION } from './archive';
import { writeAuditLog } from '../permissions/audit';
import { IDENTITY_FIELDS, pickPII, blankIdentityFields } from './legacyPrivacy';

// الحقول المسموح بها في كل مجموعة خاصة (مطابقة لقيد hasOnly في القواعد).
export const REVIEW_PRIVATE_KEYS = [
  'ownerUid', 'productId', 'userName', 'userEmail', 'userId', 'createdAt',
];
export const COMMENT_PRIVATE_KEYS = ['email', 'createdAt'];

const firstOf = (obj, keys) => {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

/**
 * يبني وثيقة السجل الخاص من حقول الهوية. نقي — قابل للاختبار بلا شبكة.
 * @returns {object|null} حمولة السجل الخاص، أو null إن لم يوجد ما يُنقل.
 */
export const buildPrivatePayload = (meta, data = {}, actor = {}) => {
  const pii = pickPII(data);
  if (meta.name === 'reviews') {
    const userEmail = firstOf(pii, ['userEmail', 'email', 'contactEmail']);
    const userId = firstOf(pii, ['userId', 'uid']);
    const userName = firstOf(pii, ['userName']);
    if (!userEmail && !userId && !userName) return null;
    return {
      ownerUid: actor.uid || '',
      productId: data.productId ?? null,
      userName,
      userEmail,
      userId,
      createdAt: serverTimestamp(),
    };
  }
  if (meta.name === 'comments') {
    const email = firstOf(pii, ['email', 'userEmail', 'contactEmail']);
    if (!email) return null;
    return { email, createdAt: serverTimestamp() };
  }
  return null;
};

/**
 * يخطط الإصلاح لسجل واحد. نقي.
 * @returns {{
 *   pii: object,                    // حقول الهوية الموجودة بقيم
 *   publicStrip: string[],          // مفاتيح تُحذف من المستند العام (قيم + فارغة)
 *   privatePayload: object|null,    // ما يُنقل للسجل الخاص (قد يكون null)
 * }}
 */
export const planRepair = (meta, data = {}, actor = {}) => {
  const pii = pickPII(data);
  const blanks = blankIdentityFields(data);
  const publicStrip = Array.from(new Set([...Object.keys(pii), ...blanks]));
  const privatePayload = buildPrivatePayload(meta, data, actor);
  return { pii, publicStrip, privatePayload };
};

const privateNameFor = (meta) =>
  (meta.name === 'reviews' ? 'review_private' : 'comment_private');

// نقطة حقن اختيارية: تسمح لاختبار المحاكي بتمرير قاعدة بيانات المحاكي بدل
// قاعدة الإنتاج. الافتراضي دائماً قاعدة التطبيق (لا تغيير في سلوك الإنتاج).
const dbOf = (deps) => (deps && deps.db) || db;

async function archiveDoc(dbRef, meta, id, data, actor) {
  if (!dbRef) throw new Error('قاعدة البيانات غير متاحة');
  await addDoc(collection(dbRef, ARCHIVE_COLLECTION), {
    sourceCollection: meta.name,
    sourceId: String(id),
    payload: data || {},
    deletedAt: serverTimestamp(),
    deletedByUid: actor.uid || null,
    deletedByEmail: actor.email || null,
    restored: false,
  });
}

/**
 * ينظّف سجلاً واحداً: أرشفة → (نقل للسجل الخاص إن وُجد ما يُنقل) → مسح حقول
 * الهوية من المستند العام. لا يحذف المستند العام.
 * @returns {Promise<{status:'cleaned'|'skipped', moved:boolean, stripped:string[]}>}
 */
export const repairRecord = async (meta, record, actor = {}, deps = {}) => {
  const dbRef = dbOf(deps);
  if (!dbRef) throw new Error('قاعدة البيانات غير متاحة');
  const id = record.id;
  const data = record.data || record;
  const { publicStrip, privatePayload } = planRepair(meta, data, actor);

  if (publicStrip.length === 0 && !privatePayload) {
    return { status: 'skipped', moved: false, stripped: [] };
  }

  await archiveDoc(dbRef, meta, id, data, actor);

  let moved = false;
  if (privatePayload) {
    await setDoc(doc(dbRef, privateNameFor(meta), id), privatePayload, { merge: true });
    moved = true;
  }

  if (publicStrip.length > 0) {
    const patch = {};
    for (const f of publicStrip) patch[f] = deleteField();
    await updateDoc(doc(dbRef, meta.name, id), patch);
  }

  await writeAuditLog({
    action: 'PRIVACY_REPAIR_RECORD',
    permissionKey: 'MANAGE_REVIEWS',
    targetType: meta.name,
    targetId: id,
    result: 'success',
    details: `moved=${moved} stripped=${publicStrip.join(',')}`,
    severity: 'high',
  });

  return { status: 'cleaned', moved, stripped: publicStrip };
};

/**
 * يحذف سجلاً: أرشفة → حذف السجل الخاص إن وُجد → حذف المستند العام.
 * @returns {Promise<{status:'deleted'}>}
 */
export const deleteRecord = async (meta, record, actor = {}, deps = {}) => {
  const dbRef = dbOf(deps);
  if (!dbRef) throw new Error('قاعدة البيانات غير متاحة');
  const id = record.id;
  const data = record.data || record;

  await archiveDoc(dbRef, meta, id, data, actor);

  const privRef = doc(dbRef, privateNameFor(meta), id);
  try {
    const snap = await getDoc(privRef);
    if (snap.exists()) await deleteDoc(privRef);
  } catch (e) {
    console.warn('privacy delete: private doc', e?.message);
  }

  await deleteDoc(doc(dbRef, meta.name, id));

  await writeAuditLog({
    action: 'PRIVACY_DELETE_RECORD',
    permissionKey: 'MANAGE_REVIEWS',
    targetType: meta.name,
    targetId: id,
    result: 'success',
    details: 'archived-then-deleted',
    severity: 'high',
  });

  return { status: 'deleted' };
};

/**
 * ينفّذ عملية على عدة سجلات مع متابعة التقدّم. يتابع رغم الأخطاء الفردية
 * ويُرجع ملخّصاً (نجح/فشل) — لا يرمي إلا لخطأ غير متوقّع.
 */
export const runBatch = async (records, worker, onProgress) => {
  const summary = { total: records.length, ok: 0, failed: 0, errors: [] };
  let i = 0;
  for (const rec of records) {
    i += 1;
    try {
      await worker(rec);
      summary.ok += 1;
    } catch (e) {
      summary.failed += 1;
      summary.errors.push({ id: rec?.id, message: e?.message || String(e) });
    }
    if (onProgress) onProgress(i, records.length);
  }
  return summary;
};

// يصدّر للاختبارات/الواجهة أسماء حقول الهوية نفسها المستخدمة في القواعد.
export { IDENTITY_FIELDS };
