// src/data/brand.js
// ============================================================
// هوية العلامة — المصدر الواحد لكل نصوص واسم العلامة الظاهرة للمستخدم.
// لتغيير الاسم مستقبلاً: عدّل القيم هنا فقط.
// ============================================================

export const BRAND = Object.freeze({
  AR: 'المسيمير',
  EN: 'ALMUSAYMIR',
  /** الصيغة المعتمدة في الواجهة */
  FULL: 'المسيمير | ALMUSAYMIR',
  /** وصف مختصر للعلامة (متجر شامل) */
  TAGLINE: 'متجر المسيمير — كل ما تحتاجه في مكان واحد',
  /**
   * الشعارات: رقم الإصدار `?v=` ضروري لأن /assets/* يُخزَّن immutable سنة
   * كاملة (public/_headers). عند تغيير أي صورة: ارفع الرقم هنا وفي index.html
   * وفي utils/watermark.js — وإلا بقي الشعار القديم في كاش المتصفح.
   */
  /** شعار العلامة الرأسي — PNG بديل لكل المتصفحات */
  LOGO: '/assets/logo-almusaymir.png?v=3',
  /** شعار العلامة الرأسي — AVIF (أصغر ~52%) يُقدَّم عبر <picture> */
  LOGO_AVIF: '/assets/logo-almusaymir.avif?v=3',
  /** شعار العلامة الأفقي — للترويسة والأماكن الضيقة */
  LOGO_WIDE: '/assets/logo-almusaymir-wide.png?v=3',
  LOGO_WIDE_AVIF: '/assets/logo-almusaymir-wide.avif?v=3',
  /** شعار مختصر (الرمز فقط) */
  EMBLEM: '/assets/emblem.png?v=3',
  /** اسم المساعد الذكي */
  ASSISTANT: 'فهد',
});

export default BRAND;
