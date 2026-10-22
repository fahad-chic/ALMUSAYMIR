// src/data/royalMenu.js
// ============================================================
// قائمة التنقل الملكية (+ الذكية) — متجر المسيمير | ALMUSAYMIR
// هيكل هرمي: كل مجموعة رئيسية لها فروع تُفتح بزر (+).
// ملاحظة: كل مسار هنا حقيقي وموجود في App.jsx — لا اختراع مسارات.
// /catalog/:catalogId مسار ديناميكي: أي catalogId جديد يعمل فوراً
// ويظهر باسمه من src/components/RoyalHome/sectionsData.js.
// ============================================================
import { BRAND } from './brand';

/** المسار الافتراضي لدخول متجر المنتجات */
export const STORE_HOME_PATH = '/catalog/electronics';

export const ROYAL_NAV = [
  { id: 'home', label: 'الرئيسية', path: '/', icon: 'home' },
  { id: 'store', label: `متجر ${BRAND.AR}`, path: STORE_HOME_PATH, icon: 'store' },
  { id: 'catalogs', label: 'الأقسام', path: '/branches', icon: 'grid' },
  { id: 'haraj', label: 'الحراج', path: '/haraj', icon: 'tag' },
  { id: 'offers', label: 'العروض', path: '/advertisements', icon: 'sparkles' },
  { id: 'about', label: 'من نحن', path: '/about', icon: 'info' },
];

export const ROYAL_DRAWER = [
  {
    id: 'store',
    label: `متجر ${BRAND.AR}`,
    icon: 'store',
    items: [
      { label: 'جميع المنتجات', path: STORE_HOME_PATH },
      { label: 'كل الأقسام', path: '/branches' },
      { label: 'العروض', path: '/advertisements' },
    ],
  },
  {
    id: 'sections',
    label: 'أقسام المتجر',
    icon: 'grid',
    items: [
      { label: 'إلكترونيات', path: '/catalog/electronics' },
      { label: 'جوالات وإكسسوارات', path: '/catalog/mobiles' },
      { label: 'أجهزة منزلية', path: '/catalog/home-appliances' },
      { label: 'أزياء وموضة', path: '/catalog/fashion' },
      { label: 'أطفال', path: '/catalog/kids' },
      { label: 'جمال وعناية', path: '/catalog/beauty' },
      { label: 'رياضة', path: '/catalog/sports' },
      { label: 'سيارات وإكسسوارات', path: '/catalog/cars' },
      { label: 'مستلزمات منزلية', path: '/catalog/home-supplies' },
      { label: 'خدمات', path: '/catalog/services' },
      { label: 'متنوعات', path: '/catalog/others' },
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
      { label: 'الطلبات الخاصة', path: '/wanted-dress' },
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
