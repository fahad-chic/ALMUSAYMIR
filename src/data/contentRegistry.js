// src/data/contentRegistry.js
// ============================================================
// سجلّ كل محتوى الموقع القابل للتحكم — مصدر واحد.
// كل عنصر له:
//   key   : معرّف فريد يُحفظ في settings/siteContent (texts/hidden/lists)
//   label : وصف عربي يظهر للمالك في المحرر
//   group : القسم (يُستخدم للتصنيف في مدير المحتوى)
//   type  : 'text' | 'list'
// إضافة عنصر جديد = سطر واحد هنا + استخدام <Editable> في الواجهة.
// ============================================================

export const CONTENT_GROUPS = Object.freeze({
  home: 'الصفحة الرئيسية',
  header: 'الترويسة والقوائم',
  faq: 'الأسئلة الشائعة',
  contact: 'تواصل معنا',
  terms: 'الشروط والأحكام',
  footer: 'التذييل',
});

// نصوص مفردة (texts)
export const CONTENT_FIELDS = Object.freeze([
  // الرئيسية
  { key: 'home.hero_sub', label: 'الرئيسية — وصف الهيرو', group: 'home', type: 'text' },
  { key: 'home.footer_tag', label: 'الرئيسية — وسم التذييل', group: 'home', type: 'text' },
  { key: 'home.hero_title', label: 'الرئيسية — العنوان الرئيسي', group: 'home', type: 'text' },
  { key: 'home.haraj_cta', label: 'الرئيسية — زر الحراج', group: 'home', type: 'text' },

  // الترويسة
  { key: 'header.search_placeholder', label: 'الترويسة — نص حقل البحث', group: 'header', type: 'text' },
  { key: 'header.nav.store', label: 'القائمة — عنصر المتجر', group: 'header', type: 'text' },
  { key: 'header.nav.catalogs', label: 'القائمة — عنصر الأقسام', group: 'header', type: 'text' },
  { key: 'header.nav.haraj', label: 'القائمة — عنصر الحراج', group: 'header', type: 'text' },
  { key: 'header.nav.offers', label: 'القائمة — عنصر العروض', group: 'header', type: 'text' },
  { key: 'header.nav.about', label: 'القائمة — عنصر من نحن', group: 'header', type: 'text' },

  // الأسئلة الشائعة
  { key: 'faq.page_title', label: 'الأسئلة الشائعة — العنوان', group: 'faq', type: 'text' },
  { key: 'faq.page_subtitle', label: 'الأسئلة الشائعة — الوصف', group: 'faq', type: 'text' },

  // تواصل معنا
  { key: 'contact.hero_subtitle', label: 'تواصل معنا — الجملة الرئيسية', group: 'contact', type: 'text' },
  { key: 'contact.page_title', label: 'تواصل معنا — العنوان', group: 'contact', type: 'text' },

  // الشروط
  { key: 'terms.page_title', label: 'شروط الاستخدام — العنوان', group: 'terms', type: 'text' },

  // التذييل
  { key: 'footer.tagline', label: 'التذييل — العبارة', group: 'footer', type: 'text' },
  { key: 'footer.copyright', label: 'التذييل — سطر الحقوق', group: 'footer', type: 'text' },
]);

// قوائم عناصر (lists) — كل عنصر { id, q/a } أو { id, title/path }
export const CONTENT_LISTS = Object.freeze([
  { key: 'faq.items', label: 'الأسئلة الشائعة — قائمة الأسئلة', group: 'faq' },
  { key: 'home.trust', label: 'الرئيسية — نقاط الثقة', group: 'home' },
  { key: 'home.footer_links', label: 'التذييل — روابط الموقع', group: 'footer' },
]);

const FIELD_BY_KEY = new Map(CONTENT_FIELDS.map((f) => [f.key, f]));
const LIST_BY_KEY = new Map(CONTENT_LISTS.map((l) => [l.key, l]));

export const getContentField = (key) => FIELD_BY_KEY.get(key) || null;
export const getContentList = (key) => LIST_BY_KEY.get(key) || null;

export default { CONTENT_FIELDS, CONTENT_LISTS, CONTENT_GROUPS };
