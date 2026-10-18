// src/data/royalMenu.js
// ============================================================
// قائمة التنقل الملكية (+ الذكية) — أناقة ROOZ
// هيكل هرمي: كل مجموعة رئيسية لها فروع تُفتح بزر (+).
// ملاحظة: كل مسار هنا حقيقي وموجود في App.jsx — لا اختراع مسارات.
// المتجر = صفحات الكتالوج للزوار (/catalog/...) وليس /dashboard (لوحة المالك).
// ============================================================

/** المسار الافتراضي لدخول متجر المنتجات */
export const STORE_HOME_PATH = '/catalog/party-dresses';

export const ROYAL_NAV = [
  { id: 'home', label: 'الرئيسية', path: '/', icon: 'home' },
  { id: 'store', label: 'متجر أناقةROOZ', path: STORE_HOME_PATH, icon: 'store' },
  { id: 'catalogs', label: 'الكتالوجات', path: '/branches', icon: 'grid' },
  { id: 'haraj', label: 'الحراج', path: '/haraj', icon: 'tag' },
  { id: 'offers', label: 'العروض', path: '/advertisements', icon: 'sparkles' },
  { id: 'about', label: 'من نحن', path: '/about', icon: 'info' },
];

export const ROYAL_DRAWER = [
  {
    id: 'store',
    label: 'متجر أناقةROOZ',
    icon: 'store',
    items: [
      { label: 'جميع المنتجات', path: STORE_HOME_PATH },
      { label: 'الكتالوجات', path: '/branches' },
      { label: 'العروض', path: '/advertisements' },
    ],
  },
  {
    id: 'sections',
    label: 'أقسام متجر أناقة',
    icon: 'grid',
    items: [
      { label: 'فساتين حفلات أنيقة وفخمة', path: '/catalog/party-dresses' },
      { label: 'فساتين أعراس', path: '/catalog/wedding-dresses' },
      { label: 'فساتين بنات صغار', path: '/catalog/girls-dresses' },
      { label: 'العبايات بأنواعها', path: '/catalog/abayas' },
      { label: 'الشنط والحقائب', path: '/catalog/bags' },
      { label: 'الأحذية', path: '/catalog/shoes' },
      { label: 'فساتين فاخرة مستعملة', path: '/catalog/used-dresses' },
      { label: 'العطور والبخور', path: '/catalog/perfumes' },
      { label: 'المجوهرات والإكسسوارات', path: '/catalog/jewelry' },
      { label: 'أمهاتنا – الجيل الذهبي', path: '/catalog/golden-mothers' },
      { label: 'الأسر المنتجة', path: '/catalog/home-products' },
    ],
  },
  {
    id: 'haraj',
    label: 'الحراج',
    icon: 'tag',
    items: [
      { label: 'الحراج الرئيسي', path: '/haraj' },
      { label: 'كل الإعلانات', path: '/advertisements' },
      { label: 'أضف إعلانك', path: '/haraj/post' },
      { label: 'الفستان المطلوب', path: '/wanted-dress' },
    ],
  },
  {
    id: 'account',
    label: 'الحساب',
    icon: 'user',
    authOnly: true,
    items: [
      { label: 'ملفي الشخصي', path: '/settings' },
      { label: 'رسائلي', path: '/chat' },
      { label: 'صندوق الوارد', path: '/inbox' },
      { label: 'إشعاراتي', path: '/notifications' },
      { label: 'المفضلة', path: '/settings' },
    ],
  },
  {
    id: 'help',
    label: 'المساعدة',
    icon: 'help',
    items: [
      { label: 'الأسئلة الشائعة', path: '/faq' },
      { label: 'تواصل معنا', path: '/contact' },
      { label: 'الشكاوى', path: '/complaints' },
      { label: 'سياسة الاستخدام', path: '/terms' },
      { label: 'حول الموقع', path: '/about' },
    ],
  },
  {
    id: 'quick',
    label: 'خدمات سريعة',
    icon: 'sparkles',
    items: [
      { label: 'أريد التسوق', path: STORE_HOME_PATH },
      { label: 'أريد مشاهدة العروض', path: '/advertisements' },
      { label: 'أريد تصفح الحراج', path: '/haraj' },
      { label: 'أريد إضافة إعلان', path: '/haraj/post' },
      { label: 'أريد الوصول إلى حسابي', path: '/settings' },
      { label: 'دخول الحراج', path: '/haraj' },
    ],
  },
];
