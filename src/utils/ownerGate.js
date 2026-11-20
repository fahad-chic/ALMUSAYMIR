// src/utils/ownerGate.js — جلسة بوابة الرمز السري (غرفة القيادة + غرفة المالك)
//
// الرمز يُطلب مرة واحدة عند بداية الدخول فقط، ثم تبقى الجلسة مفتوحة حتى:
//   • خروج صريح (زر تسجيل الخروج)  → clearOwnerGateSession()
//   • انتهاء المهلة الأمنية          → انتهاء expiresAt
// إغلاق لوحة/قائمة (❌) أو الرجوع خطوة لا يُسقط الجلسة إطلاقاً.
//
// ملاحظة مهمة: كان الفحص السابق يشترط `auth.currentUser.uid` وقت القراءة،
// وهو null أثناء استعادة Firebase للجلسة عند أول تحميل ⇒ كان الرمز يُطلب
// من جديد عند كل تحديث/رجوع. الآن تُقبل الجلسة إذا كان السجل صالحاً، ويُتحقّق
// من مطابقة uid فقط عند توفّره — والحماية الحقيقية تبقى على الخادم والصلاحيات.

export const OWNER_GATE_KEY = 'rooz_owner_gate_ok'

// مهلة أمنية معقولة لجلسة المالك: 30 دقيقة من آخر دخول بالرمز.
export const OWNER_GATE_TTL_MS = 30 * 60 * 1000

const readRecord = () => {
  try {
    const raw = sessionStorage.getItem(OWNER_GATE_KEY)
    if (!raw) return null
    const record = JSON.parse(raw)
    if (!record || typeof record !== 'object') return null
    if (!Number.isFinite(record.expiresAt)) return null
    if (record.expiresAt <= Date.now()) return null
    return record
  } catch {
    return null
  }
}

/**
 * هل جلسة الرمز ما زالت صالحة؟
 * @param {string|null|undefined} currentUid uid الحالي إن كان معروفاً
 */
export const hasOwnerGateSession = (currentUid) => {
  const record = readRecord()
  if (!record) return false
  // uid غير متوفّر (استعادة الجلسة) ⇒ لا نُبطل السجل. الحماية على الخادم.
  if (currentUid && record.uid && record.uid !== currentUid) return false
  return true
}

/** يحفظ/يجدّد الجلسة بعد نجاح الرمز. */
export const saveOwnerGateSession = (uid) => {
  try {
    sessionStorage.setItem(
      OWNER_GATE_KEY,
      JSON.stringify({
        uid: uid || null,
        expiresAt: Date.now() + OWNER_GATE_TTL_MS
      })
    )
    return true
  } catch {
    return false
  }
}

/** خروج صريح فقط (تسجيل خروج / انتهاء المهلة / رفض الصلاحية). */
export const clearOwnerGateSession = () => {
  try {
    sessionStorage.removeItem(OWNER_GATE_KEY)
  } catch {
    /* ignore */
  }
}

/** الوقت المتبقي بالمللي ثانية (0 إن لم توجد جلسة). */
export const ownerGateRemainingMs = () => {
  const record = readRecord()
  if (!record) return 0
  return Math.max(0, record.expiresAt - Date.now())
}
