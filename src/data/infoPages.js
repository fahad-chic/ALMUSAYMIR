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

// الرقم الثاني (احتياطي/واتساب) — للصفحات التي تعرض رقمين.
export const INFO_PHONE2_LOCAL = toLocalPhone(CONTACT_INFO.PHONE_2 || '966507882771');

export const INFO_PHONE2_TEL = `+${String(CONTACT_INFO.PHONE_2 || '966507882771').replace(/\D/g, '')}`;

// البريد الرسمي المعتمد للموقع (نفس بريد صفحة «تواصل معنا»).
export const INFO_CONTACTS = Object.freeze({
  careers: 'kal6667222@gmail.com',
  partners: 'kal6667222@gmail.com',
  privacy: 'kal6667222@gmail.com',
});
