import { describe, it, expect } from 'vitest';
import {
  parseColor,
  relativeLuminance,
  contrastRatio,
  blend,
  thresholdFor,
  evaluateContrast,
} from './wcag';

describe('wcag.parseColor', () => {
  it('parses hex forms', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#202A3A')).toEqual({ r: 32, g: 42, b: 58, a: 1 });
    expect(parseColor('#E8E2D6')).toEqual({ r: 232, g: 226, b: 214, a: 1 });
  });
  it('parses rgb/rgba', () => {
    expect(parseColor('rgb(30, 41, 59)')).toEqual({ r: 30, g: 41, b: 59, a: 1 });
    expect(parseColor('rgba(32, 42, 58, 0.5)')).toEqual({ r: 32, g: 42, b: 58, a: 0.5 });
  });
  it('parses transparent and rejects junk', () => {
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('not-a-color')).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });
});

describe('wcag.contrastRatio', () => {
  it('is 21:1 for black on white and 1:1 for identical', () => {
    expect(contrastRatio(parseColor('#000'), parseColor('#fff'))).toBeCloseTo(21, 1);
    expect(contrastRatio(parseColor('#202A3A'), parseColor('#202A3A'))).toBeCloseTo(1, 5);
  });
  it('flags the dark-on-dark regression class (#202A3A on #202A3A)', () => {
    const r = contrastRatio(parseColor('#202A3A'), parseColor('#202A3A'));
    expect(r).toBeLessThan(4.5);
  });
  it('accepts the fixed pearl-on-dark pair (#E8E2D6 on #202A3A)', () => {
    const r = contrastRatio(parseColor('#E8E2D6'), parseColor('#202A3A'));
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});

describe('wcag.blend', () => {
  it('composites translucent fg over opaque bg', () => {
    const out = blend(parseColor('rgba(255,255,255,0.5)'), parseColor('#000'));
    expect(out).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });
  it('keeps opaque fg unchanged', () => {
    const out = blend(parseColor('#123456'), parseColor('#ffffff'));
    expect(out).toEqual({ r: 18, g: 52, b: 86, a: 1 });
  });
});

describe('wcag.thresholdFor', () => {
  it('applies 4.5:1 for normal text', () => {
    expect(thresholdFor(16, 400)).toBe(4.5);
    expect(thresholdFor(18, 700)).toBe(4.5);
  });
  it('applies 3:1 for large text', () => {
    expect(thresholdFor(24, 400)).toBe(3);
    expect(thresholdFor(19, 700)).toBe(3);
  });
});

describe('wcag.evaluateContrast', () => {
  it('passes AA for pearl on dark', () => {
    const e = evaluateContrast('#E8E2D6', '#202A3A', 16, 400);
    expect(e.ok).toBe(true);
    expect(e.required).toBe(4.5);
  });
  it('fails AA for dark on dark', () => {
    const e = evaluateContrast('#202A3A', '#202A3A', 16, 400);
    expect(e.ok).toBe(false);
  });
  it('uses the 3:1 large-text threshold', () => {
    // ~3.45:1 pair (#8a8a8a on white): fails normal, passes large
    const e1 = evaluateContrast('#8a8a8a', '#ffffff', 16, 400);
    const e2 = evaluateContrast('#8a8a8a', '#ffffff', 26, 400);
    expect(e1.ok).toBe(false);
    expect(e2.ok).toBe(true);
  });
  it('returns unknown for unparsable colours', () => {
    expect(evaluateContrast('var(--x)', '#fff', 16, 400).ok).toBeNull();
  });
});
