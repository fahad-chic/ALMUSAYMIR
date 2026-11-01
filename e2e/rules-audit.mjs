// e2e/rules-audit.mjs — تدقيق حقيقي لقواعد Firestore على محاكي Firebase.
// يتحقق من مصفوفة الصلاحيات رباعية الأطراف:
//   1) المالك => مسموح
//   2) مشرف مصرّح له => مسموح
//   3) مشرف بلا الصلاحية => مرفوض
//   4) مستخدم/زائر => مرفوض
// ويغطي: منع المنح الذاتي، منع تصعيد الدور، فرض الحظر فعلياً، أقل صلاحية،
// وسجل التدقيق. لا يعتمد على أي تخمين: القرار يُقرأ من نتيجة المحاكي الفعلية.
//
// التشغيل:
//   npx firebase emulators:exec --only firestore --project demo-almusaymir "node e2e/rules-audit.mjs"
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-almusaymir';

const OWNER_EMAIL = 'f882771f@gmail.com';
const ADMIN_A_EMAIL = 'admin-a@example.com';
const ADMIN_B_EMAIL = 'admin-b@example.com';
const USER_EMAIL = 'user@example.com';

const uid = (name) => `uid-${name}`;
const OWNER = uid('owner');
const ADMIN_A = uid('admin-a');
const ADMIN_B = uid('admin-b');
const USER = uid('user');
const VICTIM = uid('victim');

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
};

const expectAllow = async (name, p) => {
  try {
    await assertSucceeds(p);
    record(name, true);
  } catch (e) {
    record(name, false, e?.message || 'expected allow');
  }
};

const expectDeny = async (name, p) => {
  try {
    await assertFails(p);
    record(name, true);
  } catch (e) {
    record(name, false, e?.message || 'expected deny');
  }
};

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
  },
});

// ============ تهيئة البيانات (بصلاحيات الأدمن على القواعد المتجاوزة) ============
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();

  // حسابات المستخدمين
  await setDoc(doc(db, 'users', OWNER), { email: OWNER_EMAIL, role: 'owner' });
  await setDoc(doc(db, 'users', ADMIN_A), { email: ADMIN_A_EMAIL, role: 'admin' });
  await setDoc(doc(db, 'users', ADMIN_B), { email: ADMIN_B_EMAIL, role: 'user' });
  await setDoc(doc(db, 'users', USER), { email: USER_EMAIL, role: 'user' });
  await setDoc(doc(db, 'users', VICTIM), { email: 'victim@example.com', role: 'user' });

  // منح الصلاحيات: A يملك حزمة الحظر/التوثيق/الحراج، B بلا صلاحيات
  await setDoc(doc(db, 'rbac', ADMIN_A), {
    suspended: false,
    grants: {
      BAN_USER_TEMPORARY: true,
      BAN_USER_PERMANENT: true,
      UNBAN_USER_RESTORE: true,
      MANAGE_USER_VERIFICATION: true,
      HARAJ_POST_APPROVE: true,
      HARAJ_POST_DELETE: true,
      HARAJ_POST_RESTORE: true,
      TRANSFER_POST_OWNERSHIP: true,
      ADD_NEW_EMPLOYEE: true,
    },
  });
  await setDoc(doc(db, 'rbac', ADMIN_B), { suspended: false, grants: {} });

  // إعلان حراج مملوك لمستخدم عادي
  await setDoc(doc(db, 'haraj_ads', 'ad-1'), {
    title: 'إعلان تجريبي',
    price: 100,
    status: 'pending',
    userId: USER,
  });

  // موظف قائم
  await setDoc(doc(db, 'employees', 'emp-1'), { name: 'موظف', email: 'emp@example.com' });
});

const owner = testEnv.authenticatedContext(OWNER, {
  email: OWNER_EMAIL,
  email_verified: true,
}).firestore();
const adminA = testEnv.authenticatedContext(ADMIN_A, {
  email: ADMIN_A_EMAIL,
  email_verified: true,
}).firestore();
const adminB = testEnv.authenticatedContext(ADMIN_B, {
  email: ADMIN_B_EMAIL,
  email_verified: true,
}).firestore();
const user = testEnv.authenticatedContext(USER, {
  email: USER_EMAIL,
  email_verified: true,
}).firestore();
const visitor = testEnv.unauthenticatedContext().firestore();

console.log('\n=== 1) مصفوفة rbac: منع المنح الذاتي وتصعيد الصلاحيات ===');
await expectAllow('المالك يكتب rbac لأي حساب', setDoc(doc(owner, 'rbac', USER), {
  grants: { HARAJ_POST_DELETE: true },
}));
await expectDeny('مشرف مصرّح له لا يمنح نفسه صلاحيات (كتابة rbac)', setDoc(doc(adminA, 'rbac', ADMIN_A), {
  grants: { SUPER_ADMIN_FULL_ACCESS: true },
}));
await expectDeny('مستخدم عادي لا يمنح نفسه صلاحيات', setDoc(doc(user, 'rbac', USER), {
  grants: { SUPER_ADMIN_FULL_ACCESS: true },
}));
await expectDeny('الزائر لا يكتب rbac', setDoc(doc(visitor, 'rbac', USER), {
  grants: { HARAJ_POST_DELETE: true },
}));
await expectAllow('صاحب الوثيقة يقرأ rbac الخاص به', getDoc(doc(adminA, 'rbac', ADMIN_A)));
await expectDeny('مشرف لا يقرأ rbac مشرف آخر', getDoc(doc(adminA, 'rbac', ADMIN_B)));

console.log('\n=== 2) users: الحظر والتوثيق وتصعيد الدور ===');
await expectAllow('مشرف BAN_USER_TEMPORARY يحظر (status)', updateDoc(doc(adminA, 'users', VICTIM), {
  status: 'banned',
  banned: true,
  banType: 'temporary',
  banExpiresAt: new Date(Date.now() + 86400000),
  updatedBy: ADMIN_A_EMAIL,
}));
await expectAllow('مشرف UNBAN_USER_RESTORE يفك الحظر', updateDoc(doc(adminA, 'users', VICTIM), {
  status: 'active',
  banned: false,
  banExpiresAt: null,
}));
await expectAllow('مشرف MANAGE_USER_VERIFICATION يوثّق الحساب', updateDoc(doc(adminA, 'users', VICTIM), {
  isVerified: true,
  verifiedBy: ADMIN_A_EMAIL,
}));
await expectDeny('مشرف الحظر لا يستطيع تغيير الدور (تصعيد)', updateDoc(doc(adminA, 'users', VICTIM), {
  role: 'admin',
}));
await expectDeny('مشرف بلا صلاحية لا يعدّل مستخدماً', updateDoc(doc(adminB, 'users', VICTIM), {
  status: 'banned',
}));
await expectDeny('مستخدم عادي لا يعدّل مستخدماً آخر', updateDoc(doc(user, 'users', VICTIM), {
  banned: true,
}));
await expectDeny('الزائر لا يعدّل مستخدماً', updateDoc(doc(visitor, 'users', VICTIM), {
  banned: true,
}));

console.log('\n=== 3) فرض الحظر فعلياً على مستوى الخادم ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await updateDoc(doc(ctx.firestore(), 'users', VICTIM), {
    banned: true,
    status: 'banned',
    banType: 'permanent',
  });
});
const bannedVictim = testEnv.authenticatedContext(VICTIM, {
  email: 'victim@example.com',
  email_verified: true,
}).firestore();
await expectDeny('المحظور نهائياً لا ينشئ إعلان حراج', setDoc(doc(bannedVictim, 'haraj_ads', 'ad-banned'), {
  title: 'x',
  price: 1,
  status: 'active',
  userId: VICTIM,
}));
await expectDeny('المحظور نهائياً لا يكتب سجل تدقيق', setDoc(doc(bannedVictim, 'audit_logs', 'a1'), {
  action: 'X',
}));
await expectAllow('المحظور يقرأ وثيقته الشخصية فقط', getDoc(doc(bannedVictim, 'users', VICTIM)));
await expectDeny('المحظور لا يقرأ وثيقة غيره', getDoc(doc(bannedVictim, 'users', USER)));

console.log('\n=== 4) حظر مؤقت منتهي المدة يُرفع تلقائياً ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', USER), {
    email: USER_EMAIL,
    role: 'user',
    banned: true,
    banType: 'temporary',
    banExpiresAt: new Date(Date.now() - 60000),
  });
});
const expiredUser = testEnv.authenticatedContext(USER, {
  email: USER_EMAIL,
  email_verified: true,
}).firestore();
await expectAllow('المحظور مؤقتاً بعد انتهاء المدة يعمل مجدداً', setDoc(doc(expiredUser, 'haraj_ads', 'ad-after-expiry'), {
  title: 'y',
  price: 1,
  status: 'active',
  userId: USER,
}));

console.log('\n=== 5) haraj_ads: أقل صلاحية لكل إجراء ===');
await expectAllow('HARAJ_POST_APPROVE يعتمد الإعلان (status فقط)', updateDoc(doc(adminA, 'haraj_ads', 'ad-1'), {
  status: 'active',
}));
await expectDeny('HARAJ_POST_APPROVE لا يغيّر المحتوى (title)', updateDoc(doc(adminA, 'haraj_ads', 'ad-1'), {
  title: 'معدّل',
}));
await expectAllow('HARAJ_POST_RESTORE يعيد الإعلان نشطاً', updateDoc(doc(adminA, 'haraj_ads', 'ad-1'), {
  status: 'active',
  restoredAt: new Date(),
  restoredBy: ADMIN_A_EMAIL,
}));
await expectAllow('TRANSFER_POST_OWNERSHIP ينقل الملكية', updateDoc(doc(adminA, 'haraj_ads', 'ad-1'), {
  userId: VICTIM,
  transferredBy: ADMIN_A_EMAIL,
}));
// نفس الحمولة التي تكتبها الواجهة الآن (توثيق/نقل/استعادة) — تثبيت التطابق.
await expectAllow('MANAGE_USER_VERIFICATION (حمولة الواجهة: isVerified/verifiedAt/verifiedBy/updated*)', updateDoc(doc(adminA, 'users', VICTIM), {
  isVerified: true,
  verifiedAt: new Date(),
  verifiedBy: ADMIN_A_EMAIL,
  updatedAt: new Date(),
  updatedBy: ADMIN_A_EMAIL,
}));
await expectAllow('TRANSFER_POST_OWNERSHIP (حمولة الواجهة: userId/transferredAt/transferredBy/updatedAt)', updateDoc(doc(adminA, 'haraj_ads', 'ad-1'), {
  userId: VICTIM,
  transferredAt: new Date(),
  transferredBy: ADMIN_A_EMAIL,
  updatedAt: new Date(),
}));
await expectAllow('HARAJ_POST_RESTORE (حمولة الواجهة: status=active/restoredAt/restoredBy/updatedAt)', updateDoc(doc(adminA, 'haraj_ads', 'ad-1'), {
  status: 'active',
  restoredAt: new Date(),
  restoredBy: ADMIN_A_EMAIL,
  updatedAt: new Date(),
}));
await expectDeny('مشرف بلا صلاحية حراج لا يعتمد الإعلان', updateDoc(doc(adminB, 'haraj_ads', 'ad-1'), {
  status: 'pending',
  rejectionReason: 'x',
}));
await expectDeny('مستخدم لا يعدّل إعلان غيره', updateDoc(doc(user, 'haraj_ads', 'ad-1'), {
  title: 'hack',
}));
await expectAllow('HARAJ_POST_DELETE يحذف الإعلان', deleteDoc(doc(adminA, 'haraj_ads', 'ad-1')));
await expectDeny('الزائر لا يحذف الإعلان', deleteDoc(doc(visitor, 'haraj_ads', 'ad-1')));

console.log('\n=== 6) employees: ADD_NEW_EMPLOYEE ===');
await expectAllow('مشرف ADD_NEW_EMPLOYEE يضيف موظفاً', setDoc(doc(adminA, 'employees', 'emp-2'), {
  name: 'موظف جديد',
  email: 'new@example.com',
}));
await expectDeny('مشرف بلا صلاحية لا يضيف موظفاً', setDoc(doc(adminB, 'employees', 'emp-3'), {
  name: 'x',
  email: 'x@example.com',
}));
await expectDeny('مستخدم لا يضيف موظفاً', setDoc(doc(user, 'employees', 'emp-4'), {
  name: 'x',
  email: 'x@example.com',
}));

console.log('\n=== 7) audit_logs: الكتابة والقراءة ===');
await expectAllow('مستخدم موثّق يكتب سجل تدقيق (لا يمنح قدرة)', setDoc(doc(user, 'audit_logs', 'log-1'), {
  action: 'X',
  actorUid: USER,
  result: 'success',
}));
await expectDeny('مستخدم عادي لا يقرأ سجل التدقيق', getDoc(doc(user, 'audit_logs', 'log-1')));
await expectAllow('المالك يقرأ سجل التدقيق', getDoc(doc(owner, 'audit_logs', 'log-1')));
await expectDeny('الزائر لا يكتب سجل تدقيق', setDoc(doc(visitor, 'audit_logs', 'log-2'), {
  action: 'X',
}));

console.log('\n=== 8) حماية صلاحيات المراقبة (OWNER_ONLY) من التصعيد ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  // حتى لو وُجد المفتاح في الوثيقة (بيانات مُتلاعَب بها)، القاعدة ترفض.
  await setDoc(doc(ctx.firestore(), 'rbac', ADMIN_B), {
    suspended: false,
    grants: { VIEW_SYSTEM_AUDIT_LOGS: true, FIREBASE_MUTATION_LOGS: true },
  });
  await setDoc(doc(ctx.firestore(), 'security_logs', 's-1'), {
    type: 'x',
    details: 'y',
  });
});
await expectDeny('مشرف لا يحصل على VIEW_SYSTEM_AUDIT_LOGS حتى لو كُتب في الوثيقة', getDoc(doc(adminB, 'security_logs', 's-1')));
await expectAllow('المالك يقرأ security_logs', getDoc(doc(owner, 'security_logs', 's-1')));

console.log('\n=== 9) سجل التدقيق: منع التلاعب من غير المالك ===');
await expectDeny('مشرف لا يعدّل سجل تدقيق (تزوير النتيجة)', updateDoc(doc(adminA, 'audit_logs', 'log-1'), {
  result: 'forged',
}));
await expectDeny('مشرف لا يحذف سجل تدقيق', deleteDoc(doc(adminA, 'audit_logs', 'log-1')));
await expectAllow('المالك يحذف سجل تدقيق (تقادم/تنظيف)', deleteDoc(doc(owner, 'audit_logs', 'log-1')));

console.log('\n=== 10) FORCE_LOGOUT_SESSION: إبطال الجلسة فعلياً ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'rbac', ADMIN_A), {
    suspended: false,
    grants: { FORCE_LOGOUT_SESSION: true },
  });
  await setDoc(doc(ctx.firestore(), 'users', VICTIM), { email: 'victim@example.com', role: 'user' });
});
await expectAllow('مشرف FORCE_LOGOUT_SESSION يكتب forceLogoutAt', updateDoc(doc(adminA, 'users', VICTIM), {
  forceLogoutAt: Math.floor(Date.now() / 1000),
}));
await expectDeny('مشرف FORCE_LOGOUT_SESSION لا يمسّ الدور (تصعيد)', updateDoc(doc(adminA, 'users', VICTIM), {
  role: 'admin',
}));
await expectDeny('مشرف بلا الصلاحية لا ينهي الجلسة', updateDoc(doc(adminB, 'users', VICTIM), {
  forceLogoutAt: Math.floor(Date.now() / 1000),
}));
await expectDeny('مستخدم لا ينهي جلسة غيره', updateDoc(doc(user, 'users', VICTIM), {
  forceLogoutAt: Math.floor(Date.now() / 1000),
}));

// الفرض الفعلي: رمز صدر قبل forceLogoutAt يُرفض، ورمز أحدث يمر.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await updateDoc(doc(ctx.firestore(), 'users', VICTIM), {
    forceLogoutAt: Math.floor(Date.now() / 1000),
  });
});
const oldTokenVictim = testEnv.authenticatedContext(VICTIM, {
  email: 'victim@example.com',
  email_verified: true,
  auth_time: Math.floor(Date.now() / 1000) - 3600,
}).firestore();
const freshTokenVictim = testEnv.authenticatedContext(VICTIM, {
  email: 'victim@example.com',
  email_verified: true,
  auth_time: Math.floor(Date.now() / 1000) + 3600,
}).firestore();
await expectDeny('الرمز الأقدم من forceLogoutAt مرفوض (جلسة منتهية)', getDoc(doc(oldTokenVictim, 'haraj_ads', 'ad-1')));
await expectAllow('الرمز الأحدث من forceLogoutAt يعمل (بعد إعادة الدخول)', getDoc(doc(freshTokenVictim, 'haraj_ads', 'ad-1')));

console.log('\n=== 11) sessions: تتبّع الجلسات الحيّة ===');
await expectAllow('المستخدم يكتب نبضة جلسته', setDoc(doc(user, 'sessions', USER), {
  uid: USER,
  role: 'user',
  lastSeenAt: new Date(),
}));
await expectDeny('المستخدم لا يكتب نبضة لغيره (تزوير)', setDoc(doc(user, 'sessions', VICTIM), {
  uid: VICTIM,
  role: 'user',
}));
await expectDeny('uid لا يطابق صاحب الجلسة مرفوض', setDoc(doc(user, 'sessions', USER), {
  uid: VICTIM,
  role: 'user',
}));
await expectAllow('المستخدم يقرأ جلسته', getDoc(doc(user, 'sessions', USER)));
await expectDeny('مستخدم لا يقرأ جلسة غيره', getDoc(doc(adminB, 'sessions', USER)));
await expectAllow('المالك يقرأ كل الجلسات', getDoc(doc(owner, 'sessions', USER)));

console.log('\n=== 12) deleted_archive: الأرشفة والاستعادة ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  // نعيد منح adminA صلاحية حذف الحراج (طُمسِت في القسم 10) لاختبار الأرشفة.
  await setDoc(doc(ctx.firestore(), 'rbac', ADMIN_A), {
    suspended: false,
    grants: { HARAJ_POST_DELETE: true },
  });
});
await expectAllow('HARAJ_POST_DELETE يؤرشف إعلاناً', setDoc(doc(adminA, 'deleted_archive', 'arch-1'), {
  sourceCollection: 'haraj_ads',
  sourceId: 'ad-1',
  payload: { title: 'x' },
  deletedAt: new Date(),
}));
await expectDeny('مشرف بلا صلاحية لا يؤرشف', setDoc(doc(adminB, 'deleted_archive', 'arch-2'), {
  sourceCollection: 'haraj_ads',
  sourceId: 'ad-1',
  payload: { title: 'x' },
  deletedAt: new Date(),
}));
await expectDeny('أرشيف بلا بنية إلزامية مرفوض', setDoc(doc(adminA, 'deleted_archive', 'arch-3'), {
  foo: 'bar',
}));
await expectDeny('مشرف بلا صلاحية استعادة لا يقرأ الأرشيف', getDoc(doc(adminB, 'deleted_archive', 'arch-1')));
await expectAllow('المالك يقرأ الأرشيف', getDoc(doc(owner, 'deleted_archive', 'arch-1')));

console.log('\n=== 13) وضع الصيانة: تجميد الكتابة فعلياً ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'settings', 'maintenance'), { enabled: true });
});
await expectDeny('أثناء الصيانة: العضو لا ينشئ إعلان حراج', setDoc(doc(freshTokenVictim, 'haraj_ads', 'ad-maint'), {
  title: 'x',
  price: 1,
  status: 'active',
  userId: VICTIM,
}));
await expectAllow('أثناء الصيانة: المالك يواصل العمل', setDoc(doc(owner, 'haraj_ads', 'ad-maint-owner'), {
  title: 'x',
  price: 1,
  status: 'active',
  userId: OWNER,
}));
await expectAllow('أثناء الصيانة: القراءة تبقى متاحة', getDoc(doc(owner, 'haraj_ads', 'ad-1')));
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'settings', 'maintenance'), { enabled: false });
});

console.log('\n=== 14) بقية صلاحيات المرحلة الأولى: الإعدادات/الموظفون/المراقبة ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  // adminA يملك الصلاحيات القابلة للتفويض فقط (تلك التي لا تحمل owner-only).
  await setDoc(doc(db, 'rbac', ADMIN_A), {
    suspended: false,
    grants: {
      UPDATE_GLOBAL_SETTINGS: true,
      TOGGLE_MAINTENANCE_MODE: true,
      EDIT_EMPLOYEE_PROFILE: true,
      VIEW_EMPLOYEE_SALARIES: true,
      SUSPEND_SUB_ADMIN_ACCOUNT: true,
      TRACK_EMPLOYEE_LIVE_SESSIONS: true,
      VIEW_SYSTEM_AUDIT_LOGS: true,
      FIREBASE_MUTATION_LOGS: true,
      TRACK_FAILED_LOGINS: true,
      RECOVER_DELETED_ITEMS_ARCHIVE: true,
    },
  });
  await setDoc(doc(db, 'employees', 'emp-1'), { name: 'موظف', email: 'emp@example.com' });
  await setDoc(doc(db, 'settings', 'siteTexts'), {});
  await setDoc(doc(db, 'deleted_archive', 'arch-x'), {
    sourceCollection: 'haraj_ads', sourceId: 'a', payload: {}, deletedAt: new Date(),
  });
});

// UPDATE_GLOBAL_SETTINGS
await expectAllow('UPDATE_GLOBAL_SETTINGS: المصرّح يكتب settings/siteTexts', setDoc(doc(adminA, 'settings', 'siteTexts'), { hero: 'x' }, { merge: true }));
await expectDeny('UPDATE_GLOBAL_SETTINGS: غير المصرّح مرفوض', setDoc(doc(adminB, 'settings', 'siteTexts'), { hero: 'y' }, { merge: true }));
await expectDeny('UPDATE_GLOBAL_SETTINGS: الزائر مرفوض', setDoc(doc(visitor, 'settings', 'siteTexts'), { hero: 'z' }, { merge: true }));
await expectAllow('UPDATE_GLOBAL_SETTINGS: المالك يكتب', setDoc(doc(owner, 'settings', 'siteTexts'), { hero: 'o' }, { merge: true }));

// TOGGLE_MAINTENANCE_MODE
await expectAllow('TOGGLE_MAINTENANCE_MODE: المصرّح يكتب settings/maintenance', setDoc(doc(adminA, 'settings', 'maintenance'), { enabled: false }, { merge: true }));
await expectDeny('TOGGLE_MAINTENANCE_MODE: غير المصرّح مرفوض', setDoc(doc(adminB, 'settings', 'maintenance'), { enabled: true }, { merge: true }));

// EDIT_EMPLOYEE_PROFILE
await expectAllow('EDIT_EMPLOYEE_PROFILE: المصرّح يعدّل موظفاً', updateDoc(doc(adminA, 'employees', 'emp-1'), { name: 'معدّل' }));
await expectDeny('EDIT_EMPLOYEE_PROFILE: غير المصرّح مرفوض', updateDoc(doc(adminB, 'employees', 'emp-1'), { name: 'y' }));

// VIEW_EMPLOYEE_SALARIES (قراءة فقط)
await expectAllow('VIEW_EMPLOYEE_SALARIES: المصرّح يقرأ ملف الموظف', getDoc(doc(adminA, 'employees', 'emp-1')));
await expectDeny('VIEW_EMPLOYEE_SALARIES: غير المصرّح لا يقرأ', getDoc(doc(adminB, 'employees', 'emp-1')));

// SUSPEND_SUB_ADMIN_ACCOUNT — يكتب rbac وهي owner-only: لا تفويض ممكن.
await expectAllow('SUSPEND_SUB_ADMIN_ACCOUNT: المالك يجمّد مشرفاً (rbac)', setDoc(doc(owner, 'rbac', ADMIN_B), { suspended: true }, { merge: true }));
await expectDeny('SUSPEND_SUB_ADMIN_ACCOUNT: مشرف مصرّح لا يجمّد غيره (owner-only)', setDoc(doc(adminA, 'rbac', ADMIN_B), { suspended: true }, { merge: true }));

// صلاحيات المراقبة owner-only: المالك فقط، حتى لو وُجد المفتاح في الوثيقة.
await expectAllow('TRACK_EMPLOYEE_LIVE_SESSIONS: المالك يقرأ الجلسات', getDoc(doc(owner, 'sessions', USER)));
await expectDeny('TRACK_EMPLOYEE_LIVE_SESSIONS: مشرف مصرّح لا يقرأ الجلسات (owner-only)', getDoc(doc(adminA, 'sessions', USER)));
await expectAllow('VIEW_SYSTEM_AUDIT_LOGS: المالك يقرأ logs', getDoc(doc(owner, 'logs', 'l-1')));
await expectDeny('VIEW_SYSTEM_AUDIT_LOGS: مشرف مصرّح لا يقرأ logs (owner-only)', getDoc(doc(adminA, 'logs', 'l-1')));
await expectDeny('FIREBASE_MUTATION_LOGS: مشرف مصرّح لا يقرأ logs (owner-only)', getDoc(doc(adminA, 'logs', 'l-2')));
await expectDeny('TRACK_FAILED_LOGINS: مشرف مصرّح لا يقرأ security_logs (owner-only)', getDoc(doc(adminA, 'security_logs', 's-2')));
await expectAllow('RECOVER_DELETED_ITEMS_ARCHIVE: المالك يقرأ الأرشيف', getDoc(doc(owner, 'deleted_archive', 'arch-x')));
await expectDeny('RECOVER_DELETED_ITEMS_ARCHIVE: مشرف مصرّح لا يقرأ الأرشيف (owner-only)', getDoc(doc(adminA, 'deleted_archive', 'arch-x')));

console.log('\n=== 15) بوابة التسجيل (BLOCK_USER_REGISTRATION) ===');
const NEWUSER = uid('newuser');
const newUser = testEnv.authenticatedContext(NEWUSER, {
  email: 'newuser@example.com',
  email_verified: true,
}).firestore();

// الافتراضي مفتوح: إنشاء وثيقة العضوية مسموح.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await deleteDoc(doc(ctx.firestore(), 'settings', 'registrationGate'));
});
await expectAllow('التسجيل مفتوح افتراضياً: إنشاء العضوية مسموح', setDoc(doc(newUser, 'users', NEWUSER), {
  email: 'newuser@example.com',
  role: 'user',
}));

// العضو صار له عضوية فعّالة — يستطيع العمل.
await expectAllow('العضو الجديد يعمل بعد إنشاء العضوية', setDoc(doc(newUser, 'haraj_ads', 'ad-new'), {
  title: 'x', price: 1, status: 'active', userId: NEWUSER,
}));

// المالك يوقف التسجيل (سبب إلزامي في الواجهة).
await expectAllow('المالك يوقف التسجيل', setDoc(doc(owner, 'settings', 'registrationGate'), {
  blocked: true, reason: 'هجوم تسجيلات وهمية', updatedBy: OWNER,
}));

const BLOCKEDUSER = uid('blockeduser');
const blockedUser = testEnv.authenticatedContext(BLOCKEDUSER, {
  email: 'blocked@example.com',
  email_verified: true,
}).firestore();
await expectDeny('التسجيل متوقف: إنشاء عضوية جديدة مرفوض', setDoc(doc(blockedUser, 'users', BLOCKEDUSER), {
  email: 'blocked@example.com',
  role: 'user',
}));
// حساب بلا عضوية لا يستطيع فعل أي شيء فعلياً (فرض خادمي).
await expectDeny('حساب بلا عضوية لا ينشر إعلاناً', setDoc(doc(blockedUser, 'haraj_ads', 'ad-blocked'), {
  title: 'x', price: 1, status: 'active', userId: BLOCKEDUSER,
}));
// الحسابات القديمة (وثيقتها موجودة) تستمر بالدخول والعمل.
await expectAllow('حساب قديم يواصل العمل أثناء الإيقاف', setDoc(doc(newUser, 'haraj_ads', 'ad-old'), {
  title: 'y', price: 2, status: 'active', userId: NEWUSER,
}));
// المالك لا يُقفل نفسه.
await expectAllow('المالك ينشئ عضويته أثناء الإيقاف (لا يُقفل نفسه)', setDoc(doc(owner, 'users', OWNER), {
  email: OWNER_EMAIL, role: 'owner',
}, { merge: true }));

// من يملك الصلاحية يستطيع إيقاف/فتح التسجيل، وغيره لا.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'rbac', ADMIN_A), {
    suspended: false, grants: { BLOCK_USER_REGISTRATION: true },
  });
});
await expectAllow('مشرف BLOCK_USER_REGISTRATION يفتح التسجيل', setDoc(doc(adminA, 'settings', 'registrationGate'), {
  blocked: false, reason: '', updatedBy: ADMIN_A,
}, { merge: true }));
await expectAllow('التسجيل عاد للعمل: إنشاء عضوية مسموح', setDoc(doc(blockedUser, 'users', BLOCKEDUSER), {
  email: 'blocked@example.com', role: 'user',
}));
await expectDeny('مستخدم عادي لا يغيّر إعداد التسجيل', setDoc(doc(newUser, 'settings', 'registrationGate'), {
  blocked: true,
}, { merge: true }));
await expectDeny('مشرف بلا صلاحية لا يوقف التسجيل', setDoc(doc(adminB, 'settings', 'registrationGate'), {
  blocked: true,
}, { merge: true }));
await expectDeny('الزائر لا يوقف التسجيل', setDoc(doc(visitor, 'settings', 'registrationGate'), {
  blocked: true,
}, { merge: true }));

console.log('\n=== 16) حراج: ملف واحد لكل حساب + منع تعديل الملكية/الرقم ===');
const HUSER = uid('haraj-user');
const huser = testEnv.authenticatedContext(HUSER, {
  email: 'haraj-user@example.com',
  email_verified: true,
}).firestore();
const OTHER = uid('other');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', HUSER), { email: 'haraj-user@example.com', role: 'user' });
  await setDoc(doc(db, 'users', OTHER), { email: 'other@example.com', role: 'user' });
  await deleteDoc(doc(db, 'haraj_uid_index', HUSER));
  await deleteDoc(doc(db, 'haraj_users', 'hp-1'));
});

// 1) ملف حراج واحد — يُسمح.
await expectAllow('إنشاء ملف حراج واحد (authUid مطابق)', setDoc(doc(huser, 'haraj_users', 'hp-1'), {
  name: 'مستخدم', phone: '0555555555', email: 'haraj-user@example.com', authUid: HUSER,
}));
// فهرس التفرد.
await expectAllow('إنشاء فهرس التفرد لصاحب الحساب', setDoc(doc(huser, 'haraj_uid_index', HUSER), {
  phone: '0555555555', harajUserId: 'hp-1',
}));
// 2) ملف ثانٍ لنفس الحساب — مرفوض (فهرس موجود).
await expectDeny('ملف حراج ثانٍ لنفس الحساب مرفوض', setDoc(doc(huser, 'haraj_users', 'hp-2'), {
  name: 'مستخدم', phone: '0555555556', email: 'haraj-user@example.com', authUid: HUSER,
}));
// 3) انتحال authUid (كتابة ملف لحساب آخر) — مرفوض.
await expectDeny('لا يمكن كتابة ملف حراج بـ authUid لغير صاحب الجلسة', setDoc(doc(huser, 'haraj_users', 'hp-3'), {
  name: 'x', phone: '0555555557', email: 'x@example.com', authUid: OTHER,
}));
// 4) تعديل authUid/phone بعد الإنشاء — مرفوض (منع سرقة الملف/تغيير الرقم).
await expectDeny('لا يمكن تغيير authUid للملف', updateDoc(doc(huser, 'haraj_users', 'hp-1'), {
  authUid: OTHER,
}));
await expectDeny('لا يمكن تغيير رقم الجوال للملف', updateDoc(doc(huser, 'haraj_users', 'hp-1'), {
  phone: '0500000000',
}));
await expectAllow('صاحب الملف يعدّل حقولاً غير محظورة', updateDoc(doc(huser, 'haraj_users', 'hp-1'), {
  name: 'اسم محدّث',
}));
// 5) فهرس لا يُنشأ لغير صاحب الجلسة، ولا يُحذف من غير المالك/المفوَّض.
await expectDeny('لا يمكن إنشاء فهرس تفرد لحساب آخر', setDoc(doc(huser, 'haraj_uid_index', OTHER), {
  phone: '0555555555',
}));
await expectDeny('مستخدم لا يحذف فهرس التفرد', deleteDoc(doc(huser, 'haraj_uid_index', HUSER)));
await expectAllow('المالك يحذف فهرس التفرد (تصحيح حالة)', deleteDoc(doc(owner, 'haraj_uid_index', HUSER)));
// بعد الحذف يمكن إنشاء ملف جديد (تصحيح الحالة).
await expectAllow('بعد تحرير الفهرس يمكن إنشاء ملف حراج', setDoc(doc(huser, 'haraj_users', 'hp-4'), {
  name: 'مستخدم', phone: '0555555555', email: 'haraj-user@example.com', authUid: HUSER,
}));

// ============ الخلاصة ============
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} فحصاً ناجحاً`);
if (failed.length) {
  console.log('الفاشلة:');
  for (const f of failed) console.log(`  - ${f.name} :: ${f.detail}`);
  console.log('\nOVERALL: FAIL');
} else {
  console.log('OVERALL: PASS');
}

await testEnv.cleanup();
process.exit(failed.length ? 1 : 0);
