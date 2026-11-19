// src/data/consoleSections.js
// مصدر واحد لخريطة «غرفة القيادة»: 5 أقسام، وكل بند ينقل إلى مكان عمل حقيقي.
// لا بند بلا هدف، ولا بند مكرر في قسمين، ولا بند لمفتاح مؤجل/معطّل.
//
// target.kind:
//   tab    → تبويب داخل غرفة صاحب الموقع (owner-private-room?tab=...)
//   route  → صفحة مستقلة قائمة في App.jsx

export const CONSOLE_SECTIONS = [
  {
    id: 'overview',
    title: 'نظرة عامة',
    icon: 'dashboard',
    note: 'إحصائيات وملخص — مرة واحدة فقط، بلا أزرار تنفيذ مكررة',
    items: [{ id: 'stats', label: 'الإحصائيات والملخص', icon: 'chart', target: { kind: 'tab', tab: 'overview' } }],
  },
  {
    id: 'operations',
    title: 'المراقبة والتشغيل',
    icon: 'gauge',
    note: 'كل بند ينقلك إلى مكان العمل الفعلي',
    items: [
      { id: 'ads', label: 'إدارة الإعلانات', icon: 'bag', perm: 'HARAJ_POST_FORCE_EDIT', target: { kind: 'tab', tab: 'ads' } },
      { id: 'messages', label: 'الرسائل الخاصة', icon: 'chat', perm: 'MONITOR_PRIVATE_MESSAGES', target: { kind: 'tab', tab: 'messages' } },
      { id: 'comments', label: 'تعليقات الحراج', icon: 'star', perm: 'HARAJ_COMMENT_EDIT', target: { kind: 'tab', tab: 'comments' } },
      { id: 'reviews', label: 'تقييمات المنتجات', icon: 'star', perm: 'MANAGE_REVIEWS', target: { kind: 'tab', tab: 'reviews' } },
      { id: 'complaints', label: 'الشكاوى والمراسلات', icon: 'alert', ownerOnly: true, target: { kind: 'route', path: '/complaints' } },
      { id: 'reports', label: 'البلاغات', icon: 'flag', perm: 'MANAGE_REPORTS', target: { kind: 'tab', tab: 'reports' } },
      { id: 'security', label: 'تنبيهات وسجلات الأمان', icon: 'shield', perm: 'VIEW_SYSTEM_AUDIT_LOGS', target: { kind: 'tab', tab: 'security' } },
      { id: 'live', label: 'النشاط اللحظي', icon: 'gauge', ownerOnly: true, target: { kind: 'tab', tab: 'live' } },
    ],
  },
  {
    id: 'content',
    title: 'المحتوى والتصنيفات',
    icon: 'grid',
    items: [
      { id: 'categories', label: 'التصنيفات', icon: 'grid', perm: 'MANAGE_CATEGORIES', target: { kind: 'tab', tab: 'categories' } },
      { id: 'banners', label: 'البنرات', icon: 'image', perm: 'MANAGE_SITE_BANNERS', target: { kind: 'tab', tab: 'banners' } },
      { id: 'sitecontent', label: 'مدير المحتوى', icon: 'type', perm: 'INLINE_TEXT_EDIT', target: { kind: 'tab', tab: 'sitecontent' } },
      { id: 'orders', label: 'الطلبات', icon: 'activity', perm: 'MANAGE_REPORTS', target: { kind: 'tab', tab: 'orders' } },
    ],
  },
  {
    id: 'executive',
    title: 'الإدارة العليا',
    icon: 'crown',
    note: 'لصاحب الموقع أو من يملك الصلاحية فعلاً',
    items: [
      { id: 'users', label: 'إدارة المستخدمين', icon: 'users', perm: 'BAN_USER_TEMPORARY', target: { kind: 'tab', tab: 'users' } },
      { id: 'employees', label: 'الموظفون', icon: 'usercheck', perm: 'ADD_NEW_EMPLOYEE', target: { kind: 'route', path: '/employees' } },
      { id: 'permissions', label: 'مصفوفة الصلاحيات (تشغيل/إيقاف)', icon: 'key', perm: 'GRANT_SUB_ADMIN_PERMISSIONS', target: { kind: 'tab', tab: 'permissions' } },
      { id: 'admin', label: 'لوحة الإدارة', icon: 'settings', perm: 'UPDATE_GLOBAL_SETTINGS', target: { kind: 'route', path: '/admin' } },
      { id: 'broadcast', label: 'رسالة البث', icon: 'bell', perm: 'MANAGE_NOTIFICATIONS', target: { kind: 'tab', tab: 'broadcast' } },
      { id: 'ownerroom', label: 'غرفة صاحب الموقع', icon: 'crown', ownerOnly: true, target: { kind: 'route', path: '/owner-private-room' } },
    ],
  },
  {
    id: 'display',
    title: 'إعدادات العرض',
    icon: 'palette',
    note: 'متاحة للجميع — تخصيص جهازك فقط',
    items: [
      { id: 'settings', label: 'إعدادات الموقع (الخط/الألوان/التباين/الصوت)', icon: 'palette', publicItem: true, target: { kind: 'route', path: '/settings' } },
    ],
  },
];

// فلترة قسم واحد حسب صلاحيات الحساب ودوره.
// ملاحظة مهمة: كل بند هدفه { kind: 'tab' } يفتح تبويباً داخل غرفة صاحب الموقع،
// والمسار /owner-private-room مقيّد بدور owner في App.jsx. لذلك لا يُعرض
// للمشرفين أبداً — وإلا أُرسلوا إلى مسار يرفضهم (زر بلا وظيفة).
export const visibleItems = (section, { can, isOwner }) =>
  section.items.filter((item) => {
    if (item.publicItem) return true;
    if (item.target?.kind === 'tab' && !isOwner) return false;
    if (item.ownerOnly) return isOwner;
    if (!item.perm) return true;
    return isOwner || (typeof can === 'function' && can(item.perm));
  });
