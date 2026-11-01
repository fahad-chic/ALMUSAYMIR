// src/permissions/logic.test.js — اختبارات منطق الصلاحيات المجهرية
import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_CATEGORIES,
  DEFERRED_PERMISSION_KEYS,
  isValidPermissionKey,
  permissionsByCategory
} from './catalog';
import { computeEffectiveGrants, sanitizeGrants, countGranted } from './logic';

describe('كتالوج الصلاحيات', () => {
  it('يحوي 47 صلاحية بالضبط موزعة على 7 أقسام', () => {
    expect(PERMISSIONS).toHaveLength(47);
    expect(PERMISSION_CATEGORIES).toHaveLength(7);
    const sum = PERMISSION_CATEGORIES.reduce(
      (n, c) => n + permissionsByCategory(c.id).length, 0
    );
    expect(sum).toBe(47);
  });

  it('كل مفاتيح الصلاحيات فريدة', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(47);
  });

  it('كل مفاتيح المرحلة الأولى المعتمدة (23) موجودة في الكتالوج', () => {
    const PHASE_1_APPROVED_KEYS = [
      'SUPER_ADMIN_FULL_ACCESS', 'UPDATE_GLOBAL_SETTINGS', 'TOGGLE_MAINTENANCE_MODE',
      'BAN_USER_TEMPORARY', 'BAN_USER_PERMANENT', 'UNBAN_USER_RESTORE',
      'FORCE_LOGOUT_SESSION', 'BLOCK_USER_REGISTRATION', 'MANAGE_USER_VERIFICATION',
      'VIEW_USER_IP_HISTORY',
      'HARAJ_POST_APPROVE', 'HARAJ_POST_DELETE', 'HARAJ_POST_RESTORE', 'TRANSFER_POST_OWNERSHIP',
      'ADD_NEW_EMPLOYEE', 'EDIT_EMPLOYEE_PROFILE', 'GRANT_SUB_ADMIN_PERMISSIONS',
      'SUSPEND_SUB_ADMIN_ACCOUNT', 'TRACK_EMPLOYEE_LIVE_SESSIONS',
      'VIEW_SYSTEM_AUDIT_LOGS', 'FIREBASE_MUTATION_LOGS', 'TRACK_FAILED_LOGINS',
      'RECOVER_DELETED_ITEMS_ARCHIVE'
    ];
    expect(PHASE_1_APPROVED_KEYS).toHaveLength(23);
    for (const key of PHASE_1_APPROVED_KEYS) {
      expect(isValidPermissionKey(key), `مفتاح مفقود: ${key}`).toBe(true);
    }
  });

  it('VIEW_EMPLOYEE_SALARIES مصنّفة مؤجلة وتبقى في الكتالوج', () => {
    expect(DEFERRED_PERMISSION_KEYS.has('VIEW_EMPLOYEE_SALARIES')).toBe(true);
    expect(isValidPermissionKey('VIEW_EMPLOYEE_SALARIES')).toBe(true);
  });

  it('isValidPermissionKey يقبل المفاتيح المعروفة فقط', () => {
    expect(isValidPermissionKey('SUPER_ADMIN_FULL_ACCESS')).toBe(true);
    expect(isValidPermissionKey('INLINE_ELEMENT_DELETE')).toBe(true);
    expect(isValidPermissionKey('HACK_EVERYTHING')).toBe(false);
    expect(isValidPermissionKey('')).toBe(false);
  });
});

describe('computeEffectiveGrants', () => {
  it('المالك يملك كل الصلاحيات دائماً ولا يمكن تجميده', () => {
    const { grants, suspended, isOwner } = computeEffectiveGrants({
      role: 'owner',
      rbacDoc: { suspended: true, grants: {} }
    });
    expect(isOwner).toBe(true);
    expect(suspended).toBe(false);
    expect(countGranted(grants)).toBe(47);
  });

  it('المستخدم العادي بلا وثيقة rbac لا يملك شيئاً', () => {
    const { grants } = computeEffectiveGrants({ role: 'user', rbacDoc: null });
    expect(countGranted(grants)).toBe(0);
  });

  it('المنح الفردية تُفعَّل بدقة مجهرية', () => {
    const { grants } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { grants: { HARAJ_POST_APPROVE: true, INLINE_TEXT_EDIT: true } }
    });
    expect(grants.HARAJ_POST_APPROVE).toBe(true);
    expect(grants.INLINE_TEXT_EDIT).toBe(true);
    expect(grants.HARAJ_POST_DELETE).toBe(false);
    expect(countGranted(grants)).toBe(2);
  });

  it('SUPER_ADMIN_FULL_ACCESS يفتح كل الصلاحيات', () => {
    const { grants } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { grants: { SUPER_ADMIN_FULL_ACCESS: true } }
    });
    // صلاحيات المراقبة والخصوصية السبع محجوزة للمالك حتى مع
    // SUPER_ADMIN_FULL_ACCESS.
    // صلاحيات المراقبة والخصوصية السبع محجوزة للمالك، والصلاحية المؤجلة
    // (الرواتب) لا تُمنح لأي حساب غير المالك => 39 بدل 47.
    expect(countGranted(grants)).toBe(39);
    expect(grants.MONITOR_PRIVATE_MESSAGES).toBe(false);
    expect(grants.VIEW_SYSTEM_AUDIT_LOGS).toBe(false);
    expect(grants.VIEW_EMPLOYEE_SALARIES).toBe(false);
  });

  it('الصلاحية المؤجلة VIEW_EMPLOYEE_SALARIES لا تُمنح حتى لو كُتبت في الوثيقة', () => {
    const { grants } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { grants: { VIEW_EMPLOYEE_SALARIES: true } }
    });
    expect(grants.VIEW_EMPLOYEE_SALARIES).toBe(false);
    expect(countGranted(grants)).toBe(0);
  });

  it('التجميد يسحب كل الصلاحيات حتى SUPER_ADMIN', () => {
    const { grants, suspended } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { suspended: true, grants: { SUPER_ADMIN_FULL_ACCESS: true } }
    });
    expect(suspended).toBe(true);
    expect(countGranted(grants)).toBe(0);
  });

  it('الحظر (banned) يُصفّر كل الصلاحيات حتى مع وثيقة كاملة', () => {
    const { grants, suspended } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { banned: true, grants: { SUPER_ADMIN_FULL_ACCESS: true } }
    });
    expect(suspended).toBe(true);
    expect(countGranted(grants)).toBe(0);
  });

  it('القيم غير الصحيحة والمفاتيح المجهولة تُتجاهل', () => {
    const { grants } = computeEffectiveGrants({
      role: 'user',
      rbacDoc: { grants: { HARAJ_POST_DELETE: 'yes', EVIL_KEY: true, HARAJ_POST_RESTORE: true } }
    });
    expect(grants.HARAJ_POST_DELETE).toBe(false);
    expect(grants.HARAJ_POST_RESTORE).toBe(true);
    expect('EVIL_KEY' in grants).toBe(false);
  });
});

describe('sanitizeGrants', () => {
  it('يبقي المفاتيح المعروفة المفعّلة فقط', () => {
    const out = sanitizeGrants({
      BAN_USER_TEMPORARY: true,
      BAN_USER_PERMANENT: false,
      UNKNOWN: true,
      VIEW_USER_IP_HISTORY: 1
    });
    expect(out).toEqual({ BAN_USER_TEMPORARY: true });
  });

  it('يتحمل المدخلات الفاسدة', () => {
    expect(sanitizeGrants(null)).toEqual({});
    expect(sanitizeGrants('x')).toEqual({});
    expect(sanitizeGrants(undefined)).toEqual({});
  });
});