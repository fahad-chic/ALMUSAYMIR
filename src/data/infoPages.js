// src/data/infoPages.js
// بيانات صفحات المحتوى المستقلة (وظائفنا / شركاؤنا / الخصوصية).
// الجوال يُشتق من CONTACT_INFO (قابل للتغيير عبر متغيّرات البيئة) بصيغة محلية 05xxxxxxxx.
import { CONTACT_INFO } from '../utils/constants';

// يحوّل 9665xxxxxxxx أو 009665xxxxxxxx إلى الصيغة المحلية 05xxxxxxxx.
export const toLocalPhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  const withoutCountry = digits.startsWith('00966')
    ? digits.slice(5)
    : digits.startsWith('966')
      ? digits.slice(3)
      : digits;
  return withoutCountry.startsWith('0')
    ? withoutCountry
    : `0${withoutCountry}`;
};

// الرقم المحلي الرسمي المعروض في الصفحات (قابل للضبط من VITE_PHONE_1).
export const INFO_PHONE_LOCAL = toLocalPhone(
  CONTACT_INFO.PHONE_1 || '966536667222'
);

export const INFO_PHONE_TEL = `+${String(CONTACT_INFO.PHONE_1 || '966536667222').replace(/\D/g, '')}`;

export const INFO_CONTACTS = Object.freeze({
  careers: 'careers@almusaymir.com',
  partners: 'partners@almusaymir.com',
  privacy: 'privacy@almusaymir.com',
});
