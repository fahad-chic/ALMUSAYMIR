// src/permissions/permissionRoutes.js
// خريطة «إلى أين ينقل هذا المفتاح» — كل صلاحية لها مكان عمل حقيقي واحد فقط.
// القيمة إمّا مسار صفحة مستقلة أو مسار غرفة مع ?tab= (غرفة صاحب الموقع تقرأ tab).
// المفاتيح المؤجلة/المعطّلة لا مكان عمل لها ⇒ لا تُعرَض كزر تنقّل.

export const OWNER_ROOM_PATH = '/owner-private-room';

const roomTab = (tab) => `${OWNER_ROOM_PATH}?tab=${tab}`;

export const PERMISSION_ROUTES = {
  // ===== التحكم المطلق =====
  UPDATE_GLOBAL_SETTINGS: roomTab('sitecontent'),
  TOGGLE_MAINTENANCE_MODE: roomTab('maintenance'),
  MANAGE_NAVIGATION_MENU: roomTab('sitecontent'),
  FLUSH_SYSTEM_CACHE: roomTab('sitecontent'),

  // ===== المستخدمون والأمان =====
  BAN_USER_TEMPORARY: roomTab('users'),
  BAN_USER_PERMANENT: roomTab('users'),
  UNBAN_USER_RESTORE: roomTab('users'),
  BLOCK_USER_REGISTRATION: roomTab('registration'),
  FORCE_LOGOUT_SESSION: roomTab('users'),
  MANAGE_USER_VERIFICATION: roomTab('users'),
  VIEW_USER_IP_HISTORY: roomTab('security'),

  // ===== حراج =====
  HARAJ_POST_DELETE: roomTab('ads'),
  HARAJ_POST_RESTORE: roomTab('ads'),
  HARAJ_POST_FORCE_EDIT: roomTab('ads'),
  HARAJ_POST_APPROVE: roomTab('ads'),
  HARAJ_POST_FEATURE: roomTab('ads'),
  HARAJ_COMMENT_DELETE: roomTab('comments'),
  HARAJ_COMMENT_EDIT: roomTab('comments'),
  TRANSFER_POST_OWNERSHIP: roomTab('ads'),

  // ===== الكتالوج =====
  CREATE_NEW_CATALOG: '/catalog/electronics',
  DELETE_MAIN_CATALOG: '/catalog/electronics',
  EDIT_CATALOG_PRICING: '/catalog/electronics',
  MANAGE_CATALOG_TAGS: '/catalog/electronics',

  // ===== الموظفون =====
  ADD_NEW_EMPLOYEE: '/employees',
  EDIT_EMPLOYEE_PROFILE: '/employees',
  GRANT_SUB_ADMIN_PERMISSIONS: roomTab('permissions'),
  SUSPEND_SUB_ADMIN_ACCOUNT: roomTab('permissions'),

  // ===== المراقبة =====
  MONITOR_PRIVATE_MESSAGES: roomTab('messages'),
  VIEW_SYSTEM_AUDIT_LOGS: roomTab('monitoring'),
  TRACK_EMPLOYEE_LIVE_SESSIONS: roomTab('monitoring'),
  FIREBASE_MUTATION_LOGS: roomTab('monitoring'),
  RECOVER_DELETED_ITEMS_ARCHIVE: roomTab('monitoring'),
  TRACK_FAILED_LOGINS: roomTab('security'),

  // ===== التعديل المباشر (أدوات داخل الصفحة نفسها) =====
  INLINE_TEXT_EDIT: '/',
  INLINE_STYLE_COLOR: '/',
  INLINE_FONT_CUSTOMIZE: '/',
  INLINE_IMAGE_REPLACE: '/',
  INLINE_IMAGE_DESIGN_MOD: '/',
  INLINE_BOX_SHAPE_MOD: '/',
  INLINE_TICKER_CONTROL: '/',
  INLINE_ELEMENT_DELETE: '/',

  // ===== المحتوى =====
  MANAGE_CATEGORIES: roomTab('categories'),
  MANAGE_SITE_BANNERS: roomTab('banners'),

  // ===== التواصل =====
  MANAGE_REPORTS: roomTab('reports'),
  MANAGE_NOTIFICATIONS: roomTab('broadcast'),
  MANAGE_REVIEWS: roomTab('reviews'),
};

// المفتاح بلا مكان عمل = لا يُعرض له زر تنقّل (يبقى مفتاح تشغيل/إيقاف فقط
// إن كان قابلاً للمنح، ويُخفى تماماً إن كان مؤجلاً أو معطّلاً).
export const permissionRoute = (key) => PERMISSION_ROUTES[key] || null;
