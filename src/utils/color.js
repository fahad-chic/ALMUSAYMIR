// src/utils/color.js
// مساعد لدمج لون من متغيّرات theme.css مع شفافية (alpha) — بصري فقط.
// يقبل: var(--rz-*) أو hex أو rgb()/rgba() ويُعيد rgba(...) صالحة.

const VAR_TO_RGB = {
  'var(--rz-primary)': '--rz-primary-rgb',
  'var(--rz-burgundy)': '--rz-primary-rgb',
  'var(--rz-ink)': '--rz-ink-rgb',
  'var(--rz-dark)': '--rz-ink-rgb',
  'var(--rz-muted)': '--rz-muted-rgb',
  'var(--rz-gold)': '--rz-gold-rgb',
  'var(--rz-white)': '--rz-white-rgb',
  'var(--rz-ivory)': '--rz-ivory-rgb',
  'var(--rz-success)': '--rz-success-rgb',
  'var(--rz-error)': '--rz-error-rgb',
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i;

/**
 * يُعيد اللون نفسه بشفافية محدّدة.
 * @param {string} color لون (var/hex/rgb)
 * @param {number} alpha شفافية بين 0 و 1
 */
export function colorAlpha(color, alpha) {
  if (typeof color !== 'string') return color;
  const c = color.trim();
  if (Object.prototype.hasOwnProperty.call(VAR_TO_RGB, c)) {
    return `rgba(var(${VAR_TO_RGB[c]}), ${alpha})`;
  }
  const hex = c.match(HEX_RE);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = c.match(RGB_RE);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  // احتياطي: مزج لوني متوافق مع المتصفحات الحديثة
  return `color-mix(in srgb, ${c} ${Math.round(alpha * 100)}%, transparent)`;
}

export default colorAlpha;
