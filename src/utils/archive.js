// src/utils/archive.js — أرشيف المحذوفات (deleted_archive)
//
// عند حذف أي عنصر حساس نُلحق نسخة كاملة منه في مجموعة `deleted_archive`
// ليتمكن المالك (أو صاحب صلاحية RECOVER_DELETED_ITEMS_ARCHIVE) من استعادته.
// الحذف نفسه تفرضه قواعد Firestore لكل مجموعة؛ هذا الملف لا يمنح أي قدرة
// إضافية — يكتب فقط في مجموعة الأرشيف التي تفرضها قاعدتها الخاصة.
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { writeAuditLog } from '../permissions/audit';

export const ARCHIVE_COLLECTION = 'deleted_archive';

// المجموعات القابلة للأرشفة والاستعادة — قائمة بيضاء تمنع أرشفة/استعادة
// أي مجموعة غير معروفة (يمنع استخدام الأرشيف كبوابة كتابة عامة).
export const ARCHIVABLE_COLLECTIONS = new Set([
  'haraj_ads',
  'products',
  'branches',
  'employees',
  'advertisements',
  'ads',
]);

export const isArchivable = (name) => ARCHIVABLE_COLLECTIONS.has(String(name || ''));

/**
 * يبني وثيقة الأرشيف (نقيّة — قابلة للاختبار بلا شبكة).
 * الحقول الإلزامية تطابق قيد قواعد Firestore على deleted_archive.
 */
export const buildArchiveDoc = (collectionName, sourceId, payload, actor = {}) => {
  if (!isArchivable(collectionName)) {
    throw new Error(`مجموعة غير قابلة للأرشفة: ${collectionName}`);
  }
  if (!sourceId) throw new Error('معرّف العنصر مطلوب');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('بيانات العنصر غير صالحة للأرشفة');
  }
  return {
    sourceCollection: String(collectionName),
    sourceId: String(sourceId),
    payload,
    deletedAt: serverTimestamp(),
    deletedByUid: actor.uid || null,
    deletedByEmail: actor.email || null,
    restored: false,
  };
};

/**
 * يؤرشف عنصراً قبل حذفه ثم يحذفه. إن فشل الحذف تبقى نسخة الأرشيف (لا فقدان بيانات).
 * @returns {Promise<string>} معرّف وثيقة الأرشيف
 */
export const archiveAndDelete = async (collectionName, sourceId, payload, actor = {}) => {
  if (!db) throw new Error('قاعدة البيانات غير متاحة');
  const archiveDoc = buildArchiveDoc(collectionName, sourceId, payload, actor);
  const ref = await addDoc(collection(db, ARCHIVE_COLLECTION), archiveDoc);
  await deleteDoc(doc(db, collectionName, sourceId));
  return ref.id;
};

/**
 * يستعيد عنصراً من الأرشيف: يعيد كتابة الحمولة في مجموعتها الأصلية ثم يعلّم
 * وثيقة الأرشيف كمُستعادة (لا يحذفها — يبقى أثر الاستعادة كاملاً).
 */
export const restoreArchived = async (archiveId, archiveData, actor = {}) => {
  if (!db) throw new Error('قاعدة البيانات غير متاحة');
  if (!archiveId || !archiveData) throw new Error('بيانات الأرشيف مطلوبة');

  const { sourceCollection, sourceId, payload } = archiveData;
  if (!isArchivable(sourceCollection)) {
    throw new Error(`مجموعة غير قابلة للاستعادة: ${sourceCollection}`);
  }
  if (!sourceId || !payload) throw new Error('الأرشيف ناقص — تعذّرت الاستعادة');

  await setDoc(doc(db, sourceCollection, sourceId), payload);
  await setDoc(
    doc(db, ARCHIVE_COLLECTION, archiveId),
    {
      restored: true,
      restoredAt: serverTimestamp(),
      restoredByUid: actor.uid || null,
      restoredByEmail: actor.email || null,
    },
    { merge: true }
  );

  await writeAuditLog({
    action: 'RECOVER_DELETED_ITEM',
    permissionKey: 'RECOVER_DELETED_ITEMS_ARCHIVE',
    targetType: sourceCollection,
    targetId: sourceId,
    result: 'success',
    details: `استعادة عنصر محذوف من الأرشيف إلى ${sourceCollection}`,
    severity: 'high',
  });

  return sourceId;
};
