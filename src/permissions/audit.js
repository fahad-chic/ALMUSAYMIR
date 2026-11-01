// src/permissions/audit.js — سجل التدقيق الموحّد لكل إجراءات الصلاحيات
// يخزّن بنية ثابتة: الفاعل (actor) + الوقت (timestamp) + الهدف (target) + النتيجة (result).
// مجموعة audit_logs محمية بقواعد Firestore: الكتابة لأي حساب موثّق (فلا تمنح قدرة)،
// والقراءة للمالك أو صاحب صلاحية VIEW_SYSTEM_AUDIT_LOGS فقط.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const AUDIT_COLLECTION = 'audit_logs';

const SEVERITIES = new Set(['info', 'low', 'medium', 'high']);
const RESULTS = new Set(['success', 'allowed', 'denied', 'error']);

/**
 * يبني الحمولة الموحّدة لحدث التدقيق (نقي — قابل للاختبار بلا شبكة).
 * يضمن وجود الحقول الأربعة الإلزامية: actor/timestamp/target/result.
 */
export const buildAuditEvent = ({
  action,
  permissionKey = '',
  targetType = '',
  targetId = '',
  result = 'success',
  details = '',
  severity = 'info',
} = {}, actor = {}) => ({
  action: String(action || 'permission_event'),
  permissionKey: String(permissionKey || ''),
  actorUid: actor.uid || null,
  actorEmail: actor.email || null,
  targetType: String(targetType || ''),
  targetId: String(targetId || ''),
  result: RESULTS.has(result) ? result : 'error',
  details: String(details || ''),
  severity: SEVERITIES.has(severity) ? severity : 'info',
});

/**
 * يكتب حدث تدقيق موحّد. لا يرمي أبداً — فشل التسجيل لا يكسر الإجراء الأصلي.
 * @param {object} event
 * @param {string} event.action       وصف الإجراء (مثال: 'BAN_USER_PERMANENT')
 * @param {string} [event.permissionKey] مفتاح الصلاحية المستخدَمة
 * @param {string} [event.targetType]  نوع الهدف (user/ad/employee/settings…)
 * @param {string} [event.targetId]    معرّف الهدف
 * @param {'allowed'|'denied'|'error'|'success'} [event.result] نتيجة الإجراء
 * @param {string} [event.details]     تفاصيل إضافية
 * @param {string} [event.severity]    info|low|medium|high
 */
export const writeAuditLog = async (event = {}) => {
  if (!db) return;
  try {
    const payload = buildAuditEvent(event, {
      uid: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    });
    await addDoc(collection(db, AUDIT_COLLECTION), {
      ...payload,
      timestamp: serverTimestamp(),
    });
  } catch {
    // السجل لا يجب أن يكسر الإجراء الأصلي
  }
};
