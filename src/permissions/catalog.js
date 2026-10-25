// src/permissions/catalog.js — مصفوفة الصلاحيات المجهرية (Granular Micro-Permissions)
// 47 صلاحية موزعة على 7 أقسام. المنح الفعلية تُخزَّن في Firestore (rbac/{uid})
// ولا تُقرأ إلا لصاحبها أو المالك، والكتابة عليها للمالك فقط عبر قواعد الأمان —
// إظهار/إخفاء الأزرار في الواجهة مجرد راحة استخدام، والفرض الحقيقي يتم في
// الخادم (Security Rules) عند كل عملية قراءة/كتابة.

export const PERMISSION_CATEGORIES = [
  { id: 'master', label: 'التحكم المطلق والإدارة السيادية', icon: 'Crown' },
  { id: 'users', label: 'إدارة وأمان المستخدمين والزوار', icon: 'Users' },
  { id: 'haraj', label: 'التحكم بموقع حراج والإعلانات', icon: 'ShoppingBag' },
  { id: 'catalog', label: 'إدارة الكتالوجات السيادية', icon: 'Database' },
  { id: 'staff', label: 'التوزيع والتحكم بالمشرفين والموظفين', icon: 'UserCheck' },
  { id: 'spy', label: 'مراقبة التحركات الشاملة والخصوصية', icon: 'Eye' },
  { id: 'inline', label: 'التعديل المباشر في نفس العنصر', icon: 'Pencil' },
];

export const PERMISSIONS = [
  // ===== القسم الأول: التحكم المطلق =====
  { key: 'SUPER_ADMIN_FULL_ACCESS', category: 'master', label: 'التحكم السيادي الكامل', desc: 'التحكم المطلق في كافة أجزاء الموقع وتخطي جميع القيود البرمجية والأمنية.' },
  { key: 'UPDATE_GLOBAL_SETTINGS', category: 'master', label: 'تعديل إعدادات الموقع الحساسة', desc: 'اسم الموقع، الشعار الرسمي، روابط السيرفرات، بيانات الاتصال.' },
  { key: 'TOGGLE_MAINTENANCE_MODE', category: 'master', label: 'وضع الصيانة', desc: 'تفعيل أو تعطيل وضع الصيانة للموقع بالكامل وتحويل الواجهة لصفحة مغلقة.' },
  { key: 'BYPASS_FIREBASE_RULES', category: 'master', label: 'تجاوز قيود التحقق', desc: 'السماح بتعديل البيانات الحساسة مباشرة دون قيود التحقق المعتادة.' },
  { key: 'MANAGE_NAVIGATION_MENU', category: 'master', label: 'إدارة القوائم', desc: 'إضافة، حذف، أو تعديل خيارات القوائم العلوية والسفلية (Navbar & Footer).' },
  { key: 'CODE_SNIPPET_INJECTION', category: 'master', label: 'حقن الأكواد', desc: 'إضافة أو تعديل أكواد البيكسل وتحليلات جوجل وأكواد الهيدر والفوتر.' },
  { key: 'FLUSH_SYSTEM_CACHE', category: 'master', label: 'تفريغ ذاكرة الموقع', desc: 'تفريغ الكاش إجبارياً لتطبيق التحديثات فوراً عند جميع الزوار.' },

  // ===== القسم الثاني: المستخدمون والأمان =====
  { key: 'BAN_USER_TEMPORARY', category: 'users', label: 'حظر مؤقت', desc: 'طرد الزائر أو العضو فوراً وحظر حسابه مؤقتاً وفصل جلسته الحالية.' },
  { key: 'BAN_USER_PERMANENT', category: 'users', label: 'حظر نهائي', desc: 'حظر جهاز الزائر وعنوان الآي بي لمنعه من تصفح الموقع نهائياً.' },
  { key: 'UNBAN_USER_RESTORE', category: 'users', label: 'فك الحظر', desc: 'فك الحظر عن أي زائر أو عضو وإعادة تنشيط حسابه.' },
  { key: 'BLOCK_USER_REGISTRATION', category: 'users', label: 'منع التسجيل', desc: 'تعطيل إنشاء حسابات جديدة لزائر معين أو حظر نطاقات بريد محددة.' },
  { key: 'FORCE_LOGOUT_SESSION', category: 'users', label: 'تسجيل خروج إجباري', desc: 'تسجيل خروج فوري للزائر أو المشرف من كافة الأجهزة المتصلة.' },
  { key: 'MANAGE_USER_VERIFICATION', category: 'users', label: 'توثيق الحسابات', desc: 'منح الشارة الزرقاء للمستخدمين أو سحب التوثيق منهم.' },
  { key: 'VIEW_USER_IP_HISTORY', category: 'users', label: 'سجل عناوين IP', desc: 'استعراض سجل عناوين الـ IP التي دخل منها الزائر.' },

  // ===== القسم الثالث: حراج =====
  { key: 'HARAJ_POST_DELETE', category: 'haraj', label: 'حذف إعلان حراج', desc: 'حذف إعلان أي زائر مخالف ونقله إلى سلة المهملات السرية.' },
  { key: 'HARAJ_POST_RESTORE', category: 'haraj', label: 'استعادة إعلان', desc: 'استعادة الإعلان المحذوف بكامل بياناته وصوره وإرجاعه نشطاً.' },
  { key: 'HARAJ_POST_FORCE_EDIT', category: 'haraj', label: 'تعديل إجباري للإعلان', desc: 'التعديل الإجباري على محتوى إعلان العضو (نصوص، أسعار، تصنيفات).' },
  { key: 'HARAJ_POST_APPROVE', category: 'haraj', label: 'اعتماد الإعلانات', desc: 'مراجعة الإعلانات المعلقة والموافقة على نشرها أو رفضها مع السبب.' },
  { key: 'HARAJ_POST_FEATURE', category: 'haraj', label: 'تثبيت وتمييز الإعلان', desc: 'تثبيت الإعلان أعلى حراج أو تمييزه كإعلان بريميوم مدفوع.' },
  { key: 'HARAJ_COMMENT_DELETE', category: 'haraj', label: 'حذف التعليقات', desc: 'حذف تعليقات أو ردود المستخدمين المخالفة على إعلانات حراج فوراً.' },
  { key: 'HARAJ_COMMENT_EDIT', category: 'haraj', label: 'تعديل التعليقات', desc: 'تعديل أي جملة في تعليقات الزوار لحذف الكلمات المخالفة.' },
  { key: 'TRANSFER_POST_OWNERSHIP', category: 'haraj', label: 'نقل ملكية إعلان', desc: 'نقل ملكية إعلان حراج من عضو إلى عضو آخر داخل النظام.' },

  // ===== القسم الرابع: الكتالوجات =====
  { key: 'CREATE_NEW_CATALOG', category: 'catalog', label: 'إنشاء كتالوج', desc: 'إنشاء كتالوج رقمي جديد وتحديد تصنيفه وقسمه الرئيسي والفرعي.' },
  { key: 'DELETE_MAIN_CATALOG', category: 'catalog', label: 'حذف كتالوج', desc: 'حذف كتالوج كامل أو قسم كتالوجات بجميع محتوياته.' },
  { key: 'EDIT_CATALOG_PRICING', category: 'catalog', label: 'تعديل الأسعار', desc: 'تعديل الأسعار والخصومات والعملات داخل الكتالوجات رقماً برقم.' },
  { key: 'CUSTOMIZE_CATALOG_LAYOUT', category: 'catalog', label: 'تخصيص عرض الكتالوج', desc: 'تحويل العرض من شبكة Grid إلى قائمة List أو العكس.' },
  { key: 'MANAGE_CATALOG_TAGS', category: 'catalog', label: 'وسوم الكتالوج (SEO)', desc: 'إضافة الكلمات الدلالية والوسوم لتحسين الظهور في محركات البحث.' },

  // ===== القسم الخامس: المشرفون والموظفون =====
  { key: 'ADD_NEW_EMPLOYEE', category: 'staff', label: 'تسجيل موظف جديد', desc: 'تسجيل موظف أو مشرف جديد وإنشاء حساب لوحة تحكم خاص به.' },
  { key: 'EDIT_EMPLOYEE_PROFILE', category: 'staff', label: 'تعديل ملف الموظف', desc: 'تعديل بيانات الموظف الشخصية والوظيفية (الاسم، القسم، المسمى).' },
  { key: 'GRANT_SUB_ADMIN_PERMISSIONS', category: 'staff', label: 'توزيع الصلاحيات', desc: 'تخصيص وتوزيع الصلاحيات للمشرفين بشكل مجهري (تفعيل/تعطيل).' },
  { key: 'SUSPEND_SUB_ADMIN_ACCOUNT', category: 'staff', label: 'تجميد مشرف', desc: 'تجميد حساب المشرف فوراً وسحب كافة صلاحياته عند الطوارئ.' },
  { key: 'VIEW_EMPLOYEE_SALARIES', category: 'staff', label: 'كشف الرواتب', desc: 'استعراض وإدارة كشف رواتب الموظفين والمكافآت والخصومات.' },

  // ===== القسم السادس: المراقبة والسجلات =====
  { key: 'MONITOR_PRIVATE_MESSAGES', category: 'spy', label: 'مراقبة الرسائل الخاصة', desc: 'قراءة المحادثات بين الزوار أو المشرفين لمنع النصب والاحتيال.' },
  { key: 'VIEW_SYSTEM_AUDIT_LOGS', category: 'spy', label: 'السجل الأمني العام', desc: 'من فعل ماذا، في أي زر، باليوم والساعة والثانية.' },
  { key: 'TRACK_EMPLOYEE_LIVE_SESSIONS', category: 'spy', label: 'مراقبة جلسات الموظفين', desc: 'رؤية الأجهزة المتصلة وعناوين IP والصفحات التي يتصفحونها الآن.' },
  { key: 'FIREBASE_MUTATION_LOGS', category: 'spy', label: 'سجل عمليات قاعدة البيانات', desc: 'تتبع أي عملية قراءة/كتابة/حذف في جداول الفايربيس وتحديد المسؤول.' },
  { key: 'RECOVER_DELETED_ITEMS_ARCHIVE', category: 'spy', label: 'أرشيف المحذوفات', desc: 'استرجاع أي نص أو صورة أو إعلان أو كتالوج حذفه المشرفون.' },
  { key: 'TRACK_FAILED_LOGINS', category: 'spy', label: 'محاولات الدخول الفاشلة', desc: 'مراقبة محاولات الدخول الفاشلة والتحذير من هجمات الاختراق.' },
  { key: 'MONITOR_USER_TRAFFIC_LIVE', category: 'spy', label: 'حركة الزوار الحية', desc: 'معرفة من يتصفح الرئيسية أو الكتالوجات حالياً.' },

  // ===== القسم السابع: التعديل المباشر (In-Line) =====
  { key: 'INLINE_TEXT_EDIT', category: 'inline', label: 'تعديل النص في مكانه', desc: 'زر تعديل بجانب الكلمات والجمل لتغيير النص مباشرة في مكانه.' },
  { key: 'INLINE_STYLE_COLOR', category: 'inline', label: 'تغيير الألوان', desc: 'لوحة ألوان لتغيير لون الخلفية أو الخط للعنصر نفسه فوراً.' },
  { key: 'INLINE_FONT_CUSTOMIZE', category: 'inline', label: 'تخصيص الخط', desc: 'تعديل حجم الخط ونوعه وتنسيقه (عريض، مائل) للعنصر نفسه.' },
  { key: 'INLINE_IMAGE_REPLACE', category: 'inline', label: 'استبدال الصور', desc: 'زر فوق أي صورة لاستبدالها أو رفع صورة جديدة مكانها.' },
  { key: 'INLINE_IMAGE_DESIGN_MOD', category: 'inline', label: 'تعديل تصميم الصورة', desc: 'فلاتر، إضاءة، أبعاد، وتفعيل تكبير الصورة عند الضغط.' },
  { key: 'INLINE_BOX_SHAPE_MOD', category: 'inline', label: 'تعديل شكل المربع', desc: 'انحناء الحواف، تحويل لدائرة، أو إضافة ظلال للعنصر.' },
  { key: 'INLINE_TICKER_CONTROL', category: 'inline', label: 'التحكم بالشريط المتحرك', desc: 'تعديل الجمل المتحركة وتسريع أو إبطاء الحركة وتغيير اللون.' },
  { key: 'INLINE_ELEMENT_DELETE', category: 'inline', label: 'إخفاء عنصر', desc: 'زر حذف مجهري يخفي الكلمة أو الزر تماماً عن واجهة الزوار.' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// بيانات المراقبة والخصوصية لا تُمنح للمشرفين أو الموظفين.
// وجودها في الكتالوج يسمح للمالك بعرضها وفهمها، لكن طبقة القواعد تمنع
// استخدامها خارج حسابات المالك المعتمدة.
export const OWNER_ONLY_PERMISSION_KEYS = new Set([
  'MONITOR_PRIVATE_MESSAGES',
  'VIEW_SYSTEM_AUDIT_LOGS',
  'TRACK_EMPLOYEE_LIVE_SESSIONS',
  'FIREBASE_MUTATION_LOGS',
  'RECOVER_DELETED_ITEMS_ARCHIVE',
  'TRACK_FAILED_LOGINS',
  'MONITOR_USER_TRAFFIC_LIVE',
]);

const BY_KEY = new Map(PERMISSIONS.map((p) => [p.key, p]));

export const getPermission = (key) => BY_KEY.get(key) || null;

export const isValidPermissionKey = (key) => BY_KEY.has(key);

export const permissionsByCategory = (categoryId) =>
  PERMISSIONS.filter((p) => p.category === categoryId);
