import { describe, it, expect } from 'vitest';
import { buildAdOwnerNotice } from './visitorNotify';

describe('buildAdOwnerNotice', () => {
  it('يُرسل عنوان إشعار واضحاً في كل الحالات', () => {
    const { title } = buildAdOwnerNotice({ title: 'ساعة رولكس' });
    expect(title).toBe('إعلان جديد في حراج المسيمير');
  });

  it('يتضمن اسم الناشر وهاتفه ومدينته وعنوان الإعلان', () => {
    const { body } = buildAdOwnerNotice({
      title: 'ساعة رولكس ذهبية',
      userName: 'فهد العتيبي',
      userPhone: '0501234567',
      userRegion: 'حفر الباطن',
    });
    expect(body).toContain('ساعة رولكس ذهبية');
    expect(body).toContain('فهد العتيبي');
    expect(body).toContain('0501234567');
    expect(body).toContain('حفر الباطن');
  });

  it('حذف أي بيانات ناقصة ولا يترك خانات فارغة في النص', () => {
    const { body } = buildAdOwnerNotice({ title: 'عباية' });
    expect(body).not.toContain('مدينة:');
    expect(body).not.toContain('غير محددة');
  });

  it('يرد البدائل النصية عند غياب الناشر أو الهاتف حتى يعرف المالك النقص', () => {
    const { body } = buildAdOwnerNotice({ title: 'تخت' });
    expect(body).toContain('الناشر: غير محدد');
    expect(body).toContain('الهاتف: بدون');
  });
});