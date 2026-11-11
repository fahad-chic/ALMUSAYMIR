// Regression tests for asset/metadata defects found in the site audit.
// Each test reproduces a defect that existed on main before the fix:
//   1. index.html declared og:image dimensions that did not match the file.
//   2. index.html referenced /favicon.png which did not exist (SPA fallback → HTML).
//   3. public/assets/og-image.jpg was actually a PNG (wrong magic bytes for the extension).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const html = readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const readDims = (file) => {
  const buf = readFileSync(file);
  if (buf.slice(0, 4).toString('hex') === '89504e47') {
    return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return { format: 'unknown' };
};

describe('index.html icon references resolve to real files', () => {
  it('every static asset href/src in index.html exists in public/', () => {
    const refs = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)]
      .map((m) => m[1])
      .filter((ref) => !ref.startsWith('/src/') && /\.(png|jpg|jpeg|ico|svg|webp|json|xml|txt|webmanifest)$/i.test(ref));
    const missing = refs.filter(
      (ref) => !existsSync(path.join(rootDir, 'public', ref.replace(/^\//, '')))
    );
    expect(missing).toEqual([]);
  });
});

describe('og:image metadata matches the referenced image', () => {
  it('declared og:image dimensions equal the real file dimensions', () => {
    const src = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '';
    const width = Number(html.match(/property="og:image:width"\s+content="(\d+)"/)?.[1]);
    const height = Number(html.match(/property="og:image:height"\s+content="(\d+)"/)?.[1]);
    expect(src).toMatch(/\/assets\/.+\.(png|jpg)$/);

    const file = path.join(rootDir, 'public', src.replace(/^.*pages\.dev\//, ''));
    const dims = readDims(file);
    expect(width).toBe(dims.width);
    expect(height).toBe(dims.height);
  });
});

describe('image file extensions match their real content', () => {
  it('assets/og-image.jpg is a real JPEG (not a PNG with a .jpg name)', () => {
    const buf = readFileSync(path.join(rootDir, 'public/assets/og-image.jpg'));
    expect(buf.slice(0, 3).toString('hex')).toBe('ffd8ff');
  });
});
