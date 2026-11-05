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
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
// الزائر المجهول الحقيقي (anonymous auth) — هو من يستطيع الوصول للمسارات
// العامة، وليس جلسة غير مصادقة إطلاقاً. يُستخدم لاختبار القراءة العامة.
const guestCtx = testEnv.authenticatedContext(uid('guest'), {
  firebase: { sign_in_provider: 'anonymous' },
});
const guest = guestCtx.firestore();

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
// السجل append-only مطلق: لا يُحذف حتى من المالك (حماية أثر الحوادث الأمنية).
await expectDeny('المالك لا يحذف سجل تدقيق (append-only مطلق)', deleteDoc(doc(owner, 'audit_logs', 'log-1')));

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

// UPDATE_GLOBAL_SETTINGS — الإعدادات العامة غير المخصّصة (store/security/bank)
await expectAllow('UPDATE_GLOBAL_SETTINGS: المصرّح يكتب settings/store', setDoc(doc(adminA, 'settings', 'store'), { name: 'x' }, { merge: true }));
await expectDeny('UPDATE_GLOBAL_SETTINGS: غير المصرّح مرفوض', setDoc(doc(adminB, 'settings', 'store'), { name: 'y' }, { merge: true }));
await expectDeny('UPDATE_GLOBAL_SETTINGS: الزائر مرفوض', setDoc(doc(visitor, 'settings', 'store'), { name: 'z' }, { merge: true }));
await expectAllow('UPDATE_GLOBAL_SETTINGS: المالك يكتب', setDoc(doc(owner, 'settings', 'store'), { name: 'o' }, { merge: true }));
// UPDATE_GLOBAL_SETTINGS لا يتجاوز وثيقة مخصّصة (siteTexts = INLINE_TEXT_EDIT)
await expectDeny('UPDATE_GLOBAL_SETTINGS: لا يكتب siteTexts (مخصّص لـINLINE_TEXT_EDIT)', setDoc(doc(adminA, 'settings', 'siteTexts'), { hero: 'x' }, { merge: true }));

// TOGGLE_MAINTENANCE_MODE
await expectAllow('TOGGLE_MAINTENANCE_MODE: المصرّح يكتب settings/maintenance', setDoc(doc(adminA, 'settings', 'maintenance'), { enabled: false }, { merge: true }));
await expectDeny('TOGGLE_MAINTENANCE_MODE: غير المصرّح مرفوض', setDoc(doc(adminB, 'settings', 'maintenance'), { enabled: true }, { merge: true }));

// EDIT_EMPLOYEE_PROFILE
await expectAllow('EDIT_EMPLOYEE_PROFILE: المصرّح يعدّل موظفاً', updateDoc(doc(adminA, 'employees', 'emp-1'), { name: 'معدّل' }));
await expectDeny('EDIT_EMPLOYEE_PROFILE: غير المصرّح مرفوض', updateDoc(doc(adminB, 'employees', 'emp-1'), { name: 'y' }));

// VIEW_EMPLOYEE_SALARIES مؤجلة: لا تمنح أي قراءة حتى لو وُجد المفتاح في الوثيقة.
const SALARY_UID = uid('salary-admin');
const salaryAdmin = testEnv.authenticatedContext(SALARY_UID, {
  email: 'salary-admin@example.com', email_verified: true,
}).firestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'rbac', SALARY_UID), {
    suspended: false, grants: { VIEW_EMPLOYEE_SALARIES: true },
  });
});
await expectDeny('VIEW_EMPLOYEE_SALARIES (مؤجلة): لا تمنح قراءة employees', getDoc(doc(salaryAdmin, 'employees', 'emp-1')));
await expectDeny('VIEW_EMPLOYEE_SALARIES (مؤجلة): غير المصرّح لا يقرأ', getDoc(doc(adminB, 'employees', 'emp-1')));

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

// ============ 17) مصفوفة الصلاحيات الـ23 المعتمدة (5 أدوار لكل صلاحية) ============
// لكل صلاحية: المالك مسموح، مشرف مصرّح مسموح، مشرف بلا صلاحية مرفوض،
// مستخدم مرفوض، زائر مرفوض. القرار يُقرأ من نتيجة المحاكي الفعلية.
console.log('\n=== 17) مصفوفة الصلاحيات الـ23 المعتمدة (مالك/مصرّح/غير مصرّح/مستخدم/زائر) ===');

const PHASE1_APPROVED = [
  'SUPER_ADMIN_FULL_ACCESS', 'UPDATE_GLOBAL_SETTINGS', 'TOGGLE_MAINTENANCE_MODE',
  'BAN_USER_TEMPORARY', 'BAN_USER_PERMANENT', 'UNBAN_USER_RESTORE',
  'FORCE_LOGOUT_SESSION', 'BLOCK_USER_REGISTRATION', 'MANAGE_USER_VERIFICATION',
  'VIEW_USER_IP_HISTORY',
  'HARAJ_POST_APPROVE', 'HARAJ_POST_DELETE', 'HARAJ_POST_RESTORE', 'TRANSFER_POST_OWNERSHIP',
  'ADD_NEW_EMPLOYEE', 'EDIT_EMPLOYEE_PROFILE', 'GRANT_SUB_ADMIN_PERMISSIONS',
  'SUSPEND_SUB_ADMIN_ACCOUNT', 'TRACK_EMPLOYEE_LIVE_SESSIONS',
  'VIEW_SYSTEM_AUDIT_LOGS', 'FIREBASE_MUTATION_LOGS', 'TRACK_FAILED_LOGINS',
  'RECOVER_DELETED_ITEMS_ARCHIVE'
]; // 23 — VIEW_EMPLOYEE_SALARIES مؤجلة ومستثناة.
const OWNER_ONLY = new Set([
  'VIEW_SYSTEM_AUDIT_LOGS', 'FIREBASE_MUTATION_LOGS', 'TRACK_FAILED_LOGINS',
  'RECOVER_DELETED_ITEMS_ARCHIVE', 'TRACK_EMPLOYEE_LIVE_SESSIONS'
]);
if (PHASE1_APPROVED.length !== 23) throw new Error('قائمة المرحلة الأولى يجب أن تكون 23');

// مجسّ لكل صلاحية: دالة تنفّذ العملية المحمية وتعود بـ Promise.
let AD_ID = 'ad-m';
const probe = {
  SUPER_ADMIN_FULL_ACCESS: (db) => setDoc(doc(db, 'settings', 'siteTexts'), { hero: 'x' }, { merge: true }),
  UPDATE_GLOBAL_SETTINGS: (db) => setDoc(doc(db, 'settings', 'siteTexts'), { hero: 'x' }, { merge: true }),
  TOGGLE_MAINTENANCE_MODE: (db) => setDoc(doc(db, 'settings', 'maintenance'), { enabled: false }, { merge: true }),
  BAN_USER_TEMPORARY: (db) => updateDoc(doc(db, 'users', 'uid-target'), { banned: true, status: 'banned', banType: 'temporary', banExpiresAt: new Date(Date.now() + 86400000) }),
  BAN_USER_PERMANENT: (db) => updateDoc(doc(db, 'users', 'uid-target'), { banned: true, status: 'banned', banType: 'permanent' }),
  UNBAN_USER_RESTORE: (db) => updateDoc(doc(db, 'users', 'uid-target'), { banned: false, status: 'active', banExpiresAt: null }),
  FORCE_LOGOUT_SESSION: (db) => updateDoc(doc(db, 'users', 'uid-target'), { forceLogoutAt: Math.floor(Date.now() / 1000) }),
  BLOCK_USER_REGISTRATION: (db) => setDoc(doc(db, 'settings', 'registrationGate'), { blocked: false, reason: '', updatedBy: 'x' }, { merge: true }),
  MANAGE_USER_VERIFICATION: (db) => updateDoc(doc(db, 'users', 'uid-target'), { isVerified: true, verifiedAt: new Date(), verifiedBy: 'x' }),
  VIEW_USER_IP_HISTORY: (db) => getDoc(doc(db, 'security_logs', 's-2')),
  HARAJ_POST_APPROVE: (db) => updateDoc(doc(db, 'haraj_ads', AD_ID), { status: 'active', rejectionReason: 'x' }),
  HARAJ_POST_DELETE: (db) => deleteDoc(doc(db, 'haraj_ads', AD_ID)),
  HARAJ_POST_RESTORE: (db) => updateDoc(doc(db, 'haraj_ads', AD_ID), { status: 'active', restoredAt: new Date(), restoredBy: 'x' }),
  TRANSFER_POST_OWNERSHIP: (db) => updateDoc(doc(db, 'haraj_ads', AD_ID), { userId: 'uid-other', transferredAt: new Date(), transferredBy: 'x' }),
  ADD_NEW_EMPLOYEE: (db) => setDoc(doc(db, 'employees', 'emp-m'), { name: 'x', email: 'x@example.com' }),
  EDIT_EMPLOYEE_PROFILE: (db) => updateDoc(doc(db, 'employees', 'emp-1'), { name: 'x' }),
  GRANT_SUB_ADMIN_PERMISSIONS: (db) => setDoc(doc(db, 'rbac', 'uid-target'), { grants: { HARAJ_POST_DELETE: true } }),
  SUSPEND_SUB_ADMIN_ACCOUNT: (db) => setDoc(doc(db, 'rbac', 'uid-target'), { suspended: true }, { merge: true }),
  TRACK_EMPLOYEE_LIVE_SESSIONS: (db) => getDoc(doc(db, 'sessions', 'uid-target')),
  VIEW_SYSTEM_AUDIT_LOGS: (db) => getDoc(doc(db, 'logs', 'l-1')),
  FIREBASE_MUTATION_LOGS: (db) => getDoc(doc(db, 'logs', 'l-2')),
  TRACK_FAILED_LOGINS: (db) => getDoc(doc(db, 'security_logs', 's-2')),
  RECOVER_DELETED_ITEMS_ARCHIVE: (db) => getDoc(doc(db, 'deleted_archive', 'arch-m')),
};

// كل مفتاح: (المالك مسموح دائماً، المشرف المصرّح مسموح فقط إذا لم يكن owner-only،
// غير المصرّح/المستخدم/الزائر مرفوضون دائماً).
const ALL_GRANTS = Object.fromEntries(PHASE1_APPROVED.map((k) => [k, true]));
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', 'uid-target'), { email: 'target@example.com', role: 'user' });
  await setDoc(doc(db, 'users', 'uid-other'), { email: 'other@example.com', role: 'user' });
  await setDoc(doc(db, 'rbac', ADMIN_A), { suspended: false, grants: ALL_GRANTS });
  await setDoc(doc(db, 'employees', 'emp-1'), { name: 'موظف', email: 'emp@example.com' });
  await setDoc(doc(db, 'logs', 'l-1'), { action: 'X' });
  await setDoc(doc(db, 'logs', 'l-2'), { action: 'Y' });
  await setDoc(doc(db, 'security_logs', 's-2'), { type: 'x' });
  await setDoc(doc(db, 'deleted_archive', 'arch-m'), { sourceCollection: 'haraj_ads', sourceId: 'a', payload: {}, deletedAt: new Date() });
  await setDoc(doc(db, 'sessions', 'uid-target'), { uid: 'uid-target', role: 'user', lastSeenAt: new Date() });
});
// الصلاحيات التي يُرفض فيها «المشرف المصرّح» على طبقة Firestore (بحكم التصميم):
//  - owner-only        : المفتاح لا يُمنح أبداً لغير المالك (دفاع في العمق).
//  - owner-account-only: تُفرض بحساب المالك حصراً (كتابة rbac).
//  - api-enforced      : لا سطح Firestore يمنح المشرف (الفرض عبر Cloudflare Function).
const ADMIN_DENIED_AT_RULES = new Set([
  'VIEW_SYSTEM_AUDIT_LOGS', 'FIREBASE_MUTATION_LOGS', 'TRACK_FAILED_LOGINS',
  'RECOVER_DELETED_ITEMS_ARCHIVE', 'TRACK_EMPLOYEE_LIVE_SESSIONS',
  'GRANT_SUB_ADMIN_PERMISSIONS', 'SUSPEND_SUB_ADMIN_ACCOUNT',
  'VIEW_USER_IP_HISTORY'
]);
const adminExpected = (key) =>
  ADMIN_DENIED_AT_RULES.has(key) ? 'deny' : 'allow';

const matrix = [
  { name: 'مالك', db: owner, expect: 'allow' },
  { name: 'مصرّح', db: adminA, expect: 'byKey' },
  { name: 'غير مصرّح', db: adminB, expect: 'deny' },
  { name: 'مستخدم', db: user, expect: 'deny' },
  { name: 'زائر', db: visitor, expect: 'deny' },
];

for (const key of PHASE1_APPROVED) {
  for (const role of matrix) {
    // مستند إعلان فريد لكل صف + إعادة تهيئة الهدف (تجنّب إعادة إنشاء معرّف بعد حذفه).
    AD_ID = `ad-${key}-${role.name}`;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'haraj_ads', AD_ID), { title: 'x', price: 1, status: 'pending', userId: 'uid-third' });
      await setDoc(doc(db, 'users', 'uid-target'), { email: 'target@example.com', role: 'user' });
      await setDoc(doc(db, 'rbac', 'uid-target'), { suspended: false, grants: {} });
      // USER استلم HARAJ_POST_DELETE في القسم 1 (اختبار منع المنح الذاتي) — نعيده فارغاً.
      await setDoc(doc(db, 'rbac', USER), { suspended: false, grants: {} });
    });
    const label = `${key} — ${role.name}`;
    const p = probe[key](role.db);
    if (role.expect === 'allow') {
      await expectAllow(label, p);
    } else if (role.expect === 'byKey') {
      if (adminExpected(key) === 'allow') await expectAllow(label, p);
      else await expectDeny(label, p);
    } else {
      await expectDeny(label, p);
    }
  }
}

// ============ 18) سجل التدقيق: عدم القابلية للتعديل + تسجيل المخالفات ============
console.log('\n=== 18) سجل التدقيق (append-only) وتسجيل المخالفات ===');
const logAdminA = testEnv.authenticatedContext(ADMIN_A, { email: ADMIN_A_EMAIL, email_verified: true }).firestore();
await expectAllow('مشرف مصرّح يكتب سجل تدقيق (create فقط)', setDoc(doc(logAdminA, 'audit_logs', 'mt-1'), {
  action: 'PERMISSION_VIOLATION', actorUid: ADMIN_A, result: 'denied', targetType: 'server', targetId: 'x',
}));
await expectDeny('سجل التدقيق لا يُعدّل بعد الإنشاء', updateDoc(doc(logAdminA, 'audit_logs', 'mt-1'), { result: 'forged' }));
await expectDeny('سجل التدقيق لا يُحذف (حتى من منشئه)', deleteDoc(doc(logAdminA, 'audit_logs', 'mt-1')));
await expectDeny('سجل التدقيق لا يُعدّل حتى من المالك', updateDoc(doc(owner, 'audit_logs', 'mt-1'), { result: 'forged' }));
await expectDeny('سجل التدقيق لا يُحذف حتى من المالك (append-only مطلق)', deleteDoc(doc(owner, 'audit_logs', 'mt-1')));
await expectDeny('سجل التدقيق لا يُحذف من مشرف مصرّح', deleteDoc(doc(logAdminA, 'audit_logs', 'mt-1')));
await expectDeny('سجل التدقيق لا يُعدّل من مشرف مصرّح', updateDoc(doc(logAdminA, 'audit_logs', 'mt-1'), { result: 'forged' }));

// ============ 19) حراج: المخالفات تُسجَّل وتظهر للمالك ============
console.log('\n=== 19) حراج: تسجيل المخالفات وظهورها للمالك ===');
const attacker = testEnv.authenticatedContext(uid('attacker'), { email: 'attacker@example.com', email_verified: true }).firestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', uid('attacker')), { email: 'attacker@example.com', role: 'user' });
});
await expectAllow('المستخدم المخالف يسجّل محاولته في audit_logs', setDoc(doc(attacker, 'audit_logs', 'att-1'), {
  action: 'HARAJ_POST_DELETE', permissionKey: 'HARAJ_POST_DELETE', actorUid: uid('attacker'),
  targetType: 'haraj_ad', targetId: 'ad-m', result: 'denied',
}));
await expectDeny('المستخدم المخالف لا يستطيع حذف إعلان غيره (مخالفة)', deleteDoc(doc(attacker, 'haraj_ads', 'ad-m')));
await expectAllow('المالك يقرأ سجل المخالفة', getDoc(doc(owner, 'audit_logs', 'att-1')));
await expectDeny('المستخدم المخالف لا يقرأ سجله', getDoc(doc(attacker, 'audit_logs', 'att-1')));

// ============ 20) المرحلة الثانية: البلاغات/التنبيهات/التقييمات/البنرات/التصنيفات/فصل الكتالوج/INLINE ============
console.log('\n=== 20) المرحلة الثانية: صلاحيات المحتوى والتواصل ===');
const PH2 = uid('phase2-admin');
const ph2 = testEnv.authenticatedContext(PH2, { email: 'phase2@example.com', email_verified: true }).firestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', PH2), { email: 'phase2@example.com', role: 'admin' });
  await setDoc(doc(db, 'rbac', PH2), {
    suspended: false,
    grants: {
      MANAGE_REPORTS: true,
      MANAGE_NOTIFICATIONS: true,
      MANAGE_REVIEWS: true,
      MANAGE_SITE_BANNERS: true,
      MANAGE_CATEGORIES: true,
      EDIT_CATALOG_PRICING: true,
    },
  });
  await setDoc(doc(db, 'reports', 'rep-1'), { reason: 'بلاغ تجريبي', status: 'pending', reporterId: USER });
  await setDoc(doc(db, 'reviews', 'rev-1'), { productId: 'p1', rating: 5, text: 'جيد' });
  await setDoc(doc(db, 'banners', 'ban-1'), { title: 'بنر', image: 'x', active: true });
  await setDoc(doc(db, 'categories', 'cat-1'), { name: 'تصنيف' });
  await setDoc(doc(db, 'products', 'prod-1'), { name: 'منتج', price: 100, tags: [] });
  await setDoc(doc(db, 'notifications', 'ntf-1'), { title: 'تنبيه', read: false });
  // مشرف بلا صلاحيات المرحلة الثانية
  await setDoc(doc(db, 'rbac', ADMIN_B), { suspended: false, grants: {} });
});

// MANAGE_REPORTS — عرض/تغيير الحالة/سبب المعالجة
await expectAllow('MANAGE_REPORTS: المصرّح يقرأ البلاغات', getDoc(doc(ph2, 'reports', 'rep-1')));
await expectAllow('MANAGE_REPORTS: المصرّح يغيّر الحالة', updateDoc(doc(ph2, 'reports', 'rep-1'), { status: 'resolved', resolutionNote: 'تم', handledBy: 'x', handledAt: new Date() }));
await expectDeny('MANAGE_REPORTS: المصرّح لا يزور محتوى البلاغ', updateDoc(doc(ph2, 'reports', 'rep-1'), { reason: 'مزوّر' }));
await expectDeny('MANAGE_REPORTS: غير المصرّح مرفوض (read)', getDoc(doc(adminB, 'reports', 'rep-1')));
await expectDeny('MANAGE_REPORTS: غير المصرّح مرفوض (update)', updateDoc(doc(adminB, 'reports', 'rep-1'), { status: 'resolved' }));
await expectDeny('MANAGE_REPORTS: المستخدم مرفوض', getDoc(doc(user, 'reports', 'rep-1')));
await expectDeny('MANAGE_REPORTS: الزائر مرفوض', getDoc(doc(visitor, 'reports', 'rep-1')));
await expectAllow('MANAGE_REPORTS: المالك مسموح', getDoc(doc(owner, 'reports', 'rep-1')));

// MANAGE_NOTIFICATIONS
await expectAllow('MANAGE_NOTIFICATIONS: المصرّح يقرأ التنبيهات', getDoc(doc(ph2, 'notifications', 'ntf-1')));
await expectAllow('MANAGE_NOTIFICATIONS: المصرّح يعدّل تنبيهاً', updateDoc(doc(ph2, 'notifications', 'ntf-1'), { read: true }));
await expectDeny('MANAGE_NOTIFICATIONS: غير المصرّح لا يقرأ', getDoc(doc(adminB, 'notifications', 'ntf-1')));
await expectDeny('MANAGE_NOTIFICATIONS: غير المصرّح لا يعدّل', updateDoc(doc(adminB, 'notifications', 'ntf-1'), { read: true }));
await expectAllow('MANAGE_NOTIFICATIONS: المالك مسموح', getDoc(doc(owner, 'notifications', 'ntf-1')));

// MANAGE_REVIEWS
await expectAllow('MANAGE_REVIEWS: المصرّح يخفي تقييماً', updateDoc(doc(ph2, 'reviews', 'rev-1'), { hidden: true, publicSafe: false, moderationReason: 'مخالف', moderatedBy: 'x', moderatedAt: new Date() }));
await expectDeny('MANAGE_REVIEWS: المصرّح لا يغيّر نص التقييم', updateDoc(doc(ph2, 'reviews', 'rev-1'), { text: 'مزوّر' }));
await expectDeny('MANAGE_REVIEWS: غير المصرّح مرفوض', updateDoc(doc(adminB, 'reviews', 'rev-1'), { hidden: true }));
await expectAllow('MANAGE_REVIEWS: المالك مسموح', updateDoc(doc(owner, 'reviews', 'rev-1'), { hidden: false, publicSafe: true }));

// MANAGE_SITE_BANNERS (كان مربوطاً خطأً بـMANAGE_NAVIGATION_MENU)
await expectAllow('MANAGE_SITE_BANNERS: المصرّح ينشئ بنراً', setDoc(doc(ph2, 'banners', 'ban-2'), { title: 'بنر2', image: 'y' }));
await expectDeny('MANAGE_SITE_BANNERS: غير المصرّح مرفوض', setDoc(doc(adminB, 'banners', 'ban-3'), { title: 'بنر3', image: 'z' }));
await expectDeny('MANAGE_SITE_BANNERS: الزائر مرفوض', setDoc(doc(visitor, 'banners', 'ban-4'), { title: 'بنر4', image: 'w' }));
await expectAllow('MANAGE_SITE_BANNERS: المالك مسموح', setDoc(doc(owner, 'banners', 'ban-5'), { title: 'بنر5', image: 'v' }));

// MANAGE_CATEGORIES (مفتاح مستقل عن صلاحيات الكتالوج)
await expectAllow('MANAGE_CATEGORIES: المصرّح ينشئ تصنيفاً', setDoc(doc(ph2, 'categories', 'cat-2'), { name: 'تصنيف2' }));
await expectDeny('MANAGE_CATEGORIES: غير المصرّح مرفوض', setDoc(doc(adminB, 'categories', 'cat-3'), { name: 'تصنيف3' }));
await expectDeny('MANAGE_CATEGORIES: الزائر مرفوض', setDoc(doc(visitor, 'categories', 'cat-4'), { name: 'تصنيف4' }));
await expectAllow('MANAGE_CATEGORIES: المالك مسموح', setDoc(doc(owner, 'categories', 'cat-5'), { name: 'تصنيف5' }));

// فصل صلاحيات الكتالوج: EDIT_CATALOG_PRICING لا تمنح CREATE/DELETE/الوسوم
await expectDeny('فصل الكتالوج: صاحب PRICING لا ينشئ منتجاً (CREATE مرفوض)', setDoc(doc(ph2, 'products', 'prod-2'), { name: 'منتج2', price: 1 }));
await expectDeny('فصل الكتالوج: صاحب PRICING لا يحذف منتجاً (DELETE مرفوض)', deleteDoc(doc(ph2, 'products', 'prod-1')));
await expectAllow('فصل الكتالوج: صاحب PRICING يعدّل السعر', updateDoc(doc(ph2, 'products', 'prod-1'), { price: 150 }));
await expectDeny('فصل الكتالوج: صاحب PRICING لا يعدّل حقلاً غير مسموح (name)', updateDoc(doc(ph2, 'products', 'prod-1'), { name: 'مزوّر' }));
await expectDeny('فصل الكتالوج: صاحب PRICING لا يعدّل وسوماً (MANAGE_CATALOG_TAGS مرفوض)', updateDoc(doc(ph2, 'products', 'prod-1'), { tags: ['x'] }));

// INLINE: كل مفتاح يحمي عمليته فقط — perm يُقرأ من الوثيقة. نبدأ بوثيقة فارغة.
const INLINE_ADMIN = uid('inline-color');
const inlineColor = testEnv.authenticatedContext(INLINE_ADMIN, { email: 'ic@example.com', email_verified: true }).firestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', INLINE_ADMIN), { email: 'ic@example.com', role: 'admin' });
  await setDoc(doc(ctx.firestore(), 'rbac', INLINE_ADMIN), { suspended: false, grants: { INLINE_STYLE_COLOR: true } });
  await setDoc(doc(ctx.firestore(), 'settings', 'inlineStyles'), { styles: {} });
});
await expectDeny('INLINE مفصول: بلا حقل perm مرفوض', setDoc(doc(inlineColor, 'settings', 'inlineStyles'), { styles: {} }, { merge: true }));
await expectAllow('INLINE مفصول: صاحب COLOR يحفظ تغيير لون', setDoc(doc(inlineColor, 'settings', 'inlineStyles'), { styles: {}, perm: 'INLINE_STYLE_COLOR' }, { merge: true }));
await expectDeny('INLINE مفصول: صاحب COLOR لا يحفظ تعديل خط (مفتاح آخر)', setDoc(doc(inlineColor, 'settings', 'inlineStyles'), { styles: {}, perm: 'INLINE_FONT_CUSTOMIZE' }, { merge: true }));
await expectDeny('INLINE مفصول: صاحب COLOR لا يحفظ إخفاء عنصر (مفتاح آخر)', setDoc(doc(inlineColor, 'settings', 'inlineStyles'), { styles: {}, perm: 'INLINE_ELEMENT_DELETE' }, { merge: true }));
await expectDeny('INLINE مفصول: غير المصرّح مرفوض', setDoc(doc(adminB, 'settings', 'inlineStyles'), { styles: {}, perm: 'INLINE_STYLE_COLOR' }, { merge: true }));
await expectAllow('INLINE مفصول: المالك مسموح', setDoc(doc(owner, 'settings', 'inlineStyles'), { styles: {}, perm: 'INLINE_STYLE_COLOR' }, { merge: true }));

// الصلاحيات المعطّلة نهائياً: لا تُمنح ولا تنفّذ حتى لو كُتبت في الوثيقة
const BYPASS_ADMIN = uid('bypass-attempt');
const bypass = testEnv.authenticatedContext(BYPASS_ADMIN, { email: 'bp@example.com', email_verified: true }).firestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users', BYPASS_ADMIN), { email: 'bp@example.com', role: 'admin' });
  await setDoc(doc(ctx.firestore(), 'rbac', BYPASS_ADMIN), {
    suspended: false,
    grants: { BYPASS_FIREBASE_RULES: true, CODE_SNIPPET_INJECTION: true, UPDATE_GLOBAL_SETTINGS: true },
  });
});
await expectDeny('معطّلة: BYPASS_FIREBASE_RULES في الوثيقة لا يفتح settings/snippets', setDoc(doc(bypass, 'settings', 'snippets'), { code: 'x' }, { merge: true }));
await expectAllow('معطّلة: بقية صلاحيات الحساب تعمل (UPDATE_GLOBAL_SETTINGS)', setDoc(doc(bypass, 'settings', 'store'), { a: 1 }, { merge: true }));

// ============ 21) تعليقات الحراج: الاعتماد والتعديل والحذف الحقيقي والأرشفة ============
console.log('\n=== 21) تعليقات الحراج: الاعتماد/التعديل/الحذف والأرشفة ===');
const CM_EDIT = uid('comment-editor');
const CM_DELETE = uid('comment-deleter');
const cmEdit = testEnv.authenticatedContext(CM_EDIT, { email: 'ce@example.com', email_verified: true }).firestore();
const cmDelete = testEnv.authenticatedContext(CM_DELETE, { email: 'cd@example.com', email_verified: true }).firestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', CM_EDIT), { email: 'ce@example.com', role: 'admin' });
  await setDoc(doc(db, 'users', CM_DELETE), { email: 'cd@example.com', role: 'admin' });
  await setDoc(doc(db, 'rbac', CM_EDIT), { suspended: false, grants: { HARAJ_COMMENT_EDIT: true } });
  await setDoc(doc(db, 'rbac', CM_DELETE), { suspended: false, grants: { HARAJ_COMMENT_DELETE: true } });
  await setDoc(doc(db, 'comments', 'cm-1'), { text: 'تعليق', status: 'pending', publicSafe: true });
  await setDoc(doc(db, 'comments', 'cm-2'), { text: 'تعليق2', status: 'pending', publicSafe: true });
  await setDoc(doc(db, 'comments', 'cm-3'), { text: 'تعليق3', status: 'pending', publicSafe: true });
});
// الزائر ينشئ تعليقاً بحالة pending فقط (لا ينشره فوراً) وبعلامة publicSafe
await expectAllow('تعليق: الزائر ينشئ تعليقاً pending', setDoc(doc(visitor, 'comments', 'cm-v'), { text: 'زائر', status: 'pending', publicSafe: true }));
await expectDeny('تعليق: الزائر لا ينشر تعليقاً معتمداً مباشرة', setDoc(doc(visitor, 'comments', 'cm-v2'), { text: 'زائر', status: 'approved', publicSafe: true }));
await expectDeny('تعليق: الزائر لا يكتب حقل email في المستند العام', setDoc(doc(visitor, 'comments', 'cm-v3'), { text: 'زائر', status: 'pending', publicSafe: true, email: 'leak@x.com' }));
await expectDeny('تعليق: إنشاء تعليق بلا publicSafe مرفوض', setDoc(doc(visitor, 'comments', 'cm-v4'), { text: 'زائر', status: 'pending' }));
// صاحب HARAJ_COMMENT_EDIT يعتمد (تغيير الحالة فقط)
await expectAllow('تعليق: صاحب EDIT يعتمد تعليقاً', updateDoc(doc(cmEdit, 'comments', 'cm-1'), { status: 'approved' }));
await expectDeny('تعليق: صاحب EDIT لا يمسح نص التعليق', updateDoc(doc(cmEdit, 'comments', 'cm-1'), { text: 'مزوّر' }));
await expectDeny('تعليق: صاحب EDIT لا يحذف', deleteDoc(doc(cmEdit, 'comments', 'cm-2')));
// صاحب HARAJ_COMMENT_DELETE يحذف فعلاً (حذف حقيقي) ويؤرشف في deleted_archive
await expectAllow('تعليق: صاحب DELETE يؤرشف التعليق', setDoc(doc(cmDelete, 'deleted_archive', 'cm-arch-1'), { sourceCollection: 'comments', sourceId: 'cm-2', payload: { text: 'تعليق2' }, deletedAt: new Date() }));
await expectAllow('تعليق: صاحب DELETE يحذف التعليق فعلاً', deleteDoc(doc(cmDelete, 'comments', 'cm-2')));
await expectDeny('تعليق: غير المصرّح لا يحذف', deleteDoc(doc(adminB, 'comments', 'cm-3')));
await expectDeny('تعليق: الزائر لا يحذف', deleteDoc(doc(visitor, 'comments', 'cm-3')));
await expectAllow('تعليق: المالك يحذف', deleteDoc(doc(owner, 'comments', 'cm-3')));

// ============ 22) خصوصية التقييمات: منع المخفي وبيانات التعريف للعام ============
console.log('\n=== 22) خصوصية التقييمات: المخفي والبيانات الشخصية ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  // المنشور النظيف: publicSafe == true
  await setDoc(doc(db, 'reviews', 'rev-pub'), { productId: 'p1', rating: 5, text: 'تقييم منشور', publicSafe: true });
  // مخفي: العلامة مُبطلة
  await setDoc(doc(db, 'reviews', 'rev-hidden'), { productId: 'p1', rating: 1, text: 'تقييم مخفي', hidden: true, publicSafe: false, moderationReason: 'مخالف' });
  // مستند قديم يحمل بريداً ولا يحمل العلامة → لا يُقرأ علناً
  await setDoc(doc(db, 'reviews', 'rev-pii'), { productId: 'p1', rating: 4, text: 'تقييم يحمل بريداً', hidden: false, userEmail: 'customer.private@example.com' });
  await setDoc(doc(db, 'review_private', 'rev-priv'), { productId: 'p1', ownerUid: USER, userEmail: 'customer.private@example.com', userId: USER });
  await setDoc(doc(db, 'review_private', 'rev-other'), { productId: 'p1', ownerUid: VICTIM, userEmail: 'victim.private@example.com', userId: VICTIM });
});
// السماح: التقييم المنشور النظيف يُقرأ للزائر والمستخدم
await expectAllow('تقييم: الزائر يقرأ التقييم المنشور', getDoc(doc(visitor, 'reviews', 'rev-pub')));
await expectAllow('تقييم: المستخدم يقرأ التقييم المنشور', getDoc(doc(user, 'reviews', 'rev-pub')));
// الرفض: المخفي لا يُقرأ للزائر/المستخدم
await expectDeny('تقييم: الزائر لا يقرأ التقييم المخفي', getDoc(doc(visitor, 'reviews', 'rev-hidden')));
await expectDeny('تقييم: المستخدم لا يقرأ التقييم المخفي', getDoc(doc(user, 'reviews', 'rev-hidden')));
// الرفض: المستند القديم الحامل لبيانات شخصية لا يُقرأ علناً (لا يحمل publicSafe)
await expectDeny('تقييم: الزائر لا يقرأ مستنداً يحمل userEmail', getDoc(doc(visitor, 'reviews', 'rev-pii')));
await expectDeny('تقييم: المستخدم لا يقرأ مستنداً يحمل userEmail', getDoc(doc(user, 'reviews', 'rev-pii')));
// السماح: المالك وصاحب MANAGE_REVIEWS يقرآن المخفي وكل الحالات
await expectAllow('تقييم: المالك يقرأ التقييم المخفي', getDoc(doc(owner, 'reviews', 'rev-hidden')));
await expectAllow('تقييم: صاحب MANAGE_REVIEWS يقرأ التقييم المخفي', getDoc(doc(ph2, 'reviews', 'rev-hidden')));
await expectAllow('تقييم: صاحب MANAGE_REVIEWS يقرأ مستند البريد', getDoc(doc(ph2, 'reviews', 'rev-pii')));
// review_private: البريد المفصول للمالك/المشرف فقط
await expectDeny('تقييم خاص: الزائر لا يقرأ review_private', getDoc(doc(visitor, 'review_private', 'rev-priv')));
await expectDeny('تقييم خاص: المستخدم لا يقرأ سجل مستخدم آخر', getDoc(doc(user, 'review_private', 'rev-other')));
await expectAllow('تقييم خاص: صاحب MANAGE_REVIEWS يقرأ review_private', getDoc(doc(ph2, 'review_private', 'rev-priv')));
await expectAllow('تقييم خاص: المالك يقرأ review_private', getDoc(doc(owner, 'review_private', 'rev-priv')));
// ربط الملكية: صاحب السجل يقرأ سجله الخاص
await expectAllow('تقييم خاص: صاحب التقييم يقرأ سجله الخاص', getDoc(doc(user, 'review_private', 'rev-priv')));
// ربط الملكية: لا إنشاء سجل خاص باسم مستخدم آخر
await expectDeny('تقييم خاص: لا إنشاء سجل بمعرّف مستخدم آخر', setDoc(doc(user, 'review_private', 'rev-forge'), { ownerUid: VICTIM, productId: 'p1', userEmail: 'x@y.com' }));
await expectDeny('تقييم خاص: لا إنشاء سجل بلا ownerUid', setDoc(doc(user, 'review_private', 'rev-nouid'), { productId: 'p1', userEmail: 'x@y.com' }));
await expectAllow('تقييم خاص: العضو ينشئ سجله الخاص بمعرّفه', setDoc(doc(user, 'review_private', 'rev-own'), { ownerUid: USER, productId: 'p1', userEmail: 'me@example.com' }));
// ربط الملكية: لا تغيير ownerUid لاحقاً (منع نقل الملكية)
await expectDeny('تقييم خاص: لا يمكن تغيير مالك السجل', updateDoc(doc(user, 'review_private', 'rev-own'), { ownerUid: VICTIM }));
// الاستعلام عن المجموعة محميّ: الشرط publicSafe مُلزَم في الاستعلام
await expectAllow('تقييم: استعلام الزائر يجلب المنشور النظيف فقط (publicSafe==true)',
  getDocs(query(collection(visitor, 'reviews'), where('productId', '==', 'p1'), where('publicSafe', '==', true))));
await expectDeny('تقييم: استعلام الزائر لا يجلب المخفي (publicSafe==false)',
  getDocs(query(collection(visitor, 'reviews'), where('publicSafe', '==', false))));
await expectDeny('تقييم: استعلام الزائر لا يجلب مستنداً بلا العلامة (فلتر productId فقط)',
  getDocs(query(collection(visitor, 'reviews'), where('productId', '==', 'p1'))));
await expectDeny('تقييم خاص: استعلام المستخدم لا يجلب review_private',
  getDocs(query(collection(user, 'review_private'), where('productId', '==', 'p1'))));
await expectAllow('تقييم خاص: استعلام المالك يجلب review_private',
  getDocs(query(collection(owner, 'review_private'), where('productId', '==', 'p1'))));
// الإنشاء: يُلزَم publicSafe، ولا يُقبل تقييم يحمل بريداً
await expectDeny('تقييم: إنشاء تقييم يحمل userEmail مرفوض', setDoc(doc(user, 'reviews', 'rev-new-pii'), { productId: 'p1', rating: 5, text: 'x', publicSafe: true, userEmail: 'x@y.com' }));
await expectDeny('تقييم: إنشاء تقييم بلا publicSafe مرفوض', setDoc(doc(user, 'reviews', 'rev-new-nosafe'), { productId: 'p1', rating: 5, text: 'x' }));
await expectDeny('تقييم: إنشاء تقييم بـ publicSafe=false مرفوض', setDoc(doc(user, 'reviews', 'rev-new-false'), { productId: 'p1', rating: 5, text: 'x', publicSafe: false }));
await expectDeny('تقييم: إنشاء تقييم بحقل ownerUid مرفوض', setDoc(doc(user, 'reviews', 'rev-new-uid'), { productId: 'p1', rating: 5, text: 'x', publicSafe: true, ownerUid: VICTIM }));
await expectAllow('تقييم: إنشاء تقييم نظيف مسموح', setDoc(doc(user, 'reviews', 'rev-new-ok'), { productId: 'p1', rating: 5, text: 'x', publicSafe: true }));
// الإخفاء يُلزم إبطال العلامة (وإلا بقي المخفي مقروءاً عبر الاستعلام)
await expectDeny('تقييم: الإخفاء دون إبطال publicSafe مرفوض', updateDoc(doc(ph2, 'reviews', 'rev-pub'), { hidden: true }));
await expectAllow('تقييم: الإخفاء مع إبطال publicSafe مسموح', updateDoc(doc(ph2, 'reviews', 'rev-pub'), { hidden: true, publicSafe: false }));

// ============ 23) قراءة التعليقات: المعتمد فقط للعام ============
console.log('\n=== 23) قراءة التعليقات: المعتمد فقط للعام ===');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'comments', 'cm-appr'), { text: 'معتمد', status: 'approved', publicSafe: true });
  await setDoc(doc(db, 'comments', 'cm-pend'), { text: 'قيد المراجعة', status: 'pending', publicSafe: true });
  // تعليق قديم معتمد يحمل بريداً في المستند العام (لا يحمل publicSafe) → تسريب
  await setDoc(doc(db, 'comments', 'cm-leak'), { text: 'قديم', status: 'approved', email: 'leak@x.com' });
  await setDoc(doc(db, 'comment_private', 'cm-appr'), { email: 'author@example.com' });
});
await expectAllow('تعليق: الزائر المجهول يقرأ التعليق المعتمد', getDoc(doc(guest, 'comments', 'cm-appr')));
await expectAllow('تعليق: المستخدم يقرأ التعليق المعتمد', getDoc(doc(user, 'comments', 'cm-appr')));
await expectDeny('تعليق: الزائر المجهول لا يقرأ التعليق المعلّق', getDoc(doc(guest, 'comments', 'cm-pend')));
await expectDeny('تعليق: المستخدم لا يقرأ التعليق المعلّق', getDoc(doc(user, 'comments', 'cm-pend')));
await expectDeny('تعليق: جلسة غير مصادقة لا تقرأ التعليق المعتمد', getDoc(doc(visitor, 'comments', 'cm-appr')));
// إغلاق تسريب البريد: تعليق قديم معتمد يحمل email في المستند العام لا يُقرأ علناً
await expectDeny('تعليق: الزائر لا يقرأ تعليقاً قديماً يحمل بريداً', getDoc(doc(guest, 'comments', 'cm-leak')));
await expectDeny('تعليق: المستخدم لا يقرأ تعليقاً قديماً يحمل بريداً', getDoc(doc(user, 'comments', 'cm-leak')));
// comment_private: البريد للصلاحيات المخوّلة فقط
await expectDeny('تعليق خاص: الزائر لا يقرأ comment_private', getDoc(doc(guest, 'comment_private', 'cm-appr')));
await expectDeny('تعليق خاص: المستخدم لا يقرأ comment_private', getDoc(doc(user, 'comment_private', 'cm-appr')));
await expectAllow('تعليق خاص: صاحب EDIT يقرأ comment_private', getDoc(doc(cmEdit, 'comment_private', 'cm-appr')));
await expectAllow('تعليق خاص: المالك يقرأ comment_private', getDoc(doc(owner, 'comment_private', 'cm-appr')));
// لوحة المراجعة تقرأ المجموعة كاملة: نتأكد أن استعلام القائمة نفسه مسموح للمخوّلين فقط
await expectAllow('تعليق خاص: صاحب EDIT يستعلم كل comment_private',
  getDocs(collection(cmEdit, 'comment_private')));
await expectAllow('تعليق خاص: المالك يستعلم كل comment_private',
  getDocs(collection(owner, 'comment_private')));
await expectDeny('تعليق خاص: الزائر لا يستعلم comment_private',
  getDocs(collection(guest, 'comment_private')));
await expectDeny('تعليق خاص: المستخدم لا يستعلم comment_private',
  getDocs(collection(user, 'comment_private')));
await expectAllow('تعليق: صاحب HARAJ_COMMENT_EDIT يقرأ المعلّق', getDoc(doc(cmEdit, 'comments', 'cm-pend')));
await expectAllow('تعليق: المالك يقرأ المعلّق', getDoc(doc(owner, 'comments', 'cm-pend')));
// استعلام المجموعة: يشترط status==approved و publicSafe==true ليعكس شرط القاعدة
await expectAllow('تعليق: استعلام الزائر يجلب المعتمد الآمن فقط',
  getDocs(query(collection(guest, 'comments'), where('status', '==', 'approved'), where('publicSafe', '==', true))));
await expectDeny('تعليق: استعلام الزائر بلا فلتر مرفوض',
  getDocs(collection(guest, 'comments')));
await expectDeny('تعليق: استعلام الزائر بالحالة فقط (بلا publicSafe) مرفوض',
  getDocs(query(collection(guest, 'comments'), where('status', '==', 'approved'))));
await expectDeny('تعليق: استعلام الزائر لغير المعتمد مرفوض',
  getDocs(query(collection(guest, 'comments'), where('status', '==', 'pending'))));
await expectAllow('تعليق: صاحب EDIT يستعلم كل الحالات',
  getDocs(collection(cmEdit, 'comments')));

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
