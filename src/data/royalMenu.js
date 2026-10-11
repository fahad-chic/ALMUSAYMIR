// src/data/royalMenu.js
// ============================================================
// قائمة التنقل الملكية (+ الذكية) — أناقة ROOZ
// هيكل هرمي: كل مجموعة رئيسية لها فروع تُفتح بزر (+).
// ملاحظة: كل مسار هنا حقيقي وموجود في App.jsx — لا اختراع مسارات.
// ============================================================

export const ROYAL_NAV = [
  { id: 'home', label: 'الرئيسية', path: '/', icon: 'home' },
  { id: 'store', label: 'المتجر', path: '/dashboard', icon: 'store' },
  { id: 'catalogs', label: 'الكتالوجات', path: '/branches', icon: 'grid' },
  { id: 'haraj', label: 'الحراج', path: '/haraj', icon: 'tag' },
  { id: 'offers', label: 'العروض', path: '/advertisements', icon: 'sparkles' },
  { id: 'about', label: 'من نحن', path: '/about', icon: 'info' },
];

export const ROYAL_DRAWER = [
  {
    id: 'store',
    label: 'المتجر',
    icon: 'store',
    items: [
      { label: 'جميع المنتجات', path: '/dashboard' },
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
      { label: 'المفضلة', path: '/dashboard' },
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
];