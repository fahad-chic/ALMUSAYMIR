// ===============================
//  ROLES - صلاحيات المستخدمين
// ===============================
export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
});

// ===============================
//  COMPLAINT STATUS - حالات الشكاوي
// ===============================
export const COMPLAINT_STATUS = Object.freeze({
  PENDING: 'pending',
  RESOLVED: 'resolved',
  IN_INVESTIGATION: 'in_investigation',
});

// ===============================
//  BRANCH TYPES - أنواع الفروع
// ===============================
export const BRANCH_TYPES = Object.freeze({
  GENERAL: 'general',
  SPECIAL: 'special',
  NEW: 'new',
});

// ===============================
//  PRODUCT PACKAGES - باقات المنتجات
// ===============================
export const PRODUCT_PACKAGES = Object.freeze({
  STANDARD: 'standard',
  VIP: 'vip',
});

// ===============================
//  CONTACT INFO - بيانات التواصل (مصدر واحد)
// ===============================
export const CONTACT_INFO = Object.freeze({
  PHONE_1: import.meta.env.VITE_PHONE_1 || '966536667222',
  PHONE_2: import.meta.env.VITE_PHONE_2 || '966507882771',
  PHONE_1_DISPLAY: import.meta.env.VITE_PHONE_1_DISPLAY || '00966536667222',
  PHONE_2_DISPLAY: import.meta.env.VITE_PHONE_2_DISPLAY || '00966507882771',
  EMAIL: import.meta.env.VITE_CONTACT_EMAIL || 'kal6667222@gmail.com',
  SNAPCHAT: import.meta.env.VITE_SNAPCHAT_URL || 'https://snapchat.com/t/HPkkIfUp',
  SNAPCHAT_USERNAME: import.meta.env.VITE_SNAPCHAT_USERNAME || 'pmp.u',
  WHATSAPP: import.meta.env.VITE_CONTACT_WHATSAPP_1 || '966536667222',
  BANK_RAJHI: import.meta.env.VITE_BANK_RAJHI_IBAN || 'SA0980000509608010069017',
  BANK_RAJHI_ACCOUNT: import.meta.env.VITE_BANK_RAJHI_ACCOUNT || '09608010069017',
  BANK_RAJHI_NAME: import.meta.env.VITE_BANK_RAJHI_NAME || 'بنك الراجحي',
  BANK_ARABI: import.meta.env.VITE_BANK_ARABI_IBAN || 'SA9830400108088851870011',
  BANK_ARABI_ACCOUNT: import.meta.env.VITE_BANK_ARABI_ACCOUNT || '0108088851870011',
  BANK_ARABI_NAME: import.meta.env.VITE_BANK_ARABI_NAME || 'بنك العربي',
});

// ===============================
//  BANK ACCOUNTS - الحسابات البنكية (مصدر واحد)
// ===============================
export const BANK_ACCOUNTS = Object.freeze([
  {
    id: 'alrajhi',
    name: CONTACT_INFO.BANK_RAJHI_NAME,
    iban: CONTACT_INFO.BANK_RAJHI,
    account: CONTACT_INFO.BANK_RAJHI_ACCOUNT,
    color: 'var(--rz-primary)',
  },
  {
    id: 'arabank',
    name: CONTACT_INFO.BANK_ARABI_NAME,
    iban: CONTACT_INFO.BANK_ARABI,
    account: CONTACT_INFO.BANK_ARABI_ACCOUNT,
    color: 'var(--rz-primary)',
  },
]);

// ===============================
//  COMMISSION RATES - نسب الموقع
// ===============================
export const COMMISSION_RATES = Object.freeze({
  NEW: 2,
  USED: 1,
  NOTE: 'وتعتبر هذه النسبة في ذمة المعلن عند بيع السلعة',
});

// ===============================
//  OWNER INFO - بيانات صاحب الموقع
// ===============================
export const OWNER_INFO = Object.freeze({
  NAME: 'فهد بن حمود بن فهد الشمري',
  PLATFORM: 'المسيمير | ALMUSAYMIR',
  VISION: '2030',
});

// ===============================
//  WELCOME MESSAGE - رسالة الترحيب الرسمية
// ===============================
export const WELCOME_MESSAGE = Object.freeze(
  `تم تسجيل دخول صاحب موقع "المسيمير | ALMUSAYMIR" ويُرحّب بكم جميعاً ويتمنى لكم تجربة تسوّق ممتعة ترضي ذائقتكم الرفيعة. يُذكّركم بأن من لديه اقتراح أو ملاحظة أو شكوى على أحد موظفي الموقع أو على أي شخص بسبب النصب أو الاحتيال، يتوجّه إلى غرفة صاحب الموقع ويتقدّم برسالة مفصّلة. وفي حال كانت الشكوى نصب واحتيال فسيتم اتخاذ الإجراءات اللازمة فوراً، سواء من قِبَل صاحب الموقع أو بإحالة الموضوع إلى الجهات الأمنية المختصّة بشكل عاجل، حفاظاً على حقوقكم وسلامة تعاملاتكم. المسيمير | ALMUSAYMIR — حيث الأناقة تلتقي بالثقة.`.trim()
);
