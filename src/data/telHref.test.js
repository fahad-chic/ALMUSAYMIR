// اختبار بناء روابط tel: — الحالة التي كانت معطوبة: tel:+0536667222
import { describe, it, expect } from 'vitest';
import { toTelHref, INFO_PHONE_TEL, INFO_PHONE2_TEL } from './infoPages';

describe('toTelHref', () => {
  it('يحوّل الصيغة المحلية 05xxxxxxxx إلى E.164 بلا صفر', () => {
    expect(toTelHref('0536667222')).toBe('tel:+966536667222');
    expect(toTelHref('0507882771')).toBe('tel:+966507882771');
  });

  it('يقبل الصيغة الدولية 966xxxxxxxx و00966xxxxxxxx', () => {
    expect(toTelHref('966536667222')).toBe('tel:+966536667222');
    expect(toTelHref('00966536667222')).toBe('tel:+966536667222');
  });

  it('لا ينتج أبداً صيغة خاطئة مثل tel:+05…', () => {
    for (const raw of ['0536667222', '+0536667222', ' 053 666 7222 ', '00966536667222']) {
      const href = toTelHref(raw);
      expect(href).not.toMatch(/^tel:\+?0/);
      expect(href).toBe('tel:+966536667222');
    }
  });

  it('يتجاهل الفواصل والرموز', () => {
    expect(toTelHref('+966 (53) 666-7222')).toBe('tel:+966536667222');
  });

  it('الثوابت المشتقّة صحيحة', () => {
    expect(INFO_PHONE_TEL).toBe('tel:+966536667222');
    expect(INFO_PHONE2_TEL).toBe('tel:+966507882771');
  });
});
