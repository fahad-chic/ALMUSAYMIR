// src/utils/archive.test.js — اختبارات أرشيف المحذوفات (بناء الوثيقة + القائمة البيضاء)
import { describe, it, expect } from 'vitest';
import { buildArchiveDoc, isArchivable, ARCHIVABLE_COLLECTIONS } from './archive';

describe('archive — بنية وثيقة الأرشيف', () => {
  it('يبني وثيقة بالحقول الإلزامية المطابقة لقاعدة Firestore', () => {
    const d = buildArchiveDoc('haraj_ads', 'ad-1', { title: 'x' }, {
      uid: 'owner-1',
      email: 'owner@example.com',
    });
    expect(d.sourceCollection).toBe('haraj_ads');
    expect(d.sourceId).toBe('ad-1');
    expect(d.payload).toEqual({ title: 'x' });
    expect(d.deletedByUid).toBe('owner-1');
    expect(d.restored).toBe(false);
    // deletedAt كائن serverTimestamp (وليس قيمة ثابتة)
    expect(d.deletedAt).toBeTruthy();
  });

  it('يرفض مجموعة غير قابلة للأرشفة', () => {
    expect(() => buildArchiveDoc('rbac', 'x', {})).toThrow();
    expect(() => buildArchiveDoc('users', 'x', {})).toThrow();
  });

  it('يرفض معرّفاً أو حمولة غير صالحة', () => {
    expect(() => buildArchiveDoc('haraj_ads', '', {})).toThrow();
    expect(() => buildArchiveDoc('haraj_ads', 'a', null)).toThrow();
    expect(() => buildArchiveDoc('haraj_ads', 'a', [])).toThrow();
  });

  it('القائمة البيضاء لا تتضمن مجموعات حساسة', () => {
    expect(isArchivable('haraj_ads')).toBe(true);
    expect(isArchivable('products')).toBe(true);
    expect(isArchivable('rbac')).toBe(false);
    expect(isArchivable('users')).toBe(false);
    expect(ARCHIVABLE_COLLECTIONS.has('audit_logs')).toBe(false);
  });
});
