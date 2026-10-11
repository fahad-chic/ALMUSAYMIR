// WCAG 2.1 contrast helpers — pure functions, no side effects.
// Used by unit tests and the e2e contrast audit (e2e/contrast-audit.mjs).

/** Parse #rgb / #rrggbb / #rrggbbaa / rgb() / rgba() into {r,g,b,a}. */
export function parseColor(input) {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    const a = parts.length > 3 ? parts[3] : 1;
    return { r: parts[0], g: parts[1], b: parts[2], a: Number.isNaN(a) ? 1 : a };
  }
  return null;
}

/** WCAG relative luminance for an sRGB colour. */
export function relativeLuminance({ r, g, b }) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast ratio between two opaque colours (1..21). */
export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite a possibly-translucent foreground over an opaque background. */
export function blend(fg, bg) {
  const a = fg.a == null ? 1 : fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

/**
 * WCAG AA minimum ratio for a given text size.
 * Large text = >= 24px, or >= 18.66px when bold (>= 700). Large => 3:1, else 4.5:1.
 */
export function thresholdFor(fontSizePx, fontWeight) {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && Number(fontWeight) >= 700);
  return large ? 3 : 4.5;
}

/** Evaluate a foreground/background pair against WCAG AA. */
export function evaluateContrast(fgColor, bgColor, fontSizePx, fontWeight) {
  const fg = parseColor(fgColor);
  const bg = parseColor(bgColor);
  if (!fg || !bg) return { ok: null, reason: 'unparsable-color' };
  const eff = fg.a < 1 ? blend(fg, bg) : fg;
  const ratio = contrastRatio(eff, bg);
  const required = thresholdFor(fontSizePx, fontWeight);
  return { ok: ratio + 1e-9 >= required, ratio, required };
}
