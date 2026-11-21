// حارس ترتيب طبقات CSS للترويسة على الجوال.
// العطب الذي نمنعه: قاعدة `@media (max-width: 720px)` تضع `.rz-logo img { height: 38px }`
// وتأتي بعد قواعد 480px/400px في الملف، فتغلبها (نفس الأولوية) فيصير الشعار كبيراً
// والحشو 8px على شاشة 320px فتُدفع الأيقونة الرابعة خارج الشاشة.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(
  path.resolve(__dirname, 'alm-royal.css'),
  'utf8'
);

// يستخرج جسم كتلة @media بمطابقة الأقواس (الكتل متداخلة).
const mediaBody = (query) => {
  const start = css.indexOf(`@media ${query} {`);
  if (start === -1) return '';
  let depth = 0;
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return '';
};

describe('ترويسة الجوال — ترتيب الطبقات', () => {
  it('قاعدة 720px وحدها لا تُكبّر الشعار ولا تُوسّع الحشو (تقتصر على 481px+)', () => {
    const body = mediaBody('(max-width: 720px)');
    expect(body).not.toBe('');
    expect(body).not.toMatch(/\.rz-logo\s*img/);
    expect(body).not.toMatch(/\.rz-topbar-inner\s*\{[^}]*padding/);
  });

  it('مقاسات 481–720px موجودة في استعلام مستقل بحدّ أدنى', () => {
    expect(mediaBody('(min-width: 481px) and (max-width: 720px)')).toMatch(
      /\.rz-logo\s*img\s*\{[^}]*height:\s*38px/
    );
  });

  it('شريط التنقل على الجوال صف واحد قابل للتمرير أفقياً', () => {
    const body = mediaBody('(max-width: 560px)');
    expect(body).toMatch(/flex-wrap:\s*nowrap/);
    expect(body).toMatch(/overflow-x:\s*auto/);
    expect(body).toMatch(/scrollbar-width:\s*none/);
  });
});
