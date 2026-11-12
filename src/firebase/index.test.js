import { describe, it, expect } from 'vitest';
import { isAdminEmail } from './index';

// الإيميلات المالكة تُقرأ من VITE_OWNER_EMAILS فقط (لا قيم احتياطية في الكود).
// الاختبار يتحقق أن القائمة المبنية من المتغير تعمل، وأن غير المالكين يُرفضون.
describe('isAdminEmail', () => {
  it('يقبل إيميلات المالك المبنية من متغيرات البيئة', () => {
    expect(isAdminEmail('f882771f@gmail.com')).toBe(true);
    expect(isAdminEmail('kal6667222@gmail.com')).toBe(true);
  });

  it('يجاهل حالة الأحرف والفراغات', () => {
    expect(isAdminEmail('  KAL6667222@GMAIL.COM ')).toBe(true);
  });

  it('يرفض غير المالكين', () => {
    expect(isAdminEmail('random@example.com')).toBe(false);
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
