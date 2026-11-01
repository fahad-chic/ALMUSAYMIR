// src/permissions/audit.test.js — اختبارات سجل التدقيق الموحّد (بنية actor/target/result)
import { describe, it, expect } from 'vitest';
import { buildAuditEvent } from './audit';

describe('buildAuditEvent — بنية التدقيق الإلزامية', () => {
  it('يحفظ الفاعل والهدف والنتيجة والإجراء', () => {
    const e = buildAuditEvent(
      {
        action: 'BAN_USER_PERMANENT',
        permissionKey: 'BAN_USER_PERMANENT',
        targetType: 'user',
        targetId: 'uid-9',
        result: 'success',
        details: 'حظر نهائي',
        severity: 'high',
      },
      { uid: 'owner-1', email: 'owner@example.com' }
    );

    expect(e.action).toBe('BAN_USER_PERMANENT');
    expect(e.permissionKey).toBe('BAN_USER_PERMANENT');
    expect(e.actorUid).toBe('owner-1');
    expect(e.actorEmail).toBe('owner@example.com');
    expect(e.targetType).toBe('user');
    expect(e.targetId).toBe('uid-9');
    expect(e.result).toBe('success');
    expect(e.severity).toBe('high');
  });

  it('يُطبّع النتائج غير الصحيحة إلى error', () => {
    expect(buildAuditEvent({ result: 'whatever' }).result).toBe('error');
    expect(buildAuditEvent({ result: 'denied' }).result).toBe('denied');
    expect(buildAuditEvent({ result: 'allowed' }).result).toBe('allowed');
  });

  it('يُطبّع الشدّة غير الصحيحة إلى info', () => {
    expect(buildAuditEvent({ severity: 'critical' }).severity).toBe('info');
    expect(buildAuditEvent({ severity: 'medium' }).severity).toBe('medium');
  });

  it('يتحمّل المدخلات الفارغة ويضع قيماً افتراضية آمنة', () => {
    const e = buildAuditEvent();
    expect(e.action).toBe('permission_event');
    expect(e.actorUid).toBeNull();
    expect(e.actorEmail).toBeNull();
    expect(e.targetId).toBe('');
    expect(e.result).toBe('success');
    expect(e.severity).toBe('info');
  });
});
